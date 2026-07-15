<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\Repositories\HubRepository;

/**
 * HubProxyService - Servicio de proxy AI con failover.
 *
 * Refactor de la lógica en kodanHUB/index.php.
 *
 * Flujo:
 * 1. Recibe payload de app cliente (con token KDN válido)
 * 2. Carga servicios asignados ordenados por priority ASC
 * 3. Itera servicios: traduce protocolo si es necesario, llama API externa
 * 4. Primer éxito -> retorna respuesta + guarda log
 * 5. Fallo -> intenta siguiente servicio
 * 6. Todos fallan -> error 500
 */
final class HubProxyService
{
    private HubRepository $repo;
    private HubLogService $logService;

    private const PROTOCOL_OPENAI = 'openai-v1';
    private const PROTOCOL_GEMINI = 'gemini-v1';

    public function __construct(HubRepository $repo, HubLogService $logService)
    {
        $this->repo = $repo;
        $this->logService = $logService;
    }

    /**
     * Ejecuta una solicitud AI con failover entre servicios.
     *
     * @param array $app La app autenticada (fila de DB)
     * @param array $input El JSON de entrada con action y payload
     * @return array{status: string, response?: string, usage?: array, hub_model?: string, provider?: string, message?: string}
     */
    public function execute(array $app, array $input): array
    {
        $payload = $input['payload'] ?? [];

        if (empty($payload)) {
            return ['status' => 'error', 'message' => 'Payload vacío o inválido.'];
        }

        $services = $this->repo->getAppServices((int)$app['id']);

        if (empty($services)) {
            return ['status' => 'error', 'message' => 'App sin servicios configurados.'];
        }

        foreach ($services as $service) {
            $startTime = microtime(true);

            try {
                if ($service['protocol'] === self::PROTOCOL_OPENAI) {
                    $result = $this->callOpenAI($service, $payload);
                } else {
                    $result = $this->callGemini($service, $payload);
                }

                $latency = round(microtime(true) - $startTime, 2);

                if ($result['status'] === 'success') {
                    $tokens = $this->logService->extractTokens($result['data'], $service['protocol']);
                    $this->repo->saveLog(
                        (int)$app['id'],
                        $service['identifier'],
                        $tokens[0],
                        $tokens[1],
                        $latency,
                        'success'
                    );

                    return [
                        'status' => 'success',
                        'response' => $result['response'] ?? '',
                        'usage' => [
                            'prompt_tokens' => $tokens[0],
                            'completion_tokens' => $tokens[1],
                            'total_tokens' => $tokens[0] + $tokens[1],
                        ],
                        'hub_model' => $service['identifier'],
                        'provider' => $service['provider'] ?? 'Unknown',
                    ];
                }

                // Fallo -> loguear y continuar con siguiente servicio
                $this->repo->saveLog((int)$app['id'], $service['identifier'], 0, 0, $latency, 'error');
            } catch (\Throwable $e) {
                $latency = round(microtime(true) - $startTime, 2);
                $this->repo->saveLog((int)$app['id'], $service['identifier'], 0, 0, $latency, 'error');
            }
        }

        return ['status' => 'error', 'message' => 'Todos los servicios de IA fallaron.'];
    }

    /**
     * Llama a un servicio con protocolo OpenAI-compatible.
     */
    private function callOpenAI(array $service, array $payload): array
    {
        $messages = $payload['messages'] ?? [];

        // Traducción Gemini -> OpenAI
        if (empty($messages) && isset($payload['contents'])) {
            $messages = $this->translateGeminiToOpenAI($payload['contents']);
        }

        if (empty($messages) && is_string($payload)) {
            $messages = [['role' => 'user', 'content' => $payload]];
        }

        if (empty($messages)) {
            $messages = [['role' => 'user', 'content' => 'Hello (System Auto-Ping)']];
        }

        $openAiPayload = [
            'model' => $service['identifier'],
            'messages' => $messages,
            'temperature' => $payload['temperature'] ?? ($payload['generationConfig']['temperature'] ?? 0.7),
            'max_tokens' => $payload['max_tokens'] ?? ($payload['generationConfig']['maxOutputTokens'] ?? 4096),
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
            CURLOPT_TIMEOUT => 60,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            return ['status' => 'error', 'message' => 'CURL Error: ' . $error, 'http_code' => 500];
        }

        $data = json_decode($response, true);
        $extractedText = $data['choices'][0]['message']['content'] ?? ($data['choices'][0]['text'] ?? '');

        return [
            'status' => ($httpCode === 200 && !empty($extractedText)) ? 'success' : 'error',
            'http_code' => $httpCode,
            'response' => $extractedText,
            'data' => $data,
            'message' => $data['error']['message'] ?? ($httpCode === 200 ? 'OK' : 'API Error ' . $httpCode),
        ];
    }

