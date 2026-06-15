<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DTOs\TenantCreateDTO;
use kodanAPPS\Services\TenantService;
use kodanAPPS\Repositories\TenantRepository;
use kodanAPPS\Repositories\PlanRepository;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;
use RuntimeException;

/**
 * SuperAdminController - Controlador centralizado para administración global
 * 
 * Endpoints:
 * - GET    /api/super-admin/stats          → Métricas globales DB
 * - GET    /api/super-admin/tenants        → Lista tenants con planes/apps
 * - POST   /api/super-admin/tenants        → Crear tenant + admin (transacción)
 * - PATCH  /api/super-admin/tenants/{id}   → Actualizar tenant (plan, nombre)
 * - POST   /api/super-admin/tenants/{id}/deactivate → Desactivar (soft delete)
 * - GET    /api/super-admin/plans          → Lista planes con límites
 * - POST   /api/super-admin/plans          → Crear plan
 * - PATCH  /api/super-admin/plans/{id}     → Actualizar plan (límites en plan_limits)
 * - DELETE /api/super-admin/plans/{id}     → Eliminar plan (si sin tenants)
 * - PUT    /api/super-admin/theme          → Guardar preferencia tema (user_configs)
 * 
 * Protección: SuperAdminMiddleware (JWT + CSRF + tenant_id verification)
 * Rate Limit: 5/min mutantes, 60/min lecturas
 * Auditoría: Todas las mutaciones en audit_logs
 */
final class SuperAdminController
{
    private TenantService $tenantService;
    private TenantRepository $tenantRepo;
    private PlanRepository $planRepo;

    public function __construct(
        TenantService $tenantService,
        TenantRepository $tenantRepo,
        PlanRepository $planRepo
    ) {
        $this->tenantService = $tenantService;
        $this->tenantRepo = $tenantRepo;
        $this->planRepo = $planRepo;
    }

    /**
     * GET /api/super-admin/stats
     * Métricas globales de toda la BD (no telemetría OS)
     */
    public function getStats(): array
    {
        return $this->tenantRepo->getGlobalStats();
    }

    /**
     * GET /api/super-admin/tenants
     * Lista todos los tenants con detalles
     */
    public function listTenants(): array
    {
        return $this->tenantRepo->findAllWithDetails();
    }

    /**
     * POST /api/super-admin/tenants
     * Crea tenant + admin (transacción atómica)
     * 
     * @throws InvalidArgumentException → 422 con errores estructurados
     * @throws RuntimeException → 500
     */
    public function createTenant(array $input): array
    {
        try {
            $dto = new TenantCreateDTO($input);
        } catch (InvalidArgumentException $e) {
            $errors = json_decode($e->getMessage(), true) ?? ['general' => $e->getMessage()];
            throw new InvalidArgumentException(json_encode([
                'message' => 'Datos de entrada inválidos',
                'errors' => $errors,
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        return $this->tenantService->createTenantWithAdmin($dto);
    }

    /**
     * PATCH /api/super-admin/tenants/{id}
     * Actualiza tenant (nombre, plan)
     */
    public function updateTenant(int $tenantId, array $input): array
    {
        $allowed = ['name', 'subscription_plan_id'];
        $data = array_intersect_key($input, array_flip($allowed));
        
        if (empty($data)) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Ningún campo válido para actualizar',
                'errors' => ['general' => 'Proporcione name o subscription_plan_id'],
            ], JSON_UNESCAPED_UNICODE), 422);
        }

        if (isset($data['subscription_plan_id'])) {
            $this->tenantService->changeTenantPlan(
                $tenantId,
                (int)$data['subscription_plan_id'],
                TenantContext::getUserId()
            );
        } else {
            $this->tenantRepo->updateTenant($tenantId, $data);
            $this->auditLog('TENANT_UPDATED', ['tenant_id' => $tenantId, 'changes' => $data]);
        }

        return ['success' => true, 'tenant_id' => $tenantId];
    }

    /**
     * POST /api/super-admin/tenants/{id}/deactivate
     * Soft delete: is_active = 0 (NO elimina físicamente)
     */
    public function deactivateTenant(int $tenantId): array
    {
        // Verificar que no sea tenant de sistema
        $tenant = $this->tenantRepo->findByIdWithDetails($tenantId);
        if ($tenant === null) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Tenant no encontrado',
                'errors' => ['tenant_id' => 'No existe'],
            ], JSON_UNESCAPED_UNICODE), 404);
        }

        if ((int)$tenant['is_system_tenant'] === 1) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'No se puede desactivar el tenant de sistema',
                'errors' => ['tenant_id' => 'Tenant protegido'],
            ], JSON_UNESCAPED_UNICODE), 403);
        }

        $this->tenantService->deactivateTenant($tenantId, TenantContext::getUserId());

        return ['success' => true, 'tenant_id' => $tenantId, 'message' => 'Tenant desactivado'];
    }

    /**
     * GET /api/super-admin/plans
     * Lista planes con sus límites (plan_limits relacional)
     */
    public function listPlans(): array
    {
        return $this->planRepo->findAllWithLimits();
    }

    /**
     * POST /api/super-admin/plans
     * Crea plan nuevo
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

        $planId = $this->planRepo->create(
            $input['name'],
            $input['description'] ?? '',
            (float)$input['price'],
            $input['currency']
        );

        // Insertar límites (plan_limits)
        foreach ($input['limits'] as $limit) {
            $this->planRepo->addLimit(
                $planId,
                $limit['module'],      // 'crm' | 'tracker' | 'api'
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
            $this->planRepo->update($planId, $data);
        }

        $this->auditLog('PLAN_UPDATED', ['plan_id' => $planId, 'changes' => $data]);

        return ['success' => true, 'plan_id' => $planId];
    }

    /**
     * DELETE /api/super-admin/plans/{id}
     * Elimina plan (solo si no tiene tenants asignados)
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

        $this->planRepo->delete($planId);
        $this->auditLog('PLAN_DELETED', ['plan_id' => $planId]);

        return ['success' => true, 'plan_id' => $planId];
    }

    /**
     * PUT /api/super-admin/theme
     * Guarda preferencia de tema en user_configs
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
            "INSERT INTO user_configs (user_id, app_id, theme_colors)
             VALUES (?, 'superadmin', ?)
             ON DUPLICATE KEY UPDATE theme_colors = VALUES(theme_colors)",
            [$userId, json_encode(['theme' => $theme])]
        );

        $this->auditLog('THEME_CHANGED', ['theme' => $theme]);

        return ['success' => true, 'theme' => $theme];
    }

    /**
     * Escribe en audit_logs (tenant_id=0 para Super Admin)
     */
    private function auditLog(string $action, array $details): void
    {
        $this->tenantRepo->rawExecute(
            "INSERT INTO audit_logs (tenant_id, user_id, action, details)
             VALUES (0, ?, ?, ?)",
            [TenantContext::getUserId(), $action, json_encode($details, JSON_UNESCAPED_UNICODE)]
        );
    }
}