<?php
/**
 * Migration 010: Crear tabla de notificaciones transversales intelgentes - kodanAPPS
 * 
 * Este script de migración PHP independiente:
 * 1. Crea la tabla 'notifications'.
 * 2. Agrega índices y claves foráneas a tenants y users.
 * 3. Previene duplicados con un constraint UNIQUE multicampo.
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

    echo "Creating 'notifications' table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `notifications` (
          `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
          `tenant_id` BIGINT(20) NOT NULL,
          `user_id` BIGINT(20) NOT NULL,
          `type` VARCHAR(50) NOT NULL,
          `entity_type` VARCHAR(50) DEFAULT NULL,
          `entity_id` BIGINT(20) UNSIGNED DEFAULT NULL,
          `title` VARCHAR(255) NOT NULL,
          `message` TEXT NOT NULL,
          `is_read` TINYINT(1) NOT NULL DEFAULT 0,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
          PRIMARY KEY (`id`),
          UNIQUE KEY `uk_tenant_user_entity_alert` (`tenant_id`, `user_id`, `type`, `entity_type`, `entity_id`),
          CONSTRAINT `fk_notifications_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
          CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    echo "✅ Migration 010 completed successfully!\n";

} catch (Throwable $e) {
    die("❌ Error during migration: " . $e->getMessage() . "\n");
}
