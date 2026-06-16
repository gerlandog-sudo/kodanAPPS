<?php
declare(strict_types=1);

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
    $pdo = new PDO($dsn, $config['user'], $config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    
    echo "=== TENANTS ===\n";
    $stmt = $pdo->query("SELECT tenant_id, name, is_system_tenant, is_active FROM tenants");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        print_r($row);
    }
    
    echo "\n=== USERS ===\n";
    $stmt = $pdo->query("SELECT id, tenant_id, email, display_name, is_super_admin, is_active FROM users");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        print_r($row);
    }
    
    echo "\n=== USER ROLES ===\n";
    $stmt = $pdo->query("
        SELECT ur.user_id, u.email, ur.app_id, r.name as role_name 
        FROM user_roles ur
        JOIN users u ON u.id = ur.user_id
        JOIN roles r ON r.id = ur.role_id
    ");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        print_r($row);
    }
    
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
