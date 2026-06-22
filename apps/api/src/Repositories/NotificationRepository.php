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
     * Obtiene el valor de configuración de la aplicación para el tenant actual
     * 
     * @param string $configKey
     * @param string $default
     * @return string
     */
    public function getAppConfig(string $configKey, string $default): string
    {
        $tenantId = TenantContext::getTenantId();
        $sql = "SELECT `config_value` 
                FROM `app_configs` 
                WHERE `tenant_id` = :tenant_id 
                  AND `app_id` = 'crm' 
                  AND `config_key` = :config_key";
        
        $params = [':tenant_id' => $tenantId, ':config_key' => $configKey];
        $result = $this->rawSelect($sql, $params);
        
        if (empty($result)) {
            $this->setAppConfig($configKey, $default);
            return $default;
        }
        
        return (string)$result[0]['config_value'];
    }

    /**
     * Guarda el valor de configuración de la aplicación para el tenant actual
     * 
     * @param string $configKey
     * @param string $configValue
     */
    public function setAppConfig(string $configKey, string $configValue): void
    {
        $tenantId = TenantContext::getTenantId();
        $sql = "INSERT INTO `app_configs` (
                    `tenant_id`, `app_id`, `config_key`, `config_value`
                ) VALUES (
                    :tenant_id, 'crm', :config_key, :config_value
                ) ON DUPLICATE KEY UPDATE 
                    `config_value` = VALUES(`config_value`)";
        
        $params = [
            ':tenant_id' => $tenantId,
            ':config_key' => $configKey,
            ':config_value' => $configValue
        ];
        
        $this->rawExecute($sql, $params);
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
     * @param int $days
     */
    public function removeStaleAlerts(int $userId, int $days): void
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
                             WHERE o.`owner_user_id` = :sub_user_id 
                               AND o.`archived_at` IS NULL 
                               AND s.`is_won_stage` = 0 
                               AND s.`is_lost_stage` = 0 
                               AND o.`close_date` IS NOT NULL 
                               AND o.`close_date` < CURRENT_DATE()
                          )";
        $this->rawExecute($sqlOverdue, [':user_id' => $userId, ':sub_user_id' => $userId]);

        // 2. Eliminar alertas de negociación estancada de oportunidades que ya no están estancadas, fueron cerradas, archivadas o cambiaron de dueño
        $sqlStalled = "DELETE FROM `notifications` 
                       WHERE `user_id` = :user_id 
                         AND `type` = 'stalled_deal' 
                         AND `entity_type` = 'crm_opportunity' 
                         AND `entity_id` NOT IN (
                             SELECT o.`id` 
                             FROM `opportunities` o
                             JOIN `pipeline_stages` s ON o.`pipeline_stage_id` = s.`id`
                             WHERE o.`owner_user_id` = :sub_user_id 
                               AND o.`archived_at` IS NULL 
                               AND s.`is_won_stage` = 0 
                               AND s.`is_lost_stage` = 0 
                               AND o.`updated_at` < DATE_SUB(NOW(), INTERVAL :days DAY)
                         )";
        $this->rawExecute($sqlStalled, [':user_id' => $userId, ':sub_user_id' => $userId, ':days' => $days]);
    }

    /**
     * Obtiene las oportunidades activas asignadas al usuario para evaluar alertas
     * 
     * @param int $userId
     * @return array<int, array<string, mixed>>
     */
    public function getActiveOpportunitiesForUser(int $userId): array
    {
        $sql = "/* BYPASS_TENANT_SCOPE */
                SELECT o.`id`, o.`title`, o.`close_date`, o.`updated_at`
                FROM `opportunities` o
                JOIN `pipeline_stages` s ON o.`pipeline_stage_id` = s.`id`
                WHERE o.`owner_user_id` = :user_id 
                  AND o.`archived_at` IS NULL 
                  AND s.`is_won_stage` = 0 
                  AND s.`is_lost_stage` = 0
                  AND o.`tenant_id` = :tenant_id";
        return $this->rawSelect($sql, [':user_id' => $userId, ':tenant_id' => TenantContext::getTenantId()]);
    }
}
