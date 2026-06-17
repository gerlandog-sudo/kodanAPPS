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

// Bootstrap: CORS, DB, repositorios, servicios, auth, controladores
$app = require __DIR__ . '/../src/bootstrap.php';

// Router + rutas
$router = new kodanAPPS\Router();
$routes = require __DIR__ . '/../config/routes.php';
$routes($router, $app);

// Despachar
$router->dispatchFromGlobals();
