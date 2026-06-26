<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

/**
 * @extends BaseRepository<array<string, mixed>>
 */
final class SummaryDailyRepository extends BaseRepository
{
    protected const TABLE = 'TRACKER_summary_daily';

    protected function getLimitConfig(): ?array
    {
        return null;
    }

    public function upsert(int $userId, int $projectId, string $date, int $totalMinutes, float $cost): void
    {
        $existing = $this->findOne(self::TABLE,
            'user_id = :user_id AND project_id = :project_id AND date = :date',
            [':user_id' => $userId, ':project_id' => $projectId, ':date' => $date]
        );

        if ($existing !== null) {
            $this->update(self::TABLE, [
                'total_minutes' => $totalMinutes,
                'calculated_cost' => $cost,
            ], 'id = :id', [':id' => $existing['id']]);
        } else {
            $this->create(self::TABLE, [
                'user_id' => $userId,
                'project_id' => $projectId,
                'date' => $date,
                'total_minutes' => $totalMinutes,
                'calculated_cost' => $cost,
            ]);
        }
    }

    public function getByUserAndPeriod(int $userId, string $dateFrom, string $dateTo): array
    {
        return $this->findAll(
            self::TABLE,
            'sd.*, p.name AS project_name',
            'sd.user_id = :user_id AND sd.date >= :date_from AND sd.date <= :date_to',
            [':user_id' => $userId, ':date_from' => $dateFrom, ':date_to' => $dateTo],
            'sd.date ASC',
            0,
            'sd LEFT JOIN projects p ON p.id = sd.project_id'
        );
    }

    public function getByProjectAndPeriod(int $projectId, string $dateFrom, string $dateTo): array
    {
        return $this->findAll(
            self::TABLE,
            'sd.*, u.display_name AS user_name',
            'sd.project_id = :project_id AND sd.date >= :date_from AND sd.date <= :date_to',
            [':project_id' => $projectId, ':date_from' => $dateFrom, ':date_to' => $dateTo],
            'sd.date ASC',
            0,
            'sd LEFT JOIN users u ON u.id = sd.user_id'
        );
    }

    public function getWeeklyTotalsByUser(string $dateFrom, string $dateTo): array
    {
        $sql = "SELECT sd.user_id, u.display_name AS user_name, SUM(sd.total_minutes) AS total_minutes, SUM(sd.calculated_cost) AS total_cost
                FROM `" . self::TABLE . "` sd
                JOIN users u ON u.id = sd.user_id
                WHERE sd.tenant_id = :tenant_id AND sd.date >= :date_from AND sd.date <= :date_to
                GROUP BY sd.user_id, u.display_name
                ORDER BY total_minutes DESC";
        return $this->rawSelect($sql, [
            ':tenant_id' => \kodanAPPS\DB\TenantContext::getTenantId(),
            ':date_from' => $dateFrom,
            ':date_to' => $dateTo,
        ]);
    }

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
