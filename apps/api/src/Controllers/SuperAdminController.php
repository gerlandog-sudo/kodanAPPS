<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DTOs\TenantCreateDTO;
use kodanAPPS\Services\TenantService;
use kodanAPPS\Repositories\TenantRepository;
use kodanAPPS\Repositories\PlanRepository;
use kodanAPPS\Repositories\UserRepository;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;
use RuntimeException;

/**
 * SuperAdminController - Controlador centralizado para administración global
 * 
 * Endpoints:
 * - GET    /api/super-admin/stats          → Métricas globales DB
 * - GET    /api/super-admin/tenants        → Lista tenants con planes/modules
 * - POST   /api/super-admin/tenants        → Crear tenant + admin (transacción)
 * - PATCH  /api/super-admin/tenants/{id}   → Actualizar tenant (plan, nombre)
 * - POST   /api/super-admin/tenants/{id}/deactivate → Desactivar (soft delete)
 * - GET    /api/super-admin/plans          → Lista planes con límites
 * - POST   /api/super-admin/plans          → Crear plan
 * - PATCH  /api/super-admin/plans/{id}     → Actualizar plan (límites en plan_limits)
 * - DELETE /api/super-admin/plans/{id}     → Eliminar plan (si sin tenants)
 * - GET    /api/super-admin/roles          → Lista roles del catálogo
 * - POST   /api/super-admin/roles          → Crear rol
 * - PATCH  /api/super-admin/roles/{id}     → Actualizar rol
 * - DELETE /api/super-admin/roles/{id}     → Eliminar rol (si sin usuarios)
 * - PUT    /api/super-admin/theme          → Guardar preferencia tema (user_configs)
 * 
 * Protección: AuthMiddleware + requireSuperAdmin (JWT + CSRF + tenant sistema)
 * Rate Limit: 5/min mutantes, 60/min lecturas
 * Auditoría: Todas las mutaciones en audit_logs
 */
final class SuperAdminController
{
    private TenantService $tenantService;
    private TenantRepository $tenantRepo;
    private PlanRepository $planRepo;
    private UserRepository $userRepo;

    public function __construct(
        TenantService $tenantService,
        TenantRepository $tenantRepo,
        PlanRepository $planRepo,
        UserRepository $userRepo
    ) {
        $this->tenantService = $tenantService;
        $this->tenantRepo = $tenantRepo;
        $this->planRepo = $planRepo;
        $this->userRepo = $userRepo;
    }

    /**
     * GET /api/super-admin/stats
     * Métricas globales de toda la BD (no telemetría OS)
     * 
     * @return array<string, mixed>
     */
    public function getStats(): array
    {
        return $this->tenantRepo->getGlobalStats();
    }

    /**
     * GET /api/super-admin/tenants
     * Lista todos los tenants con detalles
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listTenants(): array
    {
        return $this->tenantRepo->findAllWithDetails();
    }

    /**
     * POST /api/super-admin/tenants
     * Crea tenant + admin (transacción atómica)
     * 
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     * @throws InvalidArgumentException → 422 con errores estructurados
     * @throws RuntimeException → 500
     */
    public function createTenant(array $input): array
    {
        try {
            $dto = new TenantCreateDTO($input);
            return $this->tenantService->createTenantWithAdmin($dto);
        } catch (InvalidArgumentException $e) {
            $errors = json_decode($e->getMessage(), true) ?? ['general' => $e->getMessage()];
            throw new InvalidArgumentException(json_encode($errors, JSON_UNESCAPED_UNICODE));
        }
    }

    /**
     * PATCH /api/super-admin/tenants/{id}
     * Actualiza tenant (nombre, plan, logo)
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, tenant_id: int}
     */
    public function updateTenant(int $tenantId, array $input): array
    {
        $allowed = ['name', 'subscription_plan_id', 'logo_url'];
        $data = array_intersect_key($input, array_flip($allowed));

        if (empty($data)) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Ningún campo válido para actualizar',
                'errors' => ['general' => 'Proporcione name o subscription_plan_id'],
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        if (isset($data['subscription_plan_id'])) {
            $planId = (int)$data['subscription_plan_id'];
            $planChanged = $this->tenantRepo->hasPlanChanged($tenantId, $planId);
            if ($planChanged) {
                $this->tenantService->changeTenantPlan($tenantId, $planId);
            }
            unset($data['subscription_plan_id']);
        }

        if (!empty($data)) {
            $this->tenantRepo->updateTenant($tenantId, $data);
        }

        $logData = array_intersect_key($input, array_flip(['name', 'subscription_plan_id']));
        if (isset($input['logo_url'])) {
            $logData['logo_changed'] = true;
        }
        $this->auditLog('TENANT_UPDATED', ['tenant_id' => $tenantId, 'changes' => $logData]);

        return ['success' => true, 'tenant_id' => $tenantId];
    }

    /**
     * POST /api/super-admin/tenants/{id}/activate
     * Reactiva tenant: is_active = 1
     * 
     * @return array{success: bool, tenant_id: int, message: string}
     */
    public function activateTenant(int $tenantId): array
    {
        $this->tenantRepo->activateTenant($tenantId);
        $this->auditLog('TENANT_ACTIVATED', ['tenant_id' => $tenantId]);
        return ['success' => true, 'tenant_id' => $tenantId, 'message' => 'Tenant reactivado'];
    }

    /**
     * POST /api/super-admin/tenants/{id}/deactivate
     * Soft delete: is_active = 0 (NO elimina físicamente)
     * 
     * @return array{success: bool, tenant_id: int, message: string}
     */
    public function deactivateTenant(int $tenantId): array
    {
        $tenant = $this->tenantRepo->findByIdWithDetails($tenantId);

        if ((int)$tenant['is_system_tenant'] === 1) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'No se puede desactivar el tenant de sistema',
                'errors' => ['tenant_id' => 'Tenant protegido'],
            ], JSON_UNESCAPED_UNICODE), 403);
        }

        $this->tenantService->deactivateTenant($tenantId);

        return ['success' => true, 'tenant_id' => $tenantId, 'message' => 'Tenant desactivado'];
    }

    /**
     * GET /api/super-admin/plans
     * Lista planes con sus límites (plan_limits relacional)
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listPlans(): array
    {
        return $this->planRepo->findAllWithLimits();
    }

    /**
     * POST /api/super-admin/plans
     * Crea plan nuevo
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, plan_id: int}
     */
    public function createPlan(array $input): array
    {
        $required = ['name', 'price', 'currency', 'limits'];
        foreach ($required as $field) {
            if (!isset($input[$field])) {
                throw new InvalidArgumentException(json_encode([
                    'message' => "Campo requerido: $field",
                    'errors' => [$field => 'Requerido'],
                ], JSON_UNESCAPED_UNICODE), 422);
            }
        }

        if (!is_array($input['limits']) || empty($input['limits'])) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Límites requeridos',
                'errors' => ['limits' => 'Debe proporcionar al menos un límite por módulo'],
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        $planId = $this->planRepo->createPlan(
            $input['name'],
            $input['description'] ?? '',
            (float)$input['price'],
            $input['currency']
        );

        // Insertar límites (plan_limits)
        foreach ($input['limits'] as $limit) {
            $this->planRepo->addLimit(
                $planId,
                $limit['module'],      // 'crm' | 'tracker'
                $limit['metric'],      // 'pipelines_max', 'projects_max', etc.
                (int)$limit['value']   // 0 = ilimitado
            );
        }

        $this->auditLog('PLAN_CREATED', ['plan_id' => $planId, 'name' => $input['name']]);

        return ['success' => true, 'plan_id' => $planId];
    }

    /**
     * PATCH /api/super-admin/plans/{id}
     * Actualiza plan y sus límites
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, plan_id: int}
     */
    public function updatePlan(int $planId, array $input): array
    {
        $allowed = ['name', 'description', 'price', 'currency', 'limits'];
        $data = array_intersect_key($input, array_flip($allowed));
        
        if (empty($data)) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Ningún campo válido para actualizar',
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        if (isset($data['limits'])) {
            $this->planRepo->replaceLimits($planId, $data['limits']);
            unset($data['limits']);
        }

        if (!empty($data)) {
            $this->planRepo->updatePlan($planId, $data);
        }

        $this->auditLog('PLAN_UPDATED', ['plan_id' => $planId, 'changes' => $data]);

        return ['success' => true, 'plan_id' => $planId];
    }

    /**
     * DELETE /api/super-admin/plans/{id}
     * Elimina plan (solo si no tiene tenants asignados)
     * 
     * @return array{success: bool, plan_id: int}
     */
    public function deletePlan(int $planId): array
    {
        // Verificar que no tenga tenants
        $count = (int)$this->planRepo->rawSelect(
            "SELECT COUNT(*) as c FROM tenants WHERE subscription_plan_id = ?",
            [$planId]
        )[0]['c'];

        if ($count > 0) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'No se puede eliminar plan con tenants asignados',
                'errors' => ['plan_id' => "Tiene $count tenant(s) activo(s)"],
            ], JSON_UNESCAPED_UNICODE), 409);
        }

        $this->planRepo->deletePlan($planId);
        $this->auditLog('PLAN_DELETED', ['plan_id' => $planId]);

        return ['success' => true, 'plan_id' => $planId];
    }

    /**
     * PUT /api/super-admin/theme
     * Guarda preferencia de tema en user_configs
     */
    /**
     * GET /api/super-admin/theme
     * Lee preferencia de tema desde user_configs
     * 
     * @return array{theme: string}
     */
    public function getTheme(): array
    {
        $userId = TenantContext::getUserId();
        $result = $this->planRepo->rawSelect(
            "SELECT theme_colors FROM user_configs /* BYPASS_TENANT_SCOPE */
             WHERE user_id = ? AND app_id = 'superadmin'",
            [$userId]
        );

        $theme = 'light';
        if (!empty($result)) {
            $colors = json_decode($result[0]['theme_colors'], true);
            if (isset($colors['theme']) && in_array($colors['theme'], ['light', 'dark'], true)) {
                $theme = $colors['theme'];
            }
        }

        return ['theme' => $theme];
    }

    /**
     * PUT /api/super-admin/theme
     * Guarda preferencia de tema en user_configs
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, theme: string}
     */
    public function updateTheme(array $input): array
    {
        $theme = $input['theme'] ?? '';
        if (!in_array($theme, ['light', 'dark'], true)) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Tema inválido',
                'errors' => ['theme' => 'Valores permitidos: light, dark'],
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        $userId = TenantContext::getUserId();
        $this->planRepo->rawExecute(
            "INSERT INTO user_configs (user_id, app_id, theme_colors) /* BYPASS_TENANT_SCOPE */
             VALUES (?, 'superadmin', ?)
             ON DUPLICATE KEY UPDATE theme_colors = VALUES(theme_colors)",
            [$userId, json_encode(['theme' => $theme])]
        );

        $this->auditLog('THEME_CHANGED', ['theme' => $theme, 'user_id' => $userId]);

        return ['success' => true, 'theme' => $theme];
    }

    /**
     * POST /api/super-admin/change-password
     * Cambia contraseña del superadmin autenticado
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, message: string}
     */
    public function changePassword(array $input): array
    {
        $currentPassword = $input['current_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';

        if ($currentPassword === '' || $newPassword === '') {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Campos requeridos faltantes',
                'errors' => [
                    'current_password' => $currentPassword === '' ? 'Requerido' : null,
                    'new_password' => $newPassword === '' ? 'Requerido' : null,
                ],
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        if (strlen($newPassword) < 8) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Contraseña demasiado corta',
                'errors' => ['new_password' => 'Debe tener al menos 8 caracteres'],
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        $userId = TenantContext::getUserId();

        $user = $this->userRepo->rawSelect(
            "SELECT id, password_hash FROM users /* BYPASS_TENANT_SCOPE */ WHERE id = ?",
            [$userId]
        );

        if (empty($user)) {
            throw new RuntimeException('Usuario no encontrado', 404);
        }

        if (!password_verify($currentPassword, $user[0]['password_hash'])) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Contraseña actual incorrecta',
                'errors' => ['current_password' => 'No coincide con la contraseña actual'],
            ], JSON_UNESCAPED_UNICODE), 403);
        }

        $newHash = password_hash($newPassword, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3,
        ]);

        $this->userRepo->rawExecute(
            "UPDATE users /* BYPASS_TENANT_SCOPE */ SET password_hash = ? WHERE id = ?",
            [$newHash, $userId]
        );

        $this->auditLog('PASSWORD_CHANGED', ['user_id' => $userId]);

        return ['success' => true, 'message' => 'Contraseña actualizada correctamente'];
    }

    /**
     * GET /api/super-admin/roles
     * Lista roles del catálogo global
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listRoles(): array
    {
        return $this->planRepo->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT r.id, r.app_id, r.name, r.description, r.is_active, r.created_at
             FROM roles r ORDER BY r.app_id, r.name"
        );
    }

    /**
     * POST /api/super-admin/roles
     * Crea rol en el catálogo global
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, role_id: int}
     */
    public function createRole(array $input): array
    {
        if (empty($input['app_id']) || empty($input['name'])) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Campos requeridos: app_id, name',
                'errors' => ['app_id' => 'Requerido', 'name' => 'Requerido'],
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        $this->planRepo->rawExecute(
            "/* BYPASS_TENANT_SCOPE */ INSERT INTO roles (app_id, name, description, is_active, created_at)
             VALUES (?, ?, ?, 1, NOW())",
            [$input['app_id'], $input['name'], $input['description'] ?? '']
        );

        $roleId = (int)$this->planRepo->rawSelect("/* BYPASS_TENANT_SCOPE */ SELECT LAST_INSERT_ID() as id")[0]['id'];

        $this->auditLog('ROLE_CREATED', ['role_id' => $roleId, 'app_id' => $input['app_id'], 'name' => $input['name']]);

        return ['success' => true, 'role_id' => $roleId];
    }

    /**
     * PATCH /api/super-admin/roles/{id}
     * Actualiza rol
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, role_id: int}
     */
    public function updateRole(int $roleId, array $input): array
    {
        $allowed = ['name', 'description', 'is_active'];
        $data = array_intersect_key($input, array_flip($allowed));
        if (empty($data)) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Ningún campo válido',
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        $sets = implode(', ', array_map(fn($c) => "`{$c}` = :{$c}", array_keys($data)));
        $data['id'] = $roleId;
        $this->planRepo->rawExecute(
            "/* BYPASS_TENANT_SCOPE */ UPDATE roles SET {$sets} WHERE id = :id",
            $data
        );

        $this->auditLog('ROLE_UPDATED', ['role_id' => $roleId, 'changes' => $data]);

        return ['success' => true, 'role_id' => $roleId];
    }

    /**
     * DELETE /api/super-admin/roles/{id}
     * Elimina rol (solo si no tiene usuarios asignados)
     * 
     * @return array{success: bool, role_id: int}
     */
    public function deleteRole(int $roleId): array
    {
        $count = (int)$this->planRepo->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT COUNT(*) as c FROM user_roles WHERE role_id = ?",
            [$roleId]
        )[0]['c'];

        if ($count > 0) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'No se puede eliminar rol con usuarios asignados',
                'errors' => ['role_id' => "Tiene {$count} usuario(s) asignado(s)"],
            ], JSON_UNESCAPED_UNICODE), 409);
        }

        $this->planRepo->rawExecute(
            "/* BYPASS_TENANT_SCOPE */ DELETE FROM roles WHERE id = ?",
            [$roleId]
        );

        $this->auditLog('ROLE_DELETED', ['role_id' => $roleId]);

        return ['success' => true, 'role_id' => $roleId];
    }

    /**
     * Escribe en audit_logs (tenant_id=0 para Super Admin)
     * 
     * @param array<string, mixed> $details
     */
    private function auditLog(string $action, array $details): void
    {
        $this->tenantRepo->rawExecute(
            "INSERT INTO audit_logs (tenant_id, user_id, action, details) /* BYPASS_TENANT_SCOPE */
             VALUES (?, ?, ?, ?)",
            [TenantContext::getTenantId(), TenantContext::getUserId(), $action, json_encode($details, JSON_UNESCAPED_UNICODE)]
        );
    }
}