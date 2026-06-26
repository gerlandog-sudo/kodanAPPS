<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Services\KanbanService;
use kodanAPPS\DTOs\CreateProjectTaskDTO;
use kodanAPPS\DTOs\MoveTaskDTO;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;
use RuntimeException;

final class KanbanController
{
    public function __construct(
        private KanbanService $kanbanService,
    ) {}

    public function getBoard(int $projectId): array
    {
        return $this->kanbanService->getBoard($projectId);
    }

    public function create(array $input): array
    {
        $dto = new CreateProjectTaskDTO($input);
        return $this->kanbanService->createTask($dto);
    }

    public function get(int $id): array
    {
        return $this->kanbanService->getTask($id);
    }

    public function update(int $id, array $input): array
    {
        return $this->kanbanService->updateTask($id, $input);
    }

    public function move(int $id, array $input): array
    {
        $input['task_id'] = $id;
        $dto = new MoveTaskDTO($input);
        $this->kanbanService->moveTask($dto);
        return $this->kanbanService->getTask($id);
    }

    public function delete(int $id): array
    {
        $this->kanbanService->deleteTask($id);
        return ['deleted' => true];
    }

    public function taskTypes(): array
    {
        return $this->kanbanService->getTaskTypes();
    }
}
