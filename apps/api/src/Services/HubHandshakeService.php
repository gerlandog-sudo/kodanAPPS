<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\Repositories\HubRepository;

/**
 * HubHandshakeService - Protocolo de handshake KODAN.
 *
 * Permite que apps cliente se registren automáticamente o recuperen su token.
 *
 * Flujo:
 * 1. App envía POST con body vacío + header X-KODAN-APP-ID
 * 2. Si app_id no existe -> se crea registro, se genera token, se retorna
 * 3. Si app_id existe y está activa -> se retorna el token almacenado
 * 4. Si app_id existe pero está inactiva/pausada -> 403
 */
final class HubHandshakeService
{
    private HubRepository $repo;
    private HubTokenService $tokenService;

    public function __construct(HubRepository $repo, HubTokenService $tokenService)
    {
        $this->repo = $repo;
        $this->tokenService = $tokenService;
    }

    /**
     * Ejecuta el handshake para una app.
     *
     * @return array{status: string, new_kodan_token?: string, message: string}
     */
    public function handshake(string $appId, ?string $appName = null): array
    {
        $app = $this->repo->getAppByAppId($appId);

        if (!$app) {
            // Caso: Registro de nueva App
            $newToken = $this->tokenService->generateToken($appName ?? 'Nueva App');

            $this->repo->createApp([
                'app_id' => $appId,
                'name' => $appName ?? 'Nueva App',
                'token' => $newToken,
                'status' => 'active',
            ]);

            return [
                'status' => 'success',
                'new_kodan_token' => $newToken,
                'message' => 'Handshake OK (Registrado)',
            ];
        }

        // Caso: App existente
        if ($app['status'] !== 'active') {
            return [
                'status' => 'error',
                'message' => 'Handshake rechazado: La aplicación está inactiva o pausada en el Hub.',
            ];
        }

        return [
            'status' => 'success',
            'new_kodan_token' => $app['token'],
            'message' => 'Handshake OK (Sincronizado)',
        ];
    }
}
