<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\DB\TenantContext;
use PDO;

final class AiService
{
    private const HUB_URL = 'https://hub.kodan.software/';
    private const DEFAULT_TOKEN = 'KDN-PG-225411';
    private const DEFAULT_APP_ID = 'kodanAPPS-PROD';

    private static array $credsCache = [];

    public function __construct(
        private readonly PDO $pdo,
    ) {}

    public function generateText(string $prompt): string
    {
        $payload = [
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.4,
            'max_tokens' => 2048,
        ];

        return $this->callHub($payload);
    }

    public function assist(string $prompt, string $catalogJson): array
    {
        $fullPrompt = "ACT AS AN EXPERT BI ANALYST FOR A TIMETRACKING PLATFORM.\n"
            . "TODAY IS: " . date('Y-m-d') . "\n\n"
            . "AVAILABLE CATALOG (use ONLY these keys):\n$catalogJson\n\n"
            . "Return ONLY a valid JSON object with dimensions, metrics, grouping, sort, filters.\n\n"
            . "USER INSTRUCTION: " . substr($prompt, 0, 3000);

        $payload = [
            'messages' => [
                ['role' => 'user', 'content' => $fullPrompt],
            ],
            'temperature' => 0.1,
            'max_tokens' => 2048,
        ];

        $text = $this->callHub($payload);
        $clean = preg_replace('/^```(?:json)?\s*/m', '', $text);
        $clean = preg_replace('/```\s*$/m', '', $clean);
        $clean = trim($clean);

        $definition = json_decode($clean, true);
        if (!is_array($definition) && preg_match('/\{[\s\S]*\}/m', $clean, $m)) {
            $definition = json_decode($m[0], true);
        }

        return is_array($definition) ? $definition : [];
    }

    public function syncTenantIdentity(int $tenantId, string $companyName = ''): void
    {
        if (!$tenantId) return;

        try {
            $stmt = $this->pdo->prepare("SELECT value FROM system_config WHERE tenant_id = ? AND `key` = 'kodan_app_id' LIMIT 1");
            $stmt->execute([$tenantId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $appId = $row['value'] ?? '';

            if (empty($appId)) {
                $appId = 'KDN-' . bin2hex(random_bytes(4)) . '-' . date('Ymd');
                $stmt = $this->pdo->prepare("INSERT INTO system_config (tenant_id, `key`, value) VALUES (?, 'kodan_app_id', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)");
                $stmt->execute([$tenantId, $appId]);
            }

            $url = defined('KODAN_HUB_URL') ? KODAN_HUB_URL : self::HUB_URL;
            $appName = $companyName ?: "kodanAPPS Tenant $tenantId";

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => '',
                CURLOPT_HTTPHEADER => [
                    'X-KODAN-APP-ID: ' . $appId,
                    'X-KODAN-APP-NAME: ' . $appName,
                ],
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_TIMEOUT => 10,
            ]);
            $raw = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($code === 200) {
                $res = json_decode($raw, true);
                if (isset($res['new_kodan_token'])) {
                    $stmt = $this->pdo->prepare("INSERT INTO system_config (tenant_id, `key`, value) VALUES (?, 'kodan_token', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)");
                    $stmt->execute([$tenantId, $res['new_kodan_token']]);
                }
            }

            self::log("syncTenantIdentity | Tenant $tenantId HTTP $code");
        } catch (\Throwable $e) {
            self::log("syncTenantIdentity | Error: " . $e->getMessage());
        }
    }

    private function callHub(array $payload): string
    {
        $creds = $this->getCredentials();

        array_walk_recursive($payload, function (&$item) {
            if (is_string($item)) {
                $item = mb_convert_encoding($item, 'UTF-8', 'UTF-8');
                $item = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $item);
            }
        });

        $body = json_encode([
            'action' => 'ai',
            'payload' => $payload,
        ], JSON_UNESCAPED_UNICODE);

        $url = defined('KODAN_HUB_URL') ? KODAN_HUB_URL : self::HUB_URL;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HEADER => false,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-KODAN-TOKEN: ' . trim($creds['token']),
                'X-KODAN-APP-ID: ' . $creds['app_id'],
                'Connection: close',
            ],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_TIMEOUT => 90,
        ]);

        $rawBody = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($rawBody === false) {
            self::log("callHub | cURL Error: $curlError");
            throw new \RuntimeException("Error de comunicación con el Hub: $curlError");
        }

        self::log("callHub | HTTP $httpCode | Body: " . substr($rawBody, 0, 200));

        $result = json_decode($rawBody, true);
        if (!is_array($result)) {
            throw new \RuntimeException("El Hub devolvió una respuesta no válida (HTTP $httpCode).");
        }

        if ($httpCode === 401) {
            throw new \RuntimeException("Token inválido o revocado. Contacte al administrador.");
        }

        $status = $result['status'] ?? '';
        if ($status === 'pending_config') {
            throw new \RuntimeException("Servicio IA en configuración. Contacte al administrador del Hub.");
        }

        if ($status === 'error' || $httpCode !== 200) {
            $msg = $result['message'] ?? $result['error'] ?? "Error HTTP $httpCode";
            throw new \RuntimeException($msg);
        }

        if (!isset($result['response'])) {
            throw new \RuntimeException("El Hub no devolvió el campo 'response' esperado.");
        }

        return (string) $result['response'];
    }

    private function getCredentials(): array
    {
        $tenantId = TenantContext::getTenantId();

        if ($tenantId && isset(self::$credsCache[$tenantId])) {
            return self::$credsCache[$tenantId];
        }

        $creds = [
            'token' => defined('KODAN_HUB_TOKEN') ? KODAN_HUB_TOKEN : self::DEFAULT_TOKEN,
            'app_id' => defined('KODAN_HUB_APP_ID') ? KODAN_HUB_APP_ID : self::DEFAULT_APP_ID,
        ];

        if ($tenantId) {
            try {
                $stmt = $this->pdo->prepare("SELECT `key`, value FROM system_config WHERE tenant_id = ? AND `key` IN ('kodan_token', 'kodan_app_id')");
                $stmt->execute([$tenantId]);
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    if (!empty($row['value'])) {
                        $creds[$row['key'] === 'kodan_app_id' ? 'app_id' : 'token'] = $row['value'];
                    }
                }
            } catch (\Throwable $e) {
                self::log("getCredentials | Error: " . $e->getMessage());
            }

            self::$credsCache[$tenantId] = $creds;
        }

        return $creds;
    }

    private static function log(string $message): void
    {
        try {
            $dir = __DIR__ . '/../../logs';
            if (!is_dir($dir)) {
                @mkdir($dir, 0777, true);
            }
            @file_put_contents(
                $dir . '/hub.log',
                "[" . date('Y-m-d H:i:s') . "] $message\n",
                FILE_APPEND
            );
        } catch (\Throwable $e) {
        }
    }
}
