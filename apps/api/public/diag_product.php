<?php
/**
 * DIAGNÓSTICO: Creación de producto
 * 
 * Uso: POST a este script con el mismo payload que /api/crm/products
 * Muestra el error REAL en vez del mensaje genérico.
 * 
 * ELIMINAR DESPUÉS DE USAR.
 */

declare(strict_types=1);

header('Content-Type: text/plain');

// Misma lógica de arranque que index.php
$vendorPath = file_exists(__DIR__ . '/vendor/autoload.php')
    ? __DIR__ . '/vendor/autoload.php'
    : __DIR__ . '/../vendor/autoload.php';
require_once $vendorPath;

try {
    $app = require __DIR__ . '/../src/bootstrap.php';
    $router = new kodanAPPS\Router();
    $routes = require __DIR__ . '/../config/routes.php';
    $routes($router, $app);
    
    // Forzar la autenticación manualmente igual que en middleware
    $auth = $app['auth']->handle();
    $app['apiUsageTracker']->handle();
    $router->setContext('auth', $auth);
    
    // Reproducir exactamente lo que hace el controlador
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    echo "=== DATOS RECIBIDOS ===\n";
    print_r($input);
    echo "\n=== TENANT CONTEXT ===\n";
    echo 'Tenant ID: ' . (class_exists('\kodanAPPS\DB\TenantContext') ? \kodanAPPS\DB\TenantContext::getTenantId() : 'N/A') . "\n";
    echo 'User ID: ' . ($auth['user_id'] ?? 'N/A') . "\n";
    
    echo "\n=== EJECUTANDO CREACIÓN ===\n";
    $result = $app['controllers']['product']->create($input);
    echo "RESULTADO: ";
    print_r($result);
    echo "\n✅ PRODUCTO CREADO EXITOSAMENTE\n";
    
} catch (\Throwable $e) {
    echo "\n❌ ERROR REAL:\n";
    echo "Clase: " . get_class($e) . "\n";
    echo "Mensaje: " . $e->getMessage() . "\n";
    echo "Archivo: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "\nStack Trace:\n" . $e->getTraceAsString() . "\n";
    
    if ($e->getPrevious()) {
        echo "\nPrevious Exception:\n";
        echo "Clase: " . get_class($e->getPrevious()) . "\n";
        echo "Mensaje: " . $e->getPrevious()->getMessage() . "\n";
    }
}
