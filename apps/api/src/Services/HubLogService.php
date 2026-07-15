<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

/**
 * HubLogService - Extracción de tokens y utilidades de auditoría.
 */
final class HubLogService
{
    /**
     * Extrae el conteo de tokens de la respuesta de Gemini o OpenAI.
     *
     * @param array $data Respuesta decodificada de la API
     * @param string $protocol 'openai-v1' o 'gemini-v1'
     * @return array{0: int, 1: int} [prompt_tokens, completion_tokens]
     */
    public function extractTokens(array $data, string $protocol): array
    {
        $in = 0;
        $out = 0;

        if ($protocol === 'openai-v1') {
            $in = (int)($data['usage']['prompt_tokens'] ?? 0);
            $out = (int)($data['usage']['completion_tokens'] ?? 0);
        } else {
            // Estructura Gemini
            $in = (int)($data['usageMetadata']['promptTokenCount'] ?? 0);
            $out = (int)($data['usageMetadata']['candidatesTokenCount'] ?? 0);
        }

        return [$in, $out];
    }
}
