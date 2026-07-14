<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DTOs\TenantCreateDTO;
use kodanAPPS\Services\TenantService;
use kodanAPPS\Services\RecountStrategyInterface;
use kodanAPPS\Services\UsageTrackerInterface;
use kodanAPPS\Services\TenantOverrideManager;
use kodanAPPS\Repositories\TenantRepository;
use kodanAPPS\Repositories\PlanRepository;
use kodanAPPS\Repositories\UserRepository;
use kodanAPPS\DB\TenantContext;
use kodanAPPS\DB\TenantAwarePDO;
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
    private TenantOverrideManager $overrideManager;
    private UsageTrackerInterface $usageTracker;
    private TenantAwarePDO $pdo;

    /** @var array<string, RecountStrategyInterface> */
    private array $recounters;

    /**
     * @param array<string, RecountStrategyInterface> $recounters
     */
    public function __construct(
        TenantService $tenantService,
        TenantRepository $tenantRepo,
        PlanRepository $planRepo,
        UserRepository $userRepo,
        TenantOverrideManager $overrideManager,
        UsageTrackerInterface $usageTracker,
        TenantAwarePDO $pdo,
        array $recounters = []
    ) {
        $this->tenantService = $tenantService;
        $this->tenantRepo = $tenantRepo;
        $this->planRepo = $planRepo;
        $this->userRepo = $userRepo;
        $this->overrideManager = $overrideManager;
        $this->usageTracker = $usageTracker;
        $this->pdo = $pdo;
        $this->recounters = $recounters;
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
        } catch (\RuntimeException $e) {
            error_log('SuperAdminController::createTenant - ' . $e->getMessage());
            throw $e;
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
            "/* BYPASS_TENANT_SCOPE */ SELECT COUNT(*) as c FROM tenants WHERE subscription_plan_id = ?",
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
            "/* BYPASS_TENANT_SCOPE */ SELECT r.id, r.app_id, r.name, r.description, r.is_active, r.can_approve, r.created_at
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

        $canApprove = isset($input['can_approve']) ? (int)$input['can_approve'] : 0;
        $this->planRepo->rawExecute(
            "/* BYPASS_TENANT_SCOPE */ INSERT INTO roles (app_id, name, description, is_active, can_approve, created_at)
             VALUES (?, ?, ?, 1, ?, NOW())",
            [$input['app_id'], strtolower(trim($input['name'])), $input['description'] ?? '', $canApprove]
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
        $allowed = ['name', 'description', 'is_active', 'can_approve'];
        $data = array_intersect_key($input, array_flip($allowed));
        if (empty($data)) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Ningún campo válido',
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        if (isset($data['name'])) {
            $data['name'] = strtolower(trim($data['name']));
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
     * Recuenta contadores de tenant_plan_usage desde datos reales
     * 
     * @return array{success: bool, results: array<string, int>}
     */
    public function recountUsage(): array
    {
        $results = [];

        $tenants = $this->tenantRepo->rawSelect(
            "SELECT tenant_id FROM tenants WHERE is_active = 1"
        );
        $tenantIds = array_map(fn($r) => (int)$r['tenant_id'], $tenants);

        foreach ($this->recounters as $module => $strategy) {
            $count = 0;
            foreach ($tenantIds as $tid) {
                $strategy->recount($tid, $this->pdo);
                $count++;
            }
            $results[$module] = $count;
        }

        $this->auditLog('USAGE_RECALCULATED', $results);

        return ['success' => true, 'results' => $results];
    }

    /**
     * ============================================================
     * App Metrics CRUD
     * ============================================================
     */

    /**
     * GET /api/super-admin/app-metrics
     * @return array<int, array<string, mixed>>
     */
    public function listAppMetrics(): array
    {
        return $this->planRepo->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT * FROM app_metrics ORDER BY app_id, sort_order"
        );
    }

    /**
     * POST /api/super-admin/app-metrics/{app}
     * @param array<string, mixed> $input
     * @return array{success: bool, metric: string}
     */
    public function createAppMetric(string $app, array $input): array
    {
        if (empty($input['metric']) || empty($input['label'])) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Campos requeridos: metric, label',
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        $this->planRepo->rawExecute(
            "/* BYPASS_TENANT_SCOPE */ INSERT INTO app_metrics (app_id, metric, label, description, metric_type, default_value, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $app,
                $input['metric'],
                $input['label'],
                $input['description'] ?? '',
                $input['metric_type'] ?? 'limit_entity',
                (int)($input['default_value'] ?? 0),
                (int)($input['sort_order'] ?? 0),
            ]
        );

        $this->auditLog('APP_METRIC_CREATED', ['app' => $app, 'metric' => $input['metric']]);

        return ['success' => true, 'metric' => $input['metric']];
    }

    /**
     * PATCH /api/super-admin/app-metrics/{app}/{metric}
     * @param array<string, mixed> $input
     * @return array{success: bool}
     */
    public function updateAppMetric(string $app, string $metric, array $input): array
    {
        $allowed = ['label', 'description', 'metric_type', 'default_value', 'is_active', 'sort_order'];
        $data = array_intersect_key($input, array_flip($allowed));

        if (empty($data)) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'No hay campos válidos para actualizar',
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        $sets = implode(', ', array_map(fn($c) => "`{$c}` = :{$c}", array_keys($data)));
        $data['app_id'] = $app;
        $data['metric'] = $metric;
        $this->planRepo->rawExecute(
            "/* BYPASS_TENANT_SCOPE */ UPDATE app_metrics SET {$sets} WHERE app_id = :app_id AND metric = :metric",
            $data
        );

        $this->auditLog('APP_METRIC_UPDATED', ['app' => $app, 'metric' => $metric, 'changes' => $data]);

        return ['success' => true];
    }

    /**
     * DELETE /api/super-admin/app-metrics/{app}/{metric}
     * @return array{success: bool}
     */
    public function deleteAppMetric(string $app, string $metric): array
    {
        $this->planRepo->rawExecute(
            "/* BYPASS_TENANT_SCOPE */ DELETE FROM app_metrics WHERE app_id = ? AND metric = ?",
            [$app, $metric]
        );

        $this->auditLog('APP_METRIC_DELETED', ['app' => $app, 'metric' => $metric]);

        return ['success' => true];
    }

    /**
     * ============================================================
     * Apps CRUD
     * ============================================================
     */

    /**
     * GET /api/super-admin/apps
     * @return array<int, array<string, mixed>>
     */
    public function listApps(): array
    {
        return $this->planRepo->rawSelect(
            "SELECT app_id, name, description, is_active, created_at /* BYPASS_TENANT_SCOPE */
             FROM apps ORDER BY name"
        );
    }

    /**
     * POST /api/super-admin/apps
     * @param array<string, mixed> $input
     * @return array{success: bool, app_id: string}
     */
    public function createApp(array $input): array
    {
        if (empty($input['app_id']) || empty($input['name'])) {
            throw new \InvalidArgumentException(json_encode([
                'message' => 'Campos requeridos: app_id, name',
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        $appId = preg_replace('/[^a-z0-9_]/', '', strtolower($input['app_id']));
        if (strlen($appId) < 2) {
            throw new \InvalidArgumentException(json_encode([
                'message' => 'app_id debe tener al menos 2 caracteres (a-z, 0-9, _)',
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        $this->planRepo->rawExecute(
            "INSERT INTO apps (app_id, name, description, is_active) /* BYPASS_TENANT_SCOPE */
             VALUES (?, ?, ?, ?)",
            [
                $appId,
                $input['name'],
                $input['description'] ?? '',
                (int)($input['is_active'] ?? 1),
            ]
        );

        $this->auditLog('APP_CREATED', ['app_id' => $appId, 'name' => $input['name']]);

        return ['success' => true, 'app_id' => $appId];
    }

    /**
     * PUT /api/super-admin/apps/{appId}
     * @param array<string, mixed> $input
     * @return array{success: bool}
     */
    public function updateApp(string $appId, array $input): array
    {
        $allowed = ['name', 'description', 'is_active'];
        $data = array_intersect_key($input, array_flip($allowed));

        if (empty($data)) {
            throw new \InvalidArgumentException(json_encode([
                'message' => 'No hay campos válidos para actualizar',
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        $sets = implode(', ', array_map(fn($c) => "`{$c}` = :{$c}", array_keys($data)));
        $data['app_id'] = $appId;
        $this->planRepo->rawExecute(
            "UPDATE apps SET {$sets} /* BYPASS_TENANT_SCOPE */ WHERE app_id = :app_id",
            $data
        );

        $this->auditLog('APP_UPDATED', ['app_id' => $appId, 'changes' => $data]);

        return ['success' => true];
    }

    /**
     * DELETE /api/super-admin/apps/{appId}
     * @return array{success: bool}
     */
    public function deleteApp(string $appId): array
    {
        $this->planRepo->rawExecute(
            "DELETE FROM apps /* BYPASS_TENANT_SCOPE */ WHERE app_id = ?",
            [$appId]
        );

        $this->auditLog('APP_DELETED', ['app_id' => $appId]);

        return ['success' => true];
    }

    /**
     * ============================================================
     * Tenant Usage & Overrides
     * ============================================================
     */

    /**
     * GET /api/super-admin/tenants/{tenantId}/usage
     * @return array<string, mixed>
     */
    public function getTenantUsage(int $tenantId): array
    {
        $modules = $this->usageTracker->getContractedApps($tenantId);
        $usage = [];

        // Obtener módulos contratados
        $modules = $this->planRepo->rawSelect(
            "SELECT DISTINCT pl.module
             FROM tenants t
             JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
             JOIN plan_limits pl ON pl.plan_id = sp.id
             WHERE t.tenant_id = ?",
            [$tenantId]
        );

        // Para obtener todas las métricas del tenant usando v_tenant_plan_limits
        $rows = $this->planRepo->rawSelect(
            "SELECT module, metric,
                    CASE WHEN override_value IS NOT NULL THEN override_value ELSE plan_limit END AS limit_value,
                    COALESCE(current_usage, 0) AS current_usage,
                    has_capacity
             FROM v_tenant_plan_limits
             WHERE tenant_id = ?
             ORDER BY module, metric",
            [$tenantId]
        );

        $overrides = $this->overrideManager->getOverrides($tenantId);

        return [
            'modules' => array_column($modules, 'module'),
            'limits' => $rows,
            'overrides' => $overrides,
            'tenant_id' => $tenantId,
        ];
    }

    /**
     * POST /api/super-admin/tenants/{tenantId}/overrides
     * @param array<string, mixed> $input
     * @return array{success: bool, override: array<string, mixed>}
     */
    public function setTenantOverride(int $tenantId, array $input): array
    {
        $module = $input['module'] ?? '';
        $metric = $input['metric'] ?? '';
        $customValue = (int)($input['custom_value'] ?? 0);

        if (empty($module) || empty($metric)) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Campos requeridos: module, metric',
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        $this->overrideManager->setOverride($tenantId, $module, $metric, $customValue);

        $this->auditLog('TENANT_OVERRIDE_SET', [
            'tenant_id' => $tenantId,
            'module' => $module,
            'metric' => $metric,
            'custom_value' => $customValue,
        ]);

        return [
            'success' => true,
            'override' => [
                'tenant_id' => $tenantId,
                'module' => $module,
                'metric' => $metric,
                'custom_value' => $customValue,
            ],
        ];
    }

    /**
     * DELETE /api/super-admin/tenants/{tenantId}/overrides/{module}/{metric}
     * @return array{success: bool}
     */
    public function clearTenantOverride(int $tenantId, string $module, string $metric): array
    {
        $this->overrideManager->clearOverride($tenantId, $module, $metric);

        $this->auditLog('TENANT_OVERRIDE_CLEARED', [
            'tenant_id' => $tenantId,
            'module' => $module,
            'metric' => $metric,
        ]);

        return ['success' => true];
    }

    /**
     * GET /api/super-admin/backups
     * Lista los backups disponibles en el servidor
     * 
     * @return array<int, array{filename: string, size: int, size_human: string, date: string, encrypted: bool}>
     */
    public function getBackups(): array
    {
        $backupDir = '/opt/kodanapps/backups';
        if (!is_dir($backupDir)) {
            return [];
        }

        $files = glob($backupDir . '/db_backup_*');
        if ($files === false || empty($files)) {
            return [];
        }

        // Ordenar por fecha descendente (más reciente primero)
        rsort($files);
        $backups = [];

        foreach (array_slice($files, 0, 50) as $file) {
            if (!is_file($file)) continue;
            $stat = stat($file);
            $backups[] = [
                'filename' => basename($file),
                'size' => $stat['size'],
                'size_human' => $this->formatBytes($stat['size']),
                'date' => date('Y-m-d H:i:s', $stat['mtime']),
                'encrypted' => str_ends_with($file, '.enc'),
            ];
        }

        return $backups;
    }

    /**
     * DELETE /api/super-admin/backups
     * Elimina un archivo de backup
     * 
     * @param string $filename Nombre del archivo a eliminar (ej: db_backup_xxx.sql.gz.enc)
     * @return array{success: bool, message: string}
     */
    public function deleteBackup(string $filename): array
    {
        $backupDir = '/opt/kodanapps/backups';
        
        // Validar que el filename solo contenga caracteres seguros
        if (!preg_match('/^db_backup_[\w\-\.]+\.(sql\.gz\.enc|sql\.gz)$/', $filename)) {
            throw new \RuntimeException('Nombre de archivo inválido', 400);
        }

        $filePath = $backupDir . '/' . $filename;
        
        // Evitar path traversal
        $realPath = realpath($filePath);
        if ($realPath === false || !str_starts_with($realPath, realpath($backupDir))) {
            throw new \RuntimeException('Archivo no encontrado', 404);
        }

        if (!file_exists($realPath)) {
            throw new \RuntimeException('Archivo no encontrado', 404);
        }

        if (!unlink($realPath)) {
            throw new \RuntimeException('Error al eliminar el archivo de backup', 500);
        }

        $this->auditLog('BACKUP_DELETE', [
            'filename' => $filename,
            'size' => filesize($realPath) ?: 0,
        ]);

        return [
            'success' => true,
            'message' => 'Backup eliminado correctamente',
        ];
    }

    /**
     * POST /api/super-admin/backups
     * Ejecuta un backup manual
     * 
     * @return array{success: bool, message: string}
     */
    public function runBackup(): array
    {
        $backupScript = '/opt/kodanapps/scripts/backup-db.sh';
        
        if (!file_exists($backupScript)) {
            // Intentar desde la ruta alternativa dentro del contenedor
            $backupScript = '/var/www/html/scripts/backup-db.sh';
        }

        if (!file_exists($backupScript)) {
            throw new \RuntimeException('Script de backup no encontrado en el servidor', 500);
        }

        // Ejecutar el script de backup (background, timeout 120s)
        $output = [];
        $returnCode = 0;
        exec('/bin/sh ' . escapeshellarg($backupScript) . ' 2>&1', $output, $returnCode);

        if ($returnCode !== 0) {
            throw new \RuntimeException('Error ejecutando backup: ' . implode("\n", $output), 500);
        }

        $this->auditLog('BACKUP_MANUAL', [
            'result' => implode("\n", $output),
        ]);

        return [
            'success' => true,
            'message' => 'Backup ejecutado correctamente',
            'output' => $output,
        ];
    }

    /**
     * Formatea bytes a formato legible
     */
    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        return round($bytes / pow(1024, $pow), $precision) . ' ' . $units[$pow];
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