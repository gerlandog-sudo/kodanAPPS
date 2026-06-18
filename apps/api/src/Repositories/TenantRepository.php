<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;

/**
 * TenantRepository - Repositorio para tenants
 * 
 * @extends BaseRepository<array{tenant_id: int, name: string, logo_url: string|null, subscription_plan_id: int|null, is_active: int, is_system_tenant: int, created_at: string}>
 *
 * Extiende BaseRepository (Capa 1) + usa TenantAwarePDO (Capa 3).
 * Super Admin opera en tenant sistema, pero queries usan tenant_id explícito.
 * 
 * NOTA: tenant_apps fue eliminado — el plan determina apps disponibles.
 */
final class TenantRepository extends BaseRepository
{
    protected const TABLE = 'tenants';

    public function __construct(TenantAwarePDO $pdo)
    {
        parent::__construct($pdo);
    }

    /**
     * Lista todos los tenants con plan y módulos del plan
     * 
     * @return array<int, array<string, mixed>>
     */
    public function findAllWithDetails(): array
    {
        $sql = "
            /* BYPASS_TENANT_SCOPE */
            SELECT 
                t.tenant_id,
                t.name,
                t.logo_url,
                t.is_active,
                t.is_system_tenant,
                t.subscription_plan_id,
                t.created_at,
                sp.name AS plan_name,
                sp.price AS plan_price,
                sp.currency AS plan_currency
            FROM tenants t
            LEFT JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
            ORDER BY t.created_at DESC
        ";
        
        $tenants = $this->rawSelect($sql);
        
        // Obtener módulos del plan para cada tenant
        foreach ($tenants as &$tenant) {
            $planId = $tenant['subscription_plan_id'];
            $tenant['apps'] = [];
            if ($planId !== null) {
                $tenant['apps'] = $this->rawSelect(
                    "/* BYPASS_TENANT_SCOPE */ SELECT DISTINCT module AS app_id, TRUE AS is_active FROM plan_limits WHERE plan_id = ? ORDER BY module",
                    [(int)$planId]
                );
            }
        }
        
        return $tenants;
    }

    /**
     * Busca tenant por ID con detalles
     * 
     * @return array<string, mixed>
     */
    public function findByIdWithDetails(int $tenantId): array
    {
        $sql = "
            /* BYPASS_TENANT_SCOPE */
            SELECT 
                t.tenant_id,
                t.name,
                t.logo_url,
                t.is_active,
                t.is_system_tenant,
                t.subscription_plan_id,
                t.created_at,
                sp.name AS plan_name,
                sp.price AS plan_price,
                sp.currency AS plan_currency
            FROM tenants t
            LEFT JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
            WHERE t.tenant_id = :tenant_id
        ";
        
        $results = $this->rawSelect($sql, [':tenant_id' => $tenantId]);
        $tenant = $results[0] ?? null;
        
        if ($tenant === null) {
            throw new \RuntimeException('Tenant no encontrado.', 404);
        }
        
        if ($tenant['subscription_plan_id'] !== null) {
            $tenant['apps'] = $this->rawSelect(
                "/* BYPASS_TENANT_SCOPE */ SELECT DISTINCT module AS app_id, TRUE AS is_active FROM plan_limits WHERE plan_id = ? ORDER BY module",
                [(int)$tenant['subscription_plan_id']]
            );
        } else {
            $tenant['apps'] = [];
        }
        
        return $tenant;
    }

    /**
     * Crea tenant nuevo
     * 
     * @return int Nuevo tenant_id
     */
    public function createTenant(string $name, int $subscriptionPlanId, ?string $logoUrl = null): int
    {
        return $this->create(self::TABLE, [
            'name' => $name,
            'subscription_plan_id' => $subscriptionPlanId,
            'logo_url' => $logoUrl,
            'is_active' => 1,
            'is_system_tenant' => 0,
        ]);
    }

