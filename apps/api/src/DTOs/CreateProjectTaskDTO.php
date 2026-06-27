<?php

declare(strict_types=1);

namespace kodanAPPS\DTOs;

use InvalidArgumentException;

final readonly class CreateProjectTaskDTO
{
    public int $projectId;
    public ?int $taskTypeId;
    public string $title;
    public ?string $description;
    public ?int $assignedTo;
    public string $kanbanStatus;
    public string $priority;
    public ?string $startDate;
    public ?string $dueDate;
    public ?float $estimatedHours;

    /**
     * @param array<string, mixed> $data
     */
    public function __construct(array $data)
    {
        $this->validate($data);

        $this->projectId = (int)$data['project_id'];
        $this->taskTypeId = isset($data['task_type_id']) ? (int)$data['task_type_id'] : null;
        $this->title = trim((string)$data['title']);
        $this->description = isset($data['description']) ? trim((string)$data['description']) : null;
        $this->assignedTo = isset($data['assigned_to']) ? (int)$data['assigned_to'] : null;
        $this->kanbanStatus = $data['kanban_status'] ?? 'todo';
        $this->priority = $data['priority'] ?? 'medium';
        $this->startDate = $data['start_date'] ?? null;
        $this->dueDate = $data['due_date'] ?? null;
        $this->estimatedHours = isset($data['estimated_hours']) ? (float)$data['estimated_hours'] : null;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function validate(array $data): void
    {
        $errors = [];

        if (!isset($data['project_id']) || !is_numeric($data['project_id'])) {
            $errors['project_id'] = 'El proyecto es requerido';
        }

        if (!isset($data['title']) || !is_string($data['title'])) {
            $errors['title'] = 'El título es requerido';
        } elseif (trim($data['title']) === '') {
            $errors['title'] = 'El título no puede estar vacío';
        }

        if (isset($data['kanban_status'])) {
            $allowed = ['todo', 'in_progress', 'review', 'done', 'archived'];
            if (!in_array($data['kanban_status'], $allowed, true)) {
                $errors['kanban_status'] = 'Estado kanban inválido';
            }
        }

        if (isset($data['priority'])) {
            $allowed = ['low', 'medium', 'high', 'critical'];
            if (!in_array($data['priority'], $allowed, true)) {
                $errors['priority'] = 'Prioridad inválida';
            }
        }

        if (!empty($errors)) {
            throw new InvalidArgumentException(json_encode($errors, JSON_UNESCAPED_UNICODE));
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'project_id' => $this->projectId,
            'task_type_id' => $this->taskTypeId,
            'title' => $this->title,
            'description' => $this->description,
            'assigned_to' => $this->assignedTo,
            'kanban_status' => $this->kanbanStatus,
            'position' => 0,
            'priority' => $this->priority,
            'start_date' => $this->startDate,
            'due_date' => $this->dueDate,
            'estimated_hours' => $this->estimatedHours,
        ];
    }
}
