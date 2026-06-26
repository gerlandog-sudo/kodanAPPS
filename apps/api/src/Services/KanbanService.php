<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\Repositories\ProjectTaskRepository;
use kodanAPPS\Repositories\TaskTypeRepository;
use kodanAPPS\DTOs\CreateProjectTaskDTO;
use kodanAPPS\DTOs\MoveTaskDTO;
use kodanAPPS\DB\TenantContext;

final class KanbanService
{
    public function __construct(
        private ProjectTaskRepository $taskRepo,
        private TaskTypeRepository $taskTypeRepo,
    ) {}

    public function getBoard(int $projectId): array
    {
        $tasks = $this->taskRepo->findByProject($projectId);
        $columns = ['todo', 'in_progress', 'review', 'done'];
        $board = [];

        foreach ($columns as $col) {
            $board[$col] = array_values(array_filter($tasks, fn($t) => $t['kanban_status'] === $col));
        }

        return [
            'columns' => $columns,
            'itemsByStage' => $board,
        ];
    }

    public function createTask(CreateProjectTaskDTO $dto): array
    {
        $data = $dto->toArray();
        $data['created_by'] = TenantContext::getUserId();
        $id = $this->taskRepo->createTask($data);
        return $this->taskRepo->findById($id) ?? [];
    }

    public function moveTask(MoveTaskDTO $dto): void
    {
        $this->taskRepo->moveTask($dto->taskId, $dto->toStage, $dto->position);
    }

    public function getTask(int $id): array
    {
        $task = $this->taskRepo->findById($id);
        if ($task === null) {
            throw new \RuntimeException('Tarea no encontrada', 404);
        }
        return $task;
    }

    public function updateTask(int $id, array $data): array
    {
        $this->taskRepo->rawExecute(
            'UPDATE `TRACKER_project_tasks` SET ' . implode(', ', array_map(fn($c) => "`{$c}` = :{$c}", array_keys($data))) . ' WHERE id = :id',
            array_merge($data, [':id' => $id])
        );
        return $this->taskRepo->findById($id) ?? [];
    }

    public function deleteTask(int $id): void
    {
        $this->taskRepo->deleteTask($id);
    }

    public function getTaskTypes(): array
    {
        return $this->taskTypeRepo->listAll('tracker');
    }
}
