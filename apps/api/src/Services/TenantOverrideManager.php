<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use InvalidArgumentException;
use kodanAPPS\DB\TenantAwarePDO;

final class TenantOverrideManager
{
    private TenantAwarePDO $pdo;

    public function __construct(TenantAwarePDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function setOverride(int $tenantId, string $module, string $metric, int $customValue): void
    {
        if ($customValue < -1) {
            throw new InvalidArgumentException('custom_value debe ser >= -1');
        }

        $stmt = $this->pdo->prepare(
            "INSERT INTO tenant_limit_overrides (tenant_id, module, metric, custom_value)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE custom_value = VALUES(custom_value)"
        );
        $stmt->execute([$tenantId, $module, $metric, $customValue]);
    }

    public function clearOverride(int $tenantId, string $module, string $metric): void
    {
        $stmt = $this->pdo->prepare(
            "DELETE FROM tenant_limit_overrides WHERE tenant_id = ? AND module = ? AND metric = ?"
        );
        $stmt->execute([$tenantId, $module, $metric]);
    }

    /** @return array<int, array<string, mixed>> */
    public function getOverrides(int $tenantId): array
    {
        return $this->pdo->query(
            "SELECT module, metric, custom_value, updated_at
             FROM tenant_limit_overrides
             WHERE tenant_id = {$tenantId}"
        )->fetchAll();
    }
}
