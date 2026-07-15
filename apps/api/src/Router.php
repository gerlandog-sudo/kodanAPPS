<?php

declare(strict_types=1);

namespace kodanAPPS;

use kodanAPPS\Exceptions\ApiException;

/**
 * Router simple para la API kodanAPPS
 * 
 * Soporta:
 * - Métodos GET, POST, PATCH, PUT, DELETE
 * - Parámetros dinámicos en URL ({id})
 * - Middleware por prefijo
 * - Error handling uniforme via ApiException
 * - Contexto de request (auth, etc.)
 */
class Router
{
    /** @var array<int, array{method: string, pattern: string, regex: string, handler: callable, params: array<string>}> */
    private array $routes = [];

    /** @var array<string, callable> Middlewares por prefijo */
    private array $middleware = [];

    /** @var array<string, mixed> Contexto de la request actual */
    private array $context = [];

    /**
     * Registra una ruta GET
     */
    public function get(string $path, callable $handler): self
    {
        return $this->addRoute('GET', $path, $handler);
    }

    /**
     * Registra una ruta POST
     */
    public function post(string $path, callable $handler): self
    {
        return $this->addRoute('POST', $path, $handler);
    }

    /**
     * Registra una ruta PATCH
     */
    public function patch(string $path, callable $handler): self
    {
        return $this->addRoute('PATCH', $path, $handler);
    }

    /**
     * Registra una ruta PUT
     */
    public function put(string $path, callable $handler): self
    {
        return $this->addRoute('PUT', $path, $handler);
    }

    /**
     * Registra una ruta DELETE
     */
    public function delete(string $path, callable $handler): self
    {
        return $this->addRoute('DELETE', $path, $handler);
    }

    /**
     * Asigna middleware a un prefijo de ruta
     */
    public function use(string $prefix, callable $middleware): self
    {
        $this->middleware[$prefix] = $middleware;
        return $this;
    }

    /**
     * Obtiene un valor del contexto de request
     */
    public function getContext(string $key, mixed $default = null): mixed
    {
        return $this->context[$key] ?? $default;
    }

    /**
     * Establece un valor en el contexto de request
     */
    public function setContext(string $key, mixed $value): void
    {
        $this->context[$key] = $value;
    }

