<?php
/**
 * Migration 025: Extender tabla projects con columnas para Métricas (budget_money, start_date, end_date)
 * 
 * Este script de migración PHP independiente:
 * 1. Agrega 'budget_money' (DECIMAL 15,2) a la tabla 'projects' si no existe.
 * 2. Agrega 'start_date' (DATE) a la tabla 'projects' si no existe.
 * 3. Agrega 'end_date' (DATE) a la tabla 'projects' si no existe.
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
    'user' => getenv('DB_USER') ?: ($dotenv['DB_USER'] ?? 'kodan_apps'),
    'pass' => getenv('DB_PASS') ?: ($dotenv['DB_PASS'] ?? 'admin2026'),
    'charset' => 'utf8mb4',
];

$dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$config['charset']}";

function columnExists(PDO $pdo, string $table, string $column): bool {
    try {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
        $stmt->execute([$column]);
        return (bool)$stmt->fetch();
    } catch (Throwable $e) {
        return false;
    }
}

try {
    echo "Connecting to database at {$config['host']}:{$config['port']}...\n";
    $pdo = new PDO($dsn, $config['user'], $config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    echo "✅ Database connection successful.\n";

    echo "Extending 'projects' table...\n";
    
    if (!columnExists($pdo, 'projects', 'budget_money')) {
        $pdo->exec("ALTER TABLE `projects` ADD COLUMN `budget_money` DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER `budget_hours`");
        echo "✅ Column 'budget_money' added to 'projects'.\n";
    } else {
        echo "ℹ️ Column 'budget_money' already exists in 'projects'.\n";
    }

    if (!columnExists($pdo, 'projects', 'start_date')) {
        $pdo->exec("ALTER TABLE `projects` ADD COLUMN `start_date` DATE DEFAULT NULL AFTER `budget_money`");
        echo "✅ Column 'start_date' added to 'projects'.\n";
    } else {
        echo "ℹ️ Column 'start_date' already exists in 'projects'.\n";
    }

    if (!columnExists($pdo, 'projects', 'end_date')) {
        $pdo->exec("ALTER TABLE `projects` ADD COLUMN `end_date` DATE DEFAULT NULL AFTER `start_date`");
        echo "✅ Column 'end_date' added to 'projects'.\n";
    } else {
        echo "ℹ️ Column 'end_date' already exists in 'projects'.\n";
    }

    echo "✅ Table 'projects' extended successfully.\n";

} catch (Throwable $e) {
    die("❌ Error during migration 025: " . $e->getMessage() . "\n");
}
