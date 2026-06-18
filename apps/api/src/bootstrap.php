<?php

/**
 * kodanAPPS API - Bootstrap
 * 
 * Inicialización de todas las dependencias de la API:
 * - Path resolution (vendor, .env)
 * - Debug endpoint
 * - CORS
 * - Conexión a BD (TenantAwarePDO)
 * - Repositorios
 * - Servicios
 * - Auth Middleware
 * - Controladores
 * 
 * Retorna un array con todas las dependencias inicializadas.
 */

namespace kodanAPPS;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\Middleware\AuthMiddleware;
use kodanAPPS\Controllers\SuperAdminController;
use kodanAPPS\Controllers\AuthController;
use kodanAPPS\Controllers\CrmController;
use kodanAPPS\Controllers\CustomFieldController;
use kodanAPPS\Controllers\AccountController;
use kodanAPPS\Controllers\ContactController;
use kodanAPPS\Controllers\PipelineController;
use kodanAPPS\Controllers\OpportunityController;
use kodanAPPS\Controllers\ProductController;
use kodanAPPS\Controllers\QuoteController;
use kodanAPPS\Controllers\CrmTaskController;
use kodanAPPS\Controllers\ChatController;
use kodanAPPS\Repositories\TenantRepository;
use kodanAPPS\Repositories\PlanRepository;
use kodanAPPS\Repositories\RefreshTokenRepository;
use kodanAPPS\Repositories\UserRepository;
use kodanAPPS\Repositories\AccountRepository;
use kodanAPPS\Repositories\ContactRepository;
use kodanAPPS\Repositories\PipelineRepository;
use kodanAPPS\Repositories\OpportunityRepository;
use kodanAPPS\Repositories\ProductRepository;
use kodanAPPS\Repositories\QuoteRepository;
use kodanAPPS\Repositories\CrmTaskRepository;
use kodanAPPS\Repositories\ChatRepository;
use kodanAPPS\Repositories\ProjectRepository;
use kodanAPPS\Controllers\TrackerController;
use kodanAPPS\Services\TenantService;
use kodanAPPS\Services\CustomFieldService;

// ------------------------------------------------------------
// Debug endpoint (antes de cualquier init)
// ------------------------------------------------------------
if (isset($_GET['debug_api'])) {
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'debug',
        'uri' => $_SERVER['REQUEST_URI'] ?? '',
        'method' => $_SERVER['REQUEST_METHOD'] ?? '',
        'env_exists' => file_exists(__DIR__ . '/../.env'),
        'vendor_exists' => file_exists(__DIR__ . '/../../vendor/autoload.php'),
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? '',
        'script_name' => $_SERVER['SCRIPT_NAME'] ?? '',
    ]);
    exit;
}

// ------------------------------------------------------------
// CORS Early Handling
// ------------------------------------------------------------
$allowedOrigins = [
    'https://kodan.software',
    'https://crmv2.kodan.software',
    'https://trackerv2.kodan.software',
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
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Requested-With, X-App-ID');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Max-Age: 3600');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ------------------------------------------------------------
// Configuración BD
// ------------------------------------------------------------
$envPath = file_exists(__DIR__ . '/../.env') ? __DIR__ . '/../.env' : __DIR__ . '/../../.env';
$dotenv = parse_ini_file($envPath);

$dbConfig = [
    'host' => $dotenv['DB_HOST'] ?? 'localhost',
    'port' => (int)($dotenv['DB_PORT'] ?? 3306),
    'dbname' => $dotenv['DB_NAME'] ?? 'admkoda_BBDD_APPS',
    'user' => $dotenv['DB_USER'] ?? 'kodan_apps',
    'pass' => $dotenv['DB_PASS'] ?? '',
    'charset' => 'utf8mb4',
];

$dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['dbname']};charset={$dbConfig['charset']}";

$pdo = new TenantAwarePDO(
    $dsn,
    $dbConfig['user'],
    $dbConfig['pass'],
    [
        \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
        \PDO::ATTR_EMULATE_PREPARES => false,
    ],
    ($_ENV['APP_ENV'] ?? 'production') !== 'production'
);

