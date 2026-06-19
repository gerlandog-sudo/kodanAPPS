<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\ChatRepository;
use kodanAPPS\Services\MentionsParser;
use kodanAPPS\DB\TenantContext;
use kodanAPPS\DTOs\SendMessageDTO;
use InvalidArgumentException;
use RuntimeException;

/**
 * MessagingController - Controlador global y polimórfico para mensajería y notificaciones.
 */
final class MessagingController
{
    private ChatRepository $chatRepo;
    private MentionsParser $mentionsParser;

    public function __construct(ChatRepository $chatRepo, MentionsParser $mentionsParser)
    {
        $this->chatRepo = $chatRepo;
        $this->mentionsParser = $mentionsParser;
    }

    /**
     * GET /api/chats/{entity_type}/{entity_id}
     * Obtiene los mensajes asociados a cualquier entidad y marca lecturas de mención.
     * 
     * @return array<int, array<string, mixed>>
     */
    public function getMessagesByEntity(string $entityType, int $entityId): array
    {
        $userId = TenantContext::getUserId();

        // Obtener o crear la conversación para la entidad
        $conv = $this->chatRepo->getOrCreateConversation($entityType, $entityId);
        $conversationId = (int)$conv['id'];

        // Suscribir al usuario automáticamente al abrir el chat (Opt-in por Interacción)
        $this->chatRepo->addParticipant($conversationId, $userId);

        // Obtener mensajes de la conversación
        $messages = $this->chatRepo->getMessages($conversationId);

        // Marcar menciones de este usuario en este chat como leídas
        $this->chatRepo->markMentionsAsRead($conversationId, $userId);

        return $messages;
    }

    /**
     * POST /api/chats/{entity_type}/{entity_id}
     * Envía un mensaje en el chat polimórfico de la entidad y procesa menciones.
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, message_id: int, message: string}
     */
    public function sendMessageByEntity(string $entityType, int $entityId, array $input): array
    {
        $userId = TenantContext::getUserId();
        $tenantId = TenantContext::getTenantId();

        $content = isset($input['content']) && is_scalar($input['content']) ? trim((string)$input['content']) : '';
        if ($content === '') {
            throw new InvalidArgumentException((string)json_encode([
                'content' => 'El cuerpo del mensaje no puede estar vacío.'
            ], JSON_UNESCAPED_UNICODE));
        }

        // Obtener la conversación polimórfica
        $conv = $this->chatRepo->getOrCreateConversation($entityType, $entityId);
        $conversationId = (int)$conv['id'];

        // Validar y empaquetar datos
        $dto = new SendMessageDTO([
            'conversation_id' => $conversationId,
            'sender_id' => $userId,
            'content' => $content,
            'is_system' => false,
            'system_metadata' => null
        ]);

        // Guardar mensaje
        $messageId = $this->chatRepo->createMessage($dto->toArray());

        // Asegurar que el emisor sea registrado como participante activo del chat
        $this->chatRepo->addParticipant($conversationId, $userId);

        // Actualizar el puntero del último mensaje leído por el emisor de inmediato
        $this->chatRepo->updateLastRead($conversationId, $userId, $messageId);

        // Parsear y procesar menciones en segundo plano
        $this->mentionsParser->processMentions($content, $conversationId, $messageId);

        return [
            'success' => true,
            'message_id' => $messageId,
            'message' => 'Mensaje enviado exitosamente.'
        ];
    }

    /**
     * POST /api/conversations/{id}/read
     * Actualiza el puntero de lectura global de la conversación.
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, message: string}
     */
    public function markAsRead(int $conversationId, array $input): array
    {
        $userId = TenantContext::getUserId();
        $messageId = isset($input['last_message_id']) ? (int)$input['last_message_id'] : 0;

        if ($messageId <= 0) {
            throw new InvalidArgumentException((string)json_encode([
                'last_message_id' => 'ID del último mensaje leído es requerido.'
            ], JSON_UNESCAPED_UNICODE));
        }

        $this->chatRepo->updateLastRead($conversationId, $userId, $messageId);

        return [
            'success' => true,
            'message' => 'Historial marcado como leído.'
        ];
    }

