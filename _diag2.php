<?php
$pdo = new PDO(
    'mysql:host=170.249.236.27;port=3306;dbname=admkoda_BBDD_APPS;charset=utf8mb4',
    'admkoda_APPS_admin',
    'admin2026',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "=== task_types module=tracker ===\n";
$r = $pdo->query("SELECT id, name, module FROM task_types WHERE module='tracker'");
foreach ($r as $x) {
    echo "  #{$x['id']} {$x['name']} [{$x['module']}]\n";
}
if ($r->rowCount() == 0) echo "  (vacio)\n";

echo "\n=== task_types module=crm ===\n";
$r = $pdo->query("SELECT id, name, module FROM task_types WHERE module='crm'");
foreach ($r as $x) {
    echo "  #{$x['id']} {$x['name']} [{$x['module']}]\n";
}
if ($r->rowCount() == 0) echo "  (vacio)\n";

echo "\n=== task_types ALL ===\n";
$r = $pdo->query("SELECT id, name, module FROM task_types");
foreach ($r as $x) {
    echo "  #{$x['id']} {$x['name']} [{$x['module']}]\n";
}
