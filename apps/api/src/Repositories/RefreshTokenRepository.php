<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantAwarePDO;

/**
 * RefreshTokenRepository - Manejo de rotating refresh tokens
 * 
 * Blueprint Punto 1: Rotación obligatoria + Reuse Detection
 */
final class RefreshTokenRepository extends BaseRepository
{
    public function __construct(TenantAwarePDO $pdo)
    {
        parent::__construct($pdo);
    }

    /**
     * Busca refresh token por hash
     * 
     * @return array<string, mixed>|null
     */
    public function findByHash(string $tokenHash): ?array
    {
        return $this->findOne(
            'refresh_tokens',
            'token_hash = :hash AND revoked_at IS NULL AND expires_at > NOW()',
            [':hash' => $tokenHash]
        );
    }

    /**
     * Crea nuevo refresh token
     * 
     * @return int Nuevo token_id
     */
    public function create(int $userId, int $tenantId, string $tokenHash, ?string $userAgent, ?string $ipAddress): int
    {
        $expiresAt = (new \DateTime())->modify('+30 days')->format('Y-m-d H:i:s');
        
        return $this->create('refresh_tokens', [
            'user_id' => $userId,
            'tenant_id' => $tenantId,
            'token_hash' => $tokenHash,
            'user_agent' => $userAgent,
            'ip_address' => $ipAddress,
            'expires_at' => $expiresAt,
        ]);
    }

    /**
     * Rota refresh token: revoca actual + crea nuevo
     * 
     * @return array{new_token_id: int, new_token_hash: string, expires_at: string}
     */
    public function rotate(int $oldTokenId, int $userId, int $tenantId, string $newTokenHash, ?string $userAgent, ?string $ipAddress): array
    {
        return $this->transactional(function () use ($oldTokenId, $userId, $tenantId, $newTokenHash, $userAgent, $ipAddress) {
            // 1. Revocar token actual
            $this->rawExecute(
                "UPDATE refresh_tokens 
                 SET revoked_at = NOW(), replaced_by_token_id = :new_id
                 WHERE id = :old_id",
                [':new_id' => 0, ':old_id' => $oldTokenId] // new_id se actualiza abajo
            );

            // 2. Crear nuevo token
            $expiresAt = (new \DateTime())->modify('+30 days')->format('Y-m-d H:i:s');
            $newTokenId = $this->create('refresh_tokens', [
                'user_id' => $userId,
                'tenant_id' => $tenantId,
                'token_hash' => $newTokenHash,
                'expires_at' => $expiresAt,
            ]);

            // 3. Actualizar replaced_by_token_id del token revocado
            $this->rawExecute(
                "UPDATE refresh_tokens SET replaced_by_token_id = ? WHERE id = ?",
                [$newTokenId, $oldTokenId]
            );

            return [
                'new_token_id' => $newTokenId,
                'expires_at' => $expiresAt,
            ];
        });
    }

    /**
     * Detecta reuso de refresh token (replaced_by_token_id ya tiene valor)
     * 
     * @return bool True si se detectó reuso (posible robo)
     */
    public function detectReuse(int $tokenId): bool
    {
        $result = $this->rawSelect(
            "SELECT replaced_by_token_id FROM refresh_tokens WHERE id = ?",
            [$tokenId]
        );
        
        return !empty($result) && $result[0]['replaced_by_token_id'] !== null;
    }

    /**
     * Revoca toda la cadena de tokens (ante detección de reuso)
     */
    public function revokeChain(int $tokenId): void
    {
        $this->rawExecute(
            "UPDATE refresh_tokens 
             SET revoked_at = NOW() 
             WHERE id = ? OR replaced_by_token_id = ? OR id IN (
                 SELECT id FROM refresh_tokens WHERE replaced_by_token_id = ?
             )",
            [$tokenId, $tokenId, $tokenId]
        );
    }

    /**
     * Limpia tokens expirados o revocados > 7 días (job diario)
     * 
     * @return int Cantidad eliminados
     */
    public function cleanExpired(): int
    {
        $result = $this->rawExecute(
            "DELETE FROM refresh_tokens 
             WHERE expires_at < NOW() 
                OR (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(NOW(), INTERVAL 7 DAY))"
        );
        return $result;
    }
}