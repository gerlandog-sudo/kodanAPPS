<?php

/**
 * kodanAPPS API - Definición de Rutas
 * 
 * Organizado por grupos de prefijo:
 * - /api/csrf-token   → público
 * - /api/health       → público
 * - /api/auth/*       → público
 * - /api/super-admin/* → protegido (JWT + SuperAdmin)
 * - /api/crm/*         → protegido (JWT)
 * - /api/tracker/*     → protegido (JWT)
 */

use kodanAPPS\Router;

/** @param array<string, mixed> $app Contenedor de dependencias */
return function (Router $router, array $app): void {

    // ============================================================
    // CSRF Token (público)
    // ============================================================
    $router->get('/api/csrf-token', function () use ($app) {
        $csrfSecret = $app['csrfSecret'];
        $cookieSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
        $phpsessid = $_COOKIE['PHPSESSID'] ?? '';
        if ($phpsessid === '') {
            session_start([
                'cookie_httponly' => true,
                'cookie_secure' => $cookieSecure,
                'cookie_samesite' => 'Lax',
                'cookie_domain' => $app['cookieDomain'],
            ]);
            $phpsessid = session_id();
        }
        $token = hash_hmac('sha256', $phpsessid, $csrfSecret);
        header('Content-Type: application/json');
        echo json_encode(['token' => $token]);
    });

    // ============================================================
    // Health Check (público)
    // ============================================================
    $router->get('/api/health', function () use ($app) {
        $checks = [
            'php_version' => PHP_VERSION,
            'timestamp' => date('c'),
        ];

        // 1. Verificar conexión PDO
        try {
            $pdo = $app['pdo'];
            $pdo->query('SELECT 1');
            $checks['database'] = 'connected';
        } catch (\Throwable $e) {
            http_response_code(503);
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'error',
                'error' => 'Database connection failed',
                'checks' => $checks,
            ]);
            return;
        }

        // 2. Query simple para verificar lectura/escritura
        try {
            $version = $pdo->query('SELECT VERSION() AS v')->fetch(\PDO::FETCH_ASSOC);
            $checks['db_version'] = $version['v'] ?? 'unknown';
        } catch (\Throwable $e) {
            http_response_code(503);
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'error',
                'error' => 'Database query failed',
                'checks' => $checks,
            ]);
            return;
        }

        // 3. Verificar que TenantContext sea inicializable
        $checks['tenant_context'] = class_exists(\kodanAPPS\DB\TenantContext::class) ? 'available' : 'missing';

        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'ok',
            'checks' => $checks,
        ]);
    });


    // ============================================================
    // Auth Routes
    // ============================================================
    $router->post('/api/auth/login', function () use ($app) {
        try {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $data = $app['controllers']['auth']->login($input);
            header('Content-Type: application/json');
            echo json_encode($data);
        } catch (\InvalidArgumentException $e) {
            http_response_code(422);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Validation error',
                'errors' => json_decode($e->getMessage(), true) ?: ['general' => $e->getMessage()],
            ]);
        } catch (\RuntimeException $e) {
            $code = $e->getCode();
            if ($code < 400 || $code > 599) $code = 500;
            http_response_code($code);
            header('Content-Type: application/json');
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Throwable $e) {
            error_log('Login error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Internal server error']);
        }
    });

    $router->post('/api/auth/set-password', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $data = $app['controllers']['auth']->setPassword($input);
        header('Content-Type: application/json');
        echo json_encode($data);
    });

    $router->get('/api/auth/validate', function () use ($app) {
        try {
            $app['auth']->handle();
            $data = $app['controllers']['auth']->validate();
            header('Content-Type: application/json');
            echo json_encode($data);
        } catch (\RuntimeException $e) {
            $code = $e->getCode();
            if ($code < 400 || $code > 599) $code = 500;
            http_response_code($code);
            header('Content-Type: application/json');
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Throwable $e) {
            error_log('Validate error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Internal server error']);
        }
    });

    $router->post('/api/auth/logout', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $data = $app['controllers']['auth']->logout($input);
        header('Content-Type: application/json');
        echo json_encode($data);
    });

    // ============================================================
    // Middleware: Super Admin (JWT + SuperAdmin role)
    // ============================================================
    $router->use('/api/super-admin', function (Router $router) use ($app) {
        $auth = $app['auth']->handle();
        $app['auth']->requireSuperAdmin();
        $router->setContext('auth', $auth);
    });

    // ============================================================
    // Middleware: CRM (JWT)
    // ============================================================
    $router->use('/api/crm', function (Router $router) use ($app) {
        $auth = $app['auth']->handle();
        $router->setContext('auth', $auth);
    });

    // ============================================================
    // Super Admin Routes
    // ============================================================
    $router->get('/api/super-admin/stats', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->getStats());
    });

    $router->get('/api/super-admin/tenants', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->listTenants());
    });

    $router->post('/api/super-admin/tenants', function () use ($app) {
        try {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            header('Content-Type: application/json');
            echo json_encode($app['controllers']['superAdmin']->createTenant($input));
        } catch (\InvalidArgumentException $e) {
            http_response_code(422);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Error de validación',
                'errors' => json_decode($e->getMessage(), true) ?: ['general' => $e->getMessage()],
            ]);
        } catch (\RuntimeException $e) {
            $code = $e->getCode();
            if ($code < 400 || $code > 599) $code = 500;
            http_response_code($code);
            header('Content-Type: application/json');
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Throwable $e) {
            error_log('Create tenant error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Internal server error']);
        }
    });

    $router->patch('/api/super-admin/tenants/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->updateTenant($p['id'], $input));
    });

    $router->post('/api/super-admin/tenants/{id}/deactivate', function (array $p) use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->deactivateTenant($p['id']));
    });

    $router->post('/api/super-admin/tenants/{id}/activate', function (array $p) use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->activateTenant($p['id']));
    });

    $router->get('/api/super-admin/plans', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->listPlans());
    });

    $router->post('/api/super-admin/plans', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->createPlan($input));
    });

    $router->patch('/api/super-admin/plans/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->updatePlan($p['id'], $input));
    });

    $router->delete('/api/super-admin/plans/{id}', function (array $p) use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->deletePlan($p['id']));
    });

    $router->get('/api/super-admin/theme', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->getTheme());
    });

    $router->put('/api/super-admin/theme', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->updateTheme($input));
    });

    $router->post('/api/super-admin/change-password', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->changePassword($input));
    });

    $router->post('/api/super-admin/recount-usage', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->recountUsage());
    });

    $router->get('/api/super-admin/roles', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->listRoles());
    });

    $router->post('/api/super-admin/roles', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->createRole($input));
    });

    $router->patch('/api/super-admin/roles/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->updateRole($p['id'], $input));
    });

    $router->delete('/api/super-admin/roles/{id}', function (array $p) use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['superAdmin']->deleteRole($p['id']));
    });

    // ============================================================
    // CRM Routes
    // ============================================================
    // Plan Status
    $router->get('/api/crm/plan-status', function (array $p, Router $router) use ($app) {
        $auth = $router->getContext('auth');
        echo json_encode($app['controllers']['crm']->getPlanStatus($auth['tenant_id'] ?? 0));
    });

    // Notifications
    $router->get('/api/crm/notifications', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['notification']->list());
    });

    $router->post('/api/crm/notifications/mark-read', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['notification']->markRead($input));
    });

    $router->post('/api/crm/notifications/clear', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['notification']->clearAll());
    });

    $router->get('/api/crm/notifications/config', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['notification']->getConfig());
    });

    $router->post('/api/crm/notifications/config', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['notification']->saveConfig($input));
    });

    // Theme
    $router->get('/api/crm/theme', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['crm']->getTheme());
    });

    $router->put('/api/crm/theme', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['crm']->updateTheme($input));
    });

    // Accounts B2B
    $router->get('/api/crm/accounts', function (array $p, Router $router) use ($app) {
        echo json_encode($app['controllers']['account']->list());
    });
    $router->post('/api/crm/accounts', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['account']->create($input));
    });
    $router->get('/api/crm/accounts/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['account']->get($p['id']));
    });
    $router->patch('/api/crm/accounts/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['account']->update($p['id'], $input));
    });
    $router->delete('/api/crm/accounts/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['account']->delete($p['id']));
    });

    // Contacts
    $router->get('/api/crm/contacts', function () use ($app) {
        echo json_encode($app['controllers']['contact']->list());
    });
    $router->post('/api/crm/contacts', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['contact']->create($input));
    });
    $router->get('/api/crm/contacts/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['contact']->get($p['id']));
    });
    $router->patch('/api/crm/contacts/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['contact']->update($p['id'], $input));
    });
    $router->delete('/api/crm/contacts/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['contact']->delete($p['id']));
    });

    // Pipelines
    $router->get('/api/crm/pipelines', function () use ($app) {
        echo json_encode($app['controllers']['pipeline']->listPipelines());
    });
    $router->post('/api/crm/pipelines', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['pipeline']->createPipeline($input));
    });
    $router->get('/api/crm/pipelines/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['pipeline']->getPipeline($p['id']));
    });
    $router->patch('/api/crm/pipelines/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['pipeline']->updatePipeline($p['id'], $input));
    });
    $router->delete('/api/crm/pipelines/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['pipeline']->deletePipeline($p['id']));
    });
    $router->get('/api/crm/pipelines/{pipelineId}/stages', function (array $p) use ($app) {
        echo json_encode($app['controllers']['pipeline']->listStages($p['pipelineId']));
    });
    $router->post('/api/crm/pipelines/{pipelineId}/stages', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['pipeline']->createStage($p['pipelineId'], $input));
    });
    $router->get('/api/crm/pipeline-stages/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['pipeline']->getStage($p['id']));
    });
    $router->patch('/api/crm/pipeline-stages/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['pipeline']->updateStage($p['id'], $input));
    });
    $router->delete('/api/crm/pipeline-stages/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['pipeline']->deleteStage($p['id']));
    });
    $router->put('/api/crm/pipeline-stages', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['pipeline']->bulkUpdateStages($input));
    });

    // Products
    $router->get('/api/crm/products', function () use ($app) {
        echo json_encode($app['controllers']['product']->list());
    });
    $router->post('/api/crm/products', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['product']->create($input));
    });
    $router->get('/api/crm/products/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['product']->get($p['id']));
    });
    $router->patch('/api/crm/products/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['product']->update($p['id'], $input));
    });
    $router->delete('/api/crm/products/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['product']->delete($p['id']));
    });

    // Opportunities
    $router->get('/api/crm/opportunities', function () use ($app) {
        echo json_encode($app['controllers']['opportunity']->list());
    });
    $router->post('/api/crm/opportunities', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['opportunity']->create($input));
    });
    $router->get('/api/crm/opportunities/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['opportunity']->get($p['id']));
    });
    $router->patch('/api/crm/opportunities/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['opportunity']->update($p['id'], $input));
    });
    $router->delete('/api/crm/opportunities/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['opportunity']->delete($p['id']));
    });
    $router->get('/api/crm/opportunities/{id}/items', function (array $p) use ($app) {
        echo json_encode($app['controllers']['opportunity']->getLineItems($p['id']));
    });
    $router->post('/api/crm/opportunities/{id}/items', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['opportunity']->saveLineItems($p['id'], $input));
    });
    $router->post('/api/crm/opportunities/{id}/won', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['opportunity']->wonOpportunity($p['id'], $input));
    });
    $router->post('/api/crm/opportunities/{id}/archive', function (array $p) use ($app) {
        echo json_encode($app['controllers']['opportunity']->archive($p['id']));
    });
    $router->post('/api/crm/opportunities/{id}/unarchive', function (array $p) use ($app) {
        echo json_encode($app['controllers']['opportunity']->unarchive($p['id']));
    });

    // Quotes
    $router->get('/api/crm/quotes', function () use ($app) {
        echo json_encode($app['controllers']['quote']->list());
    });
    $router->post('/api/crm/quotes', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['quote']->create($input));
    });
    $router->get('/api/crm/quotes/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['quote']->get($p['id']));
    });
    $router->patch('/api/crm/quotes/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['quote']->update($p['id'], $input));
    });
    $router->delete('/api/crm/quotes/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['quote']->delete($p['id']));
    });
    $router->get('/api/crm/quotes/{id}/items', function (array $p) use ($app) {
        echo json_encode($app['controllers']['quote']->getLineItems($p['id']));
    });
    $router->post('/api/crm/quotes/{id}/items', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['quote']->saveLineItems($p['id'], $input));
    });

    // Tasks
    $router->get('/api/crm/tasks', function () use ($app) {
        echo json_encode($app['controllers']['task']->list());
    });
    $router->post('/api/crm/tasks', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['task']->create($input));
    });
    $router->get('/api/crm/tasks/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['task']->get($p['id']));
    });
    $router->patch('/api/crm/tasks/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['task']->update($p['id'], $input));
    });
    $router->delete('/api/crm/tasks/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['task']->delete($p['id']));
    });

    // Chats
    $router->get('/api/crm/chats/unread-mentions', function () use ($app) {
        echo json_encode($app['controllers']['chat']->getUnreadMentionsCount());
    });
    $router->get('/api/crm/opportunities/{id}/chat', function (array $p) use ($app) {
        echo json_encode($app['controllers']['chat']->getMessages($p['id']));
    });
    $router->post('/api/crm/opportunities/{id}/chat', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['chat']->sendMessage($p['id'], $input));
    });
    $router->post('/api/crm/chats/messages/{id}/attach', function (array $p) use ($app) {
        echo json_encode($app['controllers']['chat']->uploadAttachment($p['id']));
    });

    // Custom Fields
    $router->get('/api/crm/custom-fields', function () use ($app) {
        echo json_encode($app['controllers']['customField']->list());
    });
    $router->post('/api/crm/custom-fields', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['customField']->create($input));
    });
    $router->put('/api/crm/custom-fields/reorder', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['customField']->reorder($input));
    });
    $router->patch('/api/crm/custom-fields/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        echo json_encode($app['controllers']['customField']->update($p['id'], $input));
    });
    $router->delete('/api/crm/custom-fields/{id}', function (array $p) use ($app) {
        echo json_encode($app['controllers']['customField']->delete($p['id']));
    });

    // Tenant Users (CRM Operators)
    $router->get('/api/crm/users', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['tenantUser']->listUsers());
    });
    $router->get('/api/crm/users/roles', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['tenantUser']->listCrmRoles());
    });
    $router->post('/api/crm/users', function () use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['tenantUser']->createUser($input));
    });
    $router->put('/api/crm/users/{id}', function (array $p) use ($app) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['tenantUser']->updateUser($p['id'], $input));
    });
    $router->delete('/api/crm/users/{id}', function (array $p) use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['tenantUser']->deleteUser($p['id']));
    });

    // ============================================================
    // Middleware: Tracker (JWT)
    // ============================================================
    $router->use('/api/tracker', function (Router $router) use ($app) {
        $auth = $app['auth']->handle();
        $router->setContext('auth', $auth);
    });

    // ============================================================
    // Tracker Routes
    // ============================================================
    $router->get('/api/tracker/projects', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['tracker']->listProjects());
    });

    $router->get('/api/tracker/projects/{id}', function (array $p) use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['tracker']->getProject($p['id']));
    });

    // ============================================================
    // Middleware & Routes: Unified Messaging System
    // ============================================================
    $router->use('/api/messages', function (Router $router) use ($app) {
        $auth = $app['auth']->handle();
        $router->setContext('auth', $auth);
    });

    $router->use('/api/chats', function (Router $router) use ($app) {
        $auth = $app['auth']->handle();
        $router->setContext('auth', $auth);
    });

    $router->use('/api/conversations', function (Router $router) use ($app) {
        $auth = $app['auth']->handle();
        $router->setContext('auth', $auth);
    });

    // Endpoints: SSE Stream & Unread Notification Count
    $router->get('/api/messages/stream', function () use ($app) {
        $dbConfig = [
            'host' => $app['dotenv']['DB_HOST'] ?? 'localhost',
            'port' => (int)($app['dotenv']['DB_PORT'] ?? 3306),
            'dbname' => $app['dotenv']['DB_NAME'] ?? 'admkoda_BBDD_APPS',
            'user' => $app['dotenv']['DB_USER'] ?? 'kodan_apps',
            'pass' => $app['dotenv']['DB_PASS'] ?? '',
            'charset' => 'utf8mb4',
        ];
        $app['controllers']['messaging']->stream($dbConfig);
    });

    $router->get('/api/messages/unread-count', function () use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['messaging']->getUnreadCount());
    });

    $router->get('/api/messages/users', function () use ($app) {
        $tenantId = \kodanAPPS\DB\TenantContext::getTenantId();
        $stmt = $app['pdo']->prepare(
            "SELECT id, email, display_name 
             FROM users 
             WHERE tenant_id = :tid AND is_active = 1
             ORDER BY display_name ASC"
        );
        $stmt->execute([':tid' => $tenantId]);
        $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        header('Content-Type: application/json');
        echo json_encode($users);
    });

    // Endpoints: Chats & Conversations Actions
    $router->post('/api/conversations/{id}/read', function (array $p) use ($app) {
        try {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            header('Content-Type: application/json');
            echo json_encode($app['controllers']['messaging']->markAsRead((int)$p['id'], $input));
        } catch (\InvalidArgumentException $e) {
            http_response_code(422);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Validation error',
                'errors' => json_decode($e->getMessage(), true) ?: ['general' => $e->getMessage()],
            ]);
        }
    });

    $router->get('/api/chats/{entity_type}/{entity_id}', function (array $p) use ($app) {
        header('Content-Type: application/json');
        echo json_encode($app['controllers']['messaging']->getMessagesByEntity($p['entity_type'], (int)$p['entity_id']));
    });

    $router->post('/api/chats/{entity_type}/{entity_id}', function (array $p) use ($app) {
        try {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            header('Content-Type: application/json');
            echo json_encode($app['controllers']['messaging']->sendMessageByEntity($p['entity_type'], (int)$p['entity_id'], $input));
        } catch (\InvalidArgumentException $e) {
            http_response_code(422);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Validation error',
                'errors' => json_decode($e->getMessage(), true) ?: ['general' => $e->getMessage()],
            ]);
        }
    });
};
