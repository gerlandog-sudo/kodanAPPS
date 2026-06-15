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
        // Configurar clase de sentencia personalizada de forma nativa para interceptar execute()
        $this->setAttribute(PDO::ATTR_STATEMENT_CLASS, [TenantAwarePDOStatement::class, [$this]]);
    }

    public function exec(string $statement): int|false
    {
        $this->assertTenantScope($statement, 'exec');
        return parent::exec($statement);
    }

    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false
    {
        $this->assertTenantScope($query, 'query');
        if ($fetchMode === null) {
            return parent::query($query);
        }
        return parent::query($query, $fetchMode, ...$fetchModeArgs);
    }

    /**
     * Valida que DML tenga tenant_id en WHERE/SET
     * 
     * @throws RuntimeException En non-prod si falta tenant_id
     */
    public function assertTenantScope(string $sql, string $method): void
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

        // Excepción: Operaciones en tablas globales de planes y límites o que no contienen tenant_id
        $isGlobalTable = preg_match('/^\s*(INSERT|UPDATE|DELETE)\s+(INTO|FROM)?\s*[`"]?(subscription_plans|plan_limits|user_apps|user_configs|login_attempts|password_resets)[`"]?\b/i', $sql) === 1;

        if (!$hasTenantScope && !$isTenantInsert && !$isTenantDelete && !$isGlobalTable) {
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
final class TenantAwarePDOStatement extends PDOStatement
{
    private TenantAwarePDO $pdo;

    protected function __construct(TenantAwarePDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function execute(?array $params = null): bool
    {
        $this->pdo->assertTenantScope($this->queryString, 'execute');
        return parent::execute($params);
    }
}