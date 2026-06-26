<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;

final class DashboardController
{
    private TenantAwarePDO $pdo;

    public function __construct(TenantAwarePDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * @return array{avgDaysToClose: float, avgStages: int, conversionRate: float, trend: int}
     */
    public function getSalesVelocity(?int $pipelineId): array
    {
        $tenantId = TenantContext::getTenantId();
        $pipelineFilter = $pipelineId ? 'AND ps.pipeline_id = :pipeline_id' : '';

        $won = $this->pdo->prepare("
            SELECT o.created_at, o.close_date
            FROM CRM_opportunities o
            JOIN CRM_pipeline_stages ps ON ps.id = o.pipeline_stage_id
            WHERE o.tenant_id = :tenant_id AND ps.is_won_stage = 1
            {$pipelineFilter}
        ");
        $params = [':tenant_id' => $tenantId];
        if ($pipelineId) $params[':pipeline_id'] = $pipelineId;
        $won->execute($params);
        $wonRows = $won->fetchAll();

        $totalDays = 0;
        $wonCount = count($wonRows);
        foreach ($wonRows as $row) {
            $created = $row['created_at'];
            $closed = $row['close_date'] ?? null;
            if ($created && $closed) {
                $totalDays += (strtotime($closed) - strtotime($created)) / 86400;
            }
        }
        $avgDaysToClose = $wonCount > 0 ? round($totalDays / $wonCount, 1) : 0;

        $wonLost = $this->pdo->prepare("
            SELECT
                SUM(CASE WHEN ps.is_won_stage = 1 THEN 1 ELSE 0 END) AS won,
                SUM(CASE WHEN ps.is_lost_stage = 1 THEN 1 ELSE 0 END) AS lost
            FROM CRM_opportunities o
            JOIN CRM_pipeline_stages ps ON ps.id = o.pipeline_stage_id
            WHERE o.tenant_id = :tenant_id AND (ps.is_won_stage = 1 OR ps.is_lost_stage = 1)
            {$pipelineFilter}
        ");
        $wonLost->execute($params);
        $wl = $wonLost->fetch();
        $totalClosed = (int)($wl['won'] ?? 0) + (int)($wl['lost'] ?? 0);
        $conversionRate = $totalClosed > 0 ? round(((int)($wl['won'] ?? 0) / $totalClosed) * 100, 1) : 0;

        return [
            'avgDaysToClose' => $avgDaysToClose,
            'avgStages' => 0,
            'conversionRate' => $conversionRate,
            'trend' => 0,
        ];
    }

    /**
     * @return array<int, array{type: string, message: string, userName: string, timestamp: string, entityType: string, entityId: int}>
     */
    public function getRecentActivity(?int $pipelineId): array
    {
        $tenantId = TenantContext::getTenantId();
        $params = [':tenant_id' => $tenantId];

        $pipelineJoin = '';
        if ($pipelineId) {
            $pipelineJoin = 'AND (o.pipeline_stage_id IN (SELECT id FROM CRM_pipeline_stages WHERE pipeline_id = :pipeline_id))';
            $params[':pipeline_id'] = $pipelineId;
        }

        $sql = "
            (SELECT 'stage_change' AS type,
                    CONCAT('Oportunidad movida a: ', ps.name) AS message,
                    u.display_name AS user_name,
                    o.updated_at AS created_at,
                    'crm_opportunity' AS entity_type,
                    o.id AS entity_id
             FROM CRM_opportunities o
             JOIN CRM_pipeline_stages ps ON ps.id = o.pipeline_stage_id
             LEFT JOIN users u ON u.id = o.owner_user_id
             WHERE o.tenant_id = :tenant_id {$pipelineJoin})
            UNION ALL
            (SELECT CONCAT('notification_', n.type) AS type,
                    n.message AS message,
                    COALESCE(u.display_name, 'Sistema') AS user_name,
                    n.created_at,
                    COALESCE(n.entity_type, '') AS entity_type,
                    COALESCE(n.entity_id, 0) AS entity_id
             FROM notifications n
             LEFT JOIN users u ON u.id = n.user_id
             WHERE n.tenant_id = :tenant_id)
            ORDER BY created_at DESC
            LIMIT 20
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        return array_map(fn($r) => [
            'type' => $r['type'],
            'message' => $r['message'],
            'userName' => $r['user_name'],
            'timestamp' => $r['created_at'],
            'entityType' => $r['entity_type'],
            'entityId' => (int)$r['entity_id'],
        ], $rows);
    }

    /**
     * @return array<int, array{id: int, name: string, avatar: string|null, won: int, lost: int, winRate: float, totalValue: float}>
     */
    public function getWinRateByUser(?int $pipelineId): array
    {
        $tenantId = TenantContext::getTenantId();
        $pipelineFilter = $pipelineId ? 'AND ps.pipeline_id = :pipeline_id' : '';

        $sql = "
            SELECT
                u.id,
                u.display_name AS name,
                uc.avatar_url AS avatar,
                SUM(CASE WHEN ps.is_won_stage = 1 THEN 1 ELSE 0 END) AS won,
                SUM(CASE WHEN ps.is_lost_stage = 1 THEN 1 ELSE 0 END) AS lost,
                COALESCE(SUM(CASE WHEN ps.is_won_stage = 1 THEN o.value ELSE 0 END), 0) AS total_value
            FROM CRM_opportunities o
            JOIN CRM_pipeline_stages ps ON ps.id = o.pipeline_stage_id
            LEFT JOIN users u ON u.id = o.owner_user_id
            LEFT JOIN user_configs uc ON uc.user_id = u.id AND uc.app_id = 'crm'
            WHERE o.tenant_id = :tenant_id AND (ps.is_won_stage = 1 OR ps.is_lost_stage = 1)
            {$pipelineFilter}
            GROUP BY u.id, u.display_name, uc.avatar_url
            ORDER BY total_value DESC
        ";

        $params = [':tenant_id' => $tenantId];
        if ($pipelineId) $params[':pipeline_id'] = $pipelineId;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        return array_map(fn($r) => [
            'id' => (int)$r['id'],
            'name' => $r['name'] ?? 'Sin asignar',
            'avatar' => $r['avatar'] ?? null,
            'won' => (int)($r['won'] ?? 0),
            'lost' => (int)($r['lost'] ?? 0),
            'winRate' => (int)($r['won'] ?? 0) + (int)($r['lost'] ?? 0) > 0
                ? round(((int)($r['won'] ?? 0) / ((int)($r['won'] ?? 0) + (int)($r['lost'] ?? 0))) * 100, 1)
                : 0,
            'totalValue' => (float)($r['total_value'] ?? 0),
        ], $rows);
    }

    /**
     * @return array<int, array{id: int, name: string, totalValue: float, activeDeals: int, wonDeals: int, winRate: float, avgCycleDays: float, color: string}>
     */
    public function getPipelineComparison(): array
    {
        $tenantId = TenantContext::getTenantId();

        $sql = "
            SELECT
                p.id,
                p.name,
                COALESCE(SUM(o.value), 0) AS total_value,
                COUNT(o.id) AS total_deals,
                SUM(CASE WHEN ps.is_won_stage = 0 AND ps.is_lost_stage = 0 THEN 1 ELSE 0 END) AS active_deals,
                SUM(CASE WHEN ps.is_won_stage = 1 THEN 1 ELSE 0 END) AS won_deals,
                SUM(CASE WHEN ps.is_lost_stage = 1 THEN 1 ELSE 0 END) AS lost_deals,
                COALESCE((
                    SELECT AVG(DATEDIFF(oi.close_date, oi.created_at))
                    FROM CRM_opportunities oi
                    JOIN CRM_pipeline_stages psi ON psi.id = oi.pipeline_stage_id
                    WHERE psi.pipeline_id = p.id AND psi.is_won_stage = 1
                      AND oi.close_date IS NOT NULL AND oi.tenant_id = :tenant_id
                ), 0) AS avg_cycle_days
            FROM CRM_pipelines p
            LEFT JOIN CRM_opportunities o ON o.pipeline_stage_id IN (
                SELECT ps2.id FROM CRM_pipeline_stages ps2 WHERE ps2.pipeline_id = p.id
            ) AND o.tenant_id = :tenant_id
            LEFT JOIN CRM_pipeline_stages ps ON ps.id = o.pipeline_stage_id
            WHERE p.tenant_id = :tenant_id
            GROUP BY p.id, p.name
            ORDER BY p.name ASC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':tenant_id' => $tenantId]);
        $rows = $stmt->fetchAll();

        $colors = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#F97316'];

        return array_map(fn($r, $i) => [
            'id' => (int)$r['id'],
            'name' => $r['name'],
            'totalValue' => (float)$r['total_value'],
            'activeDeals' => (int)($r['active_deals'] ?? 0),
            'wonDeals' => (int)($r['won_deals'] ?? 0),
            'winRate' => (int)($r['won_deals'] ?? 0) + (int)($r['lost_deals'] ?? 0) > 0
                ? round(((int)($r['won_deals'] ?? 0) / ((int)($r['won_deals'] ?? 0) + (int)($r['lost_deals'] ?? 0))) * 100, 1)
                : 0,
            'avgCycleDays' => round((float)($r['avg_cycle_days'] ?? 0), 1),
            'color' => $colors[$i % count($colors)],
        ], $rows, array_keys($rows));
    }
}