// ------------------------------------------------------------
// Repositorios
// ------------------------------------------------------------
$tenantRepo = new TenantRepository($pdo);
$planRepo = new PlanRepository($pdo);
$userRepo = new UserRepository($pdo);
$refreshTokenRepo = new RefreshTokenRepository($pdo);
$accountRepo = new AccountRepository($pdo);
$contactRepo = new ContactRepository($pdo);
$pipelineRepo = new PipelineRepository($pdo);
$oppRepo = new OpportunityRepository($pdo);
$productRepo = new ProductRepository($pdo);
$quoteRepo = new QuoteRepository($pdo);
$taskRepo = new CrmTaskRepository($pdo);
$chatRepo = new ChatRepository($pdo);
$projectRepo = new ProjectRepository($pdo);

// ------------------------------------------------------------
// Servicios
// ------------------------------------------------------------
$tenantService = new TenantService($tenantRepo, $userRepo);
$customFieldService = new CustomFieldService($pdo);

// ------------------------------------------------------------
// Configuración sensible
// ------------------------------------------------------------
$jwtSecret = $dotenv['JWT_SECRET'] ?? $_ENV['JWT_SECRET'] ?? 'change-me-in-production';
$csrfSecret = $dotenv['CSRF_SECRET'] ?? $_ENV['CSRF_SECRET'] ?? 'csrf-secret-change-in-production';
$systemTenantId = (int)($dotenv['SYSTEM_TENANT_ID'] ?? $_ENV['SYSTEM_TENANT_ID'] ?? 1);
$cookieDomain = $dotenv['COOKIE_DOMAIN'] ?? $_ENV['COOKIE_DOMAIN'] ?? '';

// ------------------------------------------------------------
// Auth Middleware
// ------------------------------------------------------------
$authMiddleware = new AuthMiddleware($jwtSecret, $csrfSecret, $systemTenantId);

// ------------------------------------------------------------
// Controladores
// ------------------------------------------------------------
$authController = new AuthController($userRepo, $refreshTokenRepo, $jwtSecret, $systemTenantId, $pdo, $cookieDomain);
$superAdminController = new SuperAdminController($tenantService, $tenantRepo, $planRepo, $userRepo);
$crmController = new CrmController($pdo);
$customFieldController = new CustomFieldController($customFieldService, $pdo);
$accountController = new AccountController($accountRepo);
$contactController = new ContactController($contactRepo);
$pipelineController = new PipelineController($pipelineRepo);
$oppController = new OpportunityController($oppRepo, $pipelineRepo, $crmController);
$productController = new ProductController($productRepo);
$quoteController = new QuoteController($quoteRepo);
$taskController = new CrmTaskController($taskRepo);
$chatController = new ChatController($chatRepo);
$trackerController = new TrackerController($projectRepo);

return [
    'pdo' => $pdo,
    'dotenv' => $dotenv,
    'jwtSecret' => $jwtSecret,
    'csrfSecret' => $csrfSecret,
    'systemTenantId' => $systemTenantId,
    'cookieDomain' => $cookieDomain,
    'repos' => [
        'tenant' => $tenantRepo,
        'plan' => $planRepo,
        'user' => $userRepo,
        'refreshToken' => $refreshTokenRepo,
        'account' => $accountRepo,
        'contact' => $contactRepo,
        'pipeline' => $pipelineRepo,
        'opportunity' => $oppRepo,
        'product' => $productRepo,
        'quote' => $quoteRepo,
        'task' => $taskRepo,
        'chat' => $chatRepo,
        'project' => $projectRepo,
        ],
    'services' => [
        'tenant' => $tenantService,
        'customField' => $customFieldService,
    ],
    'auth' => $authMiddleware,
    'controllers' => [
        'auth' => $authController,
        'superAdmin' => $superAdminController,
        'crm' => $crmController,
        'customField' => $customFieldController,
        'account' => $accountController,
        'contact' => $contactController,
        'pipeline' => $pipelineController,
        'opportunity' => $oppController,
        'product' => $productController,
        'quote' => $quoteController,
        'task' => $taskController,
        'chat' => $chatController,
        'tracker' => $trackerController,
        ],
];
