<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\CrmTaskRepository;
use kodanAPPS\Repositories\NotificationRepository;
use InvalidArgumentException;
use RuntimeException;

final class CrmTaskController
{
    private CrmTaskRepository $taskRepo;
    private NotificationRepository $notificationRepo;

    public function __construct(CrmTaskRepository $taskRepo, NotificationRepository $notificationRepo)
    {
        $this->taskRepo = $taskRepo;
        $this->notificationRepo = $notificationRepo;
    }

    /**
     * GET /api/crm/tasks
     * 
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        $opportunityId = isset($_GET['opportunity_id']) ? (int)$_GET['opportunity_id'] : 0;
        return $this->taskRepo->listAll($opportunityId);
    }

    /**
     * GET /api/crm/tasks/{id}
     * 
     * @return array<string, mixed>
     */
    public function get(int $id): array
    {
        $task = $this->taskRepo->findById($id);
        if ($task === null) {
            throw new RuntimeException('Tarea no encontrada.', 404);
        }

        // Cargar participantes
        $task['participants'] = $this->taskRepo->getParticipants($id);

        return $task;
    }

    /**
     * POST /api/crm/tasks
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, id: int, message: string}
     */
    public function create(array $input): array
    {
        $title = isset($input['title']) && is_scalar($input['title']) ? trim((string)$input['title']) : '';
        $status = isset($input['status']) && is_scalar($input['status']) ? trim((string)$input['status']) : 'pending'; // pending, in_progress, completed, cancelled

        $errors = [];
        if ($title === '') {
            $errors['title'] = 'El título de la tarea es requerido.';
        }

        if (!empty($errors)) {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos faltantes',
                'errors' => $errors
            ], JSON_UNESCAPED_UNICODE));
        }

        $data = [
            'opportunity_id' => isset($input['opportunity_id']) && is_scalar($input['opportunity_id']) && (int)$input['opportunity_id'] > 0 ? (int)$input['opportunity_id'] : null,
            'title' => $title,
            'description' => isset($input['description']) && is_scalar($input['description']) ? trim((string)$input['description']) : null,
            'due_date' => isset($input['due_date']) && is_scalar($input['due_date']) ? trim((string)$input['due_date']) : null,
            'status' => $status,
            'assigned_to' => isset($input['assigned_to']) && is_scalar($input['assigned_to']) && (int)$input['assigned_to'] > 0 ? (int)$input['assigned_to'] : null,
        ];

        $id = $this->taskRepo->createTask($data);

        // Disparar alerta si se asigna a un usuario
        $assignedTo = isset($data['assigned_to']) ? (int)$data['assigned_to'] : 0;
        if ($assignedTo > 0) {
            $this->notificationRepo->upsertNotification([
                'user_id' => $assignedTo,
                'type' => 'new_assignment_task',
                'entity_type' => 'crm_task',
                'entity_id' => $id,
                'title' => 'Nueva tarea asignada',
                'message' => "Se te ha asignado la tarea \"{$title}\".",
                'is_read' => 0
            ]);
        }

        // Guardar participantes si se pasan
        if (isset($input['participants']) && is_array($input['participants'])) {
            $this->taskRepo->saveParticipants($id, array_map('intval', $input['participants']));
        }

        return [
            'success' => true,
            'id' => $id,
            'message' => 'Tarea comercial creada exitosamente.'
        ];
    }

    /**
     * PATCH/PUT /api/crm/tasks/{id}
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, affected: int, message: string}
     */
    public function update(int $id, array $input): array
    {
        $task = $this->taskRepo->findById($id);
        if ($task === null) {
            throw new RuntimeException('Tarea no encontrada.', 404);
        }

        $data = [];
        if (isset($input['title'])) {
            $title = is_scalar($input['title']) ? trim((string)$input['title']) : '';
            if ($title === '') {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['title' => 'El título no puede estar vacío.']
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['title'] = $title;
        }

        if (array_key_exists('opportunity_id', $input)) {
            $data['opportunity_id'] = isset($input['opportunity_id']) && is_scalar($input['opportunity_id']) && (int)$input['opportunity_id'] > 0 ? (int)$input['opportunity_id'] : null;
        }
        if (array_key_exists('description', $input)) {
            $data['description'] = isset($input['description']) && is_scalar($input['description']) ? trim((string)$input['description']) : null;
        }
        if (array_key_exists('due_date', $input)) {
            $data['due_date'] = isset($input['due_date']) && is_scalar($input['due_date']) ? trim((string)$input['due_date']) : null;
        }
        if (isset($input['status']) && is_scalar($input['status'])) {
            $data['status'] = trim((string)$input['status']);
        }
        if (array_key_exists('assigned_to', $input)) {
            $data['assigned_to'] = isset($input['assigned_to']) && is_scalar($input['assigned_to']) && (int)$input['assigned_to'] > 0 ? (int)$input['assigned_to'] : null;
        }

        $oldAssignedTo = (int)($task['assigned_to'] ?? 0);
        $affected = 0;
        if (!empty($data)) {
            $affected = $this->taskRepo->updateTask($id, $data);

            // Disparar alerta si cambió el usuario asignado
            $newAssignedTo = isset($data['assigned_to']) ? (int)$data['assigned_to'] : null;
            if ($newAssignedTo !== null && $newAssignedTo !== $oldAssignedTo) {
                $taskTitle = $data['title'] ?? ($task['title'] ?? '');
                $this->notificationRepo->upsertNotification([
                    'user_id' => $newAssignedTo,
                    'type' => 'new_assignment_task',
                    'entity_type' => 'crm_task',
                    'entity_id' => $id,
                    'title' => 'Nueva tarea asignada',
                    'message' => "Se te ha asignado la tarea \"{$taskTitle}\".",
                    'is_read' => 0
                ]);
            }
        }

        // Actualizar participantes si se pasan
        if (isset($input['participants']) && is_array($input['participants'])) {
            $this->taskRepo->saveParticipants($id, array_map('intval', $input['participants']));
            $affected = 1;
        }

        return [
            'success' => true,
            'affected' => $affected,
            'message' => 'Tarea comercial actualizada exitosamente.'
        ];
    }

    /**
     * DELETE /api/crm/tasks/{id}
     * 
     * @return array{success: bool, message: string}
     */
    public function delete(int $id): array
    {
        $task = $this->taskRepo->findById($id);
        if ($task === null) {
            throw new RuntimeException('Tarea no encontrada.', 404);
        }

        $this->taskRepo->deleteTask($id);

        return [
            'success' => true,
            'message' => 'Tarea comercial eliminada exitosamente.'
        ];
    }
}
