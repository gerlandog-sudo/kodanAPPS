<?php
$pdo = new PDO(
    'mysql:host=170.249.236.27;port=3306;dbname=admkoda_BBDD_APPS;charset=utf8mb4',
    'admkoda_APPS_admin',
    'admin2026',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$tenantId = 16;
$projectId = 1;

$sql = "SELECT t.*, tt.name AS task_type_name, tt.color_hex AS task_type_color, tt.icon AS task_type_icon, u.display_name AS assigned_name
         FROM `TRACKER_project_tasks` t
         LEFT JOIN task_types tt ON tt.id = t.task_type_id
         LEFT JOIN users u ON u.id = t.assigned_to
         WHERE t.tenant_id = :tenant_id AND t.project_id = :project_id
         ORDER BY t.position ASC";

$s = $pdo->prepare($sql);
$s->execute([':tenant_id' => $tenantId, ':project_id' => $projectId]);
$rows = $s->fetchAll(PDO::FETCH_ASSOC);
echo "OK - " . count($rows) . " resultados\n";
foreach ($rows as $r) {
    echo "  #{$r['id']} \"{$r['title']}\" status={$r['kanban_status']}\n";
}
