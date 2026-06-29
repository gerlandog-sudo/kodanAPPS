<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;
use kodanAPPS\Repositories\UserRepository;
use kodanAPPS\Services\PlanAccessValidator;
use kodanAPPS\Services\UsageTrackerInterface;
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
    private PlanAccessValidator $planAccessValidator;
    private UsageTrackerInterface $usageTracker;

    public function __construct(
        UserRepository $userRepo,
        string $jwtSecret,
        int $systemTenantId,
        TenantAwarePDO $pdo,
        PlanAccessValidator $planAccessValidator,
        UsageTrackerInterface $usageTracker,
        string $cookieDomain = ''
    ) {
        $this->userRepo = $userRepo;
        $this->jwtSecret = $jwtSecret;
        $this->systemTenantId = $systemTenantId;
        $this->pdo = $pdo;
        $this->planAccessValidator = $planAccessValidator;
        $this->usageTracker = $usageTracker;
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

        // Validar acceso al plan + roles usando PlanAccessValidator
        $appAccess = $this->planAccessValidator->validateAppAccess(
            (int)$user['tenant_id'],
            $appId,
            (int)$user['id']
        );
        $roles = $appAccess['roles'];

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

        // Obtener avatar_url desde user_configs para esta app
        $avatarStmt = $this->pdo->prepare(
            "SELECT avatar_url FROM user_configs WHERE user_id = ? AND app_id = ? LIMIT 1"
        );
        $avatarStmt->execute([$user['id'], $appId]);
        $avatarUrl = $avatarStmt->fetchColumn();

        return [
            'success' => true,
            'user' => [
                'id' => (int)$user['id'],
                'email' => $user['email'],
                'display_name' => $user['display_name'],
                'avatar_url' => $avatarUrl ?: null,
                'language' => $user['language'],
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

        $planStatus = $this->usageTracker->getUsageStatus($appId);

        $planStmt = $this->pdo->prepare("
            SELECT sp.name
            FROM tenants t
            JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
            WHERE t.tenant_id = ?
        ");
        $planStmt->execute([$tenantId]);
        $planName = $planStmt->fetchColumn();

        // Obtener avatar_url desde user_configs para la app actual
        $avatarStmt = $this->pdo->prepare(
            "SELECT avatar_url FROM user_configs WHERE user_id = ? AND app_id = ? LIMIT 1"
        );
        $avatarStmt->execute([$userId, $appId]);
        $avatarUrl = $avatarStmt->fetchColumn();

        return [
            'authenticated' => true,
            'user' => [
                'id' => $userId,
                'email' => $user['email'],
                'display_name' => $user['display_name'],
                'avatar_url' => $avatarUrl ?: null,
                'language' => $user['language'],
                'is_super_admin' => (int)$user['is_super_admin'] === 1,
            ],
            'roles' => $roles,
            'app_id' => $appId,
            'plan_status' => $planStatus ?: [],
            'plan_name' => $planName ?: 'Free',
        ];
    }

    /**
     * PATCH /api/auth/profile
     *
     * Actualiza datos del perfil del usuario autenticado.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function updateProfile(array $input): array
    {
        $userId = TenantContext::getUserId();
        $tenantId = TenantContext::getTenantId();
        $appId = TenantContext::getAppId();

        $displayName = isset($input['display_name']) ? trim((string)$input['display_name']) : '';
        $avatarDataUrl = isset($input['avatar_url']) ? (string)$input['avatar_url'] : '';
        $language = isset($input['language']) ? trim((string)$input['language']) : '';

        if ($displayName === '') {
            throw new InvalidArgumentException(json_encode([
                'message' => 'El nombre es requerido',
            ]));
        }

        $this->pdo->beginTransaction();
        try {
            // 1. Actualizar users
            $updateSql = "UPDATE users SET display_name = :name";
            $params = [':name' => $displayName, ':id' => $userId, ':tid' => $tenantId];

            if ($language !== '') {
                $updateSql .= ", language = :lang";
                $params[':lang'] = $language;
            }

            $updateSql .= " WHERE id = :id AND tenant_id = :tid";
            $stmt = $this->pdo->prepare($updateSql);
            $stmt->execute($params);

            // 2. Actualizar avatar en user_configs si se envió
            if ($avatarDataUrl !== '') {
                // Validar que sea una data URL válida
                if (!str_starts_with($avatarDataUrl, 'data:image/')) {
                    throw new InvalidArgumentException(json_encode([
                        'message' => 'Formato de imagen inválido',
                    ]));
                }

                $upsertAvatar = $this->pdo->prepare(
                    "INSERT INTO user_configs (user_id, app_id, avatar_url) VALUES (:uid, :app, :avatar)
                     ON DUPLICATE KEY UPDATE avatar_url = VALUES(avatar_url)"
                );
                $upsertAvatar->execute([
                    ':uid' => $userId,
                    ':app' => $appId,
                    ':avatar' => $avatarDataUrl,
                ]);
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw new RuntimeException('Error al actualizar el perfil: ' . $e->getMessage(), 500);
        }

        return [
            'success' => true,
            'user' => [
                'id' => $userId,
                'display_name' => $displayName,
                'language' => $language ?: null,
            ],
        ];
    }

    /**
     * POST /api/auth/change-password
     *
     * Cambia la contraseña del usuario autenticado.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function changePassword(array $input): array
    {
        $userId = TenantContext::getUserId();
        $tenantId = TenantContext::getTenantId();

        $currentPassword = $input['current_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';
        $confirmPassword = $input['confirm_password'] ?? '';

        if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Todos los campos de contraseña son requeridos',
            ]));
        }

        if (strlen($newPassword) < 8) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'La nueva contraseña debe tener al menos 8 caracteres',
            ]));
        }

        if ($newPassword !== $confirmPassword) {
            throw new InvalidArgumentException(json_encode([
                'message' => 'Las contraseñas no coinciden',
            ]));
        }

        // Obtener usuario actual
        $stmt = $this->pdo->prepare(
            "SELECT id, password_hash FROM users WHERE id = :id AND tenant_id = :tid LIMIT 1"
        );
        $stmt->execute([':id' => $userId, ':tid' => $tenantId]);
        $user = $stmt->fetch();

        if (!$user) {
            throw new RuntimeException('Usuario no encontrado', 404);
        }

        // Verificar contraseña actual
        if (!password_verify($currentPassword, $user['password_hash'])) {
            throw new RuntimeException('La contraseña actual no es correcta', 400);
        }

        // Actualizar contraseña
        $passwordHash = password_hash($newPassword, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3,
        ]);

        $updateStmt = $this->pdo->prepare(
            "UPDATE users SET password_hash = :hash WHERE id = :id AND tenant_id = :tid"
        );
        $updateStmt->execute([
            ':hash' => $passwordHash,
            ':id' => $userId,
            ':tid' => $tenantId,
        ]);

        return [
            'success' => true,
            'message' => 'Contraseña actualizada exitosamente.',
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
