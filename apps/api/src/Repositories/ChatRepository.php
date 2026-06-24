<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantContext;
use RuntimeException;

/**
 * ChatRepository - Gestión transversal y polimórfica de conversaciones, participantes y mensajes.
 * 
 * @extends BaseRepository<array<string, mixed>>
 */
final class ChatRepository extends BaseRepository
{
    protected const TABLE = 'conversations';

    /**
     * Busca una conversación existente para una entidad sin crearla.
     * 
     * @return array<string, mixed>|null
     */
    public function findConversationByEntity(string $entityType, int $entityId): ?array
    {
        $tenantId = TenantContext::getTenantId();
        return $this->findOne(
            'conversations', 
            'tenant_id = :tenant_id AND entity_type = :entity_type AND entity_id = :entity_id', 
            [
                ':tenant_id' => $tenantId,
                ':entity_type' => $entityType,
                ':entity_id' => $entityId
            ]
        );
    }

    /**
     * Obtiene o crea una conversación polimórfica vinculada a una entidad específica de cualquier app.
     * 
     * @param string $entityType Tipo de entidad (ej: 'crm_opportunity', 'tracker_task')
     * @param int $entityId ID de la entidad
     * @return array<string, mixed>
     */
    public function getOrCreateConversation(string $entityType, int $entityId): array
    {
        $tenantId = TenantContext::getTenantId();

        // Buscar conversación existente por entidad y tenant
        $conv = $this->findOne(
            'conversations', 
            'tenant_id = :tenant_id AND entity_type = :entity_type AND entity_id = :entity_id', 
            [
                ':tenant_id' => $tenantId,
                ':entity_type' => $entityType,
                ':entity_id' => $entityId
            ]
        );
        
        if ($conv === null) {
            // Insertar con protección únicauk_tenant_entity capturando duplicados concurrentes
            try {
                $convId = $this->create('conversations', [
                    'tenant_id' => $tenantId,
                    'type' => 'entity',
                    'entity_type' => $entityType,
                    'entity_id' => $entityId
                ]);
                
                $conv = $this->findOne('conversations', 'id = :id', [':id' => $convId]);
            } catch (\PDOException $e) {
                // Si falla por llave duplicada (SQLSTATE 23000), recuperar el registro que ganó la condición de carrera
                if ($e->getCode() === '23000') {
                    $conv = $this->findOne(
                        'conversations', 
                        'tenant_id = :tenant_id AND entity_type = :entity_type AND entity_id = :entity_id', 
                        [
                            ':tenant_id' => $tenantId,
                            ':entity_type' => $entityType,
                            ':entity_id' => $entityId
                        ]
                    );
                } else {
                    throw $e;
                }
            }
        }

        if ($conv === null) {
            throw new RuntimeException('Error al crear o recuperar la conversación.', 500);
        }

        return $conv;
    }

    /**
     * Obtiene los mensajes de una conversación con sus archivos adjuntos y remitente.
     * 
     * @param int $conversationId ID de la conversación
     * @return array<int, array<string, mixed>>
     */
    public function getMessages(int $conversationId): array
    {
        $messages = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT m.*, u.display_name AS sender_name, u.email AS sender_email
             FROM messages m
             LEFT JOIN users u ON u.id = m.sender_id
             WHERE m.conversation_id = ?
             ORDER BY m.created_at ASC",
            [$conversationId]
        );

        // Incorporar archivos adjuntos a cada mensaje
        foreach ($messages as &$message) {
            $messageId = (int)$message['id'];
            $message['attachments'] = $this->rawSelect(
                "/* BYPASS_TENANT_SCOPE */ SELECT * FROM message_attachments WHERE message_id = ?",
                [$messageId]
            );
        }

