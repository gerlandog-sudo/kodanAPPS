<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;
use PDO;
use RuntimeException;
use Throwable;

/**
 * BaseRepository - Capa 1 de defensa multi-tenant (Blueprint Punto 2)
 * 
 * @template TEntity of array<string, mixed>
 *
 * Fuerza applyTenantScope() en TODOS los métodos CRUD.
 * Inyección explícita `tenant_id = :tenant_id` en queries.
 * Extiende esta clase para repositorios específicos.
 */
abstract class BaseRepository
{
    protected TenantAwarePDO $pdo;

    public function __construct(TenantAwarePDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Aplica scope de tenant a query builder / statement
     * DEBE llamarse en TODOS los métodos públicos (find*, create, update, delete)
     * 
     * @param array<int|string, mixed> $params
     */
    protected function applyTenantScope(string &$sql, array &$params): void
    {
        // Si la consulta solicita explícitamente saltar el scope
        if (str_contains($sql, '/* BYPASS_TENANT_SCOPE */')) {
            return;
        }

        $tenantId = TenantContext::getTenantId();
        
        // Para prepared statements: agregar tenant_id como parámetro
        if (str_contains($sql, ':tenant_id')) {
            $params[':tenant_id'] = $tenantId;
            return;
        }
        
        // Para queries raw: inyectar en WHERE
        if (stripos($sql, 'WHERE') !== false) {
            $sql = preg_replace('/\bWHERE\b/i', 'WHERE tenant_id = :tenant_id AND', $sql, 1) ?? $sql;
            $params[':tenant_id'] = $tenantId;
        } else {
            // Sin WHERE: agregar al final antes de ORDER/LIMIT
            $sql = preg_replace('/\s+(ORDER BY|LIMIT|$)/i', ' WHERE tenant_id = :tenant_id $1', $sql, 1) ?? $sql;
            $params[':tenant_id'] = $tenantId;
        }
    }

    /**
     * Ejecuta SELECT con tenant scope automático
     * 
     * @param array<string, mixed> $params
     * @return array<int, TEntity>
     */
    protected function findAll(string $table, string $columns = '*', string $where = '', array $params = [], string $orderBy = '', int $limit = 0): array
    {
        $sql = "SELECT {$columns} FROM `{$table}`";
        if ($where !== '') {
            $sql .= " WHERE {$where}";
        }
        if ($orderBy !== '') {
            $sql .= " ORDER BY {$orderBy}";
        }
        if ($limit > 0) {
            $sql .= " LIMIT {$limit}";
        }
        
        $this->applyTenantScope($sql, $params);
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Ejecuta SELECT single con tenant scope
     * 
     * @param array<string, mixed> $params
     * @return TEntity|null
     */
    protected function findOne(string $table, string $where, array $params = [], string $columns = '*'): ?array
    {
        $sql = "SELECT {$columns} FROM `{$table}` WHERE {$where}";
        $this->applyTenantScope($sql, $params);
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result === false ? null : $result;
    }

    /**
     * Ejecuta INSERT con tenant_id automático
     * 
     * @param array<string, mixed> $data
     * @return int Last insert ID
     */
    protected function create(string $table, array $data): int
    {
        $globalTables = ['tenants', 'subscription_plans', 'plan_limits'];
        $isGlobalTable = in_array($table, $globalTables, true);
        
        if (!$isGlobalTable) {
            $tenantId = TenantContext::getTenantId();
            $data['tenant_id'] = $tenantId;
        }
        $data['created_at'] = date('Y-m-d H:i:s');
        
        $columns = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($data)));
        $placeholders = ':' . implode(', :', array_keys($data));
        $bypassComment = $isGlobalTable ? '/* BYPASS_TENANT_SCOPE */ ' : '';
        $sql = "{$bypassComment}INSERT INTO `{$table}` ({$columns}) VALUES ({$placeholders})";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($data);
        
        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Ejecuta UPDATE con tenant scope obligatorio
     * 
     * @param array<string, mixed> $data
     * @param array<string, mixed> $whereParams
     * @return int Filas afectadas
     */
    protected function update(string $table, array $data, string $where, array $whereParams = []): int
    {
        $setParts = [];
        foreach (array_keys($data) as $col) {
            $setParts[] = "`{$col}` = :{$col}";
        }
        $sql = "UPDATE `{$table}` SET " . implode(', ', $setParts) . " WHERE {$where}";
        
        $params = $data;
        $params = array_merge($params, $whereParams);
        $this->applyTenantScope($sql, $params);
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * Ejecuta DELETE con tenant scope obligatorio
     * 
     * @param array<string, mixed> $params
     * @return int Filas afectadas
     */
    protected function delete(string $table, string $where, array $params = []): int
    {
        $sql = "DELETE FROM `{$table}` WHERE {$where}";
        $this->applyTenantScope($sql, $params);
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * Ejecuta query raw con validación TenantAwarePDO (Capa 3)
     * Útil para queries complejas que no encajan en helpers arriba
     * 
     * @param array<int|string, mixed> $params
     * @return array<int, array<string, mixed>>
     */
    public function rawSelect(string $sql, array $params = []): array
    {
        $this->applyTenantScope($sql, $params);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Ejecuta DML raw con validación TenantAwarePDO (Capa 3)
     * 
     * @param array<int|string, mixed> $params
     * @return int Filas afectadas
     */
    public function rawExecute(string $sql, array $params = []): int
    {
        $this->applyTenantScope($sql, $params);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * Inicia transacción
     */
    protected function beginTransaction(): void
    {
        $this->pdo->beginTransaction();
    }

    /**
     * Commit transacción
     */
    protected function commit(): void
    {
        $this->pdo->commit();
    }

    /**
     * Rollback transacción
     */
    protected function rollBack(): void
    {
        $this->pdo->rollBack();
    }

    /**
     * Transacción con tenant scope preservado
     * 
     * @template TReturn
     * @param callable(): TReturn $callback
     * @return TReturn
     * @throws Throwable
     */
    public function transactional(callable $callback): mixed
    {
        $this->beginTransaction();
        try {
            $result = $callback();
            $this->commit();
            return $result;
        } catch (Throwable $e) {
            $this->rollBack();
            throw $e;
        }
    }
}