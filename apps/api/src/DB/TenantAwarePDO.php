<?php

declare(strict_types=1);

namespace kodanAPPS\DB;

use PDO;
use PDOStatement;
use RuntimeException;

/**
 * TenantAwarePDO - Capa 3 de defensa multi-tenant (Blueprint Punto 2)
 * 
 * Wrapper sobre PDO que intercepta SQL raw y valida presencia de tenant_id
 * en todo DML (INSERT/UPDATE/DELETE). Lanza excepción en non-prod; log crítico en prod.
 * 
 * NO reemplaza BaseRepository (Capa 1) ni TenantAwareQueryBuilder (Capa 2).
 * Es RED DE SEGURIDAD FINAL para queries raw, migraciones, hotfixes.
 */
final class TenantAwarePDO extends PDO
{
    private bool $strictMode;

    public function __construct(
        string $dsn,
        string $username,
        string $password,
        array $options = [],
        bool $strictMode = true
    ) {
        $this->strictMode = $strictMode;
        parent::__construct($dsn, $username, $password, $options);
    }

    public function prepare(string $statement, array $driverOptions = []): PDOStatement|false
    {
        $stmt = parent::prepare($statement, $driverOptions);
        if ($stmt === false) {
            return false;
        }
        return new TenantAwarePDOStatement($stmt, $this, $statement);
    }

    public function exec(string $statement): int|false
    {
        $this->assertTenantScope($statement, 'exec');
        return parent::exec($statement);
    }

    public function query(string $statement): PDOStatement|false
    {
        $this->assertTenantScope($statement, 'query');
        return parent::query($statement);
    }

    /**
     * Valida que DML tenga tenant_id en WHERE/SET
     * 
     * @throws RuntimeException En non-prod si falta tenant_id
     */
    private function assertTenantScope(string $sql, string $method): void
    {
        // Solo validar DML mutante
        if (!preg_match('/^\s*(INSERT|UPDATE|DELETE)\s+/i', $sql)) {
            return; // SELECT, DDL, etc. no requieren tenant_id obligatorio
        }

        // Permitir patrones válidos de tenant_id:
        // - tenant_id = ?
        // - tenant_id = :tenant_id
        // - `tenant_id` = ?
        // - `tenant_id` IN (...)
        // - tenant_id IS NULL (para tareas globales en tasks_master)
        $hasTenantScope = preg_match(
            '/\btenant_id\s*(=|IN\s*\()/i',
            $sql
        ) === 1;

        // Excepción: INSERT en tenants (crear tenant) no tiene tenant_id aún
        $isTenantInsert = preg_match('/^\s*INSERT\s+INTO\s+[`"]?tenants[`"]?\s+/i', $sql) === 1;

        // Excepción: DELETE en tenants con is_system_tenant check (trigger lo maneja)
        $isTenantDelete = preg_match('/^\s*DELETE\s+FROM\s+[`"]?tenants[`"]?\s+/i', $sql) === 1;

        if (!$hasTenantScope && !$isTenantInsert && !$isTenantDelete) {
            $msg = "[TENANT_SCOPE_MISSING] $method: $sql";
            error_log($msg);
            
            if ($this->strictMode) {
                throw new RuntimeException($msg);
            }
        }
    }
}

/**
 * TenantAwarePDOStatement - Wrapper sobre PDOStatement
 * Valida tenant_id en execute() para prepared statements
 */
final class TenantAwarePDOStatement
{
    private PDOStatement $stmt;
    private TenantAwarePDO $pdo;
    private string $originalSql;

    public function __construct(PDOStatement $stmt, TenantAwarePDO $pdo, string $originalSql)
    {
        $this->stmt = $stmt;
        $this->pdo = $pdo;
        $this->originalSql = $originalSql;
    }

    public function execute(array $params = []): bool
    {
        $this->pdo->assertTenantScope($this->originalSql, 'execute');
        return $this->stmt->execute($params);
    }

    // Proxy methods a PDOStatement interno
    public function fetch(int $mode = PDO::FETCH_BOTH): mixed { return $this->stmt->fetch($mode); }
    public function fetchAll(int $mode = PDO::FETCH_BOTH): array { return $this->stmt->fetchAll($mode); }
    public function fetchColumn(int $column = 0): mixed { return $this->stmt->fetchColumn($column); }
    public function rowCount(): int { return $this->stmt->rowCount(); }
    public function closeCursor(): bool { return $this->stmt->closeCursor(); }
    public function setFetchMode(int $mode, ...$args): bool { return $this->stmt->setFetchMode($mode, ...$args); }
    public function getColumnMeta(int $column): array|false { return $this->stmt->getColumnMeta($column); }
    public function nextRowset(): bool { return $this->stmt->nextRowset(); }
    public function errorCode(): string { return $this->stmt->errorCode(); }
    public function errorInfo(): array { return $this->stmt->errorInfo(); }
    public function bindParam(mixed &$param, int $type = PDO::PARAM_STR, int $maxlen = 0, mixed $driverdata = null): bool { return $this->stmt->bindParam($param, $type, $maxlen, $driverdata); }
    public function bindValue(mixed $param, mixed $value, int $type = PDO::PARAM_STR): bool { return $this->stmt->bindValue($param, $value, $type); }
    public function bindColumn(mixed $column, mixed &$param, int $type = PDO::PARAM_STR, int $maxlen = 0, mixed $driverdata = null): bool { return $this->stmt->bindColumn($column, $param, $type, $maxlen, $driverdata); }
    public function debugDumpParams(): void { $this->stmt->debugDumpParams(); }
}