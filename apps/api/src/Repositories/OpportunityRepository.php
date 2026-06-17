<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

/**
 * OpportunityRepository - Gestión de Oportunidades (Negociaciones) comerciales
 * 
 * @extends BaseRepository<array{id: int, tenant_id: int, account_id: int, contact_id: int|null, pipeline_stage_id: int, title: string, value: string, currency: string, close_date: string|null, owner_user_id: int|null, custom_fields: string, archived_at: string|null, created_at: string, updated_at: string}>
 */
final class OpportunityRepository extends BaseRepository
{
    /**
     * Obtiene una oportunidad por su ID
     * 
     * @return array<string, mixed>|null
     */
    public function findById(int $id): ?array
    {
        $sql = "SELECT o.*, ps.name AS stage_name, ps.color_hex AS stage_color, ps.is_won_stage, a.name AS account_name,
                       CONCAT(c.first_name, ' ', c.last_name) AS contact_name
                FROM opportunities o
                JOIN pipeline_stages ps ON ps.id = o.pipeline_stage_id
                JOIN accounts a ON a.account_id = o.account_id
                LEFT JOIN contacts c ON c.contact_id = o.contact_id
                WHERE o.id = :id AND o.tenant_id = :tenant_id";
        $result = $this->rawSelect($sql, [':id' => $id]);
        return empty($result) ? null : $result[0];
    }

    /**
     * Lista las oportunidades del tenant, opcionalmente filtradas por pipeline
     * 
     * @param int $pipelineId
     * @param bool $includeArchived Si false, excluye oportunidades archivadas (archived_at IS NULL)
     * @return array<int, array<string, mixed>>
     */
    public function listAll(int $pipelineId = 0, bool $includeArchived = false): array
    {
        $archivedFilter = $includeArchived ? '' : ' AND o.archived_at IS NULL';

        if ($pipelineId > 0) {
            return $this->rawSelect(
                "SELECT o.*, ps.name AS stage_name, ps.color_hex AS stage_color, ps.is_won_stage, ps.is_lost_stage, a.name AS account_name,
                        CONCAT(c.first_name, ' ', c.last_name) AS contact_name
                 FROM opportunities o
                 JOIN pipeline_stages ps ON ps.id = o.pipeline_stage_id
                 JOIN accounts a ON a.account_id = o.account_id
                 LEFT JOIN contacts c ON c.contact_id = o.contact_id
                 WHERE ps.pipeline_id = :pipeline_id AND o.tenant_id = :tenant_id{$archivedFilter}
                 ORDER BY ps.sort_order ASC, o.created_at DESC",
                [':pipeline_id' => $pipelineId]
            );
        }
        
        return $this->rawSelect(
            "SELECT o.*, ps.name AS stage_name, ps.color_hex AS stage_color, ps.is_won_stage, ps.is_lost_stage, a.name AS account_name,
                    CONCAT(c.first_name, ' ', c.last_name) AS contact_name
             FROM opportunities o
             JOIN pipeline_stages ps ON ps.id = o.pipeline_stage_id
             JOIN accounts a ON a.account_id = o.account_id
             LEFT JOIN contacts c ON c.contact_id = o.contact_id
             WHERE o.tenant_id = :tenant_id{$archivedFilter}
             ORDER BY o.created_at DESC"
        );
    }

    /**
     * Crea una nueva oportunidad
     * 
     * @param array{account_id: int, contact_id: int|null, pipeline_stage_id: int, title: string, value: float, currency: string, close_date: string|null, owner_user_id: int|null, custom_fields: array<string, mixed>} $data
     * @return int ID de la oportunidad creada
     */
    public function createOpportunity(array $data): int
    {
        $customFields = $data['custom_fields'];
        $data['custom_fields'] = json_encode($customFields);
        
        return $this->transactional(function () use ($data, $customFields) {
            $id = $this->create('opportunities', $data);
            $this->syncCustomFieldValues($id, $customFields);
            return $id;
        });
    }

    /**
     * Actualiza una oportunidad existente
     * 
     * @param array{account_id?: int, contact_id?: int|null, pipeline_stage_id?: int, title?: string, value?: float, currency?: string, close_date?: string|null, owner_user_id?: int|null, custom_fields?: array<string, mixed>} $data
     */
    public function updateOpportunity(int $id, array $data): int
    {
        $customFields = $data['custom_fields'] ?? null;
        if (is_array($customFields)) {
            $data['custom_fields'] = json_encode($customFields);
        }
        
        return $this->transactional(function () use ($id, $data, $customFields) {
            $affected = $this->update('opportunities', $data, 'id = :id', [':id' => $id]);
            if (is_array($customFields)) {
                $this->syncCustomFieldValues($id, $customFields);
            }
            return $affected;
        });
    }

    /**
     * Archive / unarchive an opportunity (sets archived_at)
     */
    public function archiveOpportunity(int $id, bool $archive): int
    {
        return $this->update('opportunities', ['archived_at' => $archive ? date('Y-m-d H:i:s') : null], 'id = :id', [':id' => $id]);
    }

