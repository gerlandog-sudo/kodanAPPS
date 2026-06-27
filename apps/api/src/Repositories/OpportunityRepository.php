<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantContext;

/**
 * OpportunityRepository - Gestión de Oportunidades (Negociaciones) comerciales
 * 
 * @extends BaseRepository<array{id: int, tenant_id: int, account_id: int, contact_id: int|null, pipeline_stage_id: int, title: string, value: string, currency: string, close_date: string|null, owner_user_id: int|null, custom_fields: string, archived_at: string|null, created_at: string, updated_at: string}>
 */
final class OpportunityRepository extends BaseRepository
{
    protected const TABLE = 'CRM_opportunities';

    protected function getLimitConfig(): array
    {
        return ['module' => 'crm', 'metric' => 'negotiations_max'];
    }

    /**
     * Obtiene una oportunidad por su ID
     * 
     * @return array<string, mixed>|null
     */
    public function findById(int $id): ?array
    {
        $userId = TenantContext::getUserId();
        $sql = "SELECT o.*, 
            ps.name AS stage_name, ps.color_hex AS stage_color, ps.probability AS stage_probability, ps.is_won_stage, ps.is_lost_stage, 
            a.name AS account_name,
            CONCAT(c.first_name, ' ', c.last_name) AS contact_name,
            u.display_name AS owner_name,
            uc.avatar_url AS owner_avatar,
            (SELECT COUNT(*) FROM CRM_quotes q JOIN CRM_quote_line_items qli ON qli.quote_id = q.id WHERE q.opportunity_id = o.id) AS line_items_count,
            (SELECT COALESCE(SUM(qli.quantity * qli.unit_price), 0) FROM CRM_quotes q JOIN CRM_quote_line_items qli ON qli.quote_id = q.id WHERE q.opportunity_id = o.id) AS quote_total,
            (
                SELECT COUNT(m.id)
                FROM conversations c
                JOIN conversation_participants cp ON cp.conversation_id = c.id
                JOIN messages m ON m.conversation_id = c.id
                WHERE c.entity_type = 'crm_opportunity'
                  AND c.entity_id = o.id
                  AND cp.user_id = {$userId}
                  AND (m.sender_id IS NULL OR m.sender_id != cp.user_id)
                  AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)
            ) AS chat_unread_count
         FROM CRM_opportunities o
         JOIN CRM_pipeline_stages ps ON ps.id = o.pipeline_stage_id
         JOIN accounts a ON a.account_id = o.account_id
         LEFT JOIN contacts c ON c.contact_id = o.contact_id
         LEFT JOIN users u ON u.id = o.owner_user_id
         LEFT JOIN user_configs uc ON uc.user_id = u.id AND uc.app_id = 'crm'
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
        $userId = TenantContext::getUserId();
        $archivedFilter = $includeArchived ? '' : ' AND o.archived_at IS NULL';

