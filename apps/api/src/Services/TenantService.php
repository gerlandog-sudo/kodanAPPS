<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\DTOs\TenantCreateDTO;
use kodanAPPS\Repositories\TenantRepository;
use kodanAPPS\Repositories\UserRepository;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;
use RuntimeException;

/**
 * TenantService - Orquesta creación completa de tenant (Blueprint Punto 1.D)
 * 
 * Transacción atómica:
 * 1. Crea tenant en `tenants`
 * 2. Inserta apps habilitadas en `tenant_apps`
 * 3. Inicializa contadores en `tenant_plan_usage` (0 para todas métricas del plan)
 * 4. Crea usuario admin en `users` (password temporal Argon2id)
 * 5. Asigna roles admin en apps habilitadas + superadmin en `user_apps`
 * 6. Genera token set-password en `password_resets` (email al admin)
 * 7. Auditoria en `audit_logs`
 * 
 * Cualquier error → rollback completo.
 */
final class TenantService
{
    private TenantRepository $tenantRepo;
    private UserRepository $userRepo;

    public function __construct(
        TenantRepository $tenantRepo,
        UserRepository $userRepo
    ) {
        $this->tenantRepo = $tenantRepo;
        $this->userRepo = $userRepo;
    }

    /**
     * Crea tenant completo con admin
     * 
     * @return array{
     *     tenant_id: int,
     *     slug: string,
     *     admin_user_id: int,
     *     set_password_token: string,
     *     set_password_url: string
     * }
     * @throws InvalidArgumentException Si validación falla
     * @throws RuntimeException Si error en transacción
     */
    public function createTenantWithAdmin(TenantCreateDTO $dto): array
    {
        // Validaciones pre-transacción
        if ($this->tenantRepo->slugExists($dto->slug)) {
            throw new InvalidArgumentException(json_encode(['slug' => 'El slug ya existe'], JSON_UNESCAPED_UNICODE));
        }
        
        if ($this->userRepo->emailExists($dto->adminEmail)) {
            throw new InvalidArgumentException(json_encode(['admin_email' => 'El email ya está registrado'], JSON_UNESCAPED_UNICODE));
        }

        return $this->tenantRepo->transactional(function () use ($dto) {
            // ------------------------------------------------------------
            // 1. Crear tenant
            // ------------------------------------------------------------
            $tenantId = $this->tenantRepo->createTenant(
                $dto->name,
                $dto->slug,
                $dto->subscriptionPlanId
            );

            // ------------------------------------------------------------
            // 2. Sincronizar apps habilitadas
            // ------------------------------------------------------------
            $this->tenantRepo->syncApps($tenantId, $dto->enabledApps);

            // ------------------------------------------------------------
            // 3. Inicializar tenant_plan_usage (contadores a 0)
            // ------------------------------------------------------------
            $this->initializePlanUsage($tenantId, $dto->subscriptionPlanId);

            // ------------------------------------------------------------
            // 4. Crear usuario admin (password temporal)
            // ------------------------------------------------------------
            $tempPassword = $this->generateSecurePassword(16);
            $passwordHash = password_hash($tempPassword, PASSWORD_ARGON2ID, [
                'memory_cost' => 65536,
                'time_cost' => 4,
                'threads' => 3,
            ]);

            $adminUserId = $this->userRepo->createUser([
                'tenant_id' => $tenantId,
                'email' => $dto->adminEmail,
                'password_hash' => $passwordHash,
                'display_name' => $dto->adminName,
                'is_super_admin' => 0, // Admin de tenant, no super admin global
                'is_active' => 1,
            ]);

            // ------------------------------------------------------------
            // 5. Asignar roles en apps habilitadas + superadmin
            // ------------------------------------------------------------
            $appsWithRoles = $dto->enabledApps;
            $appsWithRoles[] = 'superadmin'; // Acceso a panel Super Admin
            
            foreach ($appsWithRoles as $appId) {
                $this->userRepo->assignRole($adminUserId, $appId, 'admin');
            }

            // ------------------------------------------------------------
            // 6. Generar token set-password (tabla password_resets)
            // ------------------------------------------------------------
            $setPasswordToken = bin2hex(random_bytes(32)); // 64 chars hex
            $this->createSetPasswordToken($dto->adminEmail, $setPasswordToken);

            // ------------------------------------------------------------
            // 7. Auditoria
            // ------------------------------------------------------------
            $this->auditLog(
                tenantId: 0, // sistema
                userId: TenantContext::getUserId(),
                action: 'TENANT_CREATED',
                details: [
                    'tenant_id' => $tenantId,
                    'slug' => $dto->slug,
                    'name' => $dto->name,
                    'plan_id' => $dto->subscriptionPlanId,
                    'apps' => $dto->enabledApps,
                    'admin_user_id' => $adminUserId,
                    'admin_email' => $dto->adminEmail,
                ]
            );

            // ------------------------------------------------------------
            // Retorno para email de activación
            // ------------------------------------------------------------
            $setPasswordUrl = sprintf(
                '%s/set-password?token=%s&email=%s',
                $_ENV['SUPERADMIN_URL'] ?? 'https://superadmin.kodan.software',
                $setPasswordToken,
                urlencode($dto->adminEmail)
            );

            return [
                'tenant_id' => $tenantId,
                'slug' => $dto->slug,
                'admin_user_id' => $adminUserId,
                'set_password_token' => $setPasswordToken,
                'set_password_url' => $setPasswordUrl,
            ];
        });
    }

