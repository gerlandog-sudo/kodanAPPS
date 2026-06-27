<?php
$pdo = new PDO(
    'mysql:host=170.249.236.27;port=3306;dbname=admkoda_BBDD_APPS;charset=utf8mb4',
    'admkoda_APPS_admin',
    'admin2026',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// Verificar si ya hay tipos para tracker
$r = $pdo->query("SELECT COUNT(*) FROM task_types WHERE module='tracker'");
$count = (int)$r->fetchColumn();
if ($count > 0) {
    echo "Ya hay $count tipos de tarea para tracker, no se agregan duplicados.\n";
    exit;
}

$maxId = (int)$pdo->query("SELECT COALESCE(MAX(id), 0) FROM task_types")->fetchColumn();

$defaults = [
    ['name' => 'Desarrollo',   'icon' => 'code',        'color_hex' => '#6366F1'],
    ['name' => 'Diseño',       'icon' => 'palette',     'color_hex' => '#EC4899'],
    ['name' => 'Revisión',     'icon' => 'search',      'color_hex' => '#F59E0B'],
    ['name' => 'Documentación','icon' => 'file-text',   'color_hex' => '#14B8A6'],
    ['name' => 'Testing',      'icon' => 'bug',         'color_hex' => '#EF4444'],
    ['name' => 'Reunión',      'icon' => 'users',       'color_hex' => '#3B82F6'],
    ['name' => 'Soporte',      'icon' => 'headphones',  'color_hex' => '#8B5CF6'],
];

$inserted = 0;
foreach ($defaults as $d) {
    $maxId++;
    $pdo->prepare(
        "INSERT INTO task_types (id, tenant_id, module, name, icon, color_hex, created_at)
         VALUES (?, 0, 'tracker', ?, ?, ?, NOW())"
    )->execute([$maxId, $d['name'], $d['icon'], $d['color_hex']]);
    echo "  + {$d['name']}\n";
    $inserted++;
}
echo "Insertados $inserted tipos de tarea para tracker.\n";
