<?php

declare(strict_types=1);

namespace kodanAPPS\DTOs;

use InvalidArgumentException;

final readonly class MoveTaskDTO
{
    public int $taskId;
    public string $toStage;
    public int $position;

    /**
     * @param array<string, mixed> $data
     */
    public function __construct(array $data)
    {
        $this->validate($data);

        $this->taskId = (int)$data['task_id'];
        $this->toStage = $data['to_stage'];
        $this->position = isset($data['position']) ? (int)$data['position'] : 0;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function validate(array $data): void
    {
        $errors = [];

        if (!isset($data['task_id']) || !is_numeric($data['task_id'])) {
            $errors['task_id'] = 'La tarea es requerida';
        }

        if (!isset($data['to_stage']) || !is_string($data['to_stage'])) {
            $errors['to_stage'] = 'La columna destino es requerida';
        } else {
            $allowed = ['todo', 'in_progress', 'review', 'done', 'archived'];
            if (!in_array($data['to_stage'], $allowed, true)) {
                $errors['to_stage'] = 'Columna destino inválida';
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
            'kanban_status' => $this->toStage,
            'position' => $this->position,
        ];
    }
}
