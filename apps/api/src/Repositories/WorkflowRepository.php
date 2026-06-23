<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantContext;

final class WorkflowRepository extends BaseRepository
{
    protected const TABLE = 'workflow_rules';

    public function listActiveRulesByTrigger(string $entity, string $event): array
    {
        return $this->findAll(
            self::TABLE,
            '*',
            "trigger_entity = :trigger_entity AND trigger_event = :trigger_event AND is_active = 1",
            [':trigger_entity' => $entity, ':trigger_event' => $event],
            'execution_order ASC'
        );
    }

    public function createRule(array $data): int
    {
        return $this->create(self::TABLE, $data);
    }

    public function updateRule(int $id, array $data): int
    {
        return $this->update(self::TABLE, $data, 'id = :id', [':id' => $id]);
    }

    public function deleteRule(int $id): int
    {
        return $this->delete(self::TABLE, 'id = :id', [':id' => $id]);
    }

    public function logExecution(array $data): int
    {
        $tenantId = TenantContext::getTenantId();
        $data['tenant_id'] = $tenantId;
        $data['executed_at'] = date('Y-m-d H:i:s');

        $columns = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($data)));
        $placeholders = ':' . implode(', :', array_keys($data));
        $sql = "/* BYPASS_TENANT_SCOPE */ INSERT INTO `workflow_executions` ({$columns}) VALUES ({$placeholders})";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($data);
        return (int)$this->pdo->lastInsertId();
    }

    public function getExecutionHistory(int $ruleId, int $limit = 50): array
    {
        $sql = "/* BYPASS_TENANT_SCOPE */
                SELECT we.*, wr.name AS rule_name
                FROM workflow_executions we
                JOIN workflow_rules wr ON wr.id = we.rule_id
                WHERE we.rule_id = :rule_id AND we.tenant_id = :tenant_id
                ORDER BY we.executed_at DESC
                LIMIT " . (int)$limit;
        return $this->rawSelect($sql, [':rule_id' => $ruleId]);
    }

    public function countActiveRules(): int
    {
        $rows = $this->rawSelect(
            "SELECT COUNT(*) AS cnt FROM `workflow_rules` WHERE is_active = 1"
        );
        return (int)($rows[0]['cnt'] ?? 0);
    }

    public function listAll(): array
    {
        return $this->findAll(self::TABLE, '*', '', [], 'execution_order ASC, name ASC');
    }

    public function getStats(): array
    {
        $tenantId = TenantContext::getTenantId();

        // Rule counts
        $rules = $this->rawSelect(
            "SELECT COUNT(*) AS total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive FROM `workflow_rules`"
        );
        $ruleStats = $rules[0] ?? ['total' => 0, 'active' => 0, 'inactive' => 0];

        // Execution counts
        $execRows = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN DATE(executed_at) = CURDATE() THEN 1 ELSE 0 END) AS today,
                SUM(CASE WHEN YEARWEEK(executed_at, 1) = YEARWEEK(CURDATE(), 1) THEN 1 ELSE 0 END) AS this_week
            FROM `workflow_executions`
            WHERE tenant_id = :tenant_id",
            [':tenant_id' => $tenantId]
        );

        // Executions by status
        $byStatus = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
            SELECT status, COUNT(*) AS count
            FROM `workflow_executions`
            WHERE tenant_id = :tenant_id
            GROUP BY status",
            [':tenant_id' => $tenantId]
        );

        // Executions by day (last 30)
        $byDay = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
            SELECT DATE(executed_at) AS date, COUNT(*) AS count
            FROM `workflow_executions`
            WHERE tenant_id = :tenant_id AND executed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(executed_at)
            ORDER BY date ASC",
            [':tenant_id' => $tenantId]
        );

        // Top events
        $topEvents = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
            SELECT wr.trigger_event, COUNT(*) AS count
            FROM `workflow_executions` we
            JOIN `workflow_rules` wr ON wr.id = we.rule_id
            WHERE we.tenant_id = :tenant_id
            GROUP BY wr.trigger_event
            ORDER BY count DESC
            LIMIT 10",
            [':tenant_id' => $tenantId]
        );

        // Top rules
        $topRules = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
            SELECT wr.id, wr.name, COUNT(*) AS execution_count
            FROM `workflow_executions` we
            JOIN `workflow_rules` wr ON wr.id = we.rule_id
            WHERE we.tenant_id = :tenant_id
            GROUP BY wr.id, wr.name
            ORDER BY execution_count DESC
            LIMIT 10",
            [':tenant_id' => $tenantId]
        );

        // Recent executions
        $recent = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
            SELECT we.*, wr.name AS rule_name
            FROM `workflow_executions` we
            JOIN `workflow_rules` wr ON wr.id = we.rule_id
            WHERE we.tenant_id = :tenant_id
            ORDER BY we.executed_at DESC
            LIMIT 10",
            [':tenant_id' => $tenantId]
        );

        // Decode JSON fields in recent executions
        foreach ($recent as &$ex) {
            if (isset($ex['executed_actions']) && is_string($ex['executed_actions'])) {
                $ex['executed_actions'] = json_decode($ex['executed_actions'], true);
            }
        }
        unset($ex);

        return [
            'rules' => [
                'total' => (int)$ruleStats['total'],
                'active' => (int)$ruleStats['active'],
                'inactive' => (int)$ruleStats['inactive'],
            ],
            'executions' => [
                'total' => (int)($execRows[0]['total'] ?? 0),
                'today' => (int)($execRows[0]['today'] ?? 0),
                'this_week' => (int)($execRows[0]['this_week'] ?? 0),
            ],
            'by_status' => array_map(fn($r) => ['status' => $r['status'], 'count' => (int)$r['count']], $byStatus),
            'by_day' => array_map(fn($r) => ['date' => $r['date'], 'count' => (int)$r['count']], $byDay),
            'top_events' => array_map(fn($r) => ['event' => $r['trigger_event'], 'count' => (int)$r['count']], $topEvents),
            'top_rules' => array_map(fn($r) => ['id' => (int)$r['id'], 'name' => $r['name'], 'execution_count' => (int)$r['execution_count']], $topRules),
            'recent_executions' => $recent,
        ];
    }
}