    /**
     * Despacha la petición actual
     */
    public function dispatch(string $method, string $uri): void
    {
        $path = parse_url($uri, PHP_URL_PATH);
        $path = rtrim($path, '/') ?: '/';

        // Limpiar contexto para nueva request
        $this->context = [];

        // Buffer general: evita que PHP warnings/notices (display_errors) corrompan el JSON
        // Se descarta en cada path (éxito, 404, o excepción)
        $obLevel = ob_get_level();

        try {
            // 1. Ejecutar middleware por prefijo
            foreach ($this->middleware as $prefix => $mw) {
                if (str_starts_with($path, $prefix)) {
                    $result = $mw($this);
                    // Si el middleware retorna false, detener (error ya respondido)
                    if ($result === false) {
                        while (ob_get_level() > $obLevel) { ob_end_clean(); }
                        return;
                    }
                }
            }

            // 2. Buscar ruta
            foreach ($this->routes as $route) {
                if ($route['method'] !== $method) {
                    continue;
                }
                if (preg_match($route['regex'], $path, $matches)) {
                    $params = [];
                    foreach ($route['params'] as $i => $name) {
                        $val = $matches[$i + 1];
                        if ($name === 'id' || str_ends_with(strtolower($name), 'id')) {
                            $params[$name] = (int)$val;
                        } else {
                            $params[$name] = $val;
                        }
                    }
                    ob_start();
                    ($route['handler'])($params, $this);
                    $output = ob_get_clean();

                    if (class_exists('\kodanAPPS\Services\WorkflowEngine')) {
                        $logs = \kodanAPPS\Services\WorkflowEngine::getDebugLogs();
                        if (!empty($logs) && is_string($output)) {
                            $trimmed = trim($output);
                            if (str_starts_with($trimmed, '{') && str_ends_with($trimmed, '}')) {
                                $data = json_decode($trimmed, true);
                                if (is_array($data)) {
                                    $data['workflow_debug_logs'] = $logs;
                                    $output = json_encode($data, JSON_UNESCAPED_UNICODE);
                                }
                            }
                        }
                        \kodanAPPS\Services\WorkflowEngine::clearDebugLogs();
                    }

                    // Descartar buffer externo (posibles warnings del middleware)
                    while (ob_get_level() > $obLevel) { ob_end_clean(); }
                    echo $output;
                    return;
                }
            }

            // 3. 404
            while (ob_get_level() > $obLevel) { ob_end_clean(); }
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Not found']);

        } catch (ApiException $e) {
            while (ob_get_level() > $obLevel) { ob_end_clean(); }
            http_response_code($e->getCode());
            header('Content-Type: application/json');
            $data = $e->toArray();
            if (class_exists('\kodanAPPS\Services\WorkflowEngine')) {
                $logs = \kodanAPPS\Services\WorkflowEngine::getDebugLogs();
                if (!empty($logs)) {
                    $data['workflow_debug_logs'] = $logs;
                }
                \kodanAPPS\Services\WorkflowEngine::clearDebugLogs();
            }
            echo json_encode($data);
        } catch (\InvalidArgumentException $e) {
            while (ob_get_level() > $obLevel) { ob_end_clean(); }
            http_response_code(422);
            header('Content-Type: application/json');
            $data = [
                'message' => 'Validation error',
                'errors' => json_decode($e->getMessage(), true) ?: ['general' => $e->getMessage()],
            ];
            if (class_exists('\kodanAPPS\Services\WorkflowEngine')) {
                $logs = \kodanAPPS\Services\WorkflowEngine::getDebugLogs();
                if (!empty($logs)) {
                    $data['workflow_debug_logs'] = $logs;
                }
                \kodanAPPS\Services\WorkflowEngine::clearDebugLogs();
            }
            echo json_encode($data);
        } catch (\RuntimeException $e) {
            while (ob_get_level() > $obLevel) { ob_end_clean(); }
            $code = (int)$e->getCode();
            if ($code < 400 || $code > 599) {
                $code = 500;
            }
            error_log('[Router] RuntimeException: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            http_response_code($code);
            header('Content-Type: application/json');
            $data = ['error' => $e->getMessage()];
            if (class_exists('\kodanAPPS\Services\WorkflowEngine')) {
                $logs = \kodanAPPS\Services\WorkflowEngine::getDebugLogs();
                if (!empty($logs)) {
                    $data['workflow_debug_logs'] = $logs;
                }
                \kodanAPPS\Services\WorkflowEngine::clearDebugLogs();
            }
            echo json_encode($data);
        } catch (\Throwable $e) {
            while (ob_get_level() > $obLevel) { ob_end_clean(); }
            error_log('[Router] Unhandled Throwable: ' . get_class($e) . ' - ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            error_log('[Router] Stack trace: ' . $e->getTraceAsString());
            http_response_code(500);
            header('Content-Type: application/json');
            $data = ['error' => 'Internal server error'];
            if (class_exists('\kodanAPPS\Services\WorkflowEngine')) {
                $logs = \kodanAPPS\Services\WorkflowEngine::getDebugLogs();
                if (!empty($logs)) {
                    $data['workflow_debug_logs'] = $logs;
                }
                \kodanAPPS\Services\WorkflowEngine::clearDebugLogs();
            }
            echo json_encode($data);
        }
    }

    /**
     * Despacha usando valores de servidor
     */
    public function dispatchFromGlobals(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $this->dispatch($method, $uri);
    }

    private function addRoute(string $method, string $path, callable $handler): self
    {
        $params = [];
        $regex = preg_replace_callback('/\{(\w+)\}/', function ($m) use (&$params) {
            $name = $m[1];
            $params[] = $name;
            if ($name === 'id' || str_ends_with(strtolower($name), 'id')) {
                return '(\d+)';
            }
            return '([^/]+)';
        }, $path);

        $this->routes[] = [
            'method' => $method,
            'pattern' => $path,
            'regex' => '#^' . $regex . '$#',
            'handler' => $handler,
            'params' => $params,
        ];

        return $this;
    }
}
