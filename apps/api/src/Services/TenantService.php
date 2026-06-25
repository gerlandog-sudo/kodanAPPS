<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\DTOs\TenantCreateDTO;
use kodanAPPS\Repositories\TenantRepository;
use kodanAPPS\Repositories\UserRepository;
use kodanAPPS\DB\TenantContext;
use kodanAPPS\Services\UsageTrackerInterface;
use InvalidArgumentException;
use RuntimeException;

/**
 * TenantService - Orquesta creación completa de tenant
 * 
 * Transacción atómica:
 * 1. Crea tenant en `tenants` (name, plan, logo_url)
 * 2. Determina apps disponibles por plan (plan_limits.module)
 * 3. Inicializa contadores en `tenant_plan_usage`
 * 4. Crea usuario admin con contraseña hasheada (Argon2id)
 * 5. Asigna rol admin en apps del plan via `user_roles`
 * 6. Guarda tema por defecto en `user_configs`
 * 7. Auditoría en `audit_logs`
 * 
 * NOTA: Ya no usa tenant_apps ni user_apps.
 * El plan determina las apps disponibles (plan_limits).
 * Los roles se asignan vía user_roles → roles globales.
 * 
 * Cualquier error → rollback completo.
 */
final class TenantService
{
    private TenantRepository $tenantRepo;
    private UserRepository $userRepo;
    private UsageTrackerInterface $usageTracker;

    public function __construct(
        TenantRepository $tenantRepo,
        UserRepository $userRepo,
        UsageTrackerInterface $usageTracker
    ) {
        $this->tenantRepo = $tenantRepo;
        $this->userRepo = $userRepo;
        $this->usageTracker = $usageTracker;
    }

    /**
     * Crea tenant completo con admin
     * 
     * @return array{
     *     tenant_id: int,
     *     admin_user_id: int
     * }
     * @throws InvalidArgumentException Si validación falla
     * @throws RuntimeException Si error en transacción
     */
    public function createTenantWithAdmin(TenantCreateDTO $dto): array
    {
        // Verificar email único antes de la transacción
        if ($this->userRepo->emailExists($dto->adminEmail)) {
            throw new InvalidArgumentException(
                json_encode(['admin_email' => 'El email ya está registrado'], JSON_UNESCAPED_UNICODE)
            );
        }

        return $this->tenantRepo->transactional(function () use ($dto) {
            // ------------------------------------------------------------
            // 1. Crear tenant
            // ------------------------------------------------------------
            $tenantId = $this->tenantRepo->createTenant(
                $dto->name,
                $dto->subscriptionPlanId,
                $dto->logoUrl
            );

            // ------------------------------------------------------------
            // 2. Obtener módulos disponibles según el plan (plan_limits.module)
            // ------------------------------------------------------------
            $planModules = $this->getPlanModules($dto->subscriptionPlanId);

            // ------------------------------------------------------------
            // 3. Inicializar tenant_plan_usage (contadores a 0)
            // ------------------------------------------------------------
            $this->initializePlanUsage($tenantId, $dto->subscriptionPlanId);

            // ------------------------------------------------------------
            // 4. Crear usuario admin (password directo Argon2id)
            // ------------------------------------------------------------
            $passwordHash = password_hash($dto->adminPassword, PASSWORD_ARGON2ID, [
                'memory_cost' => 65536,
                'time_cost' => 4,
                'threads' => 3,
            ]);

            $adminUserId = $this->userRepo->createUser([
                'tenant_id' => $tenantId,
                'email' => $dto->adminEmail,
                'password_hash' => $passwordHash,
                'display_name' => $dto->adminName,
                'is_super_admin' => 0,
                'is_active' => 1,
            ]);

            foreach ($planModules as $module) {
                $this->usageTracker->increment($module, 'users_max', 1);
            }

            // ------------------------------------------------------------
            // 5. Asignar rol admin al primer usuario en apps del plan
            // ------------------------------------------------------------
            $adminRoleIds = $this->getAdminRoleIdsByApp($planModules);
            foreach ($adminRoleIds as $appId => $roleId) {
                $this->userRepo->assignRoleToApp($adminUserId, $appId, $roleId);
            }

            // ------------------------------------------------------------
            // 6. Guardar tema por defecto en user_configs
            // ------------------------------------------------------------
            $themeJson = json_encode(['theme' => $dto->themePreference]);
            foreach (['superadmin', 'crm'] as $appId) {
                $this->tenantRepo->rawExecute(
                    "INSERT INTO user_configs (user_id, app_id, theme_colors) /* BYPASS_TENANT_SCOPE */
                     VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE theme_colors = VALUES(theme_colors)",
                    [$adminUserId, $appId, $themeJson]
                );
            }

            // ------------------------------------------------------------
            // 7. Auditoría
            // ------------------------------------------------------------
            $this->auditLog(
                tenantId: TenantContext::getTenantId(),
                userId: TenantContext::getUserId(),
                action: 'TENANT_CREATED',
                details: [
                    'tenant_id' => $tenantId,
                    'name' => $dto->name,
                    'plan_id' => $dto->subscriptionPlanId,
                    'modules' => $planModules,
                    'admin_user_id' => $adminUserId,
                    'admin_email' => $dto->adminEmail,
                    'theme' => $dto->themePreference,
                ]
            );

            return [
                'tenant_id' => $tenantId,
                'admin_user_id' => $adminUserId,
            ];
        });
    }

