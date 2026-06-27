<?php
/**
 * Migration 027: Agregar 'archived' al ENUM kanban_status de TRACKER_project_tasks
 * 
 * Permite archivar tareas en el kanban board, moviéndolas a una columna "Archivada"
 * que solo se muestra cuando el usuario activa el toggle correspondiente.
 */

$dbHost = getenv('DB_HOST') ?: '170.249.236.27';
$dbPort = getenv('DB_PORT') ?: '3306';
$dbName = getenv('DB_NAME') ?: 'admkoda_BBDD_APPS';
$dbUser = getenv('DB_USER') ?: 'admkoda_APPS_admin';
$dbPass = getenv('DB_PASS') ?: 'admin2026';

echo "Conectando a {$dbHost}:{$dbPort}...\n";

try {
    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    echo "Conectado a {$dbName}.\n\n";

    // Verificar si TRACKER_project_tasks existe
    $stmt = $pdo->query("SHOW TABLES LIKE 'TRACKER_project_tasks'");
    if (!$stmt->fetch()) {
        echo "❌ La tabla 'TRACKER_project_tasks' NO existe. Abortando.\n";
        exit(1);
    }

    // Obtener el ENUM actual
    $stmt = $pdo->query("SHOW COLUMNS FROM `TRACKER_project_tasks` LIKE 'kanban_status'");
    $col = $stmt->fetch();
    $currentEnum = $col['Type'] ?? '';
    echo "Estado actual: {$currentEnum}\n";

    // Verificar si 'archived' ya está en el ENUM
    if (str_contains($currentEnum, "'archived'")) {
        echo "✅ 'archived' ya existe en el ENUM. Nada que hacer.\n";
        exit(0);
    }

    // Agregar 'archived' al ENUM
    echo "Agregando 'archived' al ENUM kanban_status...\n";
    $pdo->exec("ALTER TABLE `TRACKER_project_tasks` MODIFY COLUMN `kanban_status` ENUM('todo','in_progress','review','done','archived') NOT NULL DEFAULT 'todo'");

    // Verificar
    $stmt = $pdo->query("SHOW COLUMNS FROM `TRACKER_project_tasks` LIKE 'kanban_status'");
    $col = $stmt->fetch();
    echo "Estado nuevo: {$col['Type']}\n";

    if (str_contains($col['Type'], "'archived'")) {
        echo "✅ Migración exitosa. 'archived' agregado al ENUM.\n";
    } else {
        echo "❌ Error: No se pudo verificar el cambio.\n";
        exit(1);
    }

} catch (PDOException $e) {
    echo "❌ Error de BD: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\nMigración 027 completada.\n";
