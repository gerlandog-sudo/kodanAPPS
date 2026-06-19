<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;
use kodanAPPS\Repositories\UserRepository;
use InvalidArgumentException;
use RuntimeException;
use DateTime;

final class AuthController
{
    private UserRepository $userRepo;
    private string $jwtSecret;
    private int $systemTenantId;
    private string $cookieDomain;
    private TenantAwarePDO $pdo;

    public function __construct(
        UserRepository $userRepo,
        string $jwtSecret,
        int $systemTenantId,
        TenantAwarePDO $pdo,
        string $cookieDomain = ''
    ) {
        $this->userRepo = $userRepo;
        $this->jwtSecret = $jwtSecret;
        $this->systemTenantId = $systemTenantId;
        $this->pdo = $pdo;
        $this->cookieDomain = $cookieDomain;
    }

    /**
     * POST /api/auth/login
     * 
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function login(array $input): array
    {
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';
        $appId = $input['app_id'] ?? '';

        if ($email === '' || $password === '' || $appId === '') {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Campos requeridos faltantes',
                'errors' => [
                    'email' => $email === '' ? 'Requerido' : null,
                    'password' => $password === '' ? 'Requerido' : null,
                    'app_id' => $appId === '' ? 'Requerido' : null,
                ]
            ]));
        }

        // Buscar usuario
        $user = $this->userRepo->findByEmail($email);
        if ($user === null) {
            throw new RuntimeException('Credenciales inválidas', 401);
        }

        // Verificar password
        if (!password_verify($password, $user['password_hash'])) {
            throw new RuntimeException('Credenciales inválidas', 401);
        }

        // Si es el panel superadmin, validar privilegios (sin plan_limits)
        if ($appId === 'superadmin') {
            if ((int)$user['is_super_admin'] !== 1) {
                throw new RuntimeException('Acceso denegado: privilegios de Super Admin requeridos.', 403);
            }
            if ((int)$user['tenant_id'] !== $this->systemTenantId) {
                throw new RuntimeException('Acceso denegado: el Super Admin debe operar desde el tenant del sistema.', 403);
            }
            // Super Admin pasa directo, sin chequear roles
            return $this->buildLoginResponse($user, $appId, []);
        }

        // Validar que el plan del tenant incluya esta app (plan_limits.module)
        $tenantPlanId = $this->userRepo->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT subscription_plan_id FROM tenants WHERE tenant_id = ? AND is_active = 1",
            [(int)$user['tenant_id']]
        );
        if (empty($tenantPlanId) || $tenantPlanId[0]['subscription_plan_id'] === null) {
            throw new RuntimeException('Acceso denegado: tenant sin plan asignado.', 403);
        }
        $planId = (int)$tenantPlanId[0]['subscription_plan_id'];
        $appAvailable = $this->userRepo->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT 1 FROM plan_limits WHERE plan_id = ? AND module = ? LIMIT 1",
            [$planId, $appId]
        );
        if (empty($appAvailable)) {
            throw new RuntimeException('Acceso denegado: la aplicación no está incluida en el plan del tenant.', 403);
        }

        // Obtener roles en la app especificada (user_roles + roles)
        $allRoles = $this->userRepo->getUserRoles((int)$user['id']);
        $roles = [];
        foreach ($allRoles as $roleRow) {
            if ($roleRow['app_id'] === $appId) {
                $roles[] = $roleRow['role'];
            }
        }

        return $this->buildLoginResponse($user, $appId, $roles);
    }

    /**
     * POST /api/auth/set-password
     * 
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function setPassword(array $input): array
    {
        $email = strtolower(trim($input['email'] ?? ''));
        $token = $input['token'] ?? '';
        $password = $input['password'] ?? '';

        if ($email === '' || $token === '' || $password === '') {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Campos requeridos faltantes',
                'errors' => [
                    'email' => $email === '' ? 'Requerido' : null,
                    'token' => $token === '' ? 'Requerido' : null,
                    'password' => $password === '' ? 'Requerido' : null,
                ]
            ]));
        }

        if (strlen($password) < 8) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Contraseña demasiado corta',
                'errors' => ['password' => 'Debe tener al menos 8 caracteres']
            ]));
        }

        // Consultar password_resets
        // Dado que password_resets no tiene tenant_id y es una tabla de seguridad global,
        // necesitamos usar un bypass de tenant scope o realizar la consulta directamente.
        $resets = $this->userRepo->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT token_hash, expires_at FROM password_resets WHERE email = ?",
            [$email]
        );

        if (empty($resets)) {
            throw new RuntimeException('Token inválido o expirado', 400);
        }

        $reset = $resets[0];
        
        // Verificar expiración
        $expiresAt = new DateTime($reset['expires_at']);
        if ($expiresAt < new DateTime()) {
            throw new RuntimeException('Token expirado', 400);
        }

        // Verificar hash del token
        if (!password_verify($token, $reset['token_hash'])) {
            throw new RuntimeException('Token inválido', 400);
        }

        // Generar hash de la nueva contraseña con Argon2id
        $passwordHash = password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3,
        ]);

        // Actualizar usuario (usamos bypass para actualizar sin restricciones de tenant si es admin de sistema)
        $this->userRepo->rawExecute(
            "/* BYPASS_TENANT_SCOPE */ UPDATE users SET password_hash = ?, is_active = 1 WHERE email = ?",
            [$passwordHash, $email]
        );

        // Eliminar token usado
        $this->userRepo->rawExecute(
            "/* BYPASS_TENANT_SCOPE */ DELETE FROM password_resets WHERE email = ?",
            [$email]
        );

        return [
            'success' => true,
            'message' => 'Contraseña configurada exitosamente.'
        ];
    }

    /**
     * Construye respuesta de login + JWT en cookie HttpOnly (sin refresh token)
     * 
     * @param array{id: int, tenant_id: int, email: string, password_hash: string, display_name: string, is_super_admin: int, language: string, is_active: int, created_at: string} $user
     * @param string[] $roles
     * @return array<string, mixed>
     */
    private function buildLoginResponse(array $user, string $appId, array $roles): array
    {
        $jwtTtl = 14400; // 4 horas
        $issuedAt = time();
        $expiresAt = $issuedAt + $jwtTtl;
        $payload = [
            'sub' => (int)$user['id'],
            'tid' => (int)$user['tenant_id'],
            'iat' => $issuedAt,
            'exp' => $expiresAt,
            'roles' => $roles,
            'app_id' => $appId,
            'is_super_admin' => (int)$user['is_super_admin'],
        ];

        $jwt = $this->generateJwt($payload);

        $cookieSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
        setcookie("access_token_{$appId}", $jwt, [
            'expires' => $expiresAt,
            'path' => '/',
            'domain' => $this->cookieDomain,
            'secure' => $cookieSecure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);

        return [
            'success' => true,
            'user' => [
                'id' => (int)$user['id'],
                'email' => $user['email'],
                'display_name' => $user['display_name'],
                'is_super_admin' => (int)$user['is_super_admin'] === 1,
            ],
            'app_id' => $appId,
            'roles' => $roles,
        ];
    }

    /**
     * GET /api/auth/validate
     *
     * Valida sesión activa (requiere AuthMiddleware), retorna user + roles + plan_status genérico.
     *
     * @return array<string, mixed>
     */
    public function validate(): array
    {
        $tenantId = TenantContext::getTenantId();
        $userId = TenantContext::getUserId();
        $roles = TenantContext::getRoles();
        $appId = TenantContext::getAppId();

        $user = $this->userRepo->findById($userId);
        if ($user === null) {
            throw new RuntimeException('Usuario no encontrado', 401);
        }

        $stmt = $this->pdo->prepare("
            SELECT module, metric, limit_value, current_usage, has_capacity
            FROM v_tenant_plan_limits
            WHERE tenant_id = ? AND module = ?
        ");
        $stmt->execute([$tenantId, $appId]);
        $planStatus = $stmt->fetchAll();

        $planStmt = $this->pdo->prepare("
            SELECT sp.name
            FROM tenants t
            JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
            WHERE t.tenant_id = ?
        ");
        $planStmt->execute([$tenantId]);
        $planName = $planStmt->fetchColumn();

        return [
            'authenticated' => true,
            'user' => [
                'id' => $userId,
                'email' => $user['email'],
                'display_name' => $user['display_name'],
                'is_super_admin' => (int)$user['is_super_admin'] === 1,
            ],
            'roles' => $roles,
            'app_id' => $appId,
            'plan_status' => $planStatus ?: [],
            'plan_name' => $planName ?: 'Free',
        ];
    }

    /**
     * POST /api/auth/logout
     *
     * Limpia cookie del access token (sin refresh tokens).
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function logout(array $input): array
    {
        $appId = $input['app_id'] ?? '';
        if ($appId === '') {
            throw new InvalidArgumentException(json_encode([
                'message' => 'app_id requerido',
            ]));
        }

        $cookieSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
        $expired = time() - 3600;

        setcookie("access_token_{$appId}", '', [
            'expires' => $expired,
            'path' => '/',
            'domain' => $this->cookieDomain,
            'secure' => $cookieSecure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);

        return ['success' => true];
    }

    /**
     * Generación de JWT compatible con AuthMiddleware
     * 
     * @param array<string, mixed> $payload
     */
    private function generateJwt(array $payload): string
    {
        $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
        $payloadJson = json_encode($payload);

        $headerB64 = $this->base64UrlEncode($header);
        $payloadB64 = $this->base64UrlEncode($payloadJson);

        $signature = hash_hmac('sha256', "$headerB64.$payloadB64", $this->jwtSecret, true);
        $signatureB64 = $this->base64UrlEncode($signature);

        return "$headerB64.$payloadB64.$signatureB64";
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
