<?php
/**
 * Migration Runner - kodanAPPS
 * 
 * Lee las credenciales de apps/api/.env y ejecuta 001_core_schema.sql
 */

declare(strict_types=1);

$envPath = __DIR__ . '/../apps/api/.env';
$dotenv = [];
if (file_exists($envPath)) {
    $dotenv = parse_ini_file($envPath) ?: [];
}

$config = [
    'host' => $dotenv['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1',
    'port' => (int)($dotenv['DB_PORT'] ?? getenv('DB_PORT') ?: 3306),
    'dbname' => $dotenv['DB_NAME'] ?? getenv('DB_NAME') ?: 'admkoda_BBDD_APPS',
    'user' => $dotenv['DB_USER'] ?? getenv('DB_USER') ?: 'kodan_apps',
    'pass' => $dotenv['DB_PASS'] ?? getenv('DB_PASS') ?: 'admin2026',
    'charset' => 'utf8mb4',
];

$dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$config['charset']}";

try {
    echo "Connecting to database at {$config['host']}:{$config['port']}...\n";
    $pdo = new PDO($dsn, $config['user'], $config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    echo "✅ Database connection successful.\n";
    
    $migrations = ['001_core_schema.sql', '002_tenant_wizard.sql', '003_roles_apps.sql'];
    
    foreach ($migrations as $migration) {
        $sqlFile = __DIR__ . '/' . $migration;
        if (!file_exists($sqlFile)) {
            throw new Exception("Migration file not found at $sqlFile");
        }
        
        echo "Executing migration: $migration...\n";
        $sql = file_get_contents($sqlFile);
        $pdo->exec($sql);
        echo "✅ $migration applied successfully.\n";
    }
    
    echo "✅ All migrations completed successfully!\n";
} catch (Throwable $e) {
    die("❌ Error during migration: " . $e->getMessage() . "\n");
}
