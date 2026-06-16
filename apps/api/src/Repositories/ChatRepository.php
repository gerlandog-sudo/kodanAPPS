<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

/**
 * ChatRepository - Gestión de hilos de chat, mensajes y menciones en oportunidades
 */
final class ChatRepository extends BaseRepository
{
    /**
     * Obtiene o crea un hilo de mensajes para una oportunidad
     * 
     * @return array<string, mixed>
     */
    public function getOrCreateThread(int $opportunityId): array
    {
        // Validar propiedad de la oportunidad
        $opp = $this->findOne('opportunities', 'id = :id', [':id' => $opportunityId]);
        if ($opp === null) {
            throw new \RuntimeException('Oportunidad no encontrada o acceso denegado', 403);
        }

        $thread = $this->findOne('message_threads', 'opportunity_id = :opp_id', [':opp_id' => $opportunityId]);
        
        if ($thread === null) {
            $tenantId = \kodanAPPS\DB\TenantContext::getTenantId();
            $threadId = $this->create('message_threads', [
                'tenant_id' => $tenantId,
                'opportunity_id' => $opportunityId,
                'subject' => "Chat Oportunidad #{$opportunityId}"
            ]);
            
            $thread = $this->findOne('message_threads', 'id = :id', [':id' => $threadId]);
        }

        if ($thread === null) {
            throw new \RuntimeException('Error al crear o recuperar el hilo de chat.', 500);
        }

        return $thread;
    }

    /**
     * Obtiene los mensajes de un hilo con sus archivos adjuntos y remitente
     * 
     * @return array<int, array<string, mixed>>
     */
    public function getMessages(int $opportunityId): array
    {
        $thread = $this->getOrCreateThread($opportunityId);
        $threadId = isset($thread['id']) && is_scalar($thread['id']) ? (int)$thread['id'] : 0;

        $messages = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT m.*, u.display_name AS sender_name, u.email AS sender_email
             FROM messages m
             JOIN users u ON u.id = m.user_id
             WHERE m.thread_id = ?
             ORDER BY m.created_at ASC",
            [$threadId]
        );

        // Incorporar archivos adjuntos a cada mensaje
        foreach ($messages as &$message) {
            $messageId = isset($message['id']) && is_scalar($message['id']) ? (int)$message['id'] : 0;
            $message['attachments'] = $this->rawSelect(
                "/* BYPASS_TENANT_SCOPE */ SELECT * FROM message_attachments WHERE message_id = ?",
                [$messageId]
            );
        }

        return $messages;
    }

    /**
     * Envía un nuevo mensaje al hilo de chat de la oportunidad
     * 
     * @param array{opportunity_id: int, user_id: int, body: string} $data
     * @return int ID del mensaje creado
     */
    public function createMessage(array $data): int
    {
        $opportunityId = (int)$data['opportunity_id'];
        $thread = $this->getOrCreateThread($opportunityId);
        
        $tenantId = \kodanAPPS\DB\TenantContext::getTenantId();
        
        $threadId = isset($thread['id']) && is_scalar($thread['id']) ? (int)$thread['id'] : 0;

        return $this->create('messages', [
            'tenant_id' => $tenantId,
            'thread_id' => $threadId,
            'opportunity_id' => $opportunityId,
            'user_id' => (int)$data['user_id'],
            'body' => $data['body']
        ]);
    }

    /**
     * Guarda un archivo adjunto vinculado a un mensaje
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
     * Guarda menciones a usuarios dentro de un mensaje
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
     * Devuelve la cantidad de menciones sin leer para el usuario autenticado
     */
    public function getUnreadMentionsCount(): int
    {
        $userId = \kodanAPPS\DB\TenantContext::getUserId();
        
        $results = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT COUNT(1) AS qty
             FROM message_mentions mm
             JOIN messages m ON m.id = mm.message_id
             WHERE mm.user_id = ? AND mm.is_read = 0",
            [$userId]
        );

        $qty = $results[0]['qty'] ?? 0;
        return is_numeric($qty) ? (int)$qty : 0;
    }

    /**
     * Marca todas las menciones del usuario en un hilo específico como leídas
     */
    public function markMentionsAsRead(int $opportunityId): void
    {
        $userId = \kodanAPPS\DB\TenantContext::getUserId();
        
        $this->rawExecute(
            "/* BYPASS_TENANT_SCOPE */
             UPDATE message_mentions mm
             JOIN messages m ON m.id = mm.message_id
             SET mm.is_read = 1
             WHERE mm.user_id = ? AND m.opportunity_id = ?",
            [$userId, $opportunityId]
        );
    }
}
