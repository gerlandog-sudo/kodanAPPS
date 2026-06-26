<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DB\TenantContext;
use kodanAPPS\DB\TenantAwarePDO;
use InvalidArgumentException;

final class CatalogController
{
    public function __construct(
        private TenantAwarePDO $pdo,
    ) {}

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listPositions(): array
    {
        $tenantId = TenantContext::getTenantId();
        return $this->pdo->query(
            "SELECT id, name FROM TRACKER_positions WHERE tenant_id = {$tenantId} ORDER BY name ASC"
        )->fetchAll();
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function createPosition(array $input): array
    {
        $tenantId = TenantContext::getTenantId();
        $name = trim($input['name'] ?? '');
        if ($name === '') {
            throw new InvalidArgumentException(json_encode(['name' => 'Nombre requerido'], JSON_UNESCAPED_UNICODE));
        }

        $stmt = $this->pdo->prepare(
            "INSERT INTO TRACKER_positions (tenant_id, name) VALUES (?, ?)"
        );
        $stmt->execute([$tenantId, $name]);
        $id = (int)$this->pdo->lastInsertId();

        return ['id' => $id, 'name' => $name];
    }

    /**
     * @param int $id
     * @return array<string, bool>
     */
    public function deletePosition(int $id): array
    {
        $tenantId = TenantContext::getTenantId();
        $stmt = $this->pdo->prepare(
            "DELETE FROM TRACKER_positions WHERE id = ? AND tenant_id = ?"
        );
        $stmt->execute([$id, $tenantId]);
        return ['deleted' => $stmt->rowCount() > 0];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listSeniorities(): array
    {
        $tenantId = TenantContext::getTenantId();
        return $this->pdo->query(
            "SELECT id, name FROM TRACKER_seniorities WHERE tenant_id = {$tenantId} ORDER BY name ASC"
        )->fetchAll();
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function createSeniority(array $input): array
    {
        $tenantId = TenantContext::getTenantId();
        $name = trim($input['name'] ?? '');
        if ($name === '') {
            throw new InvalidArgumentException(json_encode(['name' => 'Nombre requerido'], JSON_UNESCAPED_UNICODE));
        }

        $stmt = $this->pdo->prepare(
            "INSERT INTO TRACKER_seniorities (tenant_id, name) VALUES (?, ?)"
        );
        $stmt->execute([$tenantId, $name]);
        $id = (int)$this->pdo->lastInsertId();

        return ['id' => $id, 'name' => $name];
    }

    /**
     * @param int $id
     * @return array<string, bool>
     */
    public function deleteSeniority(int $id): array
    {
        $tenantId = TenantContext::getTenantId();
        $stmt = $this->pdo->prepare(
            "DELETE FROM TRACKER_seniorities WHERE id = ? AND tenant_id = ?"
        );
        $stmt->execute([$id, $tenantId]);
        return ['deleted' => $stmt->rowCount() > 0];
    }
}
