<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\ChatRepository;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;
use RuntimeException;

final class ChatController
{
    private ChatRepository $chatRepo;

    public function __construct(ChatRepository $chatRepo)
    {
        $this->chatRepo = $chatRepo;
    }

    /**
     * GET /api/crm/opportunities/{id}/chat
     * Retorna mensajes y marca menciones como leídas
     * 
     * @return array<int, array<string, mixed>>
     */
    public function getMessages(int $opportunityId): array
    {
        // Obtener mensajes de la oportunidad
        $messages = $this->chatRepo->getMessages($opportunityId);

        // Marcar menciones de este usuario en este hilo como leídas
        $this->chatRepo->markMentionsAsRead($opportunityId);

        return $messages;
    }

    /**
     * POST /api/crm/opportunities/{id}/chat
     * Envía un mensaje en el chat y registra menciones
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, message_id: int, message: string}
     */
    public function sendMessage(int $opportunityId, array $input): array
    {
        $body = isset($input['body']) && is_scalar($input['body']) ? trim((string)$input['body']) : '';
        if ($body === '') {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos faltantes',
                'errors' => ['body' => 'El cuerpo del mensaje no puede estar vacío.']
            ], JSON_UNESCAPED_UNICODE));
        }

        $userId = TenantContext::getUserId();

        $messageId = $this->chatRepo->createMessage([
            'opportunity_id' => $opportunityId,
            'user_id' => $userId,
            'body' => $body
        ]);

        // Procesar menciones si vienen en la entrada
        if (isset($input['mentions']) && is_array($input['mentions'])) {
            $this->chatRepo->saveMentions($messageId, array_map('intval', $input['mentions']));
        }

        return [
            'success' => true,
            'message_id' => $messageId,
            'message' => 'Mensaje enviado exitosamente.'
        ];
    }

    /**
     * GET /api/crm/chats/unread-mentions
     * Devuelve el total de menciones sin leer para el usuario autenticado
     * 
     * @return array{unread_count: int}
     */
    public function getUnreadMentionsCount(): array
    {
        $count = $this->chatRepo->getUnreadMentionsCount();
        return [
            'unread_count' => $count
        ];
    }

    /**
     * POST /api/crm/chats/messages/{messageId}/attach
     * Sube un archivo adjunto para un mensaje específico
     * 
     * @return array{success: bool, attachment_id: int, file_name: string, file_path: string, message: string}
     */
    public function uploadAttachment(int $messageId): array
    {
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            throw new RuntimeException('No se proporcionó un archivo válido para subir.', 400);
        }

        $file = $_FILES['file'];
        
        // Crear directorio seguro por tenant
        $tenantId = TenantContext::getTenantId();
        $uploadDir = __DIR__ . '/../../public/uploads/tenant_' . $tenantId . '/';
        
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        // Nombre de archivo seguro y único
        $uniquePrefix = bin2hex(random_bytes(8));
        $originalName = isset($file['name']) && is_scalar($file['name']) ? (string)$file['name'] : 'file';
        $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName);
        $filename = $uniquePrefix . '_' . ($safeName !== null ? $safeName : 'file');
        $destPath = $uploadDir . $filename;

        $tmpName = isset($file['tmp_name']) && is_scalar($file['tmp_name']) ? (string)$file['tmp_name'] : '';
        if (move_uploaded_file($tmpName, $destPath)) {
            $relativePath = '/uploads/tenant_' . $tenantId . '/' . $filename;
            
            $fileSize = isset($file['size']) && is_scalar($file['size']) ? (int)$file['size'] : 0;
            $attachmentId = $this->chatRepo->saveAttachment(
                $messageId,
                $originalName,
                $relativePath,
                $fileSize
            );

            return [
                'success' => true,
                'attachment_id' => $attachmentId,
                'file_name' => $originalName,
                'file_path' => $relativePath,
                'message' => 'Archivo adjunto subido correctamente.'
            ];
        } else {
            throw new RuntimeException('No se pudo guardar el archivo en el servidor.', 500);
        }
    }
}
