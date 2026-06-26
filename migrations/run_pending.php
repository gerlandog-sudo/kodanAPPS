<?php
declare(strict_types=1);

$envPath = __DIR__ . '/../apps/api/.env';
$vars = [];
if (file_exists($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) $vars[trim($parts[0])] = trim($parts[1]);
    }
}
$config = [
    'host' => $vars['DB_HOST'] ?? 'localhost',
    'port' => (int)($vars['DB_PORT'] ?? 3306),
    'dbname' => $vars['DB_NAME'] ?? 'admkoda_BBDD_APPS',
    'user' => $vars['DB_USER'] ?? 'kodan_apps',
    'pass' => $vars['DB_PASS'] ?? '',
];
$pdo = new PDO("mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset=utf8mb4", $config['user'], $config['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$files = ['020_rename_crm_tables.sql','021_cross_app_config.sql','022_tracker_project_tasks.sql','023_tracker_time_entries.sql','024_tracker_extensions.sql'];
foreach ($files as $f) {
    $path = __DIR__ . '/' . $f;
    echo "Running $f...\n";
    try {
        $pdo->exec(file_get_contents($path));
        echo "  OK\n";
    } catch (PDOException $e) {
        $m = $e->getMessage();
        $ignore = in_array($e->getCode(), ['42S01','42S21'], true) || str_contains($m, 'already exists') || str_contains($m, 'Duplicate column') || (str_contains($m, "Can't DROP") || str_contains($m, 'check that it exists'));
        if ($ignore) { echo "  SKIP (already applied)\n"; }
        else { echo "  ERROR: $m\n"; exit(1); }
    }
}
echo "Done.\n";
