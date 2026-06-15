<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;

/**
 * TenantRepository - Repositorio para tenants y tenant_apps
 * 
 * Extiende BaseRepository (Capa 1) + usa TenantAwarePDO (Capa 3).
 * Super Admin opera en tenant sistema, pero queries usan tenant_id explícito.
 */
final class TenantRepository extends BaseRepository
{
    public function __construct(TenantAwarePDO $pdo)
    {
        parent::__construct($pdo);
    }

    /**
     * Lista todos los tenants con plan y apps habilitadas
     * 
     * @return array<int, array<string, mixed>>
     */
    public function findAllWithDetails(): array
    {
        $sql = "
            /* BYPASS_TENANT_SCOPE */
            SELECT 
                t.tenant_id,
                t.slug,
                t.name,
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
        
        // Agregar apps habilitadas por tenant
        foreach ($tenants as &$tenant) {
            $tenant['apps'] = $this->getEnabledApps((int)$tenant['tenant_id']);
        }
        
        return $tenants;
    }

    /**
     * Busca tenant por ID con detalles
     * 
     * @return array<string, mixed>|null
     */
    public function findByIdWithDetails(int $tenantId): ?array
    {
        $sql = "
            /* BYPASS_TENANT_SCOPE */
            SELECT 
                t.tenant_id,
                t.slug,
                t.name,
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
        
        if ($tenant !== null) {
            $tenant['apps'] = $this->getEnabledApps($tenantId);
        }
        
        return $tenant;
    }

    /**
     * Obtiene apps habilitadas para un tenant
     * 
     * @return array<int, array{app_id: string, is_active: bool}>
     */
    public function getEnabledApps(int $tenantId): array
    {
        return $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT app_id, is_active FROM tenant_apps WHERE tenant_id = ? ORDER BY app_id",
            [$tenantId]
        );
    }

    /**
     * Crea tenant nuevo (solo tabla tenants)
     * 
     * @return int Nuevo tenant_id
     */
    public function createTenant(string $name, string $slug, int $subscriptionPlanId): int
    {
        return $this->create('tenants', [
            'name' => $name,
            'slug' => $slug,
            'subscription_plan_id' => $subscriptionPlanId,
            'is_active' => 1,
            'is_system_tenant' => 0,
        ]);
    }

    /**
     * Actualiza tenant
     * 
     * @return bool True si actualizó
     */
    public function updateTenant(int $tenantId, array $data): bool
    {
        // No permitir cambiar is_system_tenant ni tenant_id
        unset($data['tenant_id'], $data['is_system_tenant'], $data['created_at']);
        
        if (empty($data)) {
            return false;
        }
        
        $data['updated_at'] = date('Y-m-d H:i:s');
        $rows = $this->update('tenants', $data, '/* BYPASS_TENANT_SCOPE */ tenant_id = :tenant_id', [':tenant_id' => $tenantId]);
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
        $tenant = $this->findOne('tenants', '/* BYPASS_TENANT_SCOPE */ tenant_id = :id', [':id' => $tenantId], 'is_system_tenant');
        if ($tenant !== null && (int)$tenant['is_system_tenant'] === 1) {
            throw new InvalidArgumentException('Cannot deactivate system tenant');
        }
        
        $rows = $this->update('tenants', [
            'is_active' => 0,
            'updated_at' => date('Y-m-d H:i:s'),
        ], '/* BYPASS_TENANT_SCOPE */ tenant_id = :tenant_id', [':tenant_id' => $tenantId]);
        
        return $rows > 0;
    }

    /**
     * Cambia plan de suscripción del tenant
     * 
     * @return bool True si cambió
     */
    public function changePlan(int $tenantId, int $newPlanId): bool
    {
        $rows = $this->update('tenants', [
            'subscription_plan_id' => $newPlanId,
            'updated_at' => date('Y-m-d H:i:s'),
        ], '/* BYPASS_TENANT_SCOPE */ tenant_id = :tenant_id', [':tenant_id' => $tenantId]);
        
        return $rows > 0;
    }

    /**
     * Sincroniza apps habilitadas (reemplaza todas)
     * 
     * @param array<string> $appIds Ej: ['crm', 'tracker']
     * @return void
     */
    public function syncApps(int $tenantId, array $appIds): void
    {
        $allowedApps = ['crm', 'tracker', 'superadmin'];
        $appIds = array_intersect($appIds, $allowedApps);
        
        $this->transactional(function () use ($tenantId, $appIds) {
            // Desactivar todas
            $this->rawExecute(
                "/* BYPASS_TENANT_SCOPE */ UPDATE tenant_apps SET is_active = 0 WHERE tenant_id = ?",
                [$tenantId]
            );
            
            // Activar/crear seleccionadas
            foreach ($appIds as $appId) {
                $this->rawExecute(
                    "/* BYPASS_TENANT_SCOPE */ INSERT INTO tenant_apps (tenant_id, app_id, is_active) VALUES (?, ?, 1)
                     ON DUPLICATE KEY UPDATE is_active = 1",
                    [$tenantId, $appId]
                );
            }
        });
    }

    /**
     * Verifica si slug existe
     * 
     * @return bool
     */
    public function slugExists(string $slug, ?int $excludeTenantId = null): bool
    {
        $sql = "/* BYPASS_TENANT_SCOPE */ SELECT 1 FROM tenants WHERE slug = ?";
        $params = [$slug];
        
        if ($excludeTenantId !== null) {
            $sql .= " AND tenant_id != ?";
            $params[] = $excludeTenantId;
        }
        
        $result = $this->rawSelect($sql, $params);
        return !empty($result);
    }

    /**
     * Obtiene estadísticas globales (para SuperAdminDashboard)
     * 
     * @return array<string, int|float>
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
        
        return [
            'tenants_total' => $totalTenants,
            'tenants_active' => $activeTenants,
            'tenants_inactive' => $totalTenants - $activeTenants,
            'users_total' => $totalUsers,
            'super_admins' => $superAdmins,
            'revenue_mrr_usd' => (float)$revenue,
            'api_calls_24h' => $apiCalls,
            'db_size_mb' => (float)$dbSize,
        ];
    }
}