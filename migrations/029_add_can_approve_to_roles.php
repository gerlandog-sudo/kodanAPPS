<?php
/**
 * Migration 029: Añadir columna can_approve a roles
 * 
 * Agrega permisos a nivel de base de datos para aprobación de horas.
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

    // 1. Agregar columna can_approve si no existe
    $columns = $pdo->query("SHOW COLUMNS FROM `roles` LIKE 'can_approve'")->fetchAll();
    if (empty($columns)) {
        echo "Añadiendo columna 'can_approve' a la tabla 'roles'...\n";
        $pdo->exec("ALTER TABLE `roles` ADD COLUMN `can_approve` TINYINT(1) NOT NULL DEFAULT 0;");
        echo "✅ Columna 'can_approve' añadida con éxito.\n";
    } else {
        echo "ℹ️ La columna 'can_approve' ya existe.\n";
    }

    // 2. Normalizar nombres de roles a minúsculas
    echo "Normalizando nombres de roles a minúsculas...\n";
    $pdo->exec("UPDATE `roles` SET `name` = LOWER(`name`);");
    echo "✅ Nombres de roles normalizados.\n";

    // 3. Asignar permisos de aprobación a admin y pm en tracker
    echo "Asignando permisos de aprobación a admin y pm en tracker...\n";
    $pdo->exec("UPDATE `roles` SET `can_approve` = 1 WHERE `app_id` = 'tracker' AND (`name` = 'admin' OR `name` = 'pm');");
    echo "✅ Permisos de aprobación asignados.\n";

} catch (PDOException $e) {
    echo "❌ Error de BD: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\nMigración 029 completada.\n";
