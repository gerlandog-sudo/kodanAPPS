<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DB\TenantContext;
use kodanAPPS\DB\TenantAwarePDO;
use InvalidArgumentException;
use RuntimeException;

final class TrackerProfileController
{
    public function __construct(
        private TenantAwarePDO $pdo,
    ) {}

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listProfiles(): array
    {
        $tenantId = TenantContext::getTenantId();
        return $this->pdo->query(
            "SELECT 
                COALESCE(up.id, 0) AS id,
                u.id AS user_id,
                u.display_name AS user_name,
                up.position_id,
                p.name AS position_name,
                up.seniority_id,
                s.name AS seniority_name,
                COALESCE(up.hourly_cost, 0.00) AS hourly_cost,
                COALESCE(up.weekly_capacity, 2400) AS weekly_capacity
             FROM users u
             LEFT JOIN TRACKER_user_profiles up ON up.user_id = u.id AND up.tenant_id = u.tenant_id
             LEFT JOIN TRACKER_positions p ON p.id = up.position_id
             LEFT JOIN TRACKER_seniorities s ON s.id = up.seniority_id
             WHERE u.tenant_id = {$tenantId} AND u.is_active = 1
             ORDER BY u.display_name ASC"
        )->fetchAll();
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function upsertProfile(array $input): array
    {
        $tenantId = TenantContext::getTenantId();
        $userId = (int)($input['user_id'] ?? 0);
        if ($userId <= 0) {
            throw new InvalidArgumentException(json_encode(['user_id' => 'Usuario requerido'], JSON_UNESCAPED_UNICODE));
        }

        $stmt = $this->pdo->prepare(
            "INSERT INTO TRACKER_user_profiles (tenant_id, user_id, position_id, seniority_id, hourly_cost, weekly_capacity)
             VALUES (:tenant_id, :user_id, :position_id, :seniority_id, :hourly_cost, :weekly_capacity)
             ON DUPLICATE KEY UPDATE
               position_id = VALUES(position_id),
               seniority_id = VALUES(seniority_id),
               hourly_cost = VALUES(hourly_cost),
               weekly_capacity = VALUES(weekly_capacity)"
        );
        $stmt->execute([
            ':tenant_id' => $tenantId,
            ':user_id' => $userId,
            ':position_id' => isset($input['position_id']) ? (int)$input['position_id'] : null,
            ':seniority_id' => isset($input['seniority_id']) ? (int)$input['seniority_id'] : null,
            ':hourly_cost' => (float)($input['hourly_cost'] ?? 0),
            ':weekly_capacity' => (int)($input['weekly_capacity'] ?? 2400),
        ]);

        return ['success' => true];
    }
}
