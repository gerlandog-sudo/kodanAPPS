<?php

declare(strict_types=1);

namespace kodanAPPS\Middleware;

use kodanAPPS\DB\TenantContext;
use RuntimeException;

/**
 * AuthMiddleware - Autenticación y seguridad unificada para todas las rutas API
 * 
 * - JWT en cookie HttpOnly, SameSite=Lax
 * - CSRF Stateless (HMAC + PHPSESSID, sin sesión)
 * - Sesión deslizante: el JWT se renueva automáticamente en cada request válido,
 *   manteniendo la sesión activa mientras el usuario use la aplicación.
 * - Sin restricciones de app/rol — eso lo resuelve cada ruta
 * 
 * Uso en index.php:
 *   $auth = $authMiddleware->handle();         // valida JWT + CSRF + renueva cookie
 *   $authMiddleware->requireSuperAdmin();      // opcional, para rutas superadmin
 */
final class AuthMiddleware
{
    /** @var int Duración del JWT en segundos (4 horas) */
    private const JWT_TTL = 14400;

    private string $jwtSecret;
    private string $csrfSecret;
    private int $systemTenantId;
    private string $cookieDomain;
    private bool $cookieSecure;

    public function __construct(
        string $jwtSecret,
        string $csrfSecret,
        int $systemTenantId,
        string $cookieDomain = '',
    ) {
        $this->jwtSecret = $jwtSecret;
        $this->csrfSecret = $csrfSecret;
        $this->systemTenantId = $systemTenantId;
        $this->cookieDomain = $cookieDomain;
        $this->cookieSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
    }

    /**
     * Valida JWT + CSRF, setea TenantContext y renueva la cookie JWT (sesión deslizante)
     * 
     * @return array{user_id: int, tenant_id: int, roles: array<string>, app_id: string}
     * @throws RuntimeException 400/401/403
     */
    public function handle(): array
    {
        $appId = $this->getAppIdFromHeader();
        $accessToken = $_COOKIE["access_token_{$appId}"] ?? '';
        if ($accessToken === '') {
            throw new RuntimeException('UNAUTHENTICATED: Access token missing', 401);
        }

        $payload = $this->validateJwt($accessToken);
        $this->validateClaims($payload);

        $this->validateCsrf();

        $canApproveHours = isset($payload['can_approve_hours']) && (int)$payload['can_approve_hours'] === 1;
        $isSuperAdmin = isset($payload['is_super_admin']) && (int)$payload['is_super_admin'] === 1;

        TenantContext::set(
            (int)$payload['tid'],
            (int)$payload['sub'],
            $payload['roles'] ?? [],
            $payload['app_id'] ?? '',
            $canApproveHours
        );

        // === Sesión deslizante: renovar JWT en cada request válido ===
        $this->refreshJwtCookie(
            (int)$payload['sub'],
            (int)$payload['tid'],
            $payload['roles'] ?? [],
            $payload['app_id'] ?? '',
            $canApproveHours,
            $isSuperAdmin
        );

        return [
            'user_id' => (int)$payload['sub'],
            'tenant_id' => (int)$payload['tid'],
            'roles' => $payload['roles'] ?? [],
            'app_id' => $payload['app_id'] ?? '',
            'can_approve_hours' => $canApproveHours,
        ];
    }

    /**
     * Renueva la cookie JWT con un nuevo tiempo de expiración
     * (sesión deslizante: mientras el usuario haga requests, la sesión se mantiene activa)
     *
     * @param string[] $roles
     */
    private function refreshJwtCookie(int $userId, int $tenantId, array $roles, string $appId, bool $canApproveHours, bool $isSuperAdmin = false): void
    {
        $issuedAt = time();
        $expiresAt = $issuedAt + self::JWT_TTL;
        $payload = [
            'sub' => $userId,
            'tid' => $tenantId,
            'iat' => $issuedAt,
            'exp' => $expiresAt,
            'roles' => $roles,
            'app_id' => $appId,
            'is_super_admin' => $isSuperAdmin ? 1 : 0,
            'can_approve_hours' => $canApproveHours ? 1 : 0,
        ];

        $jwt = $this->generateJwt($payload);

        setcookie("access_token_{$appId}", $jwt, [
            'expires' => $expiresAt,
            'path' => '/',
            'domain' => $this->cookieDomain,
            'secure' => $this->cookieSecure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    /**
     * Genera un JWT HS256
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

    /**
     * Verifica que el usuario autenticado sea Super Admin
     * (tenant sistema + is_super_admin o rol admin en superadmin)
     * 
     * @throws RuntimeException 403
     */
    public function requireSuperAdmin(): void
    {
        $tenantId = TenantContext::getTenantId();
        if ($tenantId !== $this->systemTenantId) {
            throw new RuntimeException('FORBIDDEN: Super Admin must operate from system tenant', 403);
        }

        $appId = $this->getAppIdFromHeader();
        $accessToken = $_COOKIE["access_token_{$appId}"] ?? '';
        if ($accessToken === '') {
            throw new RuntimeException('UNAUTHENTICATED', 401);
        }

        $payload = $this->validateJwt($accessToken);

        if (!isset($payload['is_super_admin']) || (int)$payload['is_super_admin'] !== 1) {
            $roles = $payload['roles'] ?? [];
            if (!in_array('admin', $roles) || ($payload['app_id'] ?? '') !== 'superadmin') {
                throw new RuntimeException('FORBIDDEN: Super Admin privileges required', 403);
            }
        }

        // Renovar cookie también en validación superadmin
        $this->refreshJwtCookie(
            (int)$payload['sub'],
            (int)$payload['tid'],
            $payload['roles'] ?? [],
            $payload['app_id'] ?? '',
            isset($payload['can_approve_hours']) && (int)$payload['can_approve_hours'] === 1,
            isset($payload['is_super_admin']) && (int)$payload['is_super_admin'] === 1
        );
    }

    private function getAppIdFromHeader(): string
    {
        $appId = $_SERVER['HTTP_X_APP_ID'] ?? ($_GET['app_id'] ?? '');
        if ($appId === '') {
            throw new RuntimeException('MISSING_APP_ID: Header X-App-ID requerido o parámetro app_id faltante', 400);
        }
        return $appId;
    }

    /**
     * @return array<string, mixed>
     */
    private function validateJwt(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new RuntimeException('UNAUTHENTICATED: Invalid token format', 401);
        }

        [$headerB64, $payloadB64, $signatureB64] = $parts;

        $expectedSignature = $this->base64UrlEncode(
            hash_hmac('sha256', "$headerB64.$payloadB64", $this->jwtSecret, true)
        );

        if (!hash_equals($expectedSignature, $signatureB64)) {
            throw new RuntimeException('UNAUTHENTICATED: Invalid signature', 401);
        }

        $payload = json_decode($this->base64UrlDecode($payloadB64), true);
        if ($payload === null) {
            throw new RuntimeException('UNAUTHENTICATED: Invalid payload', 401);
        }

        if (isset($payload['exp']) && $payload['exp'] < time()) {
            throw new RuntimeException('TOKEN_EXPIRED: Access token expired', 401);
        }

        return $payload;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function validateClaims(array $payload): void
    {
        $required = ['sub', 'tid', 'iat', 'exp', 'roles', 'app_id'];
        foreach ($required as $claim) {
            if (!isset($payload[$claim])) {
                throw new RuntimeException("UNAUTHENTICATED: Missing claim: $claim", 401);
            }
        }
    }

    private function validateCsrf(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }

        $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
        $excludedPaths = [
            '/api/auth/login',
            '/api/auth/refresh',
            '/api/auth/logout',
            '/api/csrf-token',
        ];

        foreach ($excludedPaths as $excluded) {
            if (str_starts_with($path, $excluded)) {
                return;
            }
        }

        $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if ($headerToken === '') {
            throw new RuntimeException('CSRF_INVALID: Missing X-CSRF-Token header', 403);
        }

        $sessionId = $_COOKIE['PHPSESSID'] ?? '';
        if ($sessionId === '') {
            throw new RuntimeException('CSRF_INVALID: No session cookie', 403);
        }

        $expectedToken = hash_hmac('sha256', $sessionId, $this->csrfSecret);

        if (!hash_equals($expectedToken, $headerToken)) {
            throw new RuntimeException('CSRF_INVALID: Token mismatch', 403);
        }
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $data): string
    {
        $padding = strlen($data) % 4;
        if ($padding) {
            $data .= str_repeat('=', 4 - $padding);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
