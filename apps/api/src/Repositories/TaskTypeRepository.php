<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

/**
 * TaskTypeRepository - Gestión del Catálogo de Tipos de Tareas Comerciales
 * 
 * @extends BaseRepository<array{id: int, tenant_id: int, name: string, icon: string|null, color_hex: string|null}>
 */
final class TaskTypeRepository extends BaseRepository
{
    protected const TABLE = 'task_types';

    protected function getLimitConfig(): ?array
    {
        return null;
    }

    /**
     * Lista todos los tipos de tareas del tenant
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listAll(?string $module = null): array
    {
        if ($module !== null) {
            return $this->findAll(self::TABLE, '*', 'module = :module', [':module' => $module], 'name ASC');
        }
        return $this->findAll(self::TABLE, '*', '', [], 'name ASC');
    }

    /**
     * Crea un nuevo tipo de tarea con módulo
     * 
     * @param array{name: string, icon: string|null, color_hex: string|null, module?: string} $data
     * @return int ID del tipo de tarea creado
     */
    public function createTaskType(array $data): int
    {
        if (!isset($data['module'])) {
            $data['module'] = 'crm';
        }
        return $this->create(self::TABLE, $data);
    }

    /**
     * Actualiza un tipo de tarea existente
     * 
     * @param array{name?: string, icon?: string|null, color_hex?: string|null} $data
     */
    public function updateTaskType(int $id, array $data): int
    {
        return $this->update(self::TABLE, $data, 'id = :id', [':id' => $id]);
    }

    /**
     * Elimina un tipo de tarea
     */
    public function deleteTaskType(int $id): int
    {
        return $this->delete(self::TABLE, 'id = :id', [':id' => $id]);
    }
}
