<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\Repositories\ChatRepository;

/**
 * EntityOwnerSyncService - Sincroniza la participación en chats ante cambios de propiedad en CRM/Tracker.
 */
final class EntityOwnerSyncService
{
    private ChatRepository $chatRepo;

    public function __construct(ChatRepository $chatRepo)
    {
        $this->chatRepo = $chatRepo;
    }

    /**
     * Sincroniza la participación al cambiar el owner de una entidad.
     * 
     * @param string $entityType Tipo de entidad (ej: 'crm_opportunity', 'tracker_project')
     * @param int $entityId ID de la entidad
     * @param int $oldOwnerId ID del owner anterior
     * @param int $newOwnerId ID del nuevo owner
     */
    public function syncOwner(string $entityType, int $entityId, int $oldOwnerId, int $newOwnerId): void
    {
        $tenantId = \kodanAPPS\DB\TenantContext::getTenantId();
        
        try {
            $conv = $this->chatRepo->findConversationByEntity($entityType, $entityId);
        } catch (\Throwable $e) {
            // Si la tabla o la columna no existe o da error de base de datos, ignorar silenciosamente
            return;
        }

        if ($conv === null) {
            return;
        }

        $conversationId = (int)$conv['id'];

        // 1. Suscribir de inmediato al nuevo owner
        $this->chatRepo->addParticipant($conversationId, $newOwnerId);

        // 2. Dar de baja al owner anterior SOLO si no ha escrito ningún mensaje en este chat
        $messagesWritten = $this->chatRepo->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT COUNT(1) AS qty 
             FROM messages 
             WHERE conversation_id = ? AND sender_id = ? LIMIT 1",
            [$conversationId, $oldOwnerId]
        );

        $qty = $messagesWritten[0]['qty'] ?? 0;

        if ((int)$qty === 0) {
            $this->chatRepo->removeParticipant($conversationId, $oldOwnerId);
        }
    }
}
