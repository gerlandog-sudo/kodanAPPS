<?php

declare(strict_types=1);

namespace kodanAPPS\Services\Recounters;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\Services\RecountStrategyInterface;

class TrackerUsageRecounter implements RecountStrategyInterface
{
    public function getModule(): string
    {
        return 'tracker';
    }

    public function recount(int $tenantId, TenantAwarePDO $pdo): void
    {
        $stmtProj = $pdo->prepare(
            "UPDATE tenant_plan_usage u
             JOIN (SELECT COUNT(*) AS cnt FROM projects WHERE tenant_id = ? AND deleted_at IS NULL) actual
             SET u.current_value = actual.cnt
             WHERE u.tenant_id = ? AND u.module = 'tracker' AND u.metric = 'projects_max'"
        );
        $stmtProj->execute([$tenantId, $tenantId]);

        $stmtUsr = $pdo->prepare(
            "UPDATE tenant_plan_usage u
             JOIN (SELECT COUNT(*) AS cnt FROM users WHERE tenant_id = ? AND is_active = 1) actual
             SET u.current_value = actual.cnt
             WHERE u.tenant_id = ? AND u.module = 'tracker' AND u.metric = 'users_max'"
        );
        $stmtUsr->execute([$tenantId, $tenantId]);
    }
}
