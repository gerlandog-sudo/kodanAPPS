<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\DB\TenantContext;
use PDO;

final class CustomFieldService
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getDefinitions(string $entity, ?int $tenantId = null, bool $includeSoftDeleted = false): array
    {
        $tenantId ??= TenantContext::getTenantId();
        $sql = "SELECT * FROM custom_field_definitions WHERE tenant_id = :tenant_id AND entity_type = :entity";
        if (!$includeSoftDeleted) {
            $sql .= " AND deleted_at IS NULL";
        }
        $sql .= " ORDER BY sort_order ASC, id ASC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':tenant_id' => $tenantId, ':entity' => $entity]);
        $definitions = $stmt->fetchAll();

        foreach ($definitions as &$def) {
            if (isset($def['options']) && is_string($def['options'])) {
                $def['options'] = json_decode($def['options'], true) ?? [];
            }
        }

        return $definitions;
    }

    /**
     * @param array<string, mixed> $customFields
     * @return array<string, string>
     */
    public function validate(string $entity, array $customFields, ?int $tenantId = null): array
    {
        $tenantId ??= TenantContext::getTenantId();
        $definitions = $this->getDefinitions($entity, $tenantId, false);
        $errors = [];

        foreach ($definitions as $def) {
            $key = $def['field_key'];
            $value = $customFields[$key] ?? null;
            $isRequired = (bool)$def['is_required'];

            if ($isRequired && ($value === null || $value === '')) {
                $errors[$key] = "{$def['field_label']} es requerido.";
                continue;
            }

            if ($value === null || $value === '') {
                continue;
            }

            switch ($def['field_type']) {
                case 'number':
                    if (!is_numeric($value)) {
                        $errors[$key] = "{$def['field_label']} debe ser un numero.";
                    }
                    break;
                case 'boolean':
                    $valid = in_array($value, [true, false, 0, 1, '0', '1', 'true', 'false'], true);
                    if (!$valid) {
                        $errors[$key] = "{$def['field_label']} debe ser Si o No.";
                    }
                    break;
                case 'select':
                    $options = is_string($def['options']) ? json_decode($def['options'], true) : ($def['options'] ?? []);
                    if (!in_array((string)$value, $options, true)) {
                        $errors[$key] = "{$def['field_label']} contiene un valor no valido.";
                    }
                    break;
                case 'multi_select':
                    if (!is_array($value)) {
                        $errors[$key] = "{$def['field_label']} debe ser una lista.";
                        break;
                    }
                    $options = is_string($def['options']) ? json_decode($def['options'], true) : ($def['options'] ?? []);
                    foreach ($value as $v) {
                        if (!in_array((string)$v, $options, true)) {
                            $errors[$key] = "{$def['field_label']} contiene un valor no valido: {$v}.";
                            break;
                        }
                    }
                    break;
                case 'date':
                    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$value)) {
                        $errors[$key] = "{$def['field_label']} debe ser una fecha valida (YYYY-MM-DD).";
                    }
                    break;
            }
        }

        return $errors;
    }

    /**
     * @param array<string, mixed> $queryParams
     * @param array<int|string, mixed> $params
     */
    public function injectFilters(string $entity, array $queryParams, string &$sql, array &$params, ?int $tenantId = null, string $tableAlias = ''): void
    {
        $tenantId ??= TenantContext::getTenantId();
        $prefix = $tableAlias ? "{$tableAlias}." : "";
        $definitions = $this->getDefinitions($entity, $tenantId, false);

        foreach ($queryParams as $key => $value) {
            if (!str_starts_with($key, 'cf_')) continue;
            $fieldKey = substr($key, 3);
            $def = null;
            foreach ($definitions as $d) {
                if ($d['field_key'] === $fieldKey) { $def = $d; break; }
            }
            if ($def === null) continue;

            $paramKey = ":cf_{$fieldKey}";
            switch ($def['field_type']) {
                case 'multi_select':
                    $sql .= " AND JSON_CONTAINS({$prefix}custom_fields, JSON_QUOTE({$paramKey}), '$.{$fieldKey}')";
                    $params[$paramKey] = $value;
                    break;
                case 'boolean':
                    $sql .= " AND JSON_EXTRACT({$prefix}custom_fields, '$.{$fieldKey}') = {$paramKey}";
                    $params[$paramKey] = $value;
                    break;
                default:
                    $sql .= " AND JSON_UNQUOTE(JSON_EXTRACT({$prefix}custom_fields, '$.{$fieldKey}')) = {$paramKey}";
                    $params[$paramKey] = $value;
                    break;
            }
        }
    }

    /**
     * @param array<int, array{id: int|string, sort_order: int|string}> $entries
     */
    public function reorder(array $entries, ?int $tenantId = null): void
    {
        $tenantId ??= TenantContext::getTenantId();
        $stmt = $this->pdo->prepare(
            "UPDATE custom_field_definitions SET sort_order = :sort_order WHERE id = :id AND tenant_id = :tenant_id"
        );
        foreach ($entries as $entry) {
            $stmt->execute([
                ':sort_order' => (int)$entry['sort_order'],
                ':id' => (int)$entry['id'],
                ':tenant_id' => $tenantId,
            ]);
        }
    }
}
