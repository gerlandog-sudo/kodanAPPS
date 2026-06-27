<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;
use kodanAPPS\Services\UsageLimitEnforcer;
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

    /** Nombre de tabla. Sobrescribir en cada subclase. */
    protected const TABLE = '';

    /**
     * Nombre de la columna primary key de la tabla.
     * Sobrescribir en subclases si difiere de 'id'.
     */
    protected string $primaryKey = 'id';

    private ?UsageLimitEnforcer $limitEnforcer = null;

    /** Inyectar UsageLimitEnforcer para enforcement automático en create() */
    public function setLimitEnforcer(?UsageLimitEnforcer $enforcer): void
    {
        $this->limitEnforcer = $enforcer;
    }

    /**
     * Declara qué límite aplica a las entidades de este repositorio.
     * Retorna null si no aplica límite (repos de solo lectura o globales).
     * @return array{module: string, metric: string}|null
     */
    abstract protected function getLimitConfig(): ?array;

    /**
     * Verifica límite antes de INSERT si hay UsageLimitEnforcer configurado.
     * Se llama automáticamente en create() cuando $table coincide con static::TABLE.
     */
    protected function enforceLimitIfNeeded(string $table): void
    {
        if ($table !== static::TABLE || $this->limitEnforcer === null) {
            return;
        }
        $config = $this->getLimitConfig();
        if ($config !== null) {
            $this->limitEnforcer->enforce($config['module'], $config['metric']);
        }
    }

    /**
     * Incrementa contador después de INSERT si hay UsageLimitEnforcer configurado.
     * Se llama automáticamente en create() cuando $table coincide con static::TABLE.
     */
    protected function incrementUsageIfNeeded(string $table): void
    {
        if ($table !== static::TABLE || $this->limitEnforcer === null) {
            return;
        }
        $config = $this->getLimitConfig();
        if ($config !== null) {
            $this->limitEnforcer->increment($config['module'], $config['metric']);
        }
    }

    /**
     * Verifica un límite directamente (sin control de tabla).
     * Útil cuando un repo necesita verificar un límite de otro módulo.
     */
    protected function enforceUsageLimit(string $module, string $metric): void
    {
        if ($this->limitEnforcer !== null) {
            $this->limitEnforcer->enforce($module, $metric);
        }
    }

    /**
     * Incrementa un contador de uso directamente (sin control de tabla).
     */
    protected function incrementUsage(string $module, string $metric): void
    {
        if ($this->limitEnforcer !== null) {
            $this->limitEnforcer->increment($module, $metric);
        }
    }

    public function __construct(TenantAwarePDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Obtiene un registro por su primary key
     *
     * @return array<string, mixed>|null
     */
    public function findById(int $id): ?array
    {
        return $this->findOne(static::TABLE, "{$this->primaryKey} = :id", [':id' => $id]);
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

        // Si el query ya tiene una condición tenant_id (con = o IN), no duplicar
        if (preg_match('/\btenant_id\s*(=|IN\s*\()/i', $sql)) {
            // Si usa :tenant_id como placeholder, asegurar que el valor esté en params
            if (str_contains($sql, ':tenant_id')) {
                $params[':tenant_id'] = $tenantId;
            }
            return;
        }
        
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
            $sql = preg_replace('/\s+(ORDER BY|LIMIT)\b/i', ' WHERE tenant_id = :tenant_id $1', $sql, 1) ?? $sql;
            // Si el regex no matcheó (ej. tabla sin trailing whitespace), agregar al final
            if (!str_contains($sql, ':tenant_id')) {
                $sql .= ' WHERE tenant_id = :tenant_id';
            }
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

        $this->enforceLimitIfNeeded($table);

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

        $this->incrementUsageIfNeeded($table);
        
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