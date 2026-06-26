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
            't.project_id = :project_id',
            [':project_id' => $projectId],
            't.position ASC',
            0,
            't LEFT JOIN task_types tt ON tt.id = t.task_type_id LEFT JOIN users u ON u.id = t.assigned_to'
        );
    }

    public function moveTask(int $taskId, string $toStage, int $position): int
    {
        $task = $this->findById($taskId);
        if ($task === null) {
            throw new RuntimeException('Tarea no encontrada', 404);
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