    /**
     * Elimina una oportunidad
     */
    public function deleteOpportunity(int $id): int
    {
        return $this->transactional(function () use ($id) {
            // Eliminar valores elásticos asociados
            $this->delete('custom_field_values', "entity_type = 'opportunity' AND entity_id = :id", [':id' => $id]);
            return $this->delete('opportunities', 'id = :id', [':id' => $id]);
        });
    }

    /**
     * Sincroniza los valores de los campos personalizados en la tabla optimizada
     * 
     * @param array<string, mixed> $customFields
     */
    private function syncCustomFieldValues(int $opportunityId, array $customFields): void
    {
        $tenantId = $this->pdo->getAttribute(\PDO::ATTR_ERRMODE) !== \PDO::ERRMODE_SILENT ? \kodanAPPS\DB\TenantContext::getTenantId() : 1;
        
        // Primero, limpiar los valores existentes
        $this->delete('custom_field_values', "entity_type = 'opportunity' AND entity_id = :id", [':id' => $opportunityId]);
        
        // Guardar los nuevos valores
        foreach ($customFields as $key => $val) {
            if ($val === null || $val === '') {
                continue;
            }
            
            $valueStr = is_bool($val) ? ($val ? '1' : '0') : (is_scalar($val) ? (string)$val : '');
            
            $this->create('custom_field_values', [
                'entity_type' => 'opportunity',
                'entity_id' => $opportunityId,
                'field_key' => $key,
                'value' => $valueStr
            ]);
        }
    }

    /**
     * Obtiene los ítems asociados a la oportunidad
     * 
     * @return array<int, array<string, mixed>>
     */
    public function getOpportunityLineItems(int $opportunityId): array
    {
        // Validar propiedad de la oportunidad antes de listar
        $opp = $this->findById($opportunityId);
        if ($opp === null) {
            return [];
        }
        
        return $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT oli.*, p.name AS product_name, p.sku AS product_sku
             FROM opportunity_line_items oli
             JOIN products p ON p.id = oli.product_id
             WHERE oli.opportunity_id = ?
             ORDER BY oli.id ASC",
            [$opportunityId]
        );
    }

    /**
     * Reemplaza las líneas de ítems de una oportunidad
     * 
     * @param array<int, array{product_id: int, quantity: float, unit_price: float, discount_percentage?: float, tax_percentage?: float}> $items
     */
    public function saveOpportunityLineItems(int $opportunityId, array $items): void
    {
        $opp = $this->findById($opportunityId);
        if ($opp === null) {
            throw new \RuntimeException('Oportunidad no encontrada o acceso denegado', 403);
        }
        
        $this->transactional(function () use ($opportunityId, $items) {
            // Eliminar existentes
            $this->rawExecute("/* BYPASS_TENANT_SCOPE */ DELETE FROM opportunity_line_items WHERE opportunity_id = ?", [$opportunityId]);
            
            // Insertar nuevos
            $totalAmount = 0.00;
            foreach ($items as $item) {
                $qty = (float)$item['quantity'];
                $price = (float)$item['unit_price'];
                $disc = (float)($item['discount_percentage'] ?? 0.00);
                $tax = (float)($item['tax_percentage'] ?? 0.00);
                
                // Calcular subtotal de ítem con descuento e impuesto
                $subtotal = $qty * $price * (1 - $disc / 100) * (1 + $tax / 100);
                $totalAmount += $subtotal;
                
                $this->rawExecute(
                    "/* BYPASS_TENANT_SCOPE */
                     INSERT INTO opportunity_line_items (opportunity_id, product_id, quantity, unit_price, discount_percentage, tax_percentage)
                     VALUES (?, ?, ?, ?, ?, ?)",
                    [$opportunityId, (int)$item['product_id'], $qty, $price, $disc, $tax]
                );
            }
            
            // Actualizar el valor acumulado total en la oportunidad
            $this->update('opportunities', ['value' => $totalAmount], 'id = :id', [':id' => $opportunityId]);
        });
    }

    /**
     * Marca la oportunidad como ganada e inicializa el proyecto asociado en Tracker en una transacción atómica.
     * 
     * @return int ID del proyecto creado
     */
    public function markAsWonAndCreateProject(int $opportunityId, int $wonStageId, string $projectName, float $budgetHours): int
    {
        return $this->transactional(function () use ($opportunityId, $wonStageId, $projectName, $budgetHours) {
            // 1. Actualizar etapa de la oportunidad a ganada
            $this->update('opportunities', ['pipeline_stage_id' => $wonStageId], 'id = :id', [':id' => $opportunityId]);
            
            $oppResult = $this->rawSelect(
                "/* BYPASS_TENANT_SCOPE */ SELECT account_id FROM opportunities WHERE id = ?",
                [$opportunityId]
            );
            $accountId = isset($oppResult[0]['account_id']) && is_scalar($oppResult[0]['account_id']) ? (int)$oppResult[0]['account_id'] : 0;

            // 2. Crear proyecto en Tracker
            $projectId = $this->create('projects', [
                'account_id' => $accountId,
                'opportunity_id' => $opportunityId,
                'name' => $projectName,
                'budget_hours' => $budgetHours,
                'status' => 'active'
            ]);
            
            return $projectId;
        });
    }
}