    /**
     * Desactiva tenant (soft delete) con auditoría
     * 
     * @throws InvalidArgumentException Si tenant de sistema
     */
    public function deactivateTenant(int $tenantId): void
    {
        $this->tenantRepo->deactivateTenant($tenantId);
        
        $this->auditLog(
            tenantId: TenantContext::getTenantId(),
            userId: TenantContext::getUserId() ?: 0,
            action: 'TENANT_DEACTIVATED',
            details: ['tenant_id' => $tenantId]
        );
    }

    /**
     * Cambia plan de tenant con auditoría
     */
    public function changeTenantPlan(int $tenantId, int $newPlanId): void
    {
        $this->tenantRepo->changePlan($tenantId, $newPlanId);
        
        $this->initializePlanUsage($tenantId, $newPlanId);
        
        $this->auditLog(
            tenantId: TenantContext::getTenantId(),
            userId: TenantContext::getUserId() ?: 0,
            action: 'TENANT_PLAN_CHANGED',
            details: ['tenant_id' => $tenantId, 'new_plan_id' => $newPlanId]
        );
    }

    /**
     * Obtiene módulos (apps) incluidos en un plan desde plan_limits
     * 
     * @return array<string> Ej: ['crm', 'tracker']
     */
    private function getPlanModules(int $planId): array
    {
        $rows = $this->tenantRepo->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT DISTINCT module FROM plan_limits WHERE plan_id = ?",
            [$planId]
        );
        return array_map(fn($r) => $r['module'], $rows);
    }

    /**
     * Obtiene role_id 'admin' para cada app
     * 
     * @param array<string> $modules
     * @return array<string, int> [app_id => role_id]
     */
    private function getAdminRoleIdsByApp(array $modules): array
    {
        $result = [];
        foreach ($modules as $appId) {
            $rows = $this->tenantRepo->rawSelect(
                "/* BYPASS_TENANT_SCOPE */ SELECT id FROM roles WHERE app_id = ? AND name = 'admin' AND is_active = 1 LIMIT 1",
                [$appId]
            );
            if (!empty($rows)) {
                $result[$appId] = (int)$rows[0]['id'];
            }
        }
        return $result;
    }

    /**
     * Inicializa tenant_plan_usage para todas las métricas del plan
     */
    private function initializePlanUsage(int $tenantId, int $planId): void
    {
        $this->usageTracker->initializeTenant($tenantId, $planId);
    }

    /**
     * Escribe en audit_logs (tenant_id=0 para acciones de sistema/Super Admin)
     */
    /**
     * @param array<string, mixed> $details
     */
    private function auditLog(int $tenantId, int $userId, string $action, array $details): void
    {
        $this->tenantRepo->rawExecute(
            "/* BYPASS_TENANT_SCOPE */ INSERT INTO audit_logs (tenant_id, user_id, action, details)
             VALUES (?, ?, ?, ?)",
            [$tenantId, $userId, $action, json_encode($details, JSON_UNESCAPED_UNICODE)]
        );
    }
}