    /**
     * Actualiza tenant
     * 
     * @param array<string, mixed> $data
     * @return bool True si actualizó
     */
    public function updateTenant(int $tenantId, array $data): bool
    {
        // No permitir cambiar is_system_tenant ni tenant_id
        unset($data['tenant_id'], $data['is_system_tenant'], $data['created_at'], $data['updated_at']);
        
        if (empty($data)) {
            return false;
        }
        
        $rows = $this->update(self::TABLE, $data, '/* BYPASS_TENANT_SCOPE */ tenant_id = :tenant_id', [':tenant_id' => $tenantId]);
        return $rows > 0;
    }

    /**
     * Desactiva tenant (soft delete) - NO elimina físicamente
     * 
     * @return bool True si desactivó
     * @throws InvalidArgumentException Si intenta desactivar tenant de sistema
     */
    /**
     * Activa tenant
     * 
     * @return bool True si activó
     */
    public function activateTenant(int $tenantId): bool
    {
        $rows = $this->update(self::TABLE, [
            'is_active' => 1,
        ], '/* BYPASS_TENANT_SCOPE */ tenant_id = :tenant_id', [':tenant_id' => $tenantId]);
        
        return $rows > 0;
    }

    /**
     * Desactiva tenant (soft delete) - NO elimina físicamente
     * 
     * @return bool True si desactivó
     * @throws InvalidArgumentException Si intenta desactivar tenant de sistema
     */
    public function deactivateTenant(int $tenantId): bool
    {
        // Verificar que no sea tenant de sistema
        $tenant = $this->findOne(self::TABLE, '/* BYPASS_TENANT_SCOPE */ tenant_id = :id', [':id' => $tenantId], 'is_system_tenant');
        if ($tenant !== null && (int)$tenant['is_system_tenant'] === 1) {
            throw new InvalidArgumentException('Cannot deactivate system tenant');
        }
        
        $rows = $this->update(self::TABLE, [
            'is_active' => 0,
        ], '/* BYPASS_TENANT_SCOPE */ tenant_id = :tenant_id', [':tenant_id' => $tenantId]);
        
        return $rows > 0;
    }

    /**
     * Verifica si el plan del tenant es diferente al especificado
     */
    public function hasPlanChanged(int $tenantId, int $newPlanId): bool
    {
        $current = $this->findOne(self::TABLE, '/* BYPASS_TENANT_SCOPE */ tenant_id = :id', [':id' => $tenantId], 'subscription_plan_id');
        return $current === null || (int)$current['subscription_plan_id'] !== $newPlanId;
    }

    /**
     * Cambia plan de suscripción del tenant
     * 
     * @return bool True si cambió
     */
    public function changePlan(int $tenantId, int $newPlanId): bool
    {
        $rows = $this->update(self::TABLE, [
            'subscription_plan_id' => $newPlanId,
        ], '/* BYPASS_TENANT_SCOPE */ tenant_id = :tenant_id', [':tenant_id' => $tenantId]);
        
        return $rows > 0;
    }

    /**
     * Obtiene estadísticas globales (para SuperAdminDashboard)
     * 
     * @return array<string, mixed>
     */
    public function getGlobalStats(): array
    {
        // Total tenants
        $totalTenants = (int)$this->rawSelect("/* BYPASS_TENANT_SCOPE */ SELECT COUNT(*) as c FROM tenants")[0]['c'];
        $activeTenants = (int)$this->rawSelect("/* BYPASS_TENANT_SCOPE */ SELECT COUNT(*) as c FROM tenants WHERE is_active = 1")[0]['c'];
        
        // Total users
        $totalUsers = (int)$this->rawSelect("/* BYPASS_TENANT_SCOPE */ SELECT COUNT(*) as c FROM users")[0]['c'];
        $superAdmins = (int)$this->rawSelect("/* BYPASS_TENANT_SCOPE */ SELECT COUNT(*) as c FROM users WHERE is_super_admin = 1")[0]['c'];
        
        // Revenue (MRR estimado)
        $revenue = $this->rawSelect("
            /* BYPASS_TENANT_SCOPE */
            SELECT COALESCE(SUM(sp.price), 0) as mrr
            FROM tenants t
            JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
            WHERE t.is_active = 1 AND sp.deleted_at IS NULL
        ")[0]['mrr'];
        
        // API calls 24h (desde login_attempts como proxy)
        $apiCalls = (int)$this->rawSelect("
            /* BYPASS_TENANT_SCOPE */
            SELECT COUNT(*) as c FROM login_attempts 
            WHERE attempted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ")[0]['c'];
        
        // DB size
        $dbSize = $this->rawSelect("
            /* BYPASS_TENANT_SCOPE */
            SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
        ")[0]['size_mb'] ?? 0;
        
        // Audit logs count
        $auditLogsCount = (int)$this->rawSelect("/* BYPASS_TENANT_SCOPE */ SELECT COUNT(*) as c FROM audit_logs")[0]['c'];
        
        // Plans in use
        $plansCount = (int)$this->rawSelect("
            /* BYPASS_TENANT_SCOPE */
            SELECT COUNT(DISTINCT subscription_plan_id) as c FROM tenants 
            WHERE subscription_plan_id IS NOT NULL
        ")[0]['c'];
        
        // Billing totals
        $billingTotal = (float)$this->rawSelect("
            /* BYPASS_TENANT_SCOPE */
            SELECT COALESCE(SUM(amount), 0) as total FROM tenant_invoices
        ")[0]['total'];
        
        $billingPaid = (float)$this->rawSelect("
            /* BYPASS_TENANT_SCOPE */
            SELECT COALESCE(SUM(amount), 0) as total FROM tenant_invoices WHERE status = 'paid'
        ")[0]['total'];
        
        $billingPending = (float)$this->rawSelect("
            /* BYPASS_TENANT_SCOPE */
            SELECT COALESCE(SUM(amount), 0) as total FROM tenant_invoices WHERE status = 'pending'
        ")[0]['total'];
        
        $billingOverdue = (float)$this->rawSelect("
            /* BYPASS_TENANT_SCOPE */
            SELECT COALESCE(SUM(amount), 0) as total FROM tenant_invoices WHERE status = 'overdue'
        ")[0]['total'];
        
        // Top tenants by user count
        $topTenants = $this->rawSelect("
            /* BYPASS_TENANT_SCOPE */
            SELECT t.tenant_id, t.name, t.name as display_name, COUNT(u.id) as user_count
            FROM tenants t
            LEFT JOIN users u ON u.tenant_id = t.tenant_id
            GROUP BY t.tenant_id
            ORDER BY user_count DESC
            LIMIT 5
        ");
        
        // DB version
        $dbVersion = $this->rawSelect("/* BYPASS_TENANT_SCOPE */ SELECT VERSION() as v")[0]['v'] ?? 'Unknown';
        
        // Memory
        $memoryUsage = round(memory_get_usage(true) / 1024 / 1024, 1);
        $memoryLimit = ini_get('memory_limit') ?: 'Unknown';
        
        return [
            'tenants_total' => $totalTenants,
            'tenants_active' => $activeTenants,
            'tenants_inactive' => $totalTenants - $activeTenants,
            'users_total' => $totalUsers,
            'super_admins' => $superAdmins,
            'revenue_mrr_usd' => (float)$revenue,
            'api_calls_24h' => $apiCalls,
            'db_size_mb' => (float)$dbSize,
            'metrics' => [
                'tenants_count' => $totalTenants,
                'active_tenants_count' => $activeTenants,
                'users_count' => $totalUsers,
                'admin_users_count' => $superAdmins,
                'audit_logs_count' => $auditLogsCount,
                'plans_count' => $plansCount,
            ],
            'billing' => [
                'total' => $billingTotal,
                'paid' => $billingPaid,
                'pending' => $billingPending,
                'overdue' => $billingOverdue,
            ],
            'telemetry' => [
                'php_version' => PHP_VERSION,
                'memory_usage' => $memoryUsage,
                'memory_limit' => $memoryLimit,
                'db_version' => $dbVersion,
                'db_size_mb' => (float)$dbSize,
                'status' => 'SALUDABLE',
            ],
            'top_tenants' => $topTenants,
        ];
    }
}
