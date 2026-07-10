<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DB\TenantContext;
use kodanAPPS\Services\CustomFieldService;
use InvalidArgumentException;
use RuntimeException;
use PDO;

final class CustomFieldController
{
    private CustomFieldService $customFieldService;
    private PDO $pdo;

    public function __construct(CustomFieldService $customFieldService, PDO $pdo)
    {
        $this->customFieldService = $customFieldService;
        $this->pdo = $pdo;
    }

    /**
     * GET /api/app-config/custom-fields?entity=account|contact|opportunity
     * GET /api/crm/custom-fields?entity=account|contact|opportunity (legacy)
     * 
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        $entity = $_GET['entity'] ?? '';
        if (!in_array($entity, ['account', 'contact', 'opportunity'], true)) {
            throw new InvalidArgumentException('Parametro entity invalido. Use: account, contact, opportunity');
        }
        return $this->customFieldService->getDefinitions($entity);
    }

    /**
     * POST /api/app-config/custom-fields
     * POST /api/crm/custom-fields (legacy)
     * 
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function create(array $input): array
    {
        $entity = $input['entity_type'] ?? '';
        $fieldKey = $input['field_key'] ?? '';
        $label = $input['field_label'] ?? '';
        $fieldType = $input['field_type'] ?? '';

        if (!in_array($entity, ['account', 'contact', 'opportunity'], true)) {
            throw new InvalidArgumentException('entity_type invalido.');
        }
        if (!preg_match('/^[a-z][a-z0-9_]{1,49}$/', $fieldKey)) {
            throw new InvalidArgumentException('field_key debe comenzar con minuscula, solo minusculas, numeros y guion bajo (2-50 chars).');
        }
        if ($label === '') {
            throw new InvalidArgumentException('field_label es requerido.');
        }
        $validTypes = ['text', 'number', 'select', 'multi_select', 'date', 'boolean'];
        if (!in_array($fieldType, $validTypes, true)) {
            throw new InvalidArgumentException('field_type invalido.');
        }

        $tenantId = TenantContext::getTenantId();

        // Verificar duplicado
        $check = $this->pdo->prepare(
            "SELECT id FROM custom_field_definitions WHERE tenant_id = :tid AND entity_type = :et AND field_key = :fk AND deleted_at IS NULL"
        );
        $check->execute([':tid' => $tenantId, ':et' => $entity, ':fk' => $fieldKey]);
        if ($check->fetch()) {
            throw new InvalidArgumentException("Ya existe un campo con key '{$fieldKey}' para esta entidad.");
        }

        $options = null;
        if (in_array($fieldType, ['select', 'multi_select'], true)) {
            $options = isset($input['options']) && is_array($input['options']) ? json_encode($input['options'], JSON_UNESCAPED_UNICODE) : '[]';
        }

        // Calcular sort_order
        $maxOrder = $this->pdo->prepare(
            "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM custom_field_definitions WHERE tenant_id = :tid AND entity_type = :et AND deleted_at IS NULL"
        );
        $maxOrder->execute([':tid' => $tenantId, ':et' => $entity]);
        $sortOrder = (int)$maxOrder->fetchColumn();

        $stmt = $this->pdo->prepare(
            "INSERT INTO custom_field_definitions (tenant_id, entity_type, field_key, field_label, field_type, options, is_required, sort_order, created_at)
             VALUES (:tid, :et, :fk, :fl, :ft, :op, :ir, :so, NOW())"
        );
        $stmt->execute([
            ':tid' => $tenantId,
            ':et' => $entity,
            ':fk' => $fieldKey,
            ':fl' => $label,
            ':ft' => $fieldType,
            ':op' => $options,
            ':ir' => isset($input['is_required']) && $input['is_required'] ? 1 : 0,
            ':so' => $sortOrder,
        ]);

        return [
            'success' => true,
            'id' => (int)$this->pdo->lastInsertId(),
            'message' => 'Campo personalizado creado exitosamente.',
        ];
    }

    /**
     * PUT /api/crm/custom-fields/{id}
     * 
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function update(int $id, array $input): array
    {
        $tenantId = TenantContext::getTenantId();
        $existing = $this->findDefinition($id, $tenantId);

        $data = [];
        if (isset($input['field_label'])) {
            $data['field_label'] = $input['field_label'];
        }
        if (isset($input['is_required'])) {
            $data['is_required'] = $input['is_required'] ? 1 : 0;
        }
        if (isset($input['options']) && is_array($input['options'])) {
            $data['options'] = json_encode($input['options'], JSON_UNESCAPED_UNICODE);
        }

        if (empty($data)) {
            return ['success' => true, 'message' => 'Sin cambios.'];
        }

        $setParts = [];
        $params = [':id' => $id, ':tid' => $tenantId];
        foreach ($data as $col => $val) {
            $setParts[] = "`{$col}` = :{$col}";
            $params[":{$col}"] = $val;
        }

        $sql = "UPDATE custom_field_definitions SET " . implode(', ', $setParts) . " WHERE id = :id AND tenant_id = :tid";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return [
            'success' => true,
            'affected' => $stmt->rowCount(),
            'message' => 'Campo personalizado actualizado.',
        ];
    }

    /**
     * DELETE /api/crm/custom-fields/{id}?purge=true
     * 
     * @return array<string, mixed>
     */
    public function delete(int $id): array
    {
        $tenantId = TenantContext::getTenantId();
        $def = $this->findDefinition($id, $tenantId);
        $purge = isset($_GET['purge']) && $_GET['purge'] === 'true';

        // Soft delete
        $stmt = $this->pdo->prepare(
            "UPDATE custom_field_definitions SET deleted_at = NOW() WHERE id = :id AND tenant_id = :tid"
        );
        $stmt->execute([':id' => $id, ':tid' => $tenantId]);

        if ($purge) {
            // Purga fisica: remover la key del JSON custom_fields en todas las filas de la entidad
            $fieldKey = $def['field_key'];
            $entityType = $def['entity_type'];

            $tableMap = [
                'account' => 'accounts',
                'contact' => 'contacts',
                'opportunity' => 'opportunities',
            ];
            $table = $tableMap[$entityType] ?? null;
            if ($table) {
                $stmt1 = $this->pdo->prepare(
                    "UPDATE `{$table}` SET custom_fields = JSON_REMOVE(custom_fields, :field_key_json) WHERE tenant_id = :tenant_id"
                );
                $stmt1->execute([
                    ':field_key_json' => '$.' . $fieldKey,
                    ':tenant_id' => $tenantId,
                ]);

                $stmt2 = $this->pdo->prepare(
                    "DELETE FROM custom_field_values WHERE tenant_id = :tenant_id AND entity_type = :entity_type AND field_key = :field_key"
                );
                $stmt2->execute([
                    ':tenant_id' => $tenantId,
                    ':entity_type' => $entityType,
                    ':field_key' => $fieldKey,
                ]);
            }
        }

        return [
            'success' => true,
            'message' => $purge
                ? 'Campo personalizado eliminado y datos purgados.'
                : 'Campo personalizado desactivado.',
        ];
    }

    /**
     * PUT /api/crm/custom-fields/reorder
     * 
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function reorder(array $input): array
    {
        $entries = $input['entries'] ?? [];
        if (!is_array($entries) || empty($entries)) {
            throw new InvalidArgumentException('Se requiere array entries con {id, sort_order}.');
        }

        $this->customFieldService->reorder($entries);

        return [
            'success' => true,
            'message' => 'Orden actualizado exitosamente.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function findDefinition(int $id, int $tenantId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM custom_field_definitions WHERE id = :id AND tenant_id = :tid AND deleted_at IS NULL"
        );
        $stmt->execute([':id' => $id, ':tid' => $tenantId]);
        $def = $stmt->fetch();
        if ($def === false) {
            throw new RuntimeException('Campo personalizado no encontrado.', 404);
        }
        if (isset($def['options']) && is_string($def['options'])) {
            $def['options'] = json_decode($def['options'], true) ?? [];
        }
        return $def;
    }
}
