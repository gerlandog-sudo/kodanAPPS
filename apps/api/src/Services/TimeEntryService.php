<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\Repositories\TimeEntryRepository;
use kodanAPPS\Repositories\SummaryDailyRepository;
use kodanAPPS\DTOs\CreateTimeEntryDTO;
use kodanAPPS\DTOs\UpdateTimeEntryDTO;
use kodanAPPS\DTOs\TimeEntryFilterDTO;
use kodanAPPS\DB\TenantContext;
use RuntimeException;

final class TimeEntryService
{
    public function __construct(
        private TimeEntryRepository $entryRepo,
        private SummaryDailyRepository $summaryRepo,
    ) {}

    /**
     * @param CreateTimeEntryDTO $dto
     * @return array<string, mixed>
     */
    public function create(CreateTimeEntryDTO $dto): array
    {
        $data = $dto->toArray();

        // Retrieve user's hourly cost from profile if not provided
        if (($data['hourly_cost'] ?? 0.0) === 0.0) {
            $res = $this->entryRepo->rawSelect(
                "SELECT hourly_cost FROM TRACKER_user_profiles WHERE user_id = :uid",
                [':uid' => $dto->userId]
            );
            if (!empty($res)) {
                $hourlyCost = (float)$res[0]['hourly_cost'];
                $data['hourly_cost'] = $hourlyCost;
                $data['calculated_cost'] = round(($hourlyCost / 60) * $dto->durationMinutes, 2);
            }
        }

        $id = $this->entryRepo->createEntry($data);
        $entry = $this->entryRepo->findById($id);

        $this->updateSummary($dto->userId, $dto->projectId, $dto->date);

        return $entry ?? [];
    }

    /**
     * @param int $id
     * @param UpdateTimeEntryDTO $dto
     * @param int $authUserId
     * @return array<string, mixed>
     */
    public function update(int $id, UpdateTimeEntryDTO $dto, int $authUserId): array
    {
        $entry = $this->entryRepo->findById($id);
        if ($entry === null) {
            throw new RuntimeException('Time entry no encontrada', 404);
        }
        if ((int)$entry['user_id'] !== $authUserId) {
            $isAdmin = TenantContext::hasRole('admin');
            if (!$isAdmin) {
                throw new RuntimeException('No tienes permiso para modificar esta entry', 403);
            }
        }

        $data = $dto->toArray();
        $this->entryRepo->updateEntry($id, $data);

        if (isset($data['duration_minutes']) || isset($data['project_id'])) {
            $this->updateSummary(
                (int)$entry['user_id'],
                (int)($data['project_id'] ?? $entry['project_id']),
                $data['date'] ?? $entry['date']
            );
        }

        return $this->entryRepo->findById($id) ?? [];
    }

    public function delete(int $id, int $authUserId): void
    {
        $entry = $this->entryRepo->findById($id);
        if ($entry === null) {
            throw new RuntimeException('Time entry no encontrada', 404);
        }
        if ((int)$entry['user_id'] !== $authUserId) {
            throw new RuntimeException('No tienes permiso para eliminar esta entry', 403);
        }
        $this->entryRepo->deleteEntry($id);

        $this->updateSummary(
            (int)$entry['user_id'],
            (int)$entry['project_id'],
            $entry['date']
        );
    }

    /**
     * @param int $id
     * @param int $authUserId
     * @return array<string, mixed>
     */
    public function submit(int $id, int $authUserId): array
    {
        $entry = $this->entryRepo->findById($id);
        if ($entry === null) {
            throw new RuntimeException('Time entry no encontrada', 404);
        }
        if ((int)$entry['user_id'] !== $authUserId) {
            throw new RuntimeException('Solo el propietario puede enviar a aprobación', 403);
        }
        $this->entryRepo->submit($id);
        return $this->entryRepo->findById($id) ?? [];
    }

    /**
     * @param int $id
     * @param int $approverId
     * @return array<string, mixed>
     */
    public function approve(int $id, int $approverId): array
    {
        if (!TenantContext::hasRole('admin')) {
            throw new \RuntimeException('Acceso denegado', 403);
        }
        $this->entryRepo->approve($id, $approverId);
        return $this->entryRepo->findById($id) ?? [];
    }

    /**
     * @param int $id
     * @param string $reason
     * @return array<string, mixed>
     */
    public function reject(int $id, string $reason): array
    {
        if (!TenantContext::hasRole('admin')) {
            throw new \RuntimeException('Acceso denegado', 403);
        }
        $this->entryRepo->reject($id, $reason);
        return $this->entryRepo->findById($id) ?? [];
    }

    /**
     * @param array<int, int|string> $ids
     * @param int $approverId
     * @return array<string, int>
     */
    public function bulkApprove(array $ids, int $approverId): array
    {
        if (!TenantContext::hasRole('admin')) {
            throw new \RuntimeException('Acceso denegado', 403);
        }
        $affected = $this->entryRepo->bulkApprove($ids, $approverId);
        return ['approved' => $affected];
    }

    /**
     * @param array<int, int|string> $ids
     * @param string $reason
     * @return array<string, int>
     */
    public function bulkReject(array $ids, string $reason): array
    {
        if (!TenantContext::hasRole('admin')) {
            throw new \RuntimeException('Acceso denegado', 403);
        }
        $affected = $this->entryRepo->bulkReject($ids, $reason);
        return ['rejected' => $affected];
    }

    /**
     * @param TimeEntryFilterDTO $filter
     * @return array<string, mixed>
     */
    public function list(TimeEntryFilterDTO $filter): array
    {
        $items = $this->entryRepo->findFiltered(
            $filter->toArray(),
            $filter->page,
            $filter->perPage
        );
        $total = $this->entryRepo->countFiltered($filter->toArray());

        return [
            'data' => $items,
            'total' => $total,
            'page' => $filter->page,
            'per_page' => $filter->perPage,
        ];
    }

    /**
     * @param int $approverId
     * @param array<string, mixed> $filters
     * @return array<int, array<string, mixed>>
     */
    public function getPendingApprovals(int $approverId, array $filters = []): array
    {
        if (!TenantContext::hasRole('admin')) {
            throw new \RuntimeException('Acceso denegado', 403);
        }
        return $this->entryRepo->getPendingApprovals($approverId, $filters);
    }

    private function updateSummary(int $userId, int $projectId, string $date): void
    {
        $sql = "SELECT SUM(duration_minutes) AS total_minutes, SUM(calculated_cost) AS total_cost
                FROM `TRACKER_time_entries`
                WHERE user_id = :uid AND project_id = :pid AND date = :d
                  AND approval_status != 'rejected'";
        $stmt = $this->entryRepo->rawSelect($sql, [
            ':uid' => $userId, ':pid' => $projectId, ':d' => $date,
        ]);
        $row = $stmt[0] ?? ['total_minutes' => 0, 'total_cost' => 0];
        $this->summaryRepo->upsert(
            $userId,
            $projectId,
            $date,
            (int)($row['total_minutes'] ?? 0),
            (float)($row['total_cost'] ?? 0)
        );
    }
}
