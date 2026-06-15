<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\UserRepository;
use kodanAPPS\Repositories\RefreshTokenRepository;
use InvalidArgumentException;
use RuntimeException;
use DateTime;

final class AuthController
{
    private UserRepository $userRepo;
    private RefreshTokenRepository $refreshTokenRepo;
    private string $jwtSecret;
    private int $systemTenantId;

    public function __construct(
        UserRepository $userRepo,
        RefreshTokenRepository $refreshTokenRepo,
        string $jwtSecret,
        int $systemTenantId
    ) {
        $this->userRepo = $userRepo;
        $this->refreshTokenRepo = $refreshTokenRepo;
        $this->jwtSecret = $jwtSecret;
        $this->systemTenantId = $systemTenantId;
    }

    /**
     * POST /api/auth/login
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

        // Obtener roles en la app especificada
        $allRoles = $this->userRepo->getUserRoles((int)$user['id']);
        $roles = [];
        foreach ($allRoles as $roleRow) {
            if ($roleRow['app_id'] === $appId && (int)$roleRow['is_active'] === 1) {
                $roles[] = $roleRow['role'];
            }
        }

        // Si es el panel superadmin, validar privilegios
        if ($appId === 'superadmin') {
            if ((int)$user['is_super_admin'] !== 1 && !in_array('admin', $roles, true)) {
                throw new RuntimeException('Acceso denegado: privilegios de Super Admin requeridos', 403);
            }
            if ((int)$user['tenant_id'] !== $this->systemTenantId) {
                throw new RuntimeException('Acceso denegado: el Super Admin debe operar desde el tenant del sistema', 403);
            }
        } elseif (empty($roles)) {
            throw new RuntimeException('Acceso denegado: el usuario no tiene rol asignado en esta aplicación', 403);
        }

        // Generar JWT
        $issuedAt = time();
        $expiresAt = $issuedAt + 1800; // 30 minutos
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

        // Configurar cookie HttpOnly
        $cookieSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
        setcookie('access_token', $jwt, [
            'expires' => $expiresAt,
            'path' => '/',
            'domain' => '', // subdominio exacto / local
            'secure' => $cookieSecure,
            'httponly' => true,
            'samesite' => 'Strict',
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
     * POST /api/auth/set-password
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
     * Generación de JWT compatible con SuperAdminMiddleware
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
