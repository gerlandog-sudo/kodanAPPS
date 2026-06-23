<?php
/**
 * Migration 011: Agregar columnas de soporte para Won/Lost Reasons - kodanAPPS
 * 
 * Este script de migración PHP independiente:
 * 1. Agrega la columna 'ui_config' (JSON) a la tabla 'pipelines'.
 * 2. Agrega la columna 'close_reason' (VARCHAR) a la tabla 'opportunities'.
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

// Intentar primera configuración (API Env)
$configs = [
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
    $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset=utf8mb4";
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
    // 1. Agregar columna ui_config a pipelines
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pipelines' AND COLUMN_NAME = 'ui_config'");
    $stmt->execute([$connectedConfig['dbname']]);
    if ((int)$stmt->fetchColumn() === 0) {
        echo "Agregando columna 'ui_config' a pipelines...\n";
        $pdo->exec("ALTER TABLE `pipelines` ADD COLUMN `ui_config` JSON DEFAULT NULL COMMENT 'Configuración visual y motivos de cierre' AFTER `is_default`");
        echo "✅ Columna 'ui_config' agregada exitosamente.\n";
    } else {
        echo "ℹ️ La columna 'ui_config' ya existe en 'pipelines'. Saltando...\n";
    }

    // 2. Agregar columna close_reason a opportunities
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'opportunities' AND COLUMN_NAME = 'close_reason'");
    $stmt->execute([$connectedConfig['dbname']]);
    if ((int)$stmt->fetchColumn() === 0) {
        echo "Agregando columna 'close_reason' a opportunities...\n";
        $pdo->exec("ALTER TABLE `opportunities` ADD COLUMN `close_reason` VARCHAR(255) DEFAULT NULL COMMENT 'Motivo del cierre ganado/perdido' AFTER `custom_fields`");
        echo "✅ Columna 'close_reason' agregada exitosamente.\n";
    } else {
        echo "ℹ️ La columna 'close_reason' ya existe en 'opportunities'. Saltando...\n";
    }

    echo "✅ Migración 011 completada exitosamente!\n";

} catch (Throwable $e) {
    die("❌ Error durante la ejecución de consultas de migración: " . $e->getMessage() . "\n");
}
