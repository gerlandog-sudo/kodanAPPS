<?php

declare(strict_types=1);

namespace kodanAPPS\DTOs;

use InvalidArgumentException;

final readonly class CreateTimeEntryDTO
{
    public int $projectId;
    public ?int $taskId;
    public int $userId;
    public string $date;
    public int $durationMinutes;
    public ?string $description;
    public float $hourlyCost;

    /**
     * @param array<string, mixed> $data
     */
    public function __construct(array $data)
    {
        $this->validate($data);

        $this->projectId = (int)$data['project_id'];
        $this->taskId = isset($data['task_id']) ? (int)$data['task_id'] : null;
        $this->userId = (int)$data['user_id'];
        $this->date = $data['date'];
        $this->durationMinutes = (int)$data['duration_minutes'];
        $this->description = isset($data['description']) ? trim((string)$data['description']) : null;
        $this->hourlyCost = isset($data['hourly_cost']) ? (float)$data['hourly_cost'] : 0.0;
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

        if (!isset($data['user_id']) || !is_numeric($data['user_id'])) {
            $errors['user_id'] = 'El usuario es requerido';
        }

        if (!isset($data['date']) || !is_string($data['date'])) {
            $errors['date'] = 'La fecha es requerida';
        } elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['date'])) {
            $errors['date'] = 'Formato de fecha inválido (YYYY-MM-DD)';
        }

        if (!isset($data['duration_minutes']) || !is_numeric($data['duration_minutes'])) {
            $errors['duration_minutes'] = 'La duración es requerida';
        } elseif ((int)$data['duration_minutes'] <= 0) {
            $errors['duration_minutes'] = 'La duración debe ser mayor a 0';
        } elseif ((int)$data['duration_minutes'] > 1440) {
            $errors['duration_minutes'] = 'La duración no puede exceder 24 horas';
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
        $calculatedCost = $this->hourlyCost > 0
            ? round(($this->hourlyCost / 60) * $this->durationMinutes, 2)
            : 0.0;

        return [
            'project_id' => $this->projectId,
            'task_id' => $this->taskId,
            'user_id' => $this->userId,
            'date' => $this->date,
            'duration_minutes' => $this->durationMinutes,
            'description' => $this->description,
            'hourly_cost' => $this->hourlyCost,
            'calculated_cost' => $calculatedCost,
        ];
    }
}
