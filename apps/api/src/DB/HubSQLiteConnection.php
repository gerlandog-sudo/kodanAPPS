<?php

declare(strict_types=1);

namespace kodanAPPS\DB;

use PDO;
use RuntimeException;

/**
 * HubSQLiteConnection - Conexión singleton a la base de datos SQLite de kodanHUB.
 *
 * La ruta del archivo .sqlite se obtiene de la variable de entorno DB_SQLITE_PATH.
 * En desarrollo: apunta al archivo local.
 * En producción: apunta al volumen montado en Docker.
 */
final class HubSQLiteConnection
{
    private static ?PDO $instance = null;

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $dbPath = self::resolvePath();
            self::$instance = new PDO("sqlite:{$dbPath}", null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            self::$instance->exec("PRAGMA foreign_keys = ON;");
        }
        return self::$instance;
    }

    /**
     * Resetea la instancia (útil para tests)
     */
    public static function reset(): void
    {
        self::$instance = null;
    }

    private static function resolvePath(): string
    {
        // 1. Variable de entorno explícita
        $envPath = $_ENV['DB_SQLITE_PATH'] ?? ($_SERVER['DB_SQLITE_PATH'] ?? null);
        if ($envPath && is_string($envPath)) {
            return $envPath;
        }

        // 2. Fallback: ruta relativa al proyecto (desarrollo local)
        $fallback = dirname(__DIR__, 3) . '/docker/hub/hub.sqlite';
        if (file_exists($fallback)) {
            return $fallback;
        }

        throw new RuntimeException(
            'HubSQLiteConnection: No se encontró el archivo SQLite. ' .
            'Define DB_SQLITE_PATH en .env o asegura que docker/hub/hub.sqlite existe.'
        );
    }
}
