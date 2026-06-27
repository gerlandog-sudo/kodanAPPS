<?php
$pdo = new PDO(
    'mysql:host=170.249.236.27;port=3306;dbname=admkoda_BBDD_APPS;charset=utf8mb4',
    'admkoda_APPS_admin',
    'admin2026',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$tenantId = 16;
$projectId = isset($argv[1]) ? (int)$argv[1] : 1;

echo "=== Proyectos del tenant $tenantId ===\n";
$r = $pdo->query("SELECT id, name, status FROM TRACKER_projects WHERE tenant_id = $tenantId");
foreach ($r as $x) {
    echo "  #{$x['id']} {$x['name']} [{$x['status']}]\n";
}

echo "\n=== TRACKER_project_tasks del tenant $tenantId ===\n";
$r = $pdo->query("SELECT COUNT(*) AS cnt FROM TRACKER_project_tasks WHERE tenant_id = $tenantId");
echo "  Total: " . $r->fetchColumn() . "\n";

$r = $pdo->query("SELECT id, project_id, title, kanban_status, tenant_id FROM TRACKER_project_tasks WHERE tenant_id = $tenantId ORDER BY id");
foreach ($r as $x) {
    echo "  #{$x['id']} p{$x['project_id']} \"{$x['title']}\" status={$x['kanban_status']} tenant={$x['tenant_id']}\n";
}

echo "\n=== Test: La query exacta del kanban causaria ambiguous? ===\n";
$sql = "SELECT t.*, tt.name AS task_type_name
         FROM `TRACKER_project_tasks` t
         LEFT JOIN task_types tt ON tt.id = t.task_type_id
         LEFT JOIN users u ON u.id = t.assigned_to
         WHERE tenant_id = :tenant_id AND t.project_id = :project_id
         ORDER BY t.position ASC";
try {
    $s = $pdo->prepare($sql);
    $s->execute([':tenant_id' => $tenantId, ':project_id' => $projectId]);
    $rows = $s->fetchAll();
    echo "  OK - " . count($rows) . " resultados\n";
} catch (Exception $e) {
    echo "  ERROR: " . $e->getMessage() . "\n";
}