    /**
     * Desactiva tenant (soft delete) con auditoría
     * 
     * @throws InvalidArgumentException Si tenant de sistema
     */
    public function deactivateTenant(int $tenantId, int $superAdminUserId): void
    {
        $this->tenantRepo->deactivateTenant($tenantId);
        
        $this->auditLog(
            tenantId: 0,
            userId: $superAdminUserId,
            action: 'TENANT_DEACTIVATED',
            details: ['tenant_id' => $tenantId]
        );
    }

    /**
     * Cambia plan de tenant con auditoría
     */
    public function changeTenantPlan(int $tenantId, int $newPlanId, int $superAdminUserId): void
    {
        $this->tenantRepo->changePlan($tenantId, $newPlanId);
        
        // Reinicializar contadores para nuevo plan
        $this->initializePlanUsage($tenantId, $newPlanId);
        
        $this->auditLog(
            tenantId: 0,
            userId: $superAdminUserId,
            action: 'TENANT_PLAN_CHANGED',
            details: ['tenant_id' => $tenantId, 'new_plan_id' => $newPlanId]
        );
    }

    /**
     * Inicializa tenant_plan_usage para todas las métricas del plan
     * Contadores a 0 (primer uso hará UPDATE +1)
     */
    private function initializePlanUsage(int $tenantId, int $planId): void
    {
        $this->tenantRepo->rawExecute(
            "INSERT INTO tenant_plan_usage (tenant_id, module, metric, current_value)
             SELECT ?, pl.module, pl.metric, 0
             FROM plan_limits pl WHERE pl.plan_id = ?
             ON DUPLICATE KEY UPDATE current_value = 0",
            [$tenantId, $planId]
        );
    }

    /**
     * Genera token set-password en tabla password_resets
     * TTL: 1 hora
     */
    private function createSetPasswordToken(string $email, string $token): void
    {
        $tokenHash = password_hash($token, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3,
        ]);
        $expiresAt = (new \DateTime())->modify('+1 hour')->format('Y-m-d H:i:s');

        $this->tenantRepo->rawExecute(
            "INSERT INTO password_resets (email, token_hash, expires_at)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), expires_at = VALUES(expires_at), created_at = CURRENT_TIMESTAMP()",
            [$email, $tokenHash, $expiresAt]
        );
    }

    /**
     * Genera password seguro (16 chars, alta entropía)
     */
    private function generateSecurePassword(int $length = 16): string
    {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        $bytes = random_bytes($length);
        $password = '';
        for ($i = 0; $i < $length; $i++) {
            $password .= $chars[$bytes[$i] % strlen($chars)];
        }
        return $password;
    }

    /**
     * Escribe en audit_logs (tenant_id=0 para acciones de sistema/Super Admin)
     */
    private function auditLog(int $tenantId, int $userId, string $action, array $details): void
    {
        $this->tenantRepo->rawExecute(
            "INSERT INTO audit_logs (tenant_id, user_id, action, details)
             VALUES (?, ?, ?, ?)",
            [$tenantId, $userId, $action, json_encode($details, JSON_UNESCAPED_UNICODE)]
        );
    }
}