<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use RuntimeException;

/**
 * @extends BaseRepository<array<string, mixed>>
 */
final class ProjectTaskRepository extends BaseRepository
{
    protected const TABLE = 'TRACKER_project_tasks';

    /**
     * @return array{module: string, metric: string}
     */
    protected function getLimitConfig(): array
    {
        return ['module' => 'tracker', 'metric' => 'tasks_max'];
    }

    /**
     * @param int $projectId
     * @return array<int, array<string, mixed>>
     */
    public function findByProject(int $projectId): array
    {
        return $this->findAll(
            self::TABLE,
            't.*, tt.name AS task_type_name, tt.color_hex AS task_type_color, tt.icon AS task_type_icon, u.display_name AS assigned_name',
            't.tenant_id = :tenant_id AND t.project_id = :project_id',
            [':tenant_id' => 0, ':project_id' => $projectId],
            't.position ASC',
            0,
            't LEFT JOIN task_types tt ON tt.id = t.task_type_id LEFT JOIN users u ON u.id = t.assigned_to'
        );
    }

    /**
     * Obtiene todas las tareas de todos los proyectos del tenant.
     *
     * @return array<int, array<string, mixed>>
     */
    public function findAllByTenant(): array
    {
        return $this->findAll(
            self::TABLE,
            't.*, tt.name AS task_type_name, tt.color_hex AS task_type_color, tt.icon AS task_type_icon, u.display_name AS assigned_name, p.name AS project_name',
            't.tenant_id = :tenant_id',
            [':tenant_id' => 0],
            't.position ASC',
            0,
            't LEFT JOIN task_types tt ON tt.id = t.task_type_id LEFT JOIN users u ON u.id = t.assigned_to LEFT JOIN TRACKER_projects p ON p.id = t.project_id'
        );
    }

    public function moveTask(int $taskId, string $toStage, int $position): int
    {
        $task = $this->findById($taskId);
        if ($task === null) {
            throw new RuntimeException('Tarea no encontrada', 404);
        }

        if ($task['kanban_status'] === 'archived') {
            throw new RuntimeException('Las tareas archivadas no se pueden mover ni modificar', 400);
        }

        if ($toStage === 'done') {
            $userId = isset($task['assigned_to']) && (int)$task['assigned_to'] > 0
                ? (int)$task['assigned_to']
                : \kodanAPPS\DB\TenantContext::getUserId();

            $hourlyCost = 0.0;
            $tenantId = \kodanAPPS\DB\TenantContext::getTenantId();
            $stmt = $this->pdo->prepare("SELECT hourly_cost FROM TRACKER_user_profiles WHERE user_id = :uid AND tenant_id = :tid");
            $stmt->execute([':uid' => $userId, ':tid' => $tenantId]);
            $profile = $stmt->fetch();
            if ($profile) {
                $hourlyCost = (float)$profile['hourly_cost'];
            }

            $durationMinutes = isset($task['estimated_hours']) && (float)$task['estimated_hours'] > 0
                ? (int)((float)$task['estimated_hours'] * 60)
                : 60; // default 1 hour

            $calculatedCost = round(($hourlyCost / 60) * $durationMinutes, 2);

            $timeEntryData = [
                'project_id' => $task['project_id'],
                'task_id' => $taskId,
                'user_id' => $userId,
                'date' => date('Y-m-d'),
                'duration_minutes' => $durationMinutes,
                'description' => 'Registro automático: Tarea finalizada "' . $task['title'] . '"',
                'hourly_cost' => $hourlyCost,
                'calculated_cost' => $calculatedCost,
                'approval_status' => 'submitted',
                'submitted_at' => date('Y-m-d H:i:s'),
                'created_at' => date('Y-m-d H:i:s'),
                'tenant_id' => $tenantId,
            ];

            $cols = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($timeEntryData)));
            $placeholders = ':' . implode(', :', array_keys($timeEntryData));
            $sql = "INSERT INTO `TRACKER_time_entries` ({$cols}) VALUES ({$placeholders})";
            $insStmt = $this->pdo->prepare($sql);
            $insStmt->execute($timeEntryData);

