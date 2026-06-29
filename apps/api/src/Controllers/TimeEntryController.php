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

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function create(array $input): array
    {
        if (!isset($input['user_id'])) {
            $input['user_id'] = \kodanAPPS\DB\TenantContext::getUserId();
        }
        $dto = new CreateTimeEntryDTO($input);
        return $this->timeEntryService->create($dto);
    }

    /**
     * @param int $id
     * @return array<string, mixed>
     */
    public function get(int $id): array
    {
        throw new RuntimeException('Not implemented', 501);
    }

    /**
     * @param int $id
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function update(int $id, array $input): array
    {
        $authUserId = \kodanAPPS\DB\TenantContext::getUserId();
        $dto = new UpdateTimeEntryDTO($input);
        return $this->timeEntryService->update($id, $dto, $authUserId);
    }

    /**
     * @param int $id
     * @return array<string, bool>
     */
    public function delete(int $id): array
    {
        $authUserId = \kodanAPPS\DB\TenantContext::getUserId();
        $this->timeEntryService->delete($id, $authUserId);
        return ['deleted' => true];
    }

    /**
     * @return array<string, mixed>
     */
    public function list(): array
    {
        $input = $_GET;
        $canSeeAll = \kodanAPPS\DB\TenantContext::hasRole('admin') || \kodanAPPS\DB\TenantContext::hasRole('pm');
        if (!$canSeeAll) {
            $input['user_id'] = \kodanAPPS\DB\TenantContext::getUserId();
        }
        $filter = new TimeEntryFilterDTO($input);
        return $this->timeEntryService->list($filter);
    }

    /**
     * @param int $id
     * @return array<string, mixed>
     */
    public function submit(int $id): array
    {
        $authUserId = \kodanAPPS\DB\TenantContext::getUserId();
        return $this->timeEntryService->submit($id, $authUserId);
    }

    /**
     * @param int $id
     * @return array<string, mixed>
     */
    public function approve(int $id): array
    {
        $approverId = \kodanAPPS\DB\TenantContext::getUserId();
        return $this->timeEntryService->approve($id, $approverId);
    }

    /**
     * @param int $id
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function reject(int $id, array $input): array
    {
        $reason = $input['reason'] ?? '';
        if (trim($reason) === '') {
            throw new InvalidArgumentException(json_encode(['reason' => 'El motivo de rechazo es obligatorio'], JSON_UNESCAPED_UNICODE));
        }
        return $this->timeEntryService->reject($id, $reason);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function bulkApprove(array $input): array
    {
        $ids = $input['ids'] ?? [];
        if (empty($ids) || !is_array($ids)) {
            throw new InvalidArgumentException(json_encode(['ids' => 'Lista de IDs requerida'], JSON_UNESCAPED_UNICODE));
        }
        $approverId = \kodanAPPS\DB\TenantContext::getUserId();
        return $this->timeEntryService->bulkApprove($ids, $approverId);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function bulkReject(array $input): array
    {
        if (!\kodanAPPS\DB\TenantContext::hasRole('admin') && !\kodanAPPS\DB\TenantContext::hasRole('pm')) {
            throw new \RuntimeException('Acceso denegado', 403);
        }
        $ids = $input['ids'] ?? [];
        if (empty($ids) || !is_array($ids)) {
            throw new InvalidArgumentException(json_encode(['ids' => 'Lista de IDs requerida'], JSON_UNESCAPED_UNICODE));
        }
        $reason = $input['reason'] ?? '';
        if (trim($reason) === '') {
            throw new InvalidArgumentException(json_encode(['reason' => 'El motivo de rechazo es obligatorio'], JSON_UNESCAPED_UNICODE));
        }
        return $this->timeEntryService->bulkReject($ids, $reason);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function pendingApprovals(): array
    {
        if (!\kodanAPPS\DB\TenantContext::hasRole('admin') && !\kodanAPPS\DB\TenantContext::hasRole('pm')) {
            throw new \RuntimeException('Acceso denegado', 403);
        }
        $approverId = \kodanAPPS\DB\TenantContext::getUserId();
        return $this->timeEntryService->getPendingApprovals($approverId, $_GET);
    }

    /**
     * @param int $id
     * @return array<int, array<string, mixed>>
     */
    public function history(int $id): array
    {
        $authUserId = \kodanAPPS\DB\TenantContext::getUserId();
        return $this->timeEntryService->getHistory($id, $authUserId);
    }
}
