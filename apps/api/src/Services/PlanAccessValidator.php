<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\DB\TenantAwarePDO;

final class PlanAccessValidator
{
    private TenantAwarePDO $pdo;

    public function __construct(TenantAwarePDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /** @return array{allowed: bool, roles: array<int, string>, plan_id: int, can_approve_hours: bool} */
    public function validateAppAccess(int $tenantId, string $appId, int $userId): array
    {
        $tenant = $this->pdo->query(
            "SELECT is_active, subscription_plan_id FROM tenants WHERE tenant_id = {$tenantId}"
        )->fetch();
        if (!$tenant || !$tenant['is_active']) {
            throw new \RuntimeException('Tenant inactivo', 403);
        }

        $planId = (int)$tenant['subscription_plan_id'];
        $module = $this->pdo->query(
            "SELECT 1 FROM plan_limits WHERE plan_id = {$planId} AND module = '{$appId}' LIMIT 1"
        )->fetch();
        if (!$module) {
            throw new \RuntimeException('Plan no incluye esta app', 403);
        }

        $rows = $this->pdo->query(
            "SELECT LOWER(r.name) AS name, r.can_approve FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = {$userId} AND ur.app_id = '{$appId}' AND r.is_active = 1"
        )->fetchAll();

        if (empty($rows)) {
            throw new \RuntimeException('Sin rol en esta app', 403);
        }

        $roles = [];
        $canApproveHours = false;
        foreach ($rows as $row) {
            $roles[] = $row['name'];
            if ((int)$row['can_approve'] === 1) {
                $canApproveHours = true;
            }
        }

        return [
            'allowed' => true,
            'roles' => $roles,
            'plan_id' => $planId,
            'can_approve_hours' => $canApproveHours
        ];
    }

    /** @return array{has_capacity: bool, current_usage: int, limit_value: int} */
    public function checkUserCapacity(int $tenantId, string $appId): array
    {
        $row = $this->pdo->query(
            "SELECT 
                CASE WHEN o.custom_value IS NOT NULL THEN o.custom_value ELSE pl.value END AS limit_value,
                COALESCE(u.current_value, 0) AS current_usage
             FROM tenants t
             JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
             JOIN plan_limits pl ON pl.plan_id = sp.id AND pl.module = '{$appId}' AND pl.metric = 'users_max'
             LEFT JOIN tenant_plan_usage u ON u.tenant_id = t.tenant_id AND u.module = pl.module AND u.metric = pl.metric
             LEFT JOIN tenant_limit_overrides o ON o.tenant_id = t.tenant_id AND o.module = pl.module AND o.metric = pl.metric
             WHERE t.tenant_id = {$tenantId}"
        )->fetch();

        if (!$row) {
            throw new \RuntimeException("App {$appId} no tiene metrica users_max", 500);
        }

        return [
            'has_capacity' => ((int)$row['limit_value'] === 0) || ((int)$row['current_usage'] < (int)$row['limit_value']),
            'current_usage' => (int)$row['current_usage'],
            'limit_value' => (int)$row['limit_value'],
        ];
    }
}
