<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Services\TimeEntryService;
use kodanAPPS\DTOs\CreateTimeEntryDTO;
use kodanAPPS\DTOs\UpdateTimeEntryDTO;
use kodanAPPS\DTOs\TimeEntryFilterDTO;
use InvalidArgumentException;
use RuntimeException;

final class TimeEntryController
{
    public function __construct(
        private TimeEntryService $timeEntryService,
    ) {}

    public function create(array $input): array
    {
        $dto = new CreateTimeEntryDTO($input);
        return $this->timeEntryService->create($dto);
    }

    public function get(int $id): array
    {
        throw new RuntimeException('Not implemented', 501);
    }

    public function update(int $id, array $input): array
    {
        $authUserId = \kodanAPPS\DB\TenantContext::getUserId();
        $dto = new UpdateTimeEntryDTO($input);
        return $this->timeEntryService->update($id, $dto, $authUserId);
    }

    public function delete(int $id): array
    {
        $authUserId = \kodanAPPS\DB\TenantContext::getUserId();
        $this->timeEntryService->delete($id, $authUserId);
        return ['deleted' => true];
    }

    public function list(): array
    {
        $filter = new TimeEntryFilterDTO($_GET);
        return $this->timeEntryService->list($filter);
    }

    public function submit(int $id): array
    {
        $authUserId = \kodanAPPS\DB\TenantContext::getUserId();
        return $this->timeEntryService->submit($id, $authUserId);
    }

    public function approve(int $id): array
    {
        $approverId = \kodanAPPS\DB\TenantContext::getUserId();
        return $this->timeEntryService->approve($id, $approverId);
    }

    public function reject(int $id, array $input): array
    {
        $reason = $input['reason'] ?? '';
        if (trim($reason) === '') {
            throw new InvalidArgumentException(json_encode(['reason' => 'El motivo de rechazo es obligatorio'], JSON_UNESCAPED_UNICODE));
        }
        return $this->timeEntryService->reject($id, $reason);
    }

    public function bulkApprove(array $input): array
    {
        $ids = $input['ids'] ?? [];
        if (empty($ids) || !is_array($ids)) {
            throw new InvalidArgumentException(json_encode(['ids' => 'Lista de IDs requerida'], JSON_UNESCAPED_UNICODE));
        }
        $approverId = \kodanAPPS\DB\TenantContext::getUserId();
        return $this->timeEntryService->bulkApprove($ids, $approverId);
    }

    public function pendingApprovals(): array
    {
        $approverId = \kodanAPPS\DB\TenantContext::getUserId();
        return $this->timeEntryService->getPendingApprovals($approverId);
    }
}
