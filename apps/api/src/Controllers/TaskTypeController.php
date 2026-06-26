<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\TaskTypeRepository;
use InvalidArgumentException;
use RuntimeException;

final class TaskTypeController
{
    private TaskTypeRepository $taskTypeRepo;

    public function __construct(TaskTypeRepository $taskTypeRepo)
    {
        $this->taskTypeRepo = $taskTypeRepo;
    }

    /**
     * GET /api/app-config/task-types?module=crm|tracker
     * GET /api/crm/task-types (legacy)
     * 
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        $module = $_GET['module'] ?? null;
        return $this->taskTypeRepo->listAll($module);
    }

    /**
     * GET /api/crm/task-types/{id}
     * 
     * @return array<string, mixed>
     */
    public function get(int $id): array
    {
        $type = $this->taskTypeRepo->findById($id);
        if ($type === null) {
            throw new RuntimeException('Tipo de tarea no encontrado.', 404);
        }
        return $type;
    }

    /**
     * POST /api/crm/task-types
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, id: int, message: string}
     */
    public function create(array $input): array
    {
        $name = isset($input['name']) && is_scalar($input['name']) ? trim((string)$input['name']) : '';
        $color = isset($input['color_hex']) && is_scalar($input['color_hex']) ? trim((string)$input['color_hex']) : '#6366F1';
        $icon = isset($input['icon']) && is_scalar($input['icon']) ? trim((string)$input['icon']) : 'list';

        $errors = [];
        if ($name === '') {
            $errors['name'] = 'El nombre del tipo de tarea es requerido.';
        }

        if (!empty($errors)) {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos faltantes o inválidos',
                'errors' => $errors
            ], JSON_UNESCAPED_UNICODE));
        }

        $module = isset($input['module']) && is_scalar($input['module']) ? trim((string)$input['module']) : 'crm';

        $data = [
            'name' => $name,
            'color_hex' => $color,
            'icon' => $icon,
            'module' => $module,
        ];

        $id = $this->taskTypeRepo->createTaskType($data);

        return [
            'success' => true,
            'id' => $id,
            'message' => 'Tipo de tarea creado exitosamente.'
        ];
    }

    /**
     * PATCH/PUT /api/crm/task-types/{id}
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, affected: int, message: string}
     */
    public function update(int $id, array $input): array
    {
        $type = $this->taskTypeRepo->findById($id);
        if ($type === null) {
            throw new RuntimeException('Tipo de tarea no encontrado.', 404);
        }

        $data = [];
        if (isset($input['name'])) {
            $name = is_scalar($input['name']) ? trim((string)$input['name']) : '';
            if ($name === '') {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['name' => 'El nombre no puede estar vacío.']
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['name'] = $name;
        }

        if (array_key_exists('color_hex', $input)) {
            $data['color_hex'] = isset($input['color_hex']) && is_scalar($input['color_hex']) ? trim((string)$input['color_hex']) : '#6366F1';
        }

        if (array_key_exists('icon', $input)) {
            $data['icon'] = isset($input['icon']) && is_scalar($input['icon']) ? trim((string)$input['icon']) : 'list';
        }

        if (empty($data)) {
            return [
                'success' => true,
                'affected' => 0,
                'message' => 'No se enviaron campos para actualizar.'
            ];
        }

        $affected = $this->taskTypeRepo->updateTaskType($id, $data);

        return [
            'success' => true,
            'affected' => $affected,
            'message' => 'Tipo de tarea actualizado exitosamente.'
        ];
    }

    /**
     * DELETE /api/crm/task-types/{id}
     * 
     * @return array{success: bool, message: string}
     */
    public function delete(int $id): array
    {
        $type = $this->taskTypeRepo->findById($id);
        if ($type === null) {
            throw new RuntimeException('Tipo de tarea no encontrado.', 404);
        }

        $this->taskTypeRepo->deleteTaskType($id);

        return [
            'success' => true,
            'message' => 'Tipo de tarea eliminado exitosamente.'
        ];
    }
}
