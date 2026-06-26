<?php

declare(strict_types=1);

namespace kodanAPPS\DTOs;

final readonly class TimeEntryFilterDTO
{
    public ?int $projectId;
    public ?int $userId;
    public ?string $dateFrom;
    public ?string $dateTo;
    public ?string $approvalStatus;
    public int $page;
    public int $perPage;

    /**
     * @param array<string, mixed> $query
     */
    public function __construct(array $query)
    {
        $this->projectId = isset($query['project_id']) ? (int)$query['project_id'] : null;
        $this->userId = isset($query['user_id']) ? (int)$query['user_id'] : null;
        $this->dateFrom = $query['date_from'] ?? null;
        $this->dateTo = $query['date_to'] ?? null;

        $allowedStatuses = ['draft', 'submitted', 'approved', 'rejected'];
        $this->approvalStatus = isset($query['approval_status']) && in_array($query['approval_status'], $allowedStatuses, true)
            ? $query['approval_status']
            : null;

        $this->page = isset($query['page']) ? max(1, (int)$query['page']) : 1;
        $this->perPage = isset($query['per_page']) ? max(1, min(100, (int)$query['per_page'])) : 50;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $filters = [];
        if ($this->projectId !== null) $filters['project_id'] = $this->projectId;
        if ($this->userId !== null) $filters['user_id'] = $this->userId;
        if ($this->dateFrom !== null) $filters['date_from'] = $this->dateFrom;
        if ($this->dateTo !== null) $filters['date_to'] = $this->dateTo;
        if ($this->approvalStatus !== null) $filters['approval_status'] = $this->approvalStatus;
        $filters['page'] = $this->page;
        $filters['per_page'] = $this->perPage;
        return $filters;
    }
}
