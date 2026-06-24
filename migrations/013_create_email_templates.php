<?php
/**
 * Migration 013: Crear tabla de plantillas de correo transversales - kodanAPPS
 * 
 * Este script de migración PHP independiente:
 * 1. Crea la tabla 'email_templates' con soporte multitenant.
 * 2. Agrega índices y claves foráneas asociadas.
 */

declare(strict_types=1);

$envPath = __DIR__ . '/../apps/api/.env';
$dotenv = [];
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (is_array($lines)) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $key = trim($parts[0]);
                $val = trim($parts[1]);
                $val = trim($val, '"\'');
                $dotenv[$key] = $val;
            }
        }
    }
}

$config = [
    'host' => getenv('DB_HOST') ?: ($dotenv['DB_HOST'] ?? '127.0.0.1'),
    'port' => (int)(getenv('DB_PORT') ?: ($dotenv['DB_PORT'] ?? 3306)),
    'dbname' => getenv('DB_NAME') ?: ($dotenv['DB_NAME'] ?? 'admkoda_BBDD_APPS'),
    'user' => 'admkoda_APPS_admin',
    'pass' => 'admin2026',
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

    echo "Creating 'email_templates' table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `email_templates` (
          `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
          `tenant_id` BIGINT(20) NOT NULL,
          `name` VARCHAR(100) NOT NULL,
          `subject` VARCHAR(255) NOT NULL,
          `body` LONGTEXT NOT NULL,
          `module` VARCHAR(50) DEFAULT NULL,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
          `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(),
          PRIMARY KEY (`id`),
          KEY `idx_templates_tenant` (`tenant_id`),
          CONSTRAINT `fk_email_templates_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✅ Table 'email_templates' created successfully.\n";

} catch (Throwable $e) {
    die("❌ Error during migration 013: " . $e->getMessage() . "\n");
}