        $select = "SELECT o.*, 
            ps.name AS stage_name, ps.color_hex AS stage_color, ps.probability AS stage_probability, ps.is_won_stage, ps.is_lost_stage, 
            a.name AS account_name,
            CONCAT(c.first_name, ' ', c.last_name) AS contact_name,
            u.display_name AS owner_name,
            uc.avatar_url AS owner_avatar,
            (SELECT COUNT(*) FROM CRM_quotes q JOIN CRM_quote_line_items qli ON qli.quote_id = q.id WHERE q.opportunity_id = o.id) AS line_items_count,
            (SELECT COALESCE(SUM(qli.quantity * qli.unit_price), 0) FROM CRM_quotes q JOIN CRM_quote_line_items qli ON qli.quote_id = q.id WHERE q.opportunity_id = o.id) AS quote_total,
            (
                SELECT COUNT(m.id)
                FROM conversations c
                JOIN conversation_participants cp ON cp.conversation_id = c.id
                JOIN messages m ON m.conversation_id = c.id
                WHERE c.entity_type = 'crm_opportunity'
                  AND c.entity_id = o.id
                  AND cp.user_id = {$userId}
                  AND (m.sender_id IS NULL OR m.sender_id != cp.user_id)
                  AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)
            ) AS chat_unread_count
         FROM CRM_opportunities o
         JOIN CRM_pipeline_stages ps ON ps.id = o.pipeline_stage_id
         JOIN accounts a ON a.account_id = o.account_id
         LEFT JOIN contacts c ON c.contact_id = o.contact_id
         LEFT JOIN users u ON u.id = o.owner_user_id
         LEFT JOIN user_configs uc ON uc.user_id = u.id AND uc.app_id = 'crm'";

        if ($pipelineId > 0) {
            return $this->rawSelect(
                $select . "
                 WHERE ps.pipeline_id = :pipeline_id AND o.tenant_id = :tenant_id{$archivedFilter}
                 ORDER BY ps.sort_order ASC, o.created_at DESC",
                [':pipeline_id' => $pipelineId]
            );
        }
        
        return $this->rawSelect(
            $select . "
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
            $id = $this->create(self::TABLE, $data);
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
            $affected = $this->update(self::TABLE, $data, 'id = :id', [':id' => $id]);
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
        return $this->update(self::TABLE, ['archived_at' => $archive ? date('Y-m-d H:i:s') : null], 'id = :id', [':id' => $id]);
    }

    /**
     * Elimina una oportunidad
     */
    public function deleteOpportunity(int $id): int
    {
        return $this->transactional(function () use ($id) {
            // Eliminar valores elásticos asociados
            $this->delete('custom_field_values', "entity_type = 'opportunity' AND entity_id = :id", [':id' => $id]);
            return $this->delete(self::TABLE, 'id = :id', [':id' => $id]);
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
             FROM CRM_opportunity_line_items oli
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
            $this->rawExecute("/* BYPASS_TENANT_SCOPE */ DELETE FROM CRM_opportunity_line_items WHERE opportunity_id = ?", [$opportunityId]);
            
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
                     INSERT INTO CRM_opportunity_line_items (opportunity_id, product_id, quantity, unit_price, discount_percentage, tax_percentage)
                     VALUES (?, ?, ?, ?, ?, ?)",
                    [$opportunityId, (int)$item['product_id'], $qty, $price, $disc, $tax]
                );
            }
            
            // Actualizar el valor acumulado total en la oportunidad
            $this->update(self::TABLE, ['value' => $totalAmount], 'id = :id', [':id' => $opportunityId]);
        });
    }

    /**
     * Verifica si el plan del tenant tiene configurado el límite projects_max
     * (indica que el plan incluye el módulo Tracker y soporta creación de proyectos).
     */
    private function tenantHasProjectsModule(): bool
    {
        $tenantId = \kodanAPPS\DB\TenantContext::getTenantId();
        $result = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT 1 FROM plan_limits pl
             JOIN subscription_plans sp ON sp.id = pl.plan_id
             JOIN tenants t ON t.subscription_plan_id = sp.id
             WHERE t.tenant_id = ?
               AND pl.module = 'crm'
               AND pl.metric = 'projects_max'
               AND t.is_active = 1
               AND sp.deleted_at IS NULL
             LIMIT 1",
            [$tenantId]
        );
        return !empty($result);
    }

    /**
     * Marca la oportunidad como ganada e inicializa el proyecto asociado en Tracker en una transacción atómica.
     * 
     * Si el plan del tenant no incluye el módulo Tracker (no tiene projects_max configurado),
     * solo marca la oportunidad como ganada sin crear proyecto.
     * 
     * @return int ID del proyecto creado (0 si no se creó proyecto)
     */
    public function markAsWonAndCreateProject(int $opportunityId, int $wonStageId, string $projectName, float $budgetHours, ?string $closeReason = null): int
    {
        $hasTracker = $this->tenantHasProjectsModule();

        return $this->transactional(function () use ($opportunityId, $wonStageId, $projectName, $budgetHours, $closeReason, $hasTracker) {
            // 1. Actualizar etapa de la oportunidad a ganada, establecer close_date y guardar motivo
            $this->update(self::TABLE, [
                'pipeline_stage_id' => $wonStageId,
                'close_date' => date('Y-m-d H:i:s'),
                'close_reason' => $closeReason
            ], 'id = :id', [':id' => $opportunityId]);

            // Si el plan no incluye Tracker, solo marcar como ganada sin crear proyecto
            if (!$hasTracker) {
                error_log("[WonOpportunity] Plan sin módulo Tracker. Se omite creación de proyecto. Oportunidad #{$opportunityId} marcada como ganada.");
                return 0;
            }

            $oppResult = $this->rawSelect(
                "/* BYPASS_TENANT_SCOPE */ SELECT account_id FROM CRM_opportunities WHERE id = ?",
                [$opportunityId]
            );
            $accountId = isset($oppResult[0]['account_id']) && is_scalar($oppResult[0]['account_id']) ? (int)$oppResult[0]['account_id'] : 0;

            // 2. Verificar límite de proyectos antes de crear
            $this->enforceUsageLimit('crm', 'projects_max');

            $projectId = $this->create('projects', [
                'account_id' => $accountId,
                'opportunity_id' => $opportunityId,
                'name' => $projectName,
                'budget_hours' => $budgetHours,
                'status' => 'active'
            ]);

            $this->incrementUsage('crm', 'projects_max');
            
            return $projectId;
        });
    }
}

