<?php
/**
 * Migration 026: Renombrar tabla projects -> TRACKER_projects
 * 
 * La tabla `projects` es la única del módulo Tracker que no usa
 * el prefijo TRACKER_. Se renombra para mantener consistencia.
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

    // Verificar si la tabla projects existe
    $stmt = $pdo->query("SHOW TABLES LIKE 'projects'");
    if (!$stmt->fetch()) {
        echo "La tabla 'projects' NO existe. ";
        // Verificar si TRACKER_projects ya existe
        $stmt2 = $pdo->query("SHOW TABLES LIKE 'TRACKER_projects'");
        if ($stmt2->fetch()) {
            echo "Pero 'TRACKER_projects' YA existe. Nada que hacer.\n";
            exit(0);
        }
        echo "Tampoco existe 'TRACKER_projects'. Nada que renombrar.\n";
        exit(0);
    }

    // Verificar si TRACKER_projects ya existe (conflicto)
    $stmt = $pdo->query("SHOW TABLES LIKE 'TRACKER_projects'");
    if ($stmt->fetch()) {
        echo "ERROR: 'TRACKER_projects' YA existe. No se puede renombrar.\n";
        exit(1);
    }

    // Renombrar
    echo "Renombrando `projects` -> `TRACKER_projects`...\n";
    $pdo->exec("RENAME TABLE `projects` TO `TRACKER_projects`");
    
    // Verificar
    $check = $pdo->query("SHOW TABLES LIKE 'TRACKER_projects'");
    if ($check->fetch()) {
        echo "✅ Renombre exitoso. Tabla 'TRACKER_projects' lista.\n";
    } else {
        echo "❌ Error: No se pudo verificar la tabla renombrada.\n";
        exit(1);
    }

    // Verificar que projects ya no existe
    $stmt = $pdo->query("SHOW TABLES LIKE 'projects'");
    if (!$stmt->fetch()) {
        echo "✅ Tabla 'projects' ya no existe en el esquema.\n";
    } else {
        echo "⚠️  Tabla 'projects' aún existe (posiblemente quedó un mirror).\n";
    }

} catch (PDOException $e) {
    echo "❌ Error de BD: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\nMigración 026 completada.\n";
