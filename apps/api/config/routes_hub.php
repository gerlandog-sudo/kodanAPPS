<?php

/**
 * kodanHUB API - Definición de Rutas
 *
 * Dos grupos:
 * - /api/hub/*        -> público (KDN token auth, sin JWT)
 * - /api/hub-admin/*  -> protegido (JWT kodanAPPS)
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

    $router->options('/api/hub', function () use ($hubController) {
        $hubController->hubPreflight();
    });

    // ============================================================
    // ADMIN: Dashboard & Stats (JWT requerido)
    // ============================================================
    $router->use('/api/hub-admin', function (Router $router) use ($app, $hubController) {
        $auth = $app['authMiddleware'];

        // --- Stats ---
        $router->get('/stats', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->getStats();
        });

        // --- Apps CRUD ---
        $router->get('/apps', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->getApps();
        });

        $router->post('/apps', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->createApp();
        });

        $router->patch('/apps/{id}', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->updateApp($id);
        });

        $router->post('/apps/{id}/rotate-token', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->rotateToken($id);
        });

        $router->post('/apps/{id}/toggle-status', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->toggleAppStatus($id);
        });

        $router->delete('/apps/{id}', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->archiveApp($id);
        });

        // --- Catalog CRUD ---
        $router->get('/catalog', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->getCatalog();
        });

        $router->post('/catalog', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->createCatalogEntry();
        });

        $router->patch('/catalog/{id}', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->updateCatalogEntry($id);
        });

        $router->delete('/catalog/{id}', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->deleteCatalogEntry($id);
        });

        // --- Services CRUD ---
        $router->get('/services', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->getServices();
        });

        $router->post('/services', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->createService();
        });

        $router->patch('/services/{id}', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->updateService($id);
        });

        $router->delete('/services/{id}', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->deleteService($id);
        });

        $router->post('/services/{id}/test', function (int $id) use ($auth, $hubController) {
            $auth->handle();
            $hubController->testService($id);
        });

        // --- Analytics ---
        $router->get('/consumption', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->getConsumption();
        });

        $router->get('/errors', function () use ($auth, $hubController) {
            $auth->handle();
            $hubController->getErrors();
        });

        // --- Settings ---
        $router->get('/settings/{key}', function (string $key) use ($auth, $hubController) {
            $auth->handle();
            $hubController->getSetting($key);
        });

        $router->put('/settings/{key}', function (string $key) use ($auth, $hubController) {
            $auth->handle();
            $hubController->updateSetting($key);
        });
    });
};
