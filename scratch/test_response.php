<?php
declare(strict_types=1);

require_once __DIR__ . '/../apps/api/vendor/autoload.php';

use kodanAPPS\DB\TenantContext;
use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\Repositories\AccountRepository;
use kodanAPPS\Controllers\AccountController;

// Configuración de conexión
$envPath = __DIR__ . '/../apps/api/.env';
$dotenv = [];
if (file_exists($envPath)) {
    $dotenv = parse_ini_file($envPath) ?: [];
}

$config = [
    'host' => '127.0.0.1',
    'port' => 3306,
    'dbname' => $dotenv['DB_NAME'] ?? 'admkoda_BBDD_APPS',
    'user' => $dotenv['DB_USER'] ?? 'kodan_apps',
    'pass' => $dotenv['DB_PASS'] ?? 'admin2026',
];

$dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset=utf8mb4";

try {
    // Crear wrapper TenantAwarePDO
    $tenantPdo = new TenantAwarePDO($dsn, $config['user'], $config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    // Configurar TenantContext manualmente
    TenantContext::set(12, 10, ['admin'], 'crm');
    
    echo "Tenant ID actual: " . TenantContext::getTenantId() . "\n";
    echo "User ID actual: " . TenantContext::getUserId() . "\n";
    
    // Instanciar repositorio y controlador
    $repo = new AccountRepository($tenantPdo);
    $controller = new AccountController($repo);
    
    echo "\n=== Llama a Repo->listAll() ===\n";
    $accountsRepo = $repo->listAll();
    print_r($accountsRepo);
    
    echo "\n=== Llama a Controller->list() ===\n";
    $accountsController = $controller->list();
    print_r($accountsController);
    
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