        return $messages;
    }

    /**
     * Envía un nuevo mensaje al hilo de chat de la conversación.
     * 
     * @param array{conversation_id: int, sender_id: int|null, content: string, is_system?: int, system_metadata?: string|null} $data
     * @return int ID del mensaje creado
     */
    public function createMessage(array $data): int
    {
        $tenantId = TenantContext::getTenantId();

        return $this->create('messages', [
            'tenant_id' => $tenantId,
            'conversation_id' => (int)$data['conversation_id'],
            'sender_id' => $data['sender_id'],
            'is_system' => $data['is_system'] ?? 0,
            'content' => $data['content'],
            'system_metadata' => $data['system_metadata'] ?? null
        ]);
    }

    /**
     * Agrega un participante a una conversación.
     */
    public function addParticipant(int $conversationId, int $userId): void
    {
        $this->rawExecute(
            "/* BYPASS_TENANT_SCOPE */
             INSERT IGNORE INTO conversation_participants (conversation_id, user_id, joined_at)
             VALUES (?, ?, NOW())",
            [$conversationId, $userId]
        );
    }

    /**
     * Elimina un participante de una conversación (Opt-out).
     */
    public function removeParticipant(int $conversationId, int $userId): void
    {
        $this->rawExecute(
            "/* BYPASS_TENANT_SCOPE */
             DELETE FROM conversation_participants 
             WHERE conversation_id = ? AND user_id = ?",
            [$conversationId, $userId]
        );
    }

    /**
     * Actualiza el puntero del último mensaje leído por el usuario.
     */
    public function updateLastRead(int $conversationId, int $userId, int $messageId): void
    {
        $this->rawExecute(
            "/* BYPASS_TENANT_SCOPE */
             UPDATE conversation_participants
             SET last_read_message_id = ?
             WHERE conversation_id = ? AND user_id = ?",
            [$messageId, $conversationId, $userId]
        );
    }

    /**
     * Guarda un archivo adjunto vinculado a un mensaje.
     */
    public function saveAttachment(int $messageId, string $fileName, string $filePath, int $fileSize): int
    {
        $this->rawExecute(
            "/* BYPASS_TENANT_SCOPE */
             INSERT INTO message_attachments (message_id, file_path, file_name, file_size)
             VALUES (?, ?, ?, ?)",
            [$messageId, $filePath, $fileName, $fileSize]
        );
        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Guarda menciones a usuarios dentro de un mensaje.
     * 
     * @param array<int, int> $userIds
     */
    public function saveMentions(int $messageId, array $userIds): void
    {
        foreach ($userIds as $userId) {
            $this->rawExecute(
                "/* BYPASS_TENANT_SCOPE */
                 INSERT INTO message_mentions (message_id, user_id, is_read, created_at)
                 VALUES (?, ?, 0, NOW())
                 ON DUPLICATE KEY UPDATE is_read = 0",
                [$messageId, (int)$userId]
            );
        }
    }

    /**
     * Devuelve la cantidad global de mensajes no leídos del usuario para el Topbar.
     */
    public function getUnreadCount(int $userId): int
    {
        $results = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT COUNT(m.id) AS qty
             FROM conversation_participants cp
             JOIN messages m ON m.conversation_id = cp.conversation_id
             WHERE cp.user_id = ? 
               AND (m.sender_id IS NULL OR m.sender_id != cp.user_id)
               AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)",
            [$userId]
        );

        $qty = $results[0]['qty'] ?? 0;
        return is_numeric($qty) ? (int)$qty : 0;
    }

    /**
     * Marca todas las menciones del usuario en un hilo específico como leídas.
     */
    public function markMentionsAsRead(int $conversationId, int $userId): void
    {
        $this->rawExecute(
            "/* BYPASS_TENANT_SCOPE */
             UPDATE message_mentions mm
             JOIN messages m ON m.id = mm.message_id
             SET mm.is_read = 1
             WHERE mm.user_id = ? AND m.conversation_id = ?",
            [$userId, $conversationId]
        );
    }

    /**
     * Devuelve la cantidad de menciones sin leer del usuario para compatibilidad.
     */
    public function getUnreadMentionsCount(int $userId): int
    {
        $tenantId = TenantContext::getTenantId();
        $results = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT COUNT(mm.message_id) AS qty
             FROM message_mentions mm
             JOIN messages m ON m.id = mm.message_id
             JOIN conversations c ON c.id = m.conversation_id
             WHERE mm.user_id = ? AND mm.is_read = 0 AND c.tenant_id = ?",
            [$userId, $tenantId]
        );

        $qty = $results[0]['qty'] ?? 0;
        return is_numeric($qty) ? (int)$qty : 0;
    }

    /**
     * Obtiene la última conversación con mensajes no leídos para el usuario.
     * 
     * @return array<string, mixed>|null
     */
    public function getLastUnreadConversation(int $userId): ?array
    {
        $results = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT c.id, c.entity_type, c.entity_id, m.id AS message_id
             FROM conversation_participants cp
             JOIN conversations c ON c.id = cp.conversation_id
             JOIN messages m ON m.conversation_id = cp.conversation_id
             WHERE cp.user_id = ?
               AND (m.sender_id IS NULL OR m.sender_id != cp.user_id)
               AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)
             ORDER BY m.id DESC
             LIMIT 1",
            [$userId]
        );

        if (empty($results)) {
            return null;
        }

        $conv = $results[0];
        $entityType = $conv['entity_type'] ?? '';
        $entityId = isset($conv['entity_id']) ? (int)$conv['entity_id'] : 0;

        $title = null;
        if ($entityType === 'crm_opportunity' && $entityId > 0) {
            $opp = $this->rawSelect("/* BYPASS_TENANT_SCOPE */ SELECT title FROM opportunities WHERE id = ?", [$entityId]);
            if (!empty($opp)) {
                $title = $opp[0]['title'] ?? null;
            }
        } elseif ($entityType === 'tracker_task' && $entityId > 0) {
            $task = $this->rawSelect("/* BYPASS_TENANT_SCOPE */ SELECT title FROM tasks WHERE id = ?", [$entityId]);
            if (!empty($task)) {
                $title = $task[0]['title'] ?? null;
            }
        }

        return [
            'type' => $entityType,
            'id' => $entityId,
            'title' => $title
        ];
    }
}
