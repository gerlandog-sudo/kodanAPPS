<?php
/**
 * Migration 028: Crear tabla TRACKER_time_entry_audit
 * 
 * Tabla para almacenar el historial de auditoría de cada registro de horas.
 */

function loadEnv(string $path): array
{
    $vars = [];
    if (!file_exists($path)) return $vars;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $val = trim($parts[1]);
            if (strlen($val) >= 2 && $val[0] === '"' && $val[-1] === '"') {
                $val = substr($val, 1, -1);
            }
            $vars[$key] = $val;
        }
    }
    return $vars;
}

$dotenv = loadEnv(__DIR__ . '/../apps/api/.env');

$dbHost = getenv('DB_HOST') ?: ($dotenv['DB_HOST'] ?? '127.0.0.1');
$dbPort = (int)(getenv('DB_PORT') ?: ($dotenv['DB_PORT'] ?? 3306));
$dbName = getenv('DB_NAME') ?: ($dotenv['DB_NAME'] ?? 'admkoda_BBDD_APPS');
$dbUser = getenv('DB_USER') ?: ($dotenv['DB_USER'] ?? 'kodan_apps');
$dbPass = getenv('DB_PASS') ?: ($dotenv['DB_PASS'] ?? 'admin2026');

$dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
echo "Conectando a base de datos en {$dbHost}:{$dbPort}...\n";

try {
    try {
        $pdo = new PDO($dsn, $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (PDOException $e) {
        if ($dbHost === 'mariadb' || $dbHost === '170.249.236.27') {
            echo "⚠️ Intentando conectar a localhost / 127.0.0.1...\n";
            $dbHost = '127.0.0.1';
            $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } else {
            throw $e;
        }
    }
    echo "Conectado a {$dbName}.\n\n";

    echo "Creando tabla 'TRACKER_time_entry_audit'...\n";
    $sql = "CREATE TABLE IF NOT EXISTS `TRACKER_time_entry_audit` (
      `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
      `tenant_id` BIGINT(20) NOT NULL,
      `time_entry_id` BIGINT(20) NOT NULL,
      `user_id` BIGINT(20) NOT NULL,
      `action` VARCHAR(50) NOT NULL COMMENT 'ej: created, submitted, approved, rejected, updated',
      `status` VARCHAR(20) NOT NULL COMMENT 'ej: draft, submitted, approved, rejected',
      `description` VARCHAR(255) NOT NULL COMMENT 'ej: Registro creado, Cambio de estado, Registro modificado',
      `details` TEXT DEFAULT NULL COMMENT 'motivo de rechazo o cambios',
      `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      PRIMARY KEY (`id`),
      KEY `idx_time_entry_audit_tenant` (`tenant_id`),
      KEY `idx_time_entry_audit_entry` (`time_entry_id`),
      CONSTRAINT `fk_time_entry_audit_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE,
      CONSTRAINT `fk_time_entry_audit_entry` FOREIGN KEY (`time_entry_id`) REFERENCES `TRACKER_time_entries` (`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_time_entry_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($sql);
    echo "✅ Tabla 'TRACKER_time_entry_audit' creada o verificada con éxito.\n";

} catch (PDOException $e) {
    echo "❌ Error de BD: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\nMigración 028 completada.\n";
