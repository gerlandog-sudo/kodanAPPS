<?php

/**
 * kodanHUB API - Definición de Rutas
 *
 * Dos grupos:
 * - /api/hub/*        -> público (KDN token auth, sin JWT)
 * - /api/hub-admin/*  -> protegido (JWT kodanAPPS)
 * 
 * NOTA: Router::use() solo registra middleware por prefijo.
 * Las rutas DENTRO deben usar rutas ABSOLUTAS (con /api/hub-admin/...).
 */

use kodanAPPS\Router;

/** @param array<string, mixed> $app Contenedor de dependencias */
return function (Router $router, array $app): void {

    $hubController = $app['controllers']['hub'];

    // ============================================================
    // PÚBLICO: Entry point para apps cliente (KDN Token)
    // ============================================================
    $router->post('/api/hub', function () use ($hubController) {
        $hubController->hubEntryPoint();
    });

    // ============================================================
    // ADMIN: Dashboard & Stats (JWT requerido)
    // ============================================================
    $router->use('/api/hub-admin', function (Router $router) use ($app, $hubController) {
        $auth = $app['auth'];

        // --- Stats ---
        $router->get('/api/hub-admin/stats', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->getStats();
        });

        // --- Apps CRUD ---
        $router->get('/api/hub-admin/apps', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->getApps();
        });

        $router->post('/api/hub-admin/apps', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->createApp();
        });

        $router->patch('/api/hub-admin/apps/{id}', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->updateApp($id);
        });

        $router->post('/api/hub-admin/apps/{id}/rotate-token', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->rotateToken($id);
        });

        $router->post('/api/hub-admin/apps/{id}/toggle-status', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->toggleAppStatus($id);
        });

        $router->delete('/api/hub-admin/apps/{id}', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->archiveApp($id);
        });

        // --- Catalog CRUD ---
        $router->get('/api/hub-admin/catalog', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->getCatalog();
        });

        $router->post('/api/hub-admin/catalog', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->createCatalogEntry();
        });

        $router->patch('/api/hub-admin/catalog/{id}', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->updateCatalogEntry($id);
        });

        $router->delete('/api/hub-admin/catalog/{id}', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->deleteCatalogEntry($id);
        });

        // --- Services CRUD ---
        $router->get('/api/hub-admin/services', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->getServices();
        });

        $router->post('/api/hub-admin/services', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->createService();
        });

        $router->patch('/api/hub-admin/services/{id}', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->updateService($id);
        });

        $router->delete('/api/hub-admin/services/{id}', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->deleteService($id);
        });

        $router->post('/api/hub-admin/services/{id}/test', function (array $p) use ($auth, $hubController) {
            $auth->handle();
            $hubController->testService($p['id']);
        });

        // --- Analytics ---
        $router->get('/api/hub-admin/consumption', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->getConsumption();
        });

        $router->get('/api/hub-admin/errors', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->getErrors();
        });

        // --- Settings ---
        $router->get('/api/hub-admin/settings/{key}', function (string $key) use ($auth, $hubController) {
            $auth->handle();
            $hubController->getSetting($key);
        });

        $router->put('/api/hub-admin/settings/{key}', function (string $key) use ($auth, $hubController) {
            $auth->handle();
            $hubController->updateSetting($key);
        });
    });
};
