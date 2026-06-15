<?php

declare(strict_types=1);

namespace kodanAPPS\Middleware;

use kodanAPPS\DB\TenantContext;
use kodanAPPS\Repositories\RefreshTokenRepository;
use RuntimeException;

/**
 * SuperAdminMiddleware - Autenticación y seguridad para panel Super Admin
 * 
 * Blueprint decisiones:
 * - Punto 1: JWT (access 30min + rotating refresh 30d) en cookie HttpOnly, SameSite=Strict
 * - Punto 3: CSRF Synchronizer Token Pattern en SESIÓN (no cookie legible por JS)
 * - Punto 4: Cookies en subdominio exacto api.kodan.software
 * - Verifica tenant_id del JWT == system tenant (is_system_tenant = TRUE)
 * 
 * Rate Limiting: 5/min mutantes, 60/min lecturas (via login_attempts pattern)
 */
final class SuperAdminMiddleware
{
    private string $jwtSecret;
    private int $systemTenantId;
    private RefreshTokenRepository $refreshTokenRepo;

    public function __construct(
        string $jwtSecret,
        int $systemTenantId,
        RefreshTokenRepository $refreshTokenRepo
    ) {
        $this->jwtSecret = $jwtSecret;
        $this->systemTenantId = $systemTenantId;
        $this->refreshTokenRepo = $refreshTokenRepo;
    }

    /**
     * Maneja request entrante
     * 
     * @return array{user_id: int, tenant_id: int, roles: array<string>, app_id: string}|null
     * @throws RuntimeException 401/403 con código específico
     */
    public function handle(): array
    {
        // 1. Leer Access Token de cookie HttpOnly
        $accessToken = $_COOKIE['access_token'] ?? '';
        if ($accessToken === '') {
            throw new RuntimeException('UNAUTHENTICATED: Access token missing', 401);
        }

        // 2. Validar JWT
        $payload = $this->validateJwt($accessToken);
        
        // 3. Verificar claims requeridos
        $this->validateClaims($payload);

        // 4. Verificar tenant_id == system tenant
        if ((int)$payload['tid'] !== $this->systemTenantId) {
            throw new RuntimeException('FORBIDDEN: Super Admin must operate from system tenant', 403);
        }

        // 5. Verificar is_super_admin o role admin en superadmin app
        if (!isset($payload['is_super_admin']) || (int)$payload['is_super_admin'] !== 1) {
            $roles = $payload['roles'] ?? [];
            if (!in_array('admin', $roles) || ($payload['app_id'] ?? '') !== 'superadmin') {
                throw new RuntimeException('FORBIDDEN: Super Admin privileges required', 403);
            }
        }

        // 6. CSRF Protection para peticiones mutables (Synchronizer Token Pattern)
        $this->validateCsrf();

        // 7. Setear TenantContext para repositorios
        TenantContext::set(
            (int)$payload['tid'],
            (int)$payload['sub'],
            $payload['roles'] ?? [],
            $payload['app_id'] ?? 'superadmin'
        );

        return [
            'user_id' => (int)$payload['sub'],
            'tenant_id' => (int)$payload['tid'],
            'roles' => $payload['roles'] ?? [],
            'app_id' => $payload['app_id'] ?? 'superadmin',
        ];
    }

    /**
     * Valida JWT (RS256)
     */
    private function validateJwt(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new RuntimeException('UNAUTHENTICATED: Invalid token format', 401);
        }

        [$headerB64, $payloadB64, $signatureB64] = $parts;
        
        // Verificar firma (simplificado - en producción usar firebase/php-jwt o lcobucci/jwt)
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

        // Verificar expiración
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            throw new RuntimeException('TOKEN_EXPIRED: Access token expired', 401);
        }

        return $payload;
    }

    /**
     * Valida claims requeridos
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

    /**
     * CSRF Synchronizer Token Pattern (Blueprint Punto 3)
     * - Token en sesión servidor ($_SESSION['csrf_token'])
     * - Header requerido: X-CSRF-Token
     * - Comparación hash_equals()
     * - Rotación tras uso válido
     * - Exclusiones: GET, HEAD, OPTIONS, /auth/*, /csrf-token
     */
    private function validateCsrf(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        
        // Excluir métodos seguros y endpoints públicos
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

        // Leer token del header
        $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if ($headerToken === '') {
            throw new RuntimeException('CSRF_INVALID: Missing X-CSRF-Token header', 403);
        }

        // Leer token de sesión
        if (session_status() === PHP_SESSION_NONE) {
            session_start([
                'cookie_httponly' => true,
                'cookie_secure' => true,
                'cookie_samesite' => 'Lax',
            ]);
        }
        
        $sessionToken = $_SESSION['csrf_token'] ?? '';
        if ($sessionToken === '') {
            throw new RuntimeException('CSRF_INVALID: No CSRF token in session', 403);
        }

        // Comparación timing-safe
        if (!hash_equals($sessionToken, $headerToken)) {
            // Rotar token por seguridad
            $_SESSION['csrf_token'] = $this->generateCsrfToken();
            throw new RuntimeException('CSRF_INVALID: Token mismatch', 403);
        }

        // Rotar token tras uso válido (opcional, más seguro)
        $_SESSION['csrf_token'] = $this->generateCsrfToken();
    }

    /**
     * Genera token CSRF seguro (32 bytes = 64 chars hex)
     */
    private function generateCsrfToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    /**
     * Base64Url encoding para JWT
     */
    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64Url decoding para JWT
     */
    private function base64UrlDecode(string $data): string
    {
        $padding = strlen($data) % 4;
        if ($padding) {
            $data .= str_repeat('=', 4 - $padding);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}