<?php

/**
 * kodanAPPS API - Entry Point
 * 
 * Blueprint decisiones:
 * - Punto 1: JWT en cookie HttpOnly (api.kodan.software)
 * - Punto 3: CSRF Synchronizer Token Pattern
 * - Punto 4: Cookies en subdominio exacto
 * - Multi-tenant: TenantContext + BaseRepository + TenantAwarePDO
 */

require_once __DIR__ . '/../vendor/autoload.php';

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;
use kodanAPPS\Middleware\SuperAdminMiddleware;
use kodanAPPS\Controllers\SuperAdminController;
use kodanAPPS\Repositories\TenantRepository;
use kodanAPPS\Repositories\PlanRepository;
use kodanAPPS\Repositories\RefreshTokenRepository;
use kodanAPPS\Services\TenantService;
use kodanAPPS\Repositories\UserRepository;

// ------------------------------------------------------------
// Configuración BD (desde .env)
// ------------------------------------------------------------
$dotenv = parse_ini_file(__DIR__ . '/../.env');
$dbConfig = [
    'host' => $dotenv['DB_HOST'] ?? 'localhost',
    'port' => (int)($dotenv['DB_PORT'] ?? 3306),
    'dbname' => $dotenv['DB_NAME'] ?? 'admkoda_BBDD_APPS',
    'user' => $dotenv['DB_USER'] ?? 'kodan_apps',
    'pass' => $dotenv['DB_PASS'] ?? '',
    'charset' => 'utf8mb4',
];

$dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['dbname']};charset={$dbConfig['charset']}";

// ------------------------------------------------------------
// Inicializar TenantAwarePDO (Capa 3 defensa multi-tenant)
// ------------------------------------------------------------
$pdo = new TenantAwarePDO(
    $dsn,
    $dbConfig['user'],
    $dbConfig['pass'],
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ],
    // Strict mode: true en development, false en production para logging
    ($_ENV['APP_ENV'] ?? 'production') !== 'production'
);

// ------------------------------------------------------------
// Inicializar repositorios y servicios
// ------------------------------------------------------------
$tenantRepo = new TenantRepository($pdo);
$planRepo = new PlanRepository($pdo);
$userRepo = new UserRepository($pdo);
$refreshTokenRepo = new RefreshTokenRepository($pdo);
$tenantService = new TenantService($tenantRepo, $userRepo);

// ------------------------------------------------------------
// Configuración Super Admin
// ------------------------------------------------------------
$jwtSecret = $_ENV['JWT_SECRET'] ?? 'change-me-in-production';
$systemTenantId = (int)($_ENV['SYSTEM_TENANT_ID'] ?? 1);

// Middleware Super Admin
$superAdminMiddleware = new SuperAdminMiddleware($jwtSecret, $systemTenantId, $refreshTokenRepo);

// ------------------------------------------------------------
// Routing simple
// ------------------------------------------------------------
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// CORS headers (aplicados también en Apache)
$allowedOrigins = [
    'https://crm.kodan.software',
    'https://tracker.kodan.software',
    'https://superadmin.kodan.software',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Requested-With');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Max-Age: 3600');
}

// Preflight
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ------------------------------------------------------------
// Rutas públicas (sin auth)
// ------------------------------------------------------------
if ($requestUri === '/api/csrf-token' && $method === 'GET') {
    // Generar CSRF token (Synchronizer Token Pattern)
    if (session_status() === PHP_SESSION_NONE) {
        session_start([
            'cookie_httponly' => true,
            'cookie_secure' => true,
            'cookie_samesite' => 'Lax',
        ]);
    }
    
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    
    header('Content-Type: application/json');
    echo json_encode(['token' => $token]);
    exit;
}

if (str_starts_with($requestUri, '/api/auth/')) {
    // Auth routes delegar a AuthController (futuro)
    // Por ahora 404
    http_response_code(404);
    echo json_encode(['error' => 'Not implemented yet']);
    exit;
}

// ------------------------------------------------------------
// Rutas Super Admin (protegidas por middleware)
// ------------------------------------------------------------
if (str_starts_with($requestUri, '/api/super-admin')) {
    try {
        $auth = $superAdminMiddleware->handle();
        // $auth contiene [user_id, tenant_id, roles, app_id]
    } catch (RuntimeException $e) {
        $code = (int)$e->getCode();
        if ($code === 0) $code = 401;
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $e->getMessage()]);
        exit;
    }

    $controller = new SuperAdminController($tenantService, $tenantRepo, $planRepo);
    
    // Parsear ruta
    $path = str_replace('/api/super-admin', '', $requestUri);
    
    try {
        // GET /api/super-admin/stats
        if ($path === '/stats' && $method === 'GET') {
            $data = $controller->getStats();
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // GET /api/super-admin/tenants
        if ($path === '/tenants' && $method === 'GET') {
            $data = $controller->listTenants();
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // POST /api/super-admin/tenants
        if ($path === '/tenants' && $method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $data = $controller->createTenant($input);
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // PATCH /api/super-admin/tenants/{id}
        if (preg_match('#^/tenants/(\d+)$#', $path, $matches) && $method === 'PATCH') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $data = $controller->updateTenant((int)$matches[1], $input);
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // POST /api/super-admin/tenants/{id}/deactivate
        if (preg_match('#^/tenants/(\d+)/deactivate$#', $path, $matches) && $method === 'POST') {
            $data = $controller->deactivateTenant((int)$matches[1]);
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // GET /api/super-admin/plans
        if ($path === '/plans' && $method === 'GET') {
            $data = $controller->listPlans();
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // POST /api/super-admin/plans
        if ($path === '/plans' && $method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $data = $controller->createPlan($input);
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // PATCH /api/super-admin/plans/{id}
        if (preg_match('#^/plans/(\d+)$#', $path, $matches) && $method === 'PATCH') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $data = $controller->updatePlan((int)$matches[1], $input);
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // DELETE /api/super-admin/plans/{id}
        if (preg_match('#^/plans/(\d+)$#', $path, $matches) && $method === 'DELETE') {
            $data = $controller->deletePlan((int)$matches[1]);
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // PUT /api/super-admin/theme
        if ($path === '/theme' && $method === 'PUT') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $data = $controller->updateTheme($input);
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
    } catch (InvalidArgumentException $e) {
        http_response_code(422);
        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'Validation error',
            'errors' => json_decode($e->getMessage(), true) ?? ['general' => $e->getMessage()],
        ]);
        exit;
    } catch (RuntimeException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => $e->getMessage()]);
        exit;
    }
}

// ------------------------------------------------------------
// Health check
// ------------------------------------------------------------
if ($requestUri === '/api/health' && $method === 'GET') {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok', 'timestamp' => date('c')]);
    exit;
}

// 404
http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['error' => 'Not found']);