<?php

/**
 * kodanAPPS API - Entry Point
 * 
 * Blueprint decisiones:
 * - Punto 1: JWT en cookie HttpOnly (api.kodan.software)
 * - Punto 3: CSRF Synchronizer Token Pattern
 * - Punto 4: Cookies en subdominio exacto
 * - Multi-tenant: TenantContext + BaseRepository + TenantAwarePDO
 */

// Autoloader (compatible con open_basedir de cPanel)
$vendorPath = file_exists(__DIR__ . '/vendor/autoload.php')
    ? __DIR__ . '/vendor/autoload.php'
    : __DIR__ . '/../vendor/autoload.php';
require_once $vendorPath;

try {
    // Bootstrap: CORS, DB, repositorios, servicios, auth, controladores
    $app = require __DIR__ . '/../src/bootstrap.php';

    // Router + rutas
    $router = new kodanAPPS\Router();
    $routes = require __DIR__ . '/../config/routes.php';
    $routes($router, $app);

    // Despachar
    $router->dispatchFromGlobals();
} catch (\Throwable $e) {
    // NO mostrar detalles en produccion, solo log
    error_log('FATAL: ' . get_class($e) . ' - ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    error_log('Stack trace: ' . $e->getTraceAsString());

    // Si es un error de API, responder JSON
    if (str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Internal server error',
            'type' => get_class($e),
            'message' => $e->getMessage(),
            'file' => basename($e->getFile()) . ':' . $e->getLine(),
        ]);
    } else {
        http_response_code(500);
        echo "Internal Server Error";
    }
}
