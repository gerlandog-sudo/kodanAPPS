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
use kodanAPPS\Middleware\AuthMiddleware;
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
$jwtSecret = $dotenv['JWT_SECRET'] ?? $_ENV['JWT_SECRET'] ?? 'change-me-in-production';
$csrfSecret = $dotenv['CSRF_SECRET'] ?? $_ENV['CSRF_SECRET'] ?? 'csrf-secret-change-in-production';
$systemTenantId = (int)($dotenv['SYSTEM_TENANT_ID'] ?? $_ENV['SYSTEM_TENANT_ID'] ?? 1);

// Middleware de autenticación unificado (JWT + CSRF)
$authMiddleware = new AuthMiddleware($jwtSecret, $csrfSecret, $systemTenantId, $refreshTokenRepo);

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
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
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
    // Stateless CSRF: HMAC(PHPSESSID_from_cookie, server_secret)
    // Usa $_COOKIE['PHPSESSID'] directamente (no session_id()) para garantizar
    // que el token coincida exactamente con lo que el middleware validará.
    // No almacenamiento en sesión, no file locking, escala horizontalmente.
    $phpsessid = $_COOKIE['PHPSESSID'] ?? '';
    if ($phpsessid === '') {
        session_start([
            'cookie_httponly' => true,
            'cookie_secure' => false,
            'cookie_samesite' => 'Lax',
        ]);
        $phpsessid = session_id();
    }
    
    $token = hash_hmac('sha256', $phpsessid, $csrfSecret);
    
    header('Content-Type: application/json');
    echo json_encode(['token' => $token]);
    exit;
}

if (str_starts_with($requestUri, '/api/auth/')) {
    require_once __DIR__ . '/../src/Controllers/AuthController.php';
    
    // Instanciar AuthController
    $authController = new \kodanAPPS\Controllers\AuthController(
        $userRepo,
        $refreshTokenRepo,
        $jwtSecret,
        $systemTenantId
    );
    
    try {
        if ($requestUri === '/api/auth/login' && $method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $data = $authController->login($input);
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        if ($requestUri === '/api/auth/set-password' && $method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $data = $authController->setPassword($input);
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Auth endpoint not found']);
        exit;
    } catch (\InvalidArgumentException $e) {
        http_response_code(422);
        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'Validation error',
            'errors' => json_decode($e->getMessage(), true) ?? ['general' => $e->getMessage()],
        ]);
        exit;
    } catch (\Throwable $e) {
        $code = (int)$e->getCode();
        if ($code < 400 || $code > 599) {
            $code = 500;
        }
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $e->getMessage()]);
        exit;
    }
}

// ------------------------------------------------------------
// Rutas Super Admin (protegidas por AuthMiddleware + verificación Super Admin)
// ------------------------------------------------------------
if (str_starts_with($requestUri, '/api/super-admin')) {
    try {
        $auth = $authMiddleware->handle();
        $authMiddleware->requireSuperAdmin();
        // $auth contiene [user_id, tenant_id, roles, app_id]
    } catch (RuntimeException $e) {
        $code = (int)$e->getCode();
        if ($code === 0) $code = 401;
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $e->getMessage()]);
        exit;
    }

    $controller = new SuperAdminController($tenantService, $tenantRepo, $planRepo, $userRepo);
    
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
        
        // GET /api/super-admin/theme
        if ($path === '/theme' && $method === 'GET') {
            $data = $controller->getTheme();
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
        
        // POST /api/super-admin/change-password
        if ($path === '/change-password' && $method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $data = $controller->changePassword($input);
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // GET /api/super-admin/roles
        if ($path === '/roles' && $method === 'GET') {
            $data = $controller->listRoles();
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // POST /api/super-admin/roles
        if ($path === '/roles' && $method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $data = $controller->createRole($input);
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // PATCH /api/super-admin/roles/{id}
        if (preg_match('#^/roles/(\d+)$#', $path, $matches) && $method === 'PATCH') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $data = $controller->updateRole((int)$matches[1], $input);
            header('Content-Type: application/json');
            echo json_encode($data);
            exit;
        }
        
        // DELETE /api/super-admin/roles/{id}
        if (preg_match('#^/roles/(\d+)$#', $path, $matches) && $method === 'DELETE') {
            $data = $controller->deleteRole((int)$matches[1]);
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
// Rutas CRM, Tracker y otras apps (protegidas por AuthMiddleware)
// ------------------------------------------------------------
if (str_starts_with($requestUri, '/api/') && !str_starts_with($requestUri, '/api/super-admin') && !str_starts_with($requestUri, '/api/auth') && $requestUri !== '/api/csrf-token' && $requestUri !== '/api/health') {
    try {
        $auth = $authMiddleware->handle();

        // CRM routes (endpoints por definir)
        if (str_starts_with($requestUri, '/api/crm')) {
            http_response_code(501);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'CRM API not implemented yet']);
            exit;
        }

        // Tracker routes (endpoints por definir)
        if (str_starts_with($requestUri, '/api/tracker')) {
            http_response_code(501);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Tracker API not implemented yet']);
            exit;
        }

        // Otras rutas API no reconocidas
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Not found']);
        exit;
    } catch (RuntimeException $e) {
        $code = (int)$e->getCode();
        if ($code === 0) $code = 401;
        http_response_code($code);
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