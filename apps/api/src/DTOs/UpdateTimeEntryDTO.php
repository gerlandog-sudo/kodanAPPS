<?php

declare(strict_types=1);

namespace kodanAPPS\DTOs;

use InvalidArgumentException;

final readonly class UpdateTimeEntryDTO
{
    public ?int $projectId;
    public ?int $taskId;
    public ?string $date;
    public ?int $durationMinutes;
    public ?string $description;

    public bool $hasProjectId;
    public bool $hasTaskId;
    public bool $hasDate;
    public bool $hasDuration;
    public bool $hasDescription;

    public function __construct(array $data)
    {
        $this->validate($data);

        $this->hasProjectId = isset($data['project_id']);
        $this->hasTaskId = array_key_exists('task_id', $data);
        $this->hasDate = isset($data['date']);
        $this->hasDuration = isset($data['duration_minutes']);
        $this->hasDescription = array_key_exists('description', $data);

        $this->projectId = $this->hasProjectId ? (int)$data['project_id'] : null;
        $this->taskId = $this->hasTaskId ? ($data['task_id'] !== null ? (int)$data['task_id'] : null) : null;
        $this->date = $this->hasDate ? $data['date'] : null;
        $this->durationMinutes = $this->hasDuration ? (int)$data['duration_minutes'] : null;
        $this->description = $this->hasDescription ? ($data['description'] !== null ? trim((string)$data['description']) : null) : null;
    }

    private function validate(array $data): void
    {
        $errors = [];

        if (isset($data['project_id']) && (!is_numeric($data['project_id']) || (int)$data['project_id'] <= 0)) {
            $errors['project_id'] = 'Proyecto inválido';
        }

        if (isset($data['date']) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['date'])) {
            $errors['date'] = 'Formato de fecha inválido (YYYY-MM-DD)';
        }

        if (isset($data['duration_minutes'])) {
            if (!is_numeric($data['duration_minutes']) || (int)$data['duration_minutes'] <= 0) {
                $errors['duration_minutes'] = 'La duración debe ser mayor a 0';
            } elseif ((int)$data['duration_minutes'] > 1440) {
                $errors['duration_minutes'] = 'La duración no puede exceder 24 horas';
            }
        }

        if (!empty($errors)) {
            throw new InvalidArgumentException(json_encode($errors, JSON_UNESCAPED_UNICODE));
        }
    }

    public function toArray(): array
    {
        $result = [];

        if ($this->hasProjectId) $result['project_id'] = $this->projectId;
        if ($this->hasTaskId) $result['task_id'] = $this->taskId;
        if ($this->hasDate) $result['date'] = $this->date;
        if ($this->hasDuration) $result['duration_minutes'] = $this->durationMinutes;
        if ($this->hasDescription) $result['description'] = $this->description;

        return $result;
    }
}
