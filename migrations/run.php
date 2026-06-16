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
    'host' => getenv('DB_HOST') ?: ($dotenv['DB_HOST'] ?? '127.0.0.1'),
    'port' => (int)(getenv('DB_PORT') ?: ($dotenv['DB_PORT'] ?? 3306)),
    'dbname' => getenv('DB_NAME') ?: ($dotenv['DB_NAME'] ?? 'admkoda_BBDD_APPS'),
    'user' => getenv('DB_USER') ?: ($dotenv['DB_USER'] ?? 'kodan_apps'),
    'pass' => getenv('DB_PASS') ?: ($dotenv['DB_PASS'] ?? 'admin2026'),
    'charset' => 'utf8mb4',
];

$dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$config['charset']}";

try {
    echo "Connecting to database at {$config['host']}:{$config['port']}...\n";
    try {
        $pdo = new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        if ($config['host'] === 'mariadb') {
            echo "⚠️ Failed to connect to 'mariadb', trying fallback to '127.0.0.1'...\n";
            $config['host'] = '127.0.0.1';
            $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$config['charset']}";
            $pdo = new PDO($dsn, $config['user'], $config['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } else {
            throw $e;
        }
    }
    echo "✅ Database connection successful.\n";
    
    $migrations = ['001_core_schema.sql', '002_tenant_wizard.sql', '003_crm_schema.sql', '004_tracker_preview.sql', '005_settings_features.sql', '006_pipeline_fixes.sql'];
    
    foreach ($migrations as $migration) {
        $sqlFile = __DIR__ . '/' . $migration;
        if (!file_exists($sqlFile)) {
            throw new Exception("Migration file not found at $sqlFile");
        }
        
        echo "Executing migration: $migration...\n";
        $sql = file_get_contents($sqlFile);
        try {
            $pdo->exec($sql);
            echo "✅ $migration applied successfully.\n";
        } catch (PDOException $e) {
            $msg = $e->getMessage();
            $code = $e->getCode();
            // Ignorar errores típicos de re-ejecución local (tabla/columna existente, o drops de índices/columnas que ya se hicieron)
            $isIgnorable = in_array($code, ['42S01', '42S21'], true) 
                || str_contains($msg, 'already exists') 
                || ($code === '42000' && (str_contains($msg, "Can't DROP") || str_contains($msg, "check that it exists") || str_contains($msg, "Duplicate column name")));
                
            if ($isIgnorable) {
                echo "⚠️ $migration skipped (database structure already updated).\n";
            } else {
                throw $e;
            }
        }
    }
    
    echo "✅ All migrations completed successfully!\n";
} catch (Throwable $e) {
    die("❌ Error during migration: " . $e->getMessage() . "\n");
}
