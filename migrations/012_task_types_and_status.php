<?php
/**
 * Migration 012: Crear tabla de tipos de tareas comerciales y actualizar tabla de tareas - kodanAPPS
 * 
 * Este script de migración PHP independiente:
 * 1. Crea la tabla 'task_types'.
 * 2. Inserta tipos de tareas por defecto (Reunión, Demo, Llamada, Visita) para todos los tenants.
 * 3. Agrega columnas 'start_date', 'end_date' y 'task_type_id' a la tabla 'tasks'.
 * 4. Migra los estados anteriores 'pending'/'completed' a 'todo'/'done'.
 * 5. Modifica la columna 'status' de 'tasks' para soportar los nuevos estados.
 */

declare(strict_types=1);

// 1. Cargar .env de apps/api
$envPathApi = __DIR__ . '/../apps/api/.env';
$dotenvApi = [];
if (file_exists($envPathApi)) {
    $lines = file($envPathApi, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (is_array($lines)) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $dotenvApi[trim($parts[0])] = trim(trim($parts[1]), '"\'');
            }
        }
    }
}

// 2. Cargar .env de la raíz
$envPathRoot = __DIR__ . '/../.env';
$dotenvRoot = [];
if (file_exists($envPathRoot)) {
    $lines = file($envPathRoot, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (is_array($lines)) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $dotenvRoot[trim($parts[0])] = trim(trim($parts[1]), '"\'');
            }
        }
    }
}

// Intentar configuración de BD
$configs = [
    [
        'host' => '170.249.236.27',
        'port' => 3306,
        'dbname' => 'admkoda_BBDD_APPS',
        'user' => 'admkoda_APPS_admin',
        'pass' => 'admin2026',
        'label' => 'Entorno Remoto Admin (admkoda_APPS_admin)'
    ],
    [
        'host' => $dotenvApi['DB_HOST'] ?? '170.249.236.27',
        'port' => (int)($dotenvApi['DB_PORT'] ?? 3306),
        'dbname' => $dotenvApi['DB_NAME'] ?? 'admkoda_BBDD_APPS',
        'user' => $dotenvApi['DB_USER'] ?? 'kodan_apps',
        'pass' => $dotenvApi['DB_PASS'] ?? 'admin2026',
        'label' => 'Entorno API Remoto/Configurado'
    ],
    [
        'host' => '127.0.0.1',
        'port' => (int)($dotenvRoot['DB_PORT'] ?? 3306),
        'dbname' => $dotenvRoot['DB_NAME'] ?? 'admkoda_BBDD_APPS',
        'user' => $dotenvRoot['DB_USER'] ?? 'admkoda_APPS_admin',
        'pass' => $dotenvRoot['DB_PASS'] ?? 'admin2026',
        'label' => 'Entorno Local Root (localhost/127.0.0.1)'
    ],
    [
        'host' => '127.0.0.1',
        'port' => 3306,
        'dbname' => 'admkoda_BBDD_APPS',
        'user' => 'kodan_apps',
        'pass' => 'admin2026',
        'label' => 'Entorno Local Fallback 2'
    ]
];

$pdo = null;
$connectedConfig = null;

foreach ($configs as $config) {
    $charset = $config['charset'] ?? 'utf8mb4';
    $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$charset}";
    try {
        echo "Intentando conectar usando: {$config['label']} ({$config['host']}:{$config['port']}) con usuario '{$config['user']}'...\n";
        $pdo = new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        echo "✅ Conexión exitosa con {$config['label']}.\n";
        $connectedConfig = $config;
        break;
    } catch (PDOException $e) {
        echo "⚠️ Error de conexión: " . $e->getMessage() . "\n";
    }
}

if (!$pdo || !$connectedConfig) {
    die("❌ No se pudo conectar a la base de datos usando ninguna de las configuraciones.\n");
}

