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
use kodanAPPS\Middleware\ApiUsageTracker;
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
use kodanAPPS\Controllers\TaskTypeController;
use kodanAPPS\Controllers\ChatController;
use kodanAPPS\Controllers\NotificationController;
use kodanAPPS\Controllers\LeadController;
use kodanAPPS\Repositories\NotificationRepository;
use kodanAPPS\Repositories\TenantRepository;
use kodanAPPS\Repositories\PlanRepository;
use kodanAPPS\Repositories\UserRepository;
use kodanAPPS\Repositories\AccountRepository;
use kodanAPPS\Repositories\ContactRepository;
use kodanAPPS\Repositories\PipelineRepository;
use kodanAPPS\Repositories\OpportunityRepository;
use kodanAPPS\Repositories\ProductRepository;
use kodanAPPS\Repositories\QuoteRepository;
use kodanAPPS\Repositories\CrmTaskRepository;
use kodanAPPS\Repositories\TaskTypeRepository;
use kodanAPPS\Repositories\WorkflowRepository;
use kodanAPPS\Repositories\ChatRepository;
use kodanAPPS\Repositories\ProjectRepository;
use kodanAPPS\Repositories\ProjectTaskRepository;
use kodanAPPS\Repositories\TimeEntryRepository;
use kodanAPPS\Repositories\SummaryDailyRepository;
use kodanAPPS\Services\AiService;
use kodanAPPS\Controllers\TrackerController;
use kodanAPPS\Controllers\TenantUserController;
use kodanAPPS\Controllers\KanbanController;
use kodanAPPS\Controllers\TimeEntryController;
use kodanAPPS\Controllers\TrackerInsightController;
use kodanAPPS\Controllers\TrackerDashboardController;
use kodanAPPS\Controllers\TrackerProfileController;
use kodanAPPS\Controllers\CatalogController;
use kodanAPPS\Controllers\ReportController;
use kodanAPPS\Controllers\TrackerMetricsController;
use kodanAPPS\Services\KanbanService;
use kodanAPPS\Services\TimeEntryService;
use kodanAPPS\Services\DashboardService;
use kodanAPPS\Services\TenantService;
use kodanAPPS\Services\CustomFieldService;
use kodanAPPS\Services\EntityOwnerSyncService;
use kodanAPPS\Services\MentionsParser;
use kodanAPPS\Services\WorkflowEngine;
use kodanAPPS\Services\UsageTracker;
use kodanAPPS\Services\UsageTrackerInterface;
use kodanAPPS\Services\PlanAccessValidator;
use kodanAPPS\Services\UsageLimitEnforcer;
use kodanAPPS\Services\TenantOverrideManager;
use kodanAPPS\Services\AppAccessService;
use kodanAPPS\Services\Recounters\CrmUsageRecounter;
use kodanAPPS\Services\Recounters\TrackerUsageRecounter;
use kodanAPPS\Controllers\MessagingController;
use kodanAPPS\Controllers\WorkflowController;

