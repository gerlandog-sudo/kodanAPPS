<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\DB\TenantContext;
use kodanAPPS\DB\TenantAwarePDO;

final class UsageTracker implements UsageTrackerInterface
{
    private TenantAwarePDO $pdo;

    /** @var array<string, RecountStrategyInterface> */
    private array $recounters;

    /** @param array<string, RecountStrategyInterface> $recounters */
    public function __construct(TenantAwarePDO $pdo, array $recounters = [])
    {
        $this->pdo = $pdo;
        $this->recounters = $recounters;
    }

    public function checkAndReserve(string $module, string $metric, int $amount = 1): void
    {
        $tenantId = TenantContext::getTenantId();

        $limit = $this->getEffectiveLimit($tenantId, $module, $metric);

        if ($limit['is_blocked']) {
            throw new \RuntimeException("Acceso bloqueado para {$module}:{$metric}", 403);
        }

        if ($limit['value'] > 0) {
            $inTransaction = $this->pdo->inTransaction();
            if (!$inTransaction) {
                $this->pdo->beginTransaction();
            }
            try {
                $row = $this->pdo->query(
                    "SELECT current_value FROM tenant_plan_usage
                     WHERE tenant_id = {$tenantId} AND module = '{$module}' AND metric = '{$metric}'
                     FOR UPDATE"
                )->fetch();

                $current = $row ? (int)$row['current_value'] : 0;

                if ($current + $amount > $limit['value']) {
                    throw new \RuntimeException(
                        "Límite excedido para {$module}:{$metric} ({$current}/{$limit['value']})", 403
                    );
                }

                $stmt = $this->pdo->prepare(
                    "INSERT INTO tenant_plan_usage (tenant_id, module, metric, current_value)
                     VALUES (?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE current_value = current_value + ?"
                );
                $stmt->execute([$tenantId, $module, $metric, $amount, $amount]);

                if (!$inTransaction) {
                    $this->pdo->commit();
                }
            } catch (\RuntimeException $e) {
                if (!$inTransaction) {
                    $this->pdo->rollBack();
                }
                throw $e;
            } catch (\Throwable $e) {
                if (!$inTransaction) {
                    $this->pdo->rollBack();
                }
                throw new \RuntimeException("Error al reservar capacidad: {$e->getMessage()}", 500, $e);
            }
        }
    }

    public function increment(string $module, string $metric, int $amount = 1): void
    {
        $tenantId = TenantContext::getTenantId();
        $stmt = $this->pdo->prepare(
            "INSERT INTO tenant_plan_usage (tenant_id, module, metric, current_value)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE current_value = current_value + ?"
        );
        $stmt->execute([$tenantId, $module, $metric, $amount, $amount]);
    }

    public function decrement(string $module, string $metric, int $amount = 1): void
    {
        $tenantId = TenantContext::getTenantId();
        $stmt = $this->pdo->prepare(
            "UPDATE tenant_plan_usage
             SET current_value = GREATEST(0, current_value - ?)
             WHERE tenant_id = ? AND module = ? AND metric = ?"
        );
        $stmt->execute([$amount, $tenantId, $module, $metric]);
    }

    /** @return array{value: int, is_blocked: bool} */
    private function getEffectiveLimit(int $tenantId, string $module, string $metric): array
    {
        $row = $this->pdo->query(
            "SELECT 
                pl.value AS plan_value,
                pl.is_blocked AS plan_blocked,
                o.custom_value AS override_value
             FROM plan_limits pl
             JOIN subscription_plans sp ON sp.id = pl.plan_id
             JOIN tenants t ON t.subscription_plan_id = sp.id
             LEFT JOIN tenant_limit_overrides o 
                ON o.tenant_id = t.tenant_id AND o.module = pl.module AND o.metric = pl.metric
             WHERE t.tenant_id = {$tenantId}
               AND pl.module = '{$module}'
               AND pl.metric = '{$metric}'
               AND t.is_active = 1
               AND sp.deleted_at IS NULL"
        )->fetch();

        if (!$row) {
            throw new \RuntimeException("Límite no configurado para {$module}:{$metric}", 500);
        }

        if ($row['override_value'] !== null) {
            $ov = (int)$row['override_value'];
            if ($ov === -1) return ['value' => 0, 'is_blocked' => true];
            if ($ov === 0)  return ['value' => 0, 'is_blocked' => false];
            return ['value' => $ov, 'is_blocked' => false];
        }

        if ((int)$row['plan_blocked'] === 1) return ['value' => 0, 'is_blocked' => true];
        return ['value' => (int)$row['plan_value'], 'is_blocked' => false];
    }

    /** @return array<int, array<string, mixed>> */
    public function getUsageStatus(string $module): array
    {
        $tenantId = TenantContext::getTenantId();
        $rows = $this->pdo->query(
            "SELECT module, metric, 
                    CASE WHEN override_value IS NOT NULL THEN override_value ELSE plan_limit END AS limit_value,
                    COALESCE(current_usage, 0) AS current_usage,
                    has_capacity
             FROM v_tenant_plan_limits
             WHERE tenant_id = {$tenantId} AND module = '{$module}'"
        )->fetchAll();

        $this->checkAndScheduleRecount($module, $rows);

        return $rows;
    }

    /** @return array<int, array<string, mixed>> */
    public function getAllUsageStatus(): array
    {
        $tenantId = TenantContext::getTenantId();
        return $this->pdo->query(
            "SELECT module, metric,
                    CASE WHEN override_value IS NOT NULL THEN override_value ELSE plan_limit END AS limit_value,
                    COALESCE(current_usage, 0) AS current_usage,
                    has_capacity
             FROM v_tenant_plan_limits
             WHERE tenant_id = {$tenantId}"
        )->fetchAll();
    }

    public function initializeTenant(int $tenantId, int $planId): void
    {
        $metrics = $this->pdo->query(
            "SELECT module, metric FROM plan_limits WHERE plan_id = {$planId}"
        )->fetchAll();

        $stmtInit = $this->pdo->prepare(
            "INSERT IGNORE INTO tenant_plan_usage (tenant_id, module, metric, current_value)
             VALUES (?, ?, ?, 0)"
        );
        foreach ($metrics as $m) {
            $stmtInit->execute([$tenantId, $m['module'], $m['metric']]);
        }
    }

    /** @return array<int, string> */
    public function getContractedApps(int $tenantId): array
    {
        return $this->pdo->query(
            "SELECT DISTINCT pl.module
             FROM tenants t
             JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
             JOIN plan_limits pl ON pl.plan_id = sp.id
             WHERE t.tenant_id = {$tenantId} AND pl.metric = 'users_max'"
        )->fetchAll(\PDO::FETCH_COLUMN);
    }

    /** @param array<int, array<string, mixed>> $usageData */
    public function checkAndScheduleRecount(string $module, array $usageData): void
    {
        $tenantId = TenantContext::getTenantId();
        $needsRecount = false;

        foreach ($usageData as $row) {
            $limit = isset($row['limit_value']) ? (int)$row['limit_value'] : 0;
            $usage = isset($row['current_usage']) ? (int)$row['current_usage'] : 0;
            if ($limit > 0) {
                $pct = $usage / $limit;
                if ($pct >= 0.8) {
                    $last = $this->pdo->query(
                        "SELECT scheduled_at FROM tenant_recount_schedule
                         WHERE tenant_id = {$tenantId} AND module = '{$module}'"
                    )->fetch();
                    if (!$last || (time() - strtotime($last['scheduled_at']) > 3600)) {
                        $needsRecount = true;
                        break;
                    }
                }
            }
        }

        if ($needsRecount) {
            $stmtSchedule = $this->pdo->prepare(
                "INSERT IGNORE INTO tenant_recount_schedule (tenant_id, module, scheduled_at)
                 VALUES (?, ?, NOW())"
            );
            $stmtSchedule->execute([$tenantId, $module]);
        }
    }

    public function processRecountQueue(): void
    {
        $rows = $this->pdo->query(
            "SELECT rs.tenant_id, rs.module
             FROM tenant_recount_schedule rs
             WHERE rs.scheduled_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
             LIMIT 10"
        )->fetchAll();

        foreach ($rows as $row) {
            $tid = (int)$row['tenant_id'];
            $module = $row['module'];
            $this->doFullRecount($tid, $module);
            $stmtDel = $this->pdo->prepare(
                "DELETE FROM tenant_recount_schedule WHERE tenant_id = ? AND module = ?"
            );
            $stmtDel->execute([$tid, $module]);
        }
    }

    private function doFullRecount(int $tenantId, string $module): void
    {
        if (isset($this->recounters[$module])) {
            $this->recounters[$module]->recount($tenantId, $this->pdo);
        }
    }
}
