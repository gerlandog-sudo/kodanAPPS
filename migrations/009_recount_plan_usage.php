<?php
declare(strict_types=1);

function loadEnv(string $path): array {
    $vars = [];
    if (!file_exists($path)) return $vars;
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (!str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $vars[trim($key)] = trim($val);
    }
    return $vars;
}

$env = loadEnv(__DIR__ . '/../apps/api/.env');

$config = [
    'host' => getenv('DB_HOST') ?: ($env['DB_HOST'] ?? '127.0.0.1'),
    'port' => (int)(getenv('DB_PORT') ?: ($env['DB_PORT'] ?? 3306)),
    'dbname' => getenv('DB_NAME') ?: ($env['DB_NAME'] ?? 'admkoda_BBDD_APPS'),
    'user' => getenv('DB_USER') ?: ($env['DB_USER'] ?? 'kodan_apps'),
    'pass' => getenv('DB_PASS') ?: ($env['DB_PASS'] ?? 'admin2026'),
];

$dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $config['user'], $config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    echo "Recalculando users_max desde usuarios activos reales...\n";
    $affected = $pdo->exec("
        UPDATE tenant_plan_usage u
        JOIN (SELECT tenant_id, COUNT(*) AS cnt FROM users WHERE is_active = 1 GROUP BY tenant_id) actual
        ON u.tenant_id = actual.tenant_id
        SET u.current_value = actual.cnt
        WHERE u.metric = 'users_max'
    ");
    echo "✅ users_max actualizado en $affected filas.\n";

    echo "Recalculando negotiations_max...\n";
    $affected = $pdo->exec("
        UPDATE tenant_plan_usage u
        JOIN (SELECT tenant_id, COUNT(*) AS cnt FROM opportunities WHERE deleted_at IS NULL GROUP BY tenant_id) actual
        ON u.tenant_id = actual.tenant_id
        SET u.current_value = actual.cnt
        WHERE u.metric = 'negotiations_max'
    ");
    echo "✅ negotiations_max actualizado en $affected filas.\n";

    $tables = $pdo->query("SHOW TABLES LIKE 'crm_tasks'")->fetchAll();
    if (count($tables) > 0) {
        echo "Recalculando tasks_max...\n";
        $affected = $pdo->exec("
            UPDATE tenant_plan_usage u
            JOIN (SELECT tenant_id, COUNT(*) AS cnt FROM crm_tasks WHERE deleted_at IS NULL AND is_completed = 0 GROUP BY tenant_id) actual
            ON u.tenant_id = actual.tenant_id
            SET u.current_value = actual.cnt
            WHERE u.metric = 'tasks_max'
        ");
        echo "✅ tasks_max actualizado en $affected filas.\n";
    }

    echo "✅ Todos los contadores recalculados.\n";
} catch (Throwable $e) {
    die("❌ Error: " . $e->getMessage() . "\n");
}
