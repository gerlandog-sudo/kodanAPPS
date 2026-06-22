<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

/**
 * CrmTaskRepository - Gestión de tareas comerciales vinculadas a negociaciones
 * 
 * @extends BaseRepository<array{id: int, tenant_id: int, opportunity_id: int|null, title: string, description: string|null, due_date: string|null, status: string, assigned_to: int|null}>
 */
final class CrmTaskRepository extends BaseRepository
{
    protected const TABLE = 'tasks';

    /**
     * Lista todas las tareas comerciales del tenant, opcionalmente filtradas por oportunidad
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listAll(int $opportunityId = 0): array
    {
        if ($opportunityId > 0) {
            return $this->findAll(self::TABLE, '*', 'opportunity_id = :opp_id', [':opp_id' => $opportunityId], 'due_date ASC');
        }
        return $this->findAll(self::TABLE, '*', '', [], 'due_date ASC');
    }

    /**
     * Crea una nueva tarea
     * 
     * @param array{opportunity_id: int|null, title: string, description: string|null, due_date: string|null, status: string, assigned_to: int|null} $data
     * @return int ID de la tarea creada
     */
    public function createTask(array $data): int
    {
        if (isset($data['opportunity_id']) && (int)$data['opportunity_id'] > 0) {
            $opp = $this->rawSelect(
                "/* BYPASS_TENANT_SCOPE */
                 SELECT 1 FROM opportunities WHERE id = ? AND tenant_id = ? LIMIT 1",
                [(int)$data['opportunity_id'], \kodanAPPS\DB\TenantContext::getTenantId()]
            );
            if (empty($opp)) {
                throw new \RuntimeException('Oportunidad no encontrada o acceso denegado', 403);
            }
        }

        return $this->transactional(function () use ($data) {
            $id = $this->create(self::TABLE, $data);
            
            // Insertar primer log de historial
            $userId = \kodanAPPS\DB\TenantContext::getUserId();
            $this->rawExecute(
                "/* BYPASS_TENANT_SCOPE */
                 INSERT INTO task_history_logs (task_id, changed_by, old_status, new_status, updated_at)
                 VALUES (?, ?, NULL, ?, NOW())",
                [$id, $userId, $data['status']]
            );

            return $id;
        });
    }

    /**
     * Actualiza una tarea existente y guarda registro en el log de auditoría
     * 
     * @param array{title?: string, description?: string|null, due_date?: string|null, status?: string, assigned_to?: int|null} $data
     */
    public function updateTask(int $id, array $data): int
    {
        $task = $this->findById($id);
        if ($task === null) {
            throw new \RuntimeException('Tarea no encontrada', 404);
        }

        $oldStatus = $task['status'];
        $newStatus = $data['status'] ?? $oldStatus;

        return $this->transactional(function () use ($id, $data, $oldStatus, $newStatus) {
            $affected = $this->update(self::TABLE, $data, 'id = :id', [':id' => $id]);
            
            if ($oldStatus !== $newStatus) {
                $userId = \kodanAPPS\DB\TenantContext::getUserId();
                $this->rawExecute(
                    "/* BYPASS_TENANT_SCOPE */
                     INSERT INTO task_history_logs (task_id, changed_by, old_status, new_status, updated_at)
                     VALUES (?, ?, ?, ?, NOW())",
                    [$id, $userId, $oldStatus, $newStatus]
                );
            }

            return $affected;
        });
    }

    /**
     * Elimina una tarea
     */
    public function deleteTask(int $id): int
    {
        return $this->delete(self::TABLE, 'id = :id', [':id' => $id]);
    }

    /**
     * Obtiene los participantes de una tarea específica
     * 
     * @return array<int, array<string, mixed>>
     */
    public function getParticipants(int $taskId): array
    {
        $task = $this->findById($taskId);
        if ($task === null) {
            return [];
        }

        return $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT tp.user_id, u.display_name, u.email
             FROM task_participants tp
             JOIN users u ON u.id = tp.user_id
             WHERE tp.task_id = ?",
            [$taskId]
        );
    }

    /**
     * Reemplaza los participantes de una tarea
     * 
     * @param array<int, int> $userIds
     */
    public function saveParticipants(int $taskId, array $userIds): void
    {
        $task = $this->findById($taskId);
        if ($task === null) {
            throw new \RuntimeException('Tarea no encontrada o acceso denegado', 403);
        }

        $this->transactional(function () use ($taskId, $userIds) {
            // Eliminar anteriores
            $this->rawExecute("/* BYPASS_TENANT_SCOPE */ DELETE FROM task_participants WHERE task_id = ?", [$taskId]);

            // Insertar nuevos
            foreach ($userIds as $userId) {
                $this->rawExecute(
                    "/* BYPASS_TENANT_SCOPE */
                     INSERT INTO task_participants (task_id, user_id)
                     VALUES (?, ?)",
                    [$taskId, (int)$userId]
                );
            }
        });
    }
}