            // Update daily summary
            $sqlSum = "SELECT SUM(duration_minutes) AS total_minutes, SUM(calculated_cost) AS total_cost
                       FROM `TRACKER_time_entries`
                       WHERE user_id = :uid AND project_id = :pid AND date = :d
                         AND approval_status != 'rejected'";
            $sumStmt = $this->pdo->prepare($sqlSum);
            $sumStmt->execute([':uid' => $userId, ':pid' => $task['project_id'], ':d' => date('Y-m-d')]);
            $sumRow = $sumStmt->fetch();
            $totMins = (int)($sumRow['total_minutes'] ?? 0);
            $totCost = (float)($sumRow['total_cost'] ?? 0);

            $upsertSql = "INSERT INTO `TRACKER_summary_daily` (tenant_id, user_id, project_id, date, total_minutes, total_cost, created_at, updated_at)
                          VALUES (:tid, :uid, :pid, :d, :tm, :tc, :cat, :uat)
                          ON DUPLICATE KEY UPDATE
                            total_minutes = VALUES(total_minutes),
                            total_cost = VALUES(total_cost),
                            updated_at = VALUES(updated_at)";
            $upsStmt = $this->pdo->prepare($upsertSql);
            $nowStr = date('Y-m-d H:i:s');
            $upsStmt->execute([
                ':tid' => $tenantId,
                ':uid' => $userId,
                ':pid' => $task['project_id'],
                ':d' => date('Y-m-d'),
                ':tm' => $totMins,
                ':tc' => $totCost,
                ':cat' => $nowStr,
                ':uat' => $nowStr,
            ]);

            $toStage = 'archived';
        }

        return $this->update(self::TABLE, [
            'kanban_status' => $toStage,
            'position' => $position,
        ], 'id = :id', [':id' => $taskId]);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function createTask(array $data): int
    {
        $maxPos = $this->rawSelect(
            "SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM `" . self::TABLE . "` WHERE project_id = :pid AND kanban_status = :ks",
            [':pid' => $data['project_id'], ':ks' => $data['kanban_status']]
        );
        $data['position'] = $maxPos[0]['next_pos'] ?? 0;

        return $this->create(self::TABLE, $data);
    }

    public function deleteTask(int $id): int
    {
        return $this->delete(self::TABLE, 'id = :id', [':id' => $id]);
    }

    /**
     * @param int $projectId
     * @return array<string, int>
     */
    public function getBoardColumns(int $projectId): array
    {
        $sql = "SELECT kanban_status, COUNT(*) AS count FROM `" . self::TABLE . "` WHERE project_id = :pid GROUP BY kanban_status";
        $results = $this->rawSelect($sql, [':pid' => $projectId]);
        $counts = [];
        foreach ($results as $row) {
            $counts[$row['kanban_status']] = (int)$row['count'];
        }
        return $counts;
    }

    /**
     * @param string $table
     * @param string $columns
     * @param string $where
     * @param array<string, mixed> $params
     * @param string $orderBy
     * @param int $limit
     * @param string|null $joins
     * @return array<int, array<string, mixed>>
     */
    public function findAll(string $table = self::TABLE, string $columns = '*', string $where = '', array $params = [], string $orderBy = '', int $limit = 0, ?string $joins = null): array
    {
        $sql = "SELECT {$columns} FROM `{$table}`";
        if ($joins !== null) {
            $sql .= " {$joins}";
        }
        if ($where !== '') {
            $sql .= " WHERE {$where}";
        }
        if ($orderBy !== '') {
            $sql .= " ORDER BY {$orderBy}";
        }
        if ($limit > 0) {
            $sql .= " LIMIT {$limit}";
        }
        $this->applyTenantScope($sql, $params);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
