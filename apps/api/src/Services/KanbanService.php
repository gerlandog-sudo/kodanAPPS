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

    /**
     * @param int $projectId
     * @param bool $includeArchived
     * @return array<string, mixed>
     */
    public function getBoard(int $projectId, bool $includeArchived = false): array
    {
        $tasks = $this->taskRepo->findByProject($projectId);

        return $this->buildBoard($tasks, $includeArchived);
    }

    /**
     * Obtiene todas las tareas de todos los proyectos (vista "TODOS").
     *
     * @param bool $includeArchived
     * @return array<string, mixed>
     */
    public function getAllBoards(bool $includeArchived = false): array
    {
        $tasks = $this->taskRepo->findAllByTenant();

        return $this->buildBoard($tasks, $includeArchived);
    }

    /**
     * Construye la estructura del board a partir de un array de tareas.
     *
     * @param array<int, array<string, mixed>> $tasks
     * @param bool $includeArchived
     * @return array<string, mixed>
     */
    private function buildBoard(array $tasks, bool $includeArchived): array
    {
        $columns = ['todo', 'in_progress', 'review', 'done'];
        if ($includeArchived) {
            $columns[] = 'archived';
        }

        $board = [];
        foreach ($columns as $col) {
            $board[$col] = array_values(array_filter($tasks, fn($t) => $t['kanban_status'] === $col));
        }

        // Si no se incluyen archivadas, filtrarlas de las columnas activas
        if (!$includeArchived) {
            // remover tareas archivadas de las columnas (no debería haber si el filtro funciona)
            // pero por seguridad
        }

        return [
            'columns' => $columns,
            'itemsByStage' => $board,
        ];
    }

    /**
     * @param CreateProjectTaskDTO $dto
     * @return array<string, mixed>
     */
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

    /**
     * @param int $id
     * @return array<string, mixed>
     */
    public function getTask(int $id): array
    {
        $task = $this->taskRepo->findById($id);
        if ($task === null) {
            throw new \RuntimeException('Tarea no encontrada', 404);
        }
        return $task;
    }

    /**
     * @param int $id
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function updateTask(int $id, array $data): array
    {
        $task = $this->getTask($id);
        if ($task['kanban_status'] === 'archived') {
            throw new \RuntimeException('Las tareas archivadas no se pueden modificar', 400);
        }
        $this->taskRepo->rawExecute(
            'UPDATE `TRACKER_project_tasks` SET ' . implode(', ', array_map(fn($c) => "`{$c}` = :{$c}", array_keys($data))) . ' WHERE id = :id',
            array_merge($data, [':id' => $id])
        );
        return $this->taskRepo->findById($id) ?? [];
    }

    public function deleteTask(int $id): void
    {
        $task = $this->getTask($id);
        if ($task['kanban_status'] === 'archived') {
            throw new \RuntimeException('Las tareas archivadas no se pueden eliminar', 400);
        }
        $this->taskRepo->deleteTask($id);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getTaskTypes(): array
    {
        return $this->taskTypeRepo->listAll('tracker');
    }
}