    /**
     * GET /api/messages/unread-count
     * Devuelve la cantidad global de mensajes no leídos del usuario para el Topbar.
     * 
     * @return array{unread_count: int}
     */
    public function getUnreadCount(): array
    {
        $userId = TenantContext::getUserId();
        $count = $this->chatRepo->getUnreadCount($userId);
        return [
            'unread_count' => $count
        ];
    }

    /**
     * GET /api/messages/stream
     * Endpoint SSE de tiempo real optimizado.
     * 
     * @param array{host: string, port: int, dbname: string, user: string, pass: string, charset: string} $dbConfig
     */
    public function stream(array $dbConfig): void
    {
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no'); // Evita que Nginx acumule el buffer en proxy

        // 1. Liberar la sesión de PHP inmediatamente para no bloquear peticiones del mismo navegador
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        $userId = TenantContext::getUserId();
        $tenantId = TenantContext::getTenantId();

        if ($userId === 0 || $tenantId === 0) {
            echo "event: error\ndata: Unauthorized\n\n";
            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();
            exit;
        }

        // 2. Control de reconexión (Last-Event-ID)
        $lastMessageId = (int)($_SERVER['HTTP_LAST_EVENT_ID'] ?? ($_GET['last_event_id'] ?? 0));

        $dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['dbname']};charset={$dbConfig['charset']}";
        /** @var \PDO|null $pdo */
        $pdo = null;

        while (true) {
            if (connection_aborted()) {
                break;
            }

            if ($pdo === null) {
                try {
                    $pdo = new \PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
                        \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                        \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                        \PDO::ATTR_EMULATE_PREPARES => false,
                    ]);
                } catch (\Throwable $e) {
                    usleep(5000000); // esperar 5s
                    continue;
                }
            }

            // Obtener conversaciones activas del usuario
            $stmt = $pdo->prepare('/* BYPASS_TENANT_SCOPE */ SELECT conversation_id FROM conversation_participants WHERE user_id = ?');
            $stmt->execute([$userId]);
            $conversationIds = $stmt->fetchAll(\PDO::FETCH_COLUMN);

            if (empty($conversationIds)) {
                echo ": keep-alive\n\n";
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            } else {
                $placeholders = implode(',', array_fill(0, count($conversationIds), '?'));
                $query = "/* BYPASS_TENANT_SCOPE */
                          SELECT m.*, u.display_name AS sender_name 
                          FROM messages m 
                          LEFT JOIN users u ON u.id = m.sender_id
                          WHERE m.conversation_id IN ($placeholders) 
                            AND m.id > ? 
                          ORDER BY m.id ASC";

                $stmt = $pdo->prepare($query);
                $params = array_merge($conversationIds, [$lastMessageId]);
                $stmt->execute($params);
                $newMessages = $stmt->fetchAll();

                if (!empty($newMessages)) {
                    foreach ($newMessages as $msg) {
                        $lastMessageId = (int)$msg['id'];
                        echo "id: {$lastMessageId}\n";
                        echo "event: message\n";
                        echo "data: " . json_encode($msg, JSON_UNESCAPED_UNICODE) . "\n\n";
                    }

                    // Enviar contador actualizado de no leídos
                    $unreadStmt = $pdo->prepare("
                        /* BYPASS_TENANT_SCOPE */
                        SELECT COUNT(m.id) as unread_count
                        FROM conversation_participants cp
                        JOIN messages m ON m.conversation_id = cp.conversation_id
                        WHERE cp.user_id = ?
                          AND (m.sender_id IS NULL OR m.sender_id != cp.user_id)
                          AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)
                    ");
                    $unreadStmt->execute([$userId]);
                    $unreadCount = (int)$unreadStmt->fetchColumn();

                    echo "event: unread_update\n";
                    echo "data: " . json_encode(['unread_count' => $unreadCount], JSON_UNESCAPED_UNICODE) . "\n\n";
                } else {
                    echo ": keep-alive\n\n";
                }
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            }

            // Liberar recursos
            $pdo = null;
            $stmt = null;
            $unreadStmt = null;

            usleep(60000000); // 60 segundos
        }
    }
}
