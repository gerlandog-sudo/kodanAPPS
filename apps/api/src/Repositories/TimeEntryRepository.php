<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use RuntimeException;

/**
 * @extends BaseRepository<array<string, mixed>>
 */
final class TimeEntryRepository extends BaseRepository
{
    protected const TABLE = 'TRACKER_time_entries';

    protected function getLimitConfig(): ?array
    {
        return ['module' => 'tracker', 'metric' => 'time_entries_max'];
    }

    public function createEntry(array $data): int
    {
        $data['approval_status'] = 'draft';
        return $this->create(self::TABLE, $data);
    }

    public function updateEntry(int $id, array $data): int
    {
        $entry = $this->findById($id);
        if ($entry === null) {
            throw new RuntimeException('Time entry no encontrada', 404);
        }
        if ($entry['approval_status'] !== 'draft') {
            throw new RuntimeException('No se puede modificar una entry ya enviada a aprobación', 403);
        }
        return $this->update(self::TABLE, $data, 'id = :id', [':id' => $id]);
    }

    public function deleteEntry(int $id): int
    {
        return $this->delete(self::TABLE, 'id = :id', [':id' => $id]);
    }

    public function submit(int $id): int
    {
        $entry = $this->findById($id);
        if ($entry === null) {
            throw new RuntimeException('Time entry no encontrada', 404);
        }
        return $this->update(self::TABLE, [
            'approval_status' => 'submitted',
            'submitted_at' => date('Y-m-d H:i:s'),
        ], 'id = :id', [':id' => $id]);
    }

    public function approve(int $id, int $approvedBy): int
    {
        $entry = $this->findById($id);
        if ($entry === null) {
            throw new RuntimeException('Time entry no encontrada', 404);
        }
        if ($entry['approval_status'] !== 'submitted') {
            throw new RuntimeException('Solo se pueden aprobar entries en estado submitted', 400);
        }
        return $this->update(self::TABLE, [
            'approval_status' => 'approved',
            'approved_by' => $approvedBy,
            'approved_at' => date('Y-m-d H:i:s'),
        ], 'id = :id', [':id' => $id]);
    }

    public function reject(int $id, string $reason): int
    {
        $entry = $this->findById($id);
        if ($entry === null) {
            throw new RuntimeException('Time entry no encontrada', 404);
        }
        if ($entry['approval_status'] !== 'submitted') {
            throw new RuntimeException('Solo se pueden rechazar entries en estado submitted', 400);
        }
        return $this->update(self::TABLE, [
            'approval_status' => 'rejected',
            'rejected_reason' => $reason,
        ], 'id = :id', [':id' => $id]);
    }

    public function findFiltered(array $filters, int $page = 1, int $perPage = 50): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['project_id'])) {
            $where[] = 'te.project_id = :project_id';
            $params[':project_id'] = $filters['project_id'];
        }
        if (!empty($filters['user_id'])) {
            $where[] = 'te.user_id = :user_id';
            $params[':user_id'] = $filters['user_id'];
        }
        if (!empty($filters['date_from'])) {
            $where[] = 'te.date >= :date_from';
            $params[':date_from'] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = 'te.date <= :date_to';
            $params[':date_to'] = $filters['date_to'];
        }
        if (!empty($filters['approval_status'])) {
            $where[] = 'te.approval_status = :approval_status';
            $params[':approval_status'] = $filters['approval_status'];
        }

        $whereSql = !empty($where) ? ' AND ' . implode(' AND ', $where) : '';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT te.*, p.name AS project_name, u.display_name AS user_name
                FROM `" . self::TABLE . "` te
                JOIN projects p ON p.id = te.project_id
                LEFT JOIN users u ON u.id = te.user_id
                WHERE te.tenant_id = :tenant_id{$whereSql}
                ORDER BY te.date DESC, te.created_at DESC
                LIMIT {$perPage} OFFSET {$offset}";

        $params[':tenant_id'] = \kodanAPPS\DB\TenantContext::getTenantId();
        return $this->rawSelect($sql, $params);
    }

    public function countFiltered(array $filters): int
    {
        $where = [];
        $params = [];

        if (!empty($filters['project_id'])) {
            $where[] = 'te.project_id = :project_id';
            $params[':project_id'] = $filters['project_id'];
        }
        if (!empty($filters['user_id'])) {
            $where[] = 'te.user_id = :user_id';
            $params[':user_id'] = $filters['user_id'];
        }
        if (!empty($filters['date_from'])) {
            $where[] = 'te.date >= :date_from';
            $params[':date_from'] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = 'te.date <= :date_to';
            $params[':date_to'] = $filters['date_to'];
        }
        if (!empty($filters['approval_status'])) {
            $where[] = 'te.approval_status = :approval_status';
            $params[':approval_status'] = $filters['approval_status'];
        }

        $whereSql = !empty($where) ? ' AND ' . implode(' AND ', $where) : '';
        $sql = "SELECT COUNT(*) FROM `" . self::TABLE . "` te WHERE te.tenant_id = :tenant_id{$whereSql}";
        $params[':tenant_id'] = \kodanAPPS\DB\TenantContext::getTenantId();

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    }

    public function getPendingApprovals(int $approverId): array
    {
        $sql = "SELECT te.*, p.name AS project_name, u.display_name AS user_name
                FROM `" . self::TABLE . "` te
                JOIN projects p ON p.id = te.project_id
                JOIN users u ON u.id = te.user_id
                WHERE te.tenant_id = :tenant_id AND te.approval_status = 'submitted'
                ORDER BY te.date ASC, te.created_at ASC";
        return $this->rawSelect($sql, [':tenant_id' => \kodanAPPS\DB\TenantContext::getTenantId()]);
    }

    public function bulkApprove(array $ids, int $approvedBy): int
    {
        $affected = 0;
        foreach ($ids as $id) {
            try {
                $this->approve((int)$id, $approvedBy);
                $affected++;
            } catch (RuntimeException $e) {
                continue;
            }
        }
        return $affected;
    }
}
