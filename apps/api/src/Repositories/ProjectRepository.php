<?php

namespace kodanAPPS\Repositories;

/**
 * @extends BaseRepository<array<string, mixed>>
 */
class ProjectRepository extends BaseRepository
{
    protected const TABLE = 'TRACKER_projects';

    protected function getLimitConfig(): ?array
    {
        return ['module' => 'crm', 'metric' => 'projects_max'];
    }

    /**
     * Lista todos los proyectos del tenant actual calculando métricas on-the-fly y uniendo la cuenta.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listAllWithMetrics(): array
    {
        $tenantId = \kodanAPPS\DB\TenantContext::getTenantId();
        
        $sql = "SELECT 
                    p.id, 
                    p.tenant_id, 
                    p.account_id, 
                    p.opportunity_id, 
                    p.name, 
                    p.description, 
                    p.color_hex, 
                    p.budget_hours, 
                    p.budget_money, 
                    p.start_date, 
                    p.end_date, 
                    p.status, 
                    p.created_at,
                    a.name AS client_name,
                    COALESCE(SUM(CASE WHEN te.approval_status != 'rejected' THEN te.duration_minutes ELSE 0 END) / 60.0, 0) AS actual_hours,
                    COALESCE(SUM(CASE WHEN te.approval_status != 'rejected' THEN te.calculated_cost ELSE 0 END), 0) AS actual_cost
                FROM TRACKER_projects p
                LEFT JOIN accounts a ON a.account_id = p.account_id
                LEFT JOIN TRACKER_time_entries te ON te.project_id = p.id
                WHERE p.tenant_id = :tenant_id
                GROUP BY p.id
                ORDER BY p.name ASC";
                
        return $this->rawSelect($sql, [':tenant_id' => $tenantId]);
    }

    /**
     * Crea un nuevo proyecto.
     *
     * @param array<string, mixed> $data
     * @return int ID del proyecto creado
     */
    public function createProject(array $data): int
    {
        return $this->create(self::TABLE, $data);
    }

    /**
     * Actualiza un proyecto existente.
     *
     * @param int $id
     * @param array<string, mixed> $data
     * @return int Filas afectadas
     */
    public function updateProject(int $id, array $data): int
    {
        return $this->update(self::TABLE, $data, 'id = :id', [':id' => $id]);
    }

    /**
     * Elimina un proyecto.
     *
     * @param int $id
     * @return int Filas afectadas
     */
    public function deleteProject(int $id): int
    {
        return $this->delete(self::TABLE, 'id = :id', [':id' => $id]);
    }

    /**
     * Lista todos los proyectos con tenant scope automático.
     *
     * @param array<string, mixed> $params
     * @return array<int, array<string, mixed>>
     */
    public function findAll(string $table = self::TABLE, string $columns = '*', string $where = '', array $params = [], string $orderBy = '', int $limit = 0): array
    {
        return parent::findAll($table, $columns, $where, $params, $orderBy, $limit);
    }
}
