<?php
/**
 * Backfill: initialize + recount tenant_plan_usage for all existing tenants.
 * Run once after deploying migrations 015-019.
 */
declare(strict_types=1);

function loadEnv(string $path): array {
    $vars = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (!str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $key = trim($key);
        $val = trim($val);
        $val = trim($val, '"\'');
        $vars[$key] = $val;
    }
    return $vars;
}

$env = loadEnv(__DIR__ . '/../apps/api/.env');

$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    $env['DB_HOST'] ?? '127.0.0.1',
    $env['DB_PORT'] ?? '3306',
    $env['DB_NAME'] ?? ''
);

$pdo = new PDO($dsn, $env['DB_USER'] ?? 'root', $env['DB_PASS'] ?? '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

echo "Conectado a {$env['DB_HOST']}\n";

// 1. Obtener todos los tenants activos con su plan
$tenants = $pdo->query(
    "SELECT t.tenant_id, t.subscription_plan_id
     FROM tenants t
     WHERE t.is_active = 1 AND t.subscription_plan_id IS NOT NULL"
)->fetchAll();

echo "Tenants activos: " . count($tenants) . "\n";

$initStmt = $pdo->prepare(
    "INSERT IGNORE INTO tenant_plan_usage (tenant_id, module, metric, current_value)
     VALUES (?, ?, ?, 0)"
);

// 2. Para cada tenant: init + recount
foreach ($tenants as $t) {
    $tid = (int)$t['tenant_id'];
    $pid = (int)$t['subscription_plan_id'];
    echo "  Tenant {$tid} (plan {$pid})... ";

    // Initialize: INSERT IGNORE rows from plan_limits
    $metrics = $pdo->prepare("SELECT module, metric FROM plan_limits WHERE plan_id = ?");
    $metrics->execute([$pid]);
    $inserted = 0;
    foreach ($metrics as $m) {
        $initStmt->execute([$tid, $m['module'], $m['metric']]);
        $inserted += $initStmt->rowCount() > 0 ? 1 : 0;
    }

    // Recount CRM
    $pdo->prepare(
        "UPDATE tenant_plan_usage u
         JOIN (SELECT COUNT(*) AS cnt FROM opportunities WHERE tenant_id = ?) actual
         SET u.current_value = actual.cnt
         WHERE u.tenant_id = ? AND u.module = 'crm' AND u.metric = 'negotiations_max'"
    )->execute([$tid, $tid]);

    $pdo->prepare(
        "UPDATE tenant_plan_usage u
         JOIN (SELECT COUNT(*) AS cnt FROM accounts WHERE tenant_id = ?) actual
         SET u.current_value = actual.cnt
         WHERE u.tenant_id = ? AND u.module = 'crm' AND u.metric = 'accounts_max'"
    )->execute([$tid, $tid]);

    $pdo->prepare(
        "UPDATE tenant_plan_usage u
         JOIN (SELECT COUNT(*) AS cnt FROM contacts WHERE tenant_id = ?) actual
         SET u.current_value = actual.cnt
         WHERE u.tenant_id = ? AND u.module = 'crm' AND u.metric = 'contacts_max'"
    )->execute([$tid, $tid]);

    $pdo->prepare(
        "UPDATE tenant_plan_usage u
         JOIN (SELECT COUNT(*) AS cnt FROM users WHERE tenant_id = ? AND is_active = 1) actual
         SET u.current_value = actual.cnt
         WHERE u.tenant_id = ? AND u.module = 'crm' AND u.metric = 'users_max'"
    )->execute([$tid, $tid]);

    // Recount Tracker
    $pdo->prepare(
        "UPDATE tenant_plan_usage u
         JOIN (SELECT COUNT(*) AS cnt FROM projects WHERE tenant_id = ?) actual
         SET u.current_value = actual.cnt
         WHERE u.tenant_id = ? AND u.module = 'tracker' AND u.metric = 'projects_max'"
    )->execute([$tid, $tid]);

    $pdo->prepare(
        "UPDATE tenant_plan_usage u
         JOIN (SELECT COUNT(*) AS cnt FROM users WHERE tenant_id = ? AND is_active = 1) actual
         SET u.current_value = actual.cnt
         WHERE u.tenant_id = ? AND u.module = 'tracker' AND u.metric = 'users_max'"
    )->execute([$tid, $tid]);

    echo "{$inserted} rows initialized, recounted.\n";
}

echo "Done.\n";
