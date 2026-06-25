<?php

declare(strict_types=1);

namespace kodanAPPS\Services\Recounters;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\Services\RecountStrategyInterface;

class CrmUsageRecounter implements RecountStrategyInterface
{
    public function getModule(): string
    {
        return 'crm';
    }

    public function recount(int $tenantId, TenantAwarePDO $pdo): void
    {
        $stmtNeg = $pdo->prepare(
            "UPDATE tenant_plan_usage u
             JOIN (SELECT COUNT(*) AS cnt FROM opportunities WHERE tenant_id = ? AND deleted_at IS NULL) actual
             SET u.current_value = actual.cnt
             WHERE u.tenant_id = ? AND u.module = 'crm' AND u.metric = 'negotiations_max'"
        );
        $stmtNeg->execute([$tenantId, $tenantId]);

        $stmtAcc = $pdo->prepare(
            "UPDATE tenant_plan_usage u
             JOIN (SELECT COUNT(*) AS cnt FROM accounts WHERE tenant_id = ? AND deleted_at IS NULL) actual
             SET u.current_value = actual.cnt
             WHERE u.tenant_id = ? AND u.module = 'crm' AND u.metric = 'accounts_max'"
        );
        $stmtAcc->execute([$tenantId, $tenantId]);

        $stmtCon = $pdo->prepare(
            "UPDATE tenant_plan_usage u
             JOIN (SELECT COUNT(*) AS cnt FROM contacts WHERE tenant_id = ? AND deleted_at IS NULL) actual
             SET u.current_value = actual.cnt
             WHERE u.tenant_id = ? AND u.module = 'crm' AND u.metric = 'contacts_max'"
        );
        $stmtCon->execute([$tenantId, $tenantId]);

        $stmtUsr = $pdo->prepare(
            "UPDATE tenant_plan_usage u
             JOIN (SELECT COUNT(*) AS cnt FROM users WHERE tenant_id = ? AND is_active = 1) actual
             SET u.current_value = actual.cnt
             WHERE u.tenant_id = ? AND u.module = 'crm' AND u.metric = 'users_max'"
        );
        $stmtUsr->execute([$tenantId, $tenantId]);
    }
}
