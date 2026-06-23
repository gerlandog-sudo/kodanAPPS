<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\CrmTaskRepository;
use kodanAPPS\Repositories\NotificationRepository;
use kodanAPPS\Services\WorkflowEngine;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;
use RuntimeException;

final class CrmTaskController
{
    private CrmTaskRepository $taskRepo;
    private NotificationRepository $notificationRepo;
    private WorkflowEngine $workflowEngine;

    public function __construct(
        CrmTaskRepository $taskRepo,
        NotificationRepository $notificationRepo,
        WorkflowEngine $workflowEngine
    ) {
        $this->taskRepo = $taskRepo;
        $this->notificationRepo = $notificationRepo;
        $this->workflowEngine = $workflowEngine;
    }

    /**
     * GET /api/crm/tasks
     * 
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        $opportunityId = isset($_GET['opportunity_id']) ? (int)$_GET['opportunity_id'] : 0;
        $includeArchived = isset($_GET['include_archived']) && ($_GET['include_archived'] === '1' || $_GET['include_archived'] === 'true');
        return $this->taskRepo->listAll($opportunityId, $includeArchived);
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
        $status = isset($input['status']) && is_scalar($input['status']) ? trim((string)$input['status']) : 'todo'; // todo, in_progress, done, archived

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

        $opportunityId = isset($input['opportunity_id']) && is_scalar($input['opportunity_id']) && (int)$input['opportunity_id'] > 0 ? (int)$input['opportunity_id'] : null;
        $assignedTo = isset($input['assigned_to']) && is_scalar($input['assigned_to']) && (int)$input['assigned_to'] > 0 ? (int)$input['assigned_to'] : null;
        
        // Heredar owner si no se especificó y hay oportunidad relacionada
        if ($opportunityId !== null && $assignedTo === null) {
            $opp = $this->taskRepo->rawSelect("/* BYPASS_TENANT_SCOPE */ SELECT owner_user_id FROM opportunities WHERE id = ?", [$opportunityId]);
            if (!empty($opp)) {
                $assignedTo = isset($opp[0]['owner_user_id']) ? (int)$opp[0]['owner_user_id'] : null;
            }
        }

        $endDate = isset($input['end_date']) && is_scalar($input['end_date']) ? trim((string)$input['end_date']) : null;
        if ($endDate === null && isset($input['due_date']) && is_scalar($input['due_date'])) {
            $endDate = trim((string)$input['due_date']);
        }

        $data = [
            'opportunity_id' => $opportunityId,
            'title' => $title,
            'description' => isset($input['description']) && is_scalar($input['description']) ? trim((string)$input['description']) : null,
            'start_date' => isset($input['start_date']) && is_scalar($input['start_date']) ? trim((string)$input['start_date']) : null,
            'end_date' => $endDate,
            'due_date' => $endDate,
            'status' => $status,
            'assigned_to' => $assignedTo,
            'task_type_id' => isset($input['task_type_id']) && is_scalar($input['task_type_id']) && (int)$input['task_type_id'] > 0 ? (int)$input['task_type_id'] : null,
        ];

        $id = $this->taskRepo->createTask($data);

        // Disparar alerta si se asigna a un usuario diferente del actual
        if ($assignedTo > 0 && $assignedTo !== \kodanAPPS\DB\TenantContext::getUserId()) {
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

        // Guardar participantes si se pasan y notificar
        if (isset($input['participants']) && is_array($input['participants'])) {
            $participants = array_map('intval', $input['participants']);
            $this->taskRepo->saveParticipants($id, $participants);
            
            foreach ($participants as $pId) {
                if ($pId !== \kodanAPPS\DB\TenantContext::getUserId() && $pId !== $assignedTo) {
                    $this->notificationRepo->upsertNotification([
                        'user_id' => $pId,
                        'type' => 'new_shared_task',
                        'entity_type' => 'crm_task',
                        'entity_id' => $id,
                        'title' => 'Tarea comercial compartida',
                        'message' => "Se te ha agregado como participante en la tarea \"{$title}\".",
                        'is_read' => 0
                    ]);
                }
            }
        }

        $this->workflowEngine->execute('task', 'task_created', $id, [
            'opportunity_id' => $opportunityId,
            'task_title' => $title,
            'assigned_to' => $assignedTo,
            'status' => $status,
            'task_type_id' => $data['task_type_id'] ?? null,
        ]);

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
        if (array_key_exists('start_date', $input)) {
            $data['start_date'] = isset($input['start_date']) && is_scalar($input['start_date']) ? trim((string)$input['start_date']) : null;
        }
        if (array_key_exists('end_date', $input)) {
            $endDate = isset($input['end_date']) && is_scalar($input['end_date']) ? trim((string)$input['end_date']) : null;
            $data['end_date'] = $endDate;
            $data['due_date'] = $endDate;
        } elseif (array_key_exists('due_date', $input)) {
            $endDate = isset($input['due_date']) && is_scalar($input['due_date']) ? trim((string)$input['due_date']) : null;
            $data['end_date'] = $endDate;
            $data['due_date'] = $endDate;
        }
        if (isset($input['status']) && is_scalar($input['status'])) {
            $data['status'] = trim((string)$input['status']);
        }
        if (array_key_exists('assigned_to', $input)) {
            $data['assigned_to'] = isset($input['assigned_to']) && is_scalar($input['assigned_to']) && (int)$input['assigned_to'] > 0 ? (int)$input['assigned_to'] : null;
        }
        if (array_key_exists('task_type_id', $input)) {
            $data['task_type_id'] = isset($input['task_type_id']) && is_scalar($input['task_type_id']) && (int)$input['task_type_id'] > 0 ? (int)$input['task_type_id'] : null;
        }

        $oldStatus = $task['status'] ?? 'todo';
        $oldAssignedTo = (int)($task['assigned_to'] ?? 0);
        $oldDueDate = $task['due_date'] ?? $task['end_date'] ?? null;
        $oldArchived = $task['status'] === 'archived';
        $affected = 0;
        if (!empty($data)) {
            $affected = $this->taskRepo->updateTask($id, $data);

            // Disparar alerta si cambió el usuario asignado
            $newAssignedTo = isset($data['assigned_to']) ? (int)$data['assigned_to'] : null;
            if ($newAssignedTo !== null && $newAssignedTo !== $oldAssignedTo && $newAssignedTo !== \kodanAPPS\DB\TenantContext::getUserId()) {
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

            // Workflow: status changed
            if (isset($data['status']) && $data['status'] !== $oldStatus) {
                $this->workflowEngine->execute('task', 'task_status_changed', $id, [
                    'old_status' => $oldStatus,
                    'new_status' => $data['status'],
                    'opportunity_id' => $task['opportunity_id'] ?? null,
                    'task_title' => $task['title'] ?? '',
                    'task_type_id' => $task['task_type_id'] ?? null,
                    'assigned_to' => (int)($data['assigned_to'] ?? $task['assigned_to'] ?? 0),
                ]);

                if ($data['status'] === 'done' && $oldStatus !== 'done') {
                    $this->workflowEngine->execute('task', 'task_completed', $id, [
                        'opportunity_id' => $task['opportunity_id'] ?? null,
                        'task_title' => $task['title'] ?? '',
                        'task_type_id' => $task['task_type_id'] ?? null,
                        'assigned_to' => (int)($data['assigned_to'] ?? $task['assigned_to'] ?? 0),
                    ]);
                }

                if ($data['status'] === 'archived' && !$oldArchived) {
                    $this->workflowEngine->execute('task', 'task_archived', $id, [
                        'opportunity_id' => $task['opportunity_id'] ?? null,
                        'task_title' => $task['title'] ?? '',
                    ]);
                } elseif ($oldStatus === 'archived' && $data['status'] !== 'archived') {
                    $this->workflowEngine->execute('task', 'task_unarchived', $id, [
                        'opportunity_id' => $task['opportunity_id'] ?? null,
                        'task_title' => $task['title'] ?? '',
                    ]);
                }
            }

            // Workflow: assigned
            if (isset($data['assigned_to']) && (int)$data['assigned_to'] !== $oldAssignedTo) {
                $this->workflowEngine->execute('task', 'task_assigned', $id, [
                    'old_assigned_to' => $oldAssignedTo,
                    'new_assigned_to' => (int)$data['assigned_to'],
                    'opportunity_id' => $task['opportunity_id'] ?? null,
                    'task_title' => $task['title'] ?? '',
                ]);
            }

            // Workflow: due_date changed
            $newDueDate = $data['due_date'] ?? $data['end_date'] ?? null;
            if ($newDueDate !== null && $newDueDate !== $oldDueDate) {
                $this->workflowEngine->execute('task', 'task_due_date_changed', $id, [
                    'old_due_date' => $oldDueDate,
                    'new_due_date' => $newDueDate,
                    'opportunity_id' => $task['opportunity_id'] ?? null,
                    'task_title' => $task['title'] ?? '',
                ]);
            }
        }

        // Actualizar participantes si se pasan y notificar a los nuevos
        if (isset($input['participants']) && is_array($input['participants'])) {
            $newParticipants = array_map('intval', $input['participants']);
            
            // Obtener participantes existentes para no volver a notificar
            $existingParticipants = array_column($this->taskRepo->getParticipants($id), 'user_id');
            $existingParticipants = array_map('intval', $existingParticipants);

            $this->taskRepo->saveParticipants($id, $newParticipants);
            
            $taskTitle = $data['title'] ?? ($task['title'] ?? '');
            $assignedTo = $data['assigned_to'] ?? $oldAssignedTo;
            foreach ($newParticipants as $pId) {
                if ($pId !== \kodanAPPS\DB\TenantContext::getUserId() && !in_array($pId, $existingParticipants, true) && $pId !== $assignedTo) {
                    $this->notificationRepo->upsertNotification([
                        'user_id' => $pId,
                        'type' => 'new_shared_task',
                        'entity_type' => 'crm_task',
                        'entity_id' => $id,
                        'title' => 'Tarea comercial compartida',
                        'message' => "Se te ha agregado como participante en la tarea \"{$taskTitle}\".",
                        'is_read' => 0
                    ]);
                }
            }
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