try {
    // 1. Crear tabla task_types
    echo "Creando tabla 'task_types' si no existe...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `task_types` (
          `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
          `tenant_id` BIGINT(20) NOT NULL,
          `name` VARCHAR(100) NOT NULL,
          `icon` VARCHAR(50) DEFAULT 'list',
          `color_hex` VARCHAR(7) DEFAULT '#6366F1',
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
          PRIMARY KEY (`id`),
          CONSTRAINT `fk_task_types_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✅ Tabla 'task_types' creada/verificada.\n";

    // 2. Seeder inicial de tipos de tareas para todos los tenants que no tengan
    echo "Seeding tipos de tareas por defecto...\n";
    $tenants = $pdo->query("SELECT tenant_id FROM tenants")->fetchAll(PDO::FETCH_COLUMN);
    $defaultTypes = [
        ['name' => 'Reunión', 'icon' => 'video', 'color_hex' => '#6366F1'],
        ['name' => 'Demo', 'icon' => 'monitor', 'color_hex' => '#7C3AED'],
        ['name' => 'Llamada', 'icon' => 'phone', 'color_hex' => '#10B981'],
        ['name' => 'Visita', 'icon' => 'map-pin', 'color_hex' => '#F59E0B'],
    ];

    foreach ($tenants as $tenantId) {
        // Verificar si este tenant ya tiene algún tipo de tarea
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM task_types WHERE tenant_id = ?");
        $stmt->execute([$tenantId]);
        if ((int)$stmt->fetchColumn() === 0) {
            echo "Insertando tipos de tareas comerciales para tenant_id: $tenantId...\n";
            $insertStmt = $pdo->prepare("INSERT INTO task_types (tenant_id, name, icon, color_hex) VALUES (?, ?, ?, ?)");
            foreach ($defaultTypes as $t) {
                $insertStmt->execute([$tenantId, $t['name'], $t['icon'], $t['color_hex']]);
            }
        }
    }
    echo "✅ Seed de tipos de tareas comerciales completado.\n";

    // 3. Modificaciones a la tabla 'tasks'
    $dbname = $connectedConfig['dbname'];

    // Agregar start_date
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'start_date'");
    $stmt->execute([$dbname]);
    if ((int)$stmt->fetchColumn() === 0) {
        echo "Agregando columna 'start_date' a la tabla 'tasks'...\n";
        $pdo->exec("ALTER TABLE `tasks` ADD COLUMN `start_date` DATETIME DEFAULT NULL AFTER `description`");
        echo "✅ Columna 'start_date' agregada.\n";
    }

    // Agregar end_date (y migrar el valor de due_date)
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'end_date'");
    $stmt->execute([$dbname]);
    if ((int)$stmt->fetchColumn() === 0) {
        echo "Agregando columna 'end_date' a la tabla 'tasks'...\n";
        $pdo->exec("ALTER TABLE `tasks` ADD COLUMN `end_date` DATETIME DEFAULT NULL AFTER `start_date`");
        echo "✅ Columna 'end_date' agregada.\n";
        
        // Copiar due_date a end_date
        echo "Migrando valores de 'due_date' a 'end_date'...\n";
        $pdo->exec("UPDATE `tasks` SET `end_date` = `due_date` WHERE `due_date` IS NOT NULL");
        // Sincronizar start_date (por defecto 1 hora antes de end_date, o el mismo valor)
        $pdo->exec("UPDATE `tasks` SET `start_date` = DATE_SUB(`end_date`, INTERVAL 1 HOUR) WHERE `end_date` IS NOT NULL");
        echo "✅ Fechas migradas.\n";
    }

    // Agregar task_type_id
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'task_type_id'");
    $stmt->execute([$dbname]);
    if ((int)$stmt->fetchColumn() === 0) {
        echo "Agregando columna 'task_type_id' a la tabla 'tasks'...\n";
        $pdo->exec("ALTER TABLE `tasks` ADD COLUMN `task_type_id` BIGINT(20) DEFAULT NULL AFTER `opportunity_id`");
        echo "✅ Columna 'task_type_id' agregada.\n";

        // Asignar por defecto el primer tipo de tarea disponible de su tenant
        echo "Asignando tipos de tareas por defecto a tareas existentes...\n";
        $pdo->exec("
            UPDATE `tasks` t
            SET t.task_type_id = (
                SELECT tt.id 
                FROM task_types tt 
                WHERE tt.tenant_id = t.tenant_id 
                ORDER BY tt.id ASC LIMIT 1
            )
            WHERE t.task_type_id IS NULL
        ");
        echo "✅ Tipos de tareas inicializados.\n";
    }

    // 4. Migración de estados antiguos
    echo "Actualizando estados de tareas existentes...\n";
    // Mapear 'pending' a 'todo' y 'completed' a 'done' antes de modificar el enum
    $pdo->exec("UPDATE `tasks` SET `status` = 'todo' WHERE `status` = 'pending'");
    $pdo->exec("UPDATE `tasks` SET `status` = 'done' WHERE `status` = 'completed'");
    echo "✅ Estados de tareas pre-migrados.\n";

    // Modificar columna status a ENUM('todo', 'in_progress', 'done', 'archived')
    echo "Modificando la columna 'status' en la tabla 'tasks'...\n";
    $pdo->exec("ALTER TABLE `tasks` MODIFY COLUMN `status` ENUM('todo', 'in_progress', 'done', 'archived') NOT NULL DEFAULT 'todo'");
    echo "✅ Columna 'status' actualizada a ENUM('todo', 'in_progress', 'done', 'archived').\n";

    // 5. Agregar constraint de FK si no existe
    try {
        echo "Agregando clave foránea fk_tasks_type a 'tasks'...\n";
        $pdo->exec("
            ALTER TABLE `tasks` 
            ADD CONSTRAINT `fk_tasks_type` 
            FOREIGN KEY (`task_type_id`) 
            REFERENCES `task_types` (`id`) 
            ON DELETE SET NULL
        ");
        echo "✅ Clave foránea agregada exitosamente.\n";
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'Duplicate key') || str_contains($e->getMessage(), 'already exists')) {
            echo "ℹ️ La clave foránea ya existe. Saltando...\n";
        } else {
            throw $e;
        }
    }

    echo "✅ Migración 012 completada exitosamente!\n";

} catch (Throwable $e) {
    die("❌ Error durante la ejecución de la migración: " . $e->getMessage() . "\n");
}