    /**
     * Llama a un servicio con protocolo Gemini.
     */
    private function callGemini(array $service, array $payload): array
    {
        $url = ($service['endpoint'] ?: "https://generativelanguage.googleapis.com/v1/models/")
            . $service['identifier'] . ":generateContent?key=" . trim($service['api_key']);

        $contents = $payload['contents'] ?? [];

        // Traducción OpenAI -> Gemini
        if (empty($contents) && isset($payload['messages'])) {
            $contents = $this->translateOpenAIToGemini($payload['messages']);
        }

        if (empty($contents) && is_string($payload)) {
            $contents = [['parts' => [['text' => $payload]]]];
        }

        $geminiPayload = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => $payload['temperature'] ?? 0.7,
                'maxOutputTokens' => $payload['max_tokens'] ?? 4096,
            ],
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($geminiPayload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_TIMEOUT => 60,
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
            'message' => $data['error']['message'] ?? ($httpCode === 200 ? 'OK' : 'API Error ' . $httpCode),
        ];
    }

    /**
     * Traduce formato Gemini (contents) -> OpenAI (messages).
     */
    private function translateGeminiToOpenAI(array $contents): array
    {
        $messages = [];
        foreach ($contents as $content) {
            $role = ($content['role'] ?? 'user') === 'user' ? 'user' : 'assistant';
            $text = '';
            $images = [];

            foreach ($content['parts'] as $part) {
                if (isset($part['text'])) {
                    $text .= $part['text'];
                }
                if (isset($part['inlineData'])) {
                    $images[] = [
                        'type' => 'image_url',
                        'image_url' => [
                            'url' => "data:{$part['inlineData']['mimeType']};base64,{$part['inlineData']['data']}",
                        ],
                    ];
                }
            }

            if (!empty($images)) {
                $msgContent = [['type' => 'text', 'text' => $text]];
                $msgContent = array_merge($msgContent, $images);
                $messages[] = ['role' => $role, 'content' => $msgContent];
            } else {
                $messages[] = ['role' => $role, 'content' => $text];
            }
        }
        return $messages;
    }

    /**
     * Traduce formato OpenAI (messages) -> Gemini (contents).
     */
    private function translateOpenAIToGemini(array $messages): array
    {
        $contents = [];
        foreach ($messages as $msg) {
            $role = ($msg['role'] ?? 'user') === 'assistant' ? 'model' : 'user';
            $parts = [];

            if (is_array($msg['content'])) {
                foreach ($msg['content'] as $part) {
                    if (($part['type'] ?? '') === 'text') {
                        $parts[] = ['text' => $part['text'] ?? ''];
                    } elseif (($part['type'] ?? '') === 'image_url') {
                        $url = $part['image_url']['url'] ?? '';
                        if (preg_match('/data:(image\/[a-zA-Z]*);base64,(.*)/', $url, $matches)) {
                            $parts[] = [
                                'inlineData' => [
                                    'mimeType' => $matches[1],
                                    'data' => $matches[2],
                                ],
                            ];
                        }
                    }
                }
            } else {
                $parts[] = ['text' => $msg['content'] ?? ''];
            }

            $contents[] = ['role' => $role, 'parts' => $parts];
        }
        return $contents;
    }
}
