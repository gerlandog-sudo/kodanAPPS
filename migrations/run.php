<?php
/**
 * Migration Runner - kodanAPPS
 * 
 * Lee las credenciales de apps/api/.env y ejecuta migraciones SQL/PHP
 */

declare(strict_types=1);

/**
 * Parsea .env manualmente (parse_ini_file falla con URLs y paréntesis en comentarios)
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
            // Quitar comillas dobles si existen
            if (strlen($val) >= 2 && $val[0] === '"' && $val[-1] === '"') {
                $val = substr($val, 1, -1);
            }
            $vars[$key] = $val;
        }
    }
    return $vars;
}

$envPath = __DIR__ . '/../apps/api/.env';
$dotenv = loadEnv($envPath);

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
    
    $migrations = [
        '001_core_schema.sql', '002_tenant_wizard.sql', '003_crm_schema.sql',
        '004_tracker_preview.sql', '005_settings_features.sql', '006_pipeline_fixes.sql',
        '007_drop_refresh_tokens.sql', '008_add_product_fields.sql', '008_unify_messaging_system.php',
        '009_recount_plan_usage.php', '010_create_notifications_table.php',
        '011_won_lost_reasons.php', '012_workflow_automation.sql',
        '012_task_types_and_status.php', '013_create_email_templates.php',
        '014_create_tenant_smtp_config.php', '015_add_is_blocked_to_plan_limits.sql',
        '016_create_app_metrics.sql', '017_create_tenant_limit_overrides.sql',
        '018_create_tenant_recount_schedule.sql', '019_update_v_tenant_plan_limits.sql',
        '020_rename_crm_tables.sql', '021_cross_app_config.sql',
        '022_tracker_project_tasks.sql', '023_tracker_time_entries.sql', '024_tracker_extensions.sql',
        '025_extend_projects_for_metrics.php',
        '026_rename_projects_to_tracker_projects.php',
        '027_add_archived_to_kanban.php',
        '028_tracker_time_entry_audit.php',
    ];
    
    foreach ($migrations as $migration) {
        $file = __DIR__ . '/' . $migration;
        if (!file_exists($file)) {
            throw new Exception("Migration file not found at $file");
        }
        
        echo "Executing migration: $migration...\n";
        $ext = pathinfo($migration, PATHINFO_EXTENSION);
        
        try {
            if ($ext === 'php') {
                // Las migraciones PHP son standalone, incluir en subproceso
                $output = [];
                $returnCode = 0;
                exec("php \"{$file}\" 2>&1", $output, $returnCode);
                if ($returnCode !== 0) {
                    echo implode("\n", $output) . "\n";
                    throw new Exception("PHP migration failed with code $returnCode");
                }
                echo implode("\n", $output) . "\n";
                echo "✅ $migration executed successfully.\n";
            } else {
                $sql = file_get_contents($file);
                $pdo->exec($sql);
                echo "✅ $migration applied successfully.\n";
            }
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
