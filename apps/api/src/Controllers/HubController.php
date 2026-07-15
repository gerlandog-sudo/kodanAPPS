<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\HubRepository;
use kodanAPPS\Services\HubHandshakeService;
use kodanAPPS\Services\HubProxyService;
use kodanAPPS\Services\HubTokenService;

/**
 * HubController - Endpoints para kodanHUB.
 *
 * Dos grupos de endpoints:
 * - /api/hub/* (públicos, autenticación KDN token)
 * - /api/hub-admin/* (protegidos, JWT kodanAPPS)
 */
final class HubController
{
    private HubRepository $repo;
    private HubHandshakeService $handshake;
    private HubProxyService $proxy;
    private HubTokenService $tokenService;

    public function __construct(
        HubRepository $repo,
        HubHandshakeService $handshake,
        HubProxyService $proxy,
        HubTokenService $tokenService
    ) {
        $this->repo = $repo;
        $this->handshake = $handshake;
        $this->proxy = $proxy;
        $this->tokenService = $tokenService;
    }

    // ============================================================
    // ENDPOINTS PÚBLICOS (KDN Token Auth)
    // ============================================================

    /**
     * POST /api/hub
     * Entry point principal para apps cliente.
     * - Body vacío + X-KODAN-APP-ID -> Handshake
     * - Body con action=ai + X-KODAN-TOKEN -> Proxy AI
     */
    public function hubEntryPoint(): void
    {
        $headers = $this->getHeaders();
        $token = $headers['X-KODAN-TOKEN'] ?? $headers['x-kodan-token'] ?? null;
        $appId = $headers['X-KODAN-APP-ID'] ?? $headers['x-kodan-app-id'] ?? null;

        // Identificar app
        $app = null;
        if (!empty($token)) {
            $app = $this->repo->getAppByToken(trim($token));
        } elseif (!empty($appId)) {
            $app = $this->repo->getAppByAppId(trim($appId));
        }

        $inputRaw = file_get_contents('php://input');
        $inputJSON = json_decode($inputRaw, true);

        // Handshake: body vacío + app_id presente
        if (!empty($appId) && empty($inputRaw)) {
            $appName = $headers['X-KODAN-APP-NAME'] ?? null;
            $result = $this->handshake->handshake($appId, $appName);

            if ($result['status'] === 'error') {
                http_response_code(403);
            }

            header('Content-Type: application/json');
            echo json_encode($result);
            return;
        }

        // Validar app para AI request
        if (!$app || $app['status'] !== 'active') {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'App no autorizada, pausada o Token inválido.']);
            return;
        }

        $action = $inputJSON['action'] ?? null;
        if ($action !== 'ai') {
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'Acción no válida. Use action=ai.']);
            return;
        }

        $result = $this->proxy->execute($app, $inputJSON);

        if ($result['status'] === 'error') {
            http_response_code(500);
        }

        header('Content-Type: application/json');
        echo json_encode($result);
    }

    /**
     * OPTIONS /api/hub - CORS preflight
     */
    public function hubPreflight(): void
    {
        http_response_code(204);
    }

    // ============================================================
    // ENDPOINTS ADMIN (JWT kodanAPPS)
    // ============================================================

    /**
     * GET /api/hub-admin/stats
     */
    public function getStats(): void
    {
        header('Content-Type: application/json');
        echo json_encode($this->repo->getStats());
    }

    /**
     * GET /api/hub-admin/apps
     */
    public function getApps(): void
    {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));
        $showArchived = ($_GET['show_archived'] ?? '0') === '1';

        header('Content-Type: application/json');
        echo json_encode($this->repo->getApps($page, $limit, $showArchived));
    }

    /**
     * POST /api/hub-admin/apps
     */
    public function createApp(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = $input['name'] ?? '';
        $customToken = $input['custom_token'] ?? null;

        if (empty($name)) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'message' => 'El nombre de la app es requerido.']);
            return;
        }

        $token = $customToken ?: $this->tokenService->generateToken($name);
        $id = $this->repo->createApp([
            'name' => $name,
            'token' => $token,
            'status' => 'active',
            'app_identifier' => $input['app_identifier'] ?? null,
        ]);

        http_response_code(201);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'id' => $id, 'token' => $token]);
    }

    /**
     * PATCH /api/hub-admin/apps/{id}
     */
    public function updateApp(int $id): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $data = [];

        if (isset($input['name'])) $data['name'] = $input['name'];
        if (isset($input['status'])) $data['status'] = $input['status'];
        if (isset($input['app_identifier'])) $data['app_identifier'] = $input['app_identifier'];

        if (empty($data)) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'message' => 'No hay campos para actualizar.']);
            return;
        }

        $rows = $this->repo->updateApp($id, $data);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'updated' => $rows]);
    }

    /**
     * POST /api/hub-admin/apps/{id}/rotate-token
     */
    public function rotateToken(int $id): void
    {
        $app = $this->repo->getAppById($id);
        if (!$app) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'App no encontrada.']);
            return;
        }

        $newToken = $this->tokenService->generateToken($app['name']);
        $this->repo->updateApp($id, [
            'old_token' => $app['token'],
            'token' => $newToken,
        ]);

        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'new_token' => $newToken]);
    }

    /**
     * POST /api/hub-admin/apps/{id}/toggle-status
     */
    public function toggleAppStatus(int $id): void
    {
        $this->repo->toggleAppStatus($id);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success']);
    }

    /**
     * DELETE /api/hub-admin/apps/{id} (soft delete = archive)
     */
    public function archiveApp(int $id): void
    {
        $this->repo->archiveApp($id);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'message' => 'App archivada.']);
    }

    /**
     * GET /api/hub-admin/catalog
     */
    public function getCatalog(): void
    {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));

        header('Content-Type: application/json');
        echo json_encode($this->repo->getCatalog($page, $limit));
    }

    /**
     * POST /api/hub-admin/catalog
     */
    public function createCatalogEntry(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = $this->repo->createCatalogEntry($input);

        http_response_code(201);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'id' => $id]);
    }

    /**
     * PATCH /api/hub-admin/catalog/{id}
     */
    public function updateCatalogEntry(int $id): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $rows = $this->repo->updateCatalogEntry($id, $input);

        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'updated' => $rows]);
    }

    /**
     * DELETE /api/hub-admin/catalog/{id}
     */
    public function deleteCatalogEntry(int $id): void
    {
        $this->repo->deleteCatalogEntry($id);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success']);
    }

    /**
     * GET /api/hub-admin/services
     */
    public function getServices(): void
    {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));

        header('Content-Type: application/json');
        echo json_encode($this->repo->getServices($page, $limit));
    }

    /**
     * POST /api/hub-admin/services
     */
    public function createService(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = $this->repo->createService($input);

        http_response_code(201);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'id' => $id]);
    }

    /**
     * PATCH /api/hub-admin/services/{id}
     */
    public function updateService(int $id): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $rows = $this->repo->updateService($id, $input);

        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'updated' => $rows]);
    }

    /**
     * DELETE /api/hub-admin/services/{id}
     */
    public function deleteService(int $id): void
    {
        $this->repo->deleteService($id);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success']);
    }

    /**
     * POST /api/hub-admin/services/{id}/test
     * Ping test a un servicio (diagnóstico)
     */
    public function testService(int $id): void
    {
        $service = $this->repo->getServiceById($id);
        if (!$service) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Servicio no encontrado.']);
            return;
        }

        $startTime = microtime(true);
        $p = ['messages' => [['role' => 'user', 'content' => "respond only with 'pong'"]]];

        if ($service['protocol'] === 'openai-v1') {
            $res = $this->callOpenAIDirect($service, $p);
        } else {
            $res = $this->callGeminiDirect($service, $p);
        }

        $latency = round(microtime(true) - $startTime, 2);

        header('Content-Type: application/json');
        echo json_encode([
            'status' => $res['status'],
            'http_code' => $res['http_code'] ?? 0,
            'response' => $res['response'] ?? '',
            'data' => $res['data'] ?? null,
            'message' => $res['message'] ?? '',
            'debug_request' => $p,
            'debug_endpoint' => $service['endpoint'],
            'latency' => $latency . 's',
        ]);
    }

    /**
     * GET /api/hub-admin/consumption
     */
    public function getConsumption(): void
    {
        $filters = [
            'app_id' => $_GET['app_id'] ?? '',
            'status' => $_GET['status'] ?? '',
            'date_from' => $_GET['date_from'] ?? '',
            'date_to' => $_GET['date_to'] ?? '',
        ];
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 15)));

        header('Content-Type: application/json');
        echo json_encode($this->repo->getConsumptionStats($filters, $page, $limit));
    }

    /**
     * GET /api/hub-admin/errors
     */
    public function getErrors(): void
    {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));

        header('Content-Type: application/json');
        echo json_encode($this->repo->getErrors($page, $limit));
    }

    /**
     * GET /api/hub-admin/settings/{key}
     */
    public function getSetting(string $key): void
    {
        $value = $this->repo->getSetting($key);
        header('Content-Type: application/json');
        echo json_encode(['key' => $key, 'value' => $value]);
    }

    /**
     * PUT /api/hub-admin/settings/{key}
     */
    public function updateSetting(string $key): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $value = $input['value'] ?? '';

        $this->repo->setSetting($key, $value);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success']);
    }

    // ============================================================
    // HELPERS
    // ============================================================

    /** @return array<string, string|null> */
    private function getHeaders(): array
    {
        if (function_exists('getallheaders')) {
            $h = getallheaders();
            return $h ?: [];
        }
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headerName = str_replace('_', '-', substr($key, 5));
                $headers[$headerName] = $value;
            }
        }
        return $headers;
    }

    private function callOpenAIDirect(array $service, array $payload): array
    {
        $messages = $payload['messages'] ?? [['role' => 'user', 'content' => 'pong']];
        $openAiPayload = [
            'model' => $service['identifier'],
            'messages' => $messages,
            'temperature' => 0.7,
            'max_tokens' => 10,
        ];

        $ch = curl_init($service['endpoint']);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . trim($service['api_key']),
            ],
            CURLOPT_POSTFIELDS => json_encode($openAiPayload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            return ['status' => 'error', 'message' => 'CURL Error: ' . $error, 'http_code' => 500];
        }

        $data = json_decode($response, true);
        $extractedText = $data['choices'][0]['message']['content'] ?? '';

        return [
            'status' => ($httpCode === 200 && !empty($extractedText)) ? 'success' : 'error',
            'http_code' => $httpCode,
            'response' => $extractedText,
            'data' => $data,
            'message' => $data['error']['message'] ?? 'OK',
        ];
    }

    private function callGeminiDirect(array $service, array $payload): array
    {
        $url = ($service['endpoint'] ?: "https://generativelanguage.googleapis.com/v1/models/")
            . $service['identifier'] . ":generateContent?key=" . trim($service['api_key']);

        $geminiPayload = [
            'contents' => [['parts' => [['text' => 'respond only with pong']]]],
            'generationConfig' => ['temperature' => 0.7, 'maxOutputTokens' => 10],
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($geminiPayload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            return ['status' => 'error', 'message' => 'CURL Error: ' . $error, 'http_code' => 500];
        }

        $data = json_decode($response, true);
        $extractedText = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

        return [
            'status' => ($httpCode === 200 && !empty($extractedText)) ? 'success' : 'error',
            'http_code' => $httpCode,
            'response' => $extractedText,
            'data' => $data,
            'message' => $data['error']['message'] ?? 'OK',
        ];
    }
}