// ------------------------------------------------------------
// Debug endpoint — solo disponible si APP_ENV=development
// ------------------------------------------------------------
$appEnv = isset($dotenv['APP_ENV']) && is_string($dotenv['APP_ENV']) ? $dotenv['APP_ENV'] : ($_ENV['APP_ENV'] ?? 'production');
if (isset($_GET['debug_api']) && $appEnv === 'development') {
    header('Content-Type: application/json');

    $publicDir  = __DIR__ . '/../public';
    $apiDir     = __DIR__ . '/..';
    $rootDir    = __DIR__ . '/../..';

    // Probar conexión BD (no rompe si falla)
    $dbStatus = 'not_tested';
    $dbError  = null;
    try {
        $envPath = file_exists(__DIR__ . '/../.env') ? __DIR__ . '/../.env' : __DIR__ . '/../../.env';
        $dotenv  = parse_ini_file($envPath);
        if (is_array($dotenv)) {
            $dbHost = isset($dotenv['DB_HOST']) && is_string($dotenv['DB_HOST']) ? $dotenv['DB_HOST'] : 'localhost';
            $dbPort = isset($dotenv['DB_PORT']) && is_string($dotenv['DB_PORT']) ? $dotenv['DB_PORT'] : '3306';
            $dbName = isset($dotenv['DB_NAME']) && is_string($dotenv['DB_NAME']) ? $dotenv['DB_NAME'] : '';
            $dbUser = isset($dotenv['DB_USER']) && is_string($dotenv['DB_USER']) ? $dotenv['DB_USER'] : '';
            $dbPass = isset($dotenv['DB_PASS']) && is_string($dotenv['DB_PASS']) ? $dotenv['DB_PASS'] : '';
            $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
            $testPdo = new \PDO($dsn, $dbUser, $dbPass, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_TIMEOUT => 3,
            ]);
            $testPdo->query('SELECT 1');
            $dbStatus = 'connected';
        } else {
            $dbStatus = 'parse_failed';
        }
    } catch (\Throwable $e) {
        $dbStatus = 'failed';
        $dbError  = $e->getMessage();
    }

    echo json_encode([
        'status' => 'debug',
        'uri' => $_SERVER['REQUEST_URI'] ?? '',
        'method' => $_SERVER['REQUEST_METHOD'] ?? '',
        'env_exists' => file_exists(__DIR__ . '/../.env'),
        'vendor_paths' => [
            'public/vendor/autoload.php' => file_exists($publicDir . '/vendor/autoload.php'),
            'api/vendor/autoload.php'    => file_exists($apiDir . '/vendor/autoload.php'),
            'root/vendor/autoload.php'   => file_exists($rootDir . '/vendor/autoload.php'),
        ],
        'doc_root_relative' => [
            'public/vendor' => file_exists((isset($_SERVER['DOCUMENT_ROOT']) && is_string($_SERVER['DOCUMENT_ROOT']) ? $_SERVER['DOCUMENT_ROOT'] : '') . '/vendor/autoload.php'),
            'parent_vendor' => file_exists(dirname(isset($_SERVER['DOCUMENT_ROOT']) && is_string($_SERVER['DOCUMENT_ROOT']) ? $_SERVER['DOCUMENT_ROOT'] : '') . '/vendor/autoload.php'),
        ],
        'open_basedir' => ini_get('open_basedir') ?: '(not set)',
        'db_status' => $dbStatus,
        'db_error' => $dbError,
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? '',
        'script_name' => $_SERVER['SCRIPT_NAME'] ?? '',
        'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? '',
        'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
        'server_script' => $_SERVER['SCRIPT_NAME'] ?? '',
        'php_self' => $_SERVER['PHP_SELF'] ?? '',
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
    // Necesario: las apps envían el JWT vía cookie (HttpOnly) con credentials: 'include'
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Requested-With, X-App-ID, X-Public-Secret');
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
$dotenv = is_array($dotenv) ? $dotenv : [];

$dbHost = isset($dotenv['DB_HOST']) && is_string($dotenv['DB_HOST']) ? $dotenv['DB_HOST'] : 'localhost';
$dbPortRaw = isset($dotenv['DB_PORT']) && is_numeric($dotenv['DB_PORT']) ? (int)$dotenv['DB_PORT'] : 3306;
$dbName = isset($dotenv['DB_NAME']) && is_string($dotenv['DB_NAME']) ? $dotenv['DB_NAME'] : 'admkoda_BBDD_APPS';
$dbUser = isset($dotenv['DB_USER']) && is_string($dotenv['DB_USER']) ? $dotenv['DB_USER'] : 'kodan_apps';
$dbPass = isset($dotenv['DB_PASS']) && is_string($dotenv['DB_PASS']) ? $dotenv['DB_PASS'] : '';
$dsn = "mysql:host={$dbHost};port={$dbPortRaw};dbname={$dbName};charset=utf8mb4";

$pdo = new TenantAwarePDO(
    $dsn,
    $dbUser,
    $dbPass,
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
$accountRepo = new AccountRepository($pdo);
$contactRepo = new ContactRepository($pdo);
$pipelineRepo = new PipelineRepository($pdo);
$oppRepo = new OpportunityRepository($pdo);
$productRepo = new ProductRepository($pdo);
$quoteRepo = new QuoteRepository($pdo);
$taskRepo = new CrmTaskRepository($pdo);
$taskTypeRepo = new TaskTypeRepository($pdo);
$chatRepo = new ChatRepository($pdo);
$projectRepo = new ProjectRepository($pdo);
$notificationRepo = new NotificationRepository($pdo);
$workflowRepo = new WorkflowRepository($pdo);
$emailTemplateRepo = new \kodanAPPS\Repositories\EmailTemplateRepository($pdo);
$smtpConfigRepo = new \kodanAPPS\Repositories\SmtpConfigRepository($pdo);
$projectTaskRepo = new ProjectTaskRepository($pdo);
$timeEntryRepo = new TimeEntryRepository($pdo);
$summaryDailyRepo = new SummaryDailyRepository($pdo);

// ------------------------------------------------------------
// Servicios de Límites y Consumo (deben ir antes de TenantService)
// ------------------------------------------------------------
$usageTracker = new UsageTracker($pdo, [
    'crm' => new CrmUsageRecounter(),
    'tracker' => new TrackerUsageRecounter(),
]);
$planAccessValidator = new PlanAccessValidator($pdo);
$usageLimitEnforcer = new UsageLimitEnforcer($usageTracker);
$tenantOverrideManager = new TenantOverrideManager($pdo);
$appAccessService = new AppAccessService(
    $planAccessValidator,
    $usageLimitEnforcer,
    $tenantOverrideManager,
    $usageTracker,
);
$apiUsageTracker = new ApiUsageTracker($usageTracker);

// ------------------------------------------------------------
// Servicios
// ------------------------------------------------------------
$tenantService = new TenantService($tenantRepo, $userRepo, $usageTracker);
$customFieldService = new CustomFieldService($pdo);
$mentionsParser = new MentionsParser($chatRepo);
$entityOwnerSyncService = new EntityOwnerSyncService($chatRepo);
$workflowEngine = new WorkflowEngine($workflowRepo, $taskRepo, $oppRepo, $notificationRepo);
$mailService = new \kodanAPPS\Services\MailService($pdo, $smtpConfigRepo);
$kanbanService = new KanbanService($projectTaskRepo, $taskTypeRepo);
$timeEntryService = new TimeEntryService($timeEntryRepo, $summaryDailyRepo);
$dashboardService = new DashboardService($pdo);
$aiService = new AiService($pdo);

// ------------------------------------------------------------
// Inyectar limit enforcer en repositorios
// ------------------------------------------------------------
$accountRepo->setLimitEnforcer($usageLimitEnforcer);
$contactRepo->setLimitEnforcer($usageLimitEnforcer);
$oppRepo->setLimitEnforcer($usageLimitEnforcer);
$pipelineRepo->setLimitEnforcer($usageLimitEnforcer);
$taskRepo->setLimitEnforcer($usageLimitEnforcer);
$projectRepo->setLimitEnforcer($usageLimitEnforcer);
$projectTaskRepo->setLimitEnforcer($usageLimitEnforcer);
$timeEntryRepo->setLimitEnforcer($usageLimitEnforcer);

// ------------------------------------------------------------
// Configuración sensible — validación estricta
// ------------------------------------------------------------
$jwtSecret = '';
if (isset($dotenv['JWT_SECRET']) && is_string($dotenv['JWT_SECRET'])) {
    $jwtSecret = $dotenv['JWT_SECRET'];
} elseif (isset($_ENV['JWT_SECRET']) && is_string($_ENV['JWT_SECRET'])) {
    $jwtSecret = $_ENV['JWT_SECRET'];
}
if ($jwtSecret === '' || $jwtSecret === 'change-me-in-production') {
    throw new \RuntimeException('JWT_SECRET no está configurado en .env. Generá uno seguro con openssl rand -hex 64.');
}

$csrfSecret = '';
if (isset($dotenv['CSRF_SECRET']) && is_string($dotenv['CSRF_SECRET'])) {
    $csrfSecret = $dotenv['CSRF_SECRET'];
} elseif (isset($_ENV['CSRF_SECRET']) && is_string($_ENV['CSRF_SECRET'])) {
    $csrfSecret = $_ENV['CSRF_SECRET'];
}
if ($csrfSecret === '' || $csrfSecret === 'csrf-secret-change-in-production') {
    throw new \RuntimeException('CSRF_SECRET no está configurado en .env. Generá uno seguro con openssl rand -hex 64.');
}

$systemTenantId = 1;
$sysTenantFromDotenv = isset($dotenv['SYSTEM_TENANT_ID']) && is_numeric($dotenv['SYSTEM_TENANT_ID']) ? (int)$dotenv['SYSTEM_TENANT_ID'] : null;
$sysTenantFromEnv = isset($_ENV['SYSTEM_TENANT_ID']) && is_numeric($_ENV['SYSTEM_TENANT_ID']) ? (int)$_ENV['SYSTEM_TENANT_ID'] : null;
if ($sysTenantFromDotenv !== null) {
    $systemTenantId = $sysTenantFromDotenv;
} elseif ($sysTenantFromEnv !== null) {
    $systemTenantId = $sysTenantFromEnv;
}

$cookieDomain = '';
if (isset($dotenv['COOKIE_DOMAIN']) && is_string($dotenv['COOKIE_DOMAIN'])) {
    $cookieDomain = $dotenv['COOKIE_DOMAIN'];
} elseif (isset($_ENV['COOKIE_DOMAIN']) && is_string($_ENV['COOKIE_DOMAIN'])) {
    $cookieDomain = $_ENV['COOKIE_DOMAIN'];
}

$publicSecret = '';
if (isset($dotenv['PUBLIC_SECRET']) && is_string($dotenv['PUBLIC_SECRET'])) {
    $publicSecret = $dotenv['PUBLIC_SECRET'];
} elseif (isset($_ENV['PUBLIC_SECRET']) && is_string($_ENV['PUBLIC_SECRET'])) {
    $publicSecret = $_ENV['PUBLIC_SECRET'];
}

// ------------------------------------------------------------
// Auth Middleware
// ------------------------------------------------------------
$authMiddleware = new AuthMiddleware($jwtSecret, $csrfSecret, $systemTenantId, $cookieDomain);

// ------------------------------------------------------------
// Controladores
// ------------------------------------------------------------
$authController = new AuthController($userRepo, $jwtSecret, $systemTenantId, $pdo, $planAccessValidator, $usageTracker, $cookieDomain);
$superAdminController = new SuperAdminController($tenantService, $tenantRepo, $planRepo, $userRepo, $tenantOverrideManager, $usageTracker, $pdo, [
    'crm' => new CrmUsageRecounter(),
    'tracker' => new TrackerUsageRecounter(),
]);
$crmController = new CrmController($pdo, $usageTracker);
$customFieldController = new CustomFieldController($customFieldService, $pdo);
$accountController = new AccountController($accountRepo);
$contactController = new ContactController($contactRepo);
$pipelineController = new PipelineController($pipelineRepo);
$oppController = new OpportunityController($oppRepo, $pipelineRepo, $crmController, $notificationRepo, $workflowEngine);
$productController = new ProductController($productRepo);
$quoteController = new QuoteController($quoteRepo);
$taskController = new CrmTaskController($taskRepo, $notificationRepo, $workflowEngine);
$taskTypeController = new TaskTypeController($taskTypeRepo);
$chatController = new ChatController($chatRepo);
$trackerController = new TrackerController($projectRepo);
$kanbanController = new KanbanController($kanbanService);
$timeEntryController = new TimeEntryController($timeEntryService);
$trackerDashboardController = new TrackerDashboardController($dashboardService);
$trackerProfileController = new TrackerProfileController($pdo);
$catalogController = new CatalogController($pdo);
$trackerMetricsController = new TrackerMetricsController($pdo);
$tenantUserController = new TenantUserController($userRepo, $pdo, $planAccessValidator, $usageTracker);
$messagingController = new MessagingController($chatRepo, $mentionsParser);
$notificationController = new NotificationController($notificationRepo);
$workflowController = new WorkflowController($workflowRepo, $oppRepo, $taskRepo);
$mailController = new \kodanAPPS\Controllers\MailController($emailTemplateRepo, $smtpConfigRepo, $mailService);
$dashboardController = new \kodanAPPS\Controllers\DashboardController($pdo);
$reportController = new ReportController($timeEntryRepo);
$trackerInsightController = new TrackerInsightController($pdo, $aiService);

require_once __DIR__ . '/Controllers/LeadController.php';
$leadController = new LeadController($publicSecret, $accountRepo, $contactRepo, $oppRepo, $pipelineRepo);

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
        'account' => $accountRepo,
        'contact' => $contactRepo,
        'pipeline' => $pipelineRepo,
        'opportunity' => $oppRepo,
        'product' => $productRepo,
        'quote' => $quoteRepo,
        'task' => $taskRepo,
        'taskType' => $taskTypeRepo,
        'chat' => $chatRepo,
        'project' => $projectRepo,
        'workflow' => $workflowRepo,
        'emailTemplate' => $emailTemplateRepo,
        ],
    'services' => [
        'tenant' => $tenantService,
        'customField' => $customFieldService,
        'mentionsParser' => $mentionsParser,
        'entityOwnerSync' => $entityOwnerSyncService,
        'workflowEngine' => $workflowEngine,
        'mail' => $mailService,
        'usageTracker' => $usageTracker,
        'planAccessValidator' => $planAccessValidator,
        'usageLimitEnforcer' => $usageLimitEnforcer,
        'tenantOverrideManager' => $tenantOverrideManager,
        'appAccessService' => $appAccessService,
    ],
    'auth' => $authMiddleware,
    'apiUsageTracker' => $apiUsageTracker,
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
        'taskType' => $taskTypeController,
        'chat' => $chatController,
        'tracker' => $trackerController,
        'kanban' => $kanbanController,
        'timeEntry' => $timeEntryController,
        'trackerDashboard' => $trackerDashboardController,
        'trackerProfile' => $trackerProfileController,
        'catalog' => $catalogController,
        'tenantUser' => $tenantUserController,
        'messaging' => $messagingController,
        'notification' => $notificationController,
        'webLead' => $leadController,
        'workflow' => $workflowController,
        'mail' => $mailController,
        'dashboard' => $dashboardController,
        'report' => $reportController,
        'trackerMetrics' => $trackerMetricsController,
        'trackerInsight' => $trackerInsightController,
        ],
];
