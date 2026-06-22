<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantContext;

/**
 * NotificationRepository - Gestión de Alertas y Notificaciones del Sistema
 * 
 * @extends BaseRepository<array{id: int, tenant_id: int, user_id: int, type: string, entity_type: string|null, entity_id: int|null, title: string, message: string, is_read: int, created_at: string}>
 */
final class NotificationRepository extends BaseRepository
{
    protected const TABLE = 'notifications';

    /**
     * Lista todas las notificaciones de un usuario ordenadas por fecha descendente
     * 
     * @param int $userId
     * @return array<int, array<string, mixed>>
     */
    public function listAllForUser(int $userId): array
    {
        return $this->findAll(self::TABLE, '*', 'user_id = :user_id', [':user_id' => $userId], 'created_at DESC, id DESC');
    }

    /**
     * Inserta o actualiza una notificación (upsert por constraint de unicidad)
     * 
     * @param array{user_id: int, type: string, entity_type: string|null, entity_id: int|null, title: string, message: string, is_read: int} $data
     */
    public function upsertNotification(array $data): void
    {
        $tenantId = TenantContext::getTenantId();
        $data['tenant_id'] = $tenantId;
        $data['created_at'] = date('Y-m-d H:i:s');

        $sql = "INSERT INTO `notifications` (
                    `tenant_id`, `user_id`, `type`, `entity_type`, `entity_id`, `title`, `message`, `is_read`, `created_at`
                ) VALUES (
                    :tenant_id, :user_id, :type, :entity_type, :entity_id, :title, :message, :is_read, :created_at
                ) ON DUPLICATE KEY UPDATE 
                    `title` = VALUES(`title`), 
                    `message` = VALUES(`message`), 
                    `is_read` = VALUES(`is_read`), 
                    `created_at` = VALUES(`created_at`)";

        $this->rawExecute($sql, $data);
    }

    /**
     * Marca como leídas un conjunto de notificaciones del usuario
     * 
     * @param int $userId
     * @param int[] $ids
     * @return int Cantidad de filas afectadas
     */
    public function markAsRead(int $userId, array $ids): int
    {
        if (empty($ids)) {
            return 0;
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $sql = "UPDATE `notifications` SET `is_read` = 1 WHERE `user_id` = ? AND `id` IN ($placeholders)";
        
        $params = array_merge([$userId], $ids);
        return $this->rawExecute($sql, $params);
    }

    /**
     * Marca todas las notificaciones del usuario como leídas
     * 
     * @param int $userId
     * @return int
     */
    public function markAllAsRead(int $userId): int
    {
        $sql = "UPDATE `notifications` SET `is_read` = 1 WHERE `user_id` = :user_id";
        return $this->rawExecute($sql, [':user_id' => $userId]);
    }

    /**
     * Limpia (elimina) todas las notificaciones de un usuario
     * 
     * @param int $userId
     * @return int
     */
    public function clearAll(int $userId): int
    {
        return $this->delete(self::TABLE, 'user_id = :user_id', [':user_id' => $userId]);
    }

    /**
     * Limpia alertas viejas/resueltas de negociaciones del usuario
     * 
     * @param int $userId
     */
    public function removeStaleAlerts(int $userId): void
    {
        // 1. Eliminar alertas de fecha vencida de oportunidades que ya no están vencidas, fueron cerradas, archivadas o cambiaron de dueño
        $sqlOverdue = "DELETE FROM `notifications` 
                       WHERE `user_id` = :user_id 
                         AND `type` = 'overdue_close' 
                         AND `entity_type` = 'crm_opportunity' 
                         AND `entity_id` NOT IN (
                             SELECT o.`id` 
                             FROM `opportunities` o
                             JOIN `pipeline_stages` s ON o.`pipeline_stage_id` = s.`id`
                             WHERE o.`owner_user_id` = :user_id 
                               AND o.`archived_at` IS NULL 
                               AND s.`is_won_stage` = 0 
                               AND s.`is_lost_stage` = 0 
                               AND o.`close_date` IS NOT NULL 
                               AND o.`close_date` < CURRENT_DATE()
                         )";
        $this->rawExecute($sqlOverdue, [':user_id' => $userId]);

        // 2. Eliminar alertas de negociación estancada de oportunidades que ya no están estancadas, fueron cerradas, archivadas o cambiaron de dueño
        $sqlStalled = "DELETE FROM `notifications` 
                       WHERE `user_id` = :user_id 
                         AND `type` = 'stalled_deal' 
                         AND `entity_type` = 'crm_opportunity' 
                         AND `entity_id` NOT IN (
                             SELECT o.`id` 
                             FROM `opportunities` o
                             JOIN `pipeline_stages` s ON o.`pipeline_stage_id` = s.`id`
                             WHERE o.`owner_user_id` = :user_id 
                               AND o.`archived_at` IS NULL 
                               AND s.`is_won_stage` = 0 
                               AND s.`is_lost_stage` = 0 
                               AND o.`updated_at` >= DATE_SUB(NOW(), INTERVAL 15 DAY)
                         )";
        $this->rawExecute($sqlStalled, [':user_id' => $userId]);
    }

    /**
     * Obtiene las oportunidades activas asignadas al usuario para evaluar alertas
     * 
     * @param int $userId
     * @return array<int, array<string, mixed>>
     */
    public function getActiveOpportunitiesForUser(int $userId): array
    {
        $sql = "SELECT o.`id`, o.`title`, o.`close_date`, o.`updated_at`
                FROM `opportunities` o
                JOIN `pipeline_stages` s ON o.`pipeline_stage_id` = s.`id`
                WHERE o.`owner_user_id` = :user_id 
                  AND o.`archived_at` IS NULL 
                  AND s.`is_won_stage` = 0 
                  AND s.`is_lost_stage` = 0";
        return $this->rawSelect($sql, [':user_id' => $userId]);
    }
}
