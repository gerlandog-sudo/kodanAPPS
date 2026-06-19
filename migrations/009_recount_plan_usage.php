<?php
/**
 * Recuenta contadores de tenant_plan_usage desde datos reales
 * 
 * Corrección: el contador users_max no se incrementaba al crear
 * el usuario admin en TenantService::createTenantWithAdmin().
 * Los tenants existentes tienen el contador desfasado.
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
    $pdo = new PDO($dsn, $config['user'], $config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    echo "Recalculando users_max desde usuarios activos reales...\n";

    $affected = $pdo->exec("
        UPDATE tenant_plan_usage u
        JOIN (
            SELECT tenant_id, COUNT(*) AS cnt
            FROM users
            WHERE is_active = 1
            GROUP BY tenant_id
        ) actual ON u.tenant_id = actual.tenant_id
        SET u.current_value = actual.cnt
        WHERE u.metric = 'users_max'
    ");

    echo "✅ users_max actualizado en $affected filas.\n";

    echo "Recalculando negotiations_max desde negociaciones activas reales...\n";

    $affected = $pdo->exec("
        UPDATE tenant_plan_usage u
        JOIN (
            SELECT tenant_id, COUNT(*) AS cnt
            FROM opportunities
            WHERE deleted_at IS NULL
            GROUP BY tenant_id
        ) actual ON u.tenant_id = actual.tenant_id
        SET u.current_value = actual.cnt
        WHERE u.metric = 'negotiations_max'
    ");

    echo "✅ negotiations_max actualizado en $affected filas.\n";

    echo "Recalculando tasks_max desde tareas activas reales...\n";

    $crmTasksExist = $pdo->query("SHOW TABLES LIKE 'crm_tasks'")->rowCount() > 0;
    if ($crmTasksExist) {
        $affected = $pdo->exec("
            UPDATE tenant_plan_usage u
            JOIN (
                SELECT tenant_id, COUNT(*) AS cnt
                FROM crm_tasks
                WHERE deleted_at IS NULL AND is_completed = 0
                GROUP BY tenant_id
            ) actual ON u.tenant_id = actual.tenant_id
            SET u.current_value = actual.cnt
            WHERE u.metric = 'tasks_max'
        ");
        echo "✅ tasks_max actualizado en $affected filas.\n";
    } else {
        echo "⚠️ Tabla crm_tasks no existe, se omite tasks_max.\n";
    }

    echo "✅ Todos los contadores recalculados.\n";
} catch (Throwable $e) {
    die("❌ Error: " . $e->getMessage() . "\n");
}
