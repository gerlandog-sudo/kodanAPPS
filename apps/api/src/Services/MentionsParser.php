<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\Repositories\ChatRepository;
use kodanAPPS\DB\TenantContext;

/**
 * MentionsParser - Analiza el contenido de los mensajes buscando menciones de tipo @[Nombre](user:id)
 * y gestiona la suscripción y alertas con validaciones multitenant de seguridad.
 */
final class MentionsParser
{
    private ChatRepository $chatRepo;

    public function __construct(ChatRepository $chatRepo)
    {
        $this->chatRepo = $chatRepo;
    }

    /**
     * Parsea y procesa menciones en un mensaje enviado.
     * 
     * @param string $content Contenido del mensaje en texto plano o markdown
     * @param int $conversationId ID de la conversación
     * @param int $messageId ID del mensaje insertado
     */
    public function processMentions(string $content, int $conversationId, int $messageId): void
    {
        preg_match_all('/user:(\d+)/', $content, $matches);
        
        if (empty($matches[1])) {
            return;
        }

        // Obtener IDs de usuarios únicos mencionados
        $userIds = array_unique(array_map('intval', $matches[1]));
        $tenantId = TenantContext::getTenantId();

        // Validar estrictamente la pertenencia de los usuarios mencionados al mismo Tenant
        $validUserIds = [];
        foreach ($userIds as $userId) {
            $user = $this->chatRepo->rawSelect(
                "/* BYPASS_TENANT_SCOPE */
                 SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1",
                [$userId, $tenantId]
            );
            if (!empty($user)) {
                $validUserIds[] = (int)$user[0]['id'];
            }
        }

        if (empty($validUserIds)) {
            return;
        }

        // Suscribir y guardar menciones para cada usuario válido
        foreach ($validUserIds as $validUserId) {
            // 1. Suscribir a la conversación para que reciba futuras respuestas
            $this->chatRepo->addParticipant($conversationId, $validUserId);

            // 2. Registrar mención en message_mentions
            $this->chatRepo->rawExecute(
                "/* BYPASS_TENANT_SCOPE */
                 INSERT IGNORE INTO message_mentions (message_id, user_id, is_read, created_at)
                 VALUES (?, ?, 0, NOW())
                 ON DUPLICATE KEY UPDATE is_read = 0",
                [$messageId, $validUserId]
            );
        }
    }
}
