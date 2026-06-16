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
     * NOTA: By-passes tenant scope porque el refresh token se busca por hash
     * desde rutas públicas (login/refresh) donde TenantContext no está inicializado.
     * La tenant_id se almacena como dato, no como filtro de scope.
     * 
     * @return array<string, mixed>|null
     */
    public function findByHash(string $tokenHash): ?array
    {
        $result = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ 
             SELECT * FROM refresh_tokens 
             WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()",
            [$tokenHash]
        );
        return $result[0] ?? null;
    }

    /**
     * Crea nuevo refresh token
     * 
     * @return int Nuevo token_id
     */
    public function createRefreshToken(int $userId, int $tenantId, string $tokenHash, ?string $userAgent, ?string $ipAddress): int
    {
        $expiresAt = (new \DateTime())->modify('+30 days')->format('Y-m-d H:i:s');
        
        $this->rawExecute(
            "/* BYPASS_TENANT_SCOPE */ INSERT INTO refresh_tokens 
             (user_id, tenant_id, token_hash, user_agent, ip_address, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())",
            [$userId, $tenantId, $tokenHash, $userAgent, $ipAddress, $expiresAt]
        );
        
        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Rota refresh token: revoca actual + crea nuevo
     * 
     * @return array{new_token_id: int, expires_at: string}
     */
    public function rotate(int $oldTokenId, int $userId, int $tenantId, string $newTokenHash, ?string $userAgent, ?string $ipAddress): array
    {
        return $this->transactional(function () use ($oldTokenId, $userId, $tenantId, $newTokenHash, $userAgent, $ipAddress) {
            // 1. Revocar token actual
            $this->rawExecute(
                "/* BYPASS_TENANT_SCOPE */ UPDATE refresh_tokens 
                 SET revoked_at = NOW(), replaced_by_token_id = :new_id
                 WHERE id = :old_id",
                [':new_id' => 0, ':old_id' => $oldTokenId]
            );

            // 2. Crear nuevo token
            $expiresAt = (new \DateTime())->modify('+30 days')->format('Y-m-d H:i:s');
            $this->rawExecute(
                "/* BYPASS_TENANT_SCOPE */ INSERT INTO refresh_tokens 
                 (user_id, tenant_id, token_hash, user_agent, ip_address, expires_at, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())",
                [$userId, $tenantId, $newTokenHash, $userAgent, $ipAddress, $expiresAt]
            );
            $newTokenId = (int)$this->pdo->lastInsertId();

            // 3. Actualizar replaced_by_token_id del token revocado
            $this->rawExecute(
                "/* BYPASS_TENANT_SCOPE */ UPDATE refresh_tokens SET replaced_by_token_id = ? WHERE id = ?",
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
            "/* BYPASS_TENANT_SCOPE */ SELECT replaced_by_token_id FROM refresh_tokens WHERE id = ?",
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
            "/* BYPASS_TENANT_SCOPE */ UPDATE refresh_tokens 
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
            "/* BYPASS_TENANT_SCOPE */ DELETE FROM refresh_tokens 
             WHERE expires_at < NOW() 
                OR (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(NOW(), INTERVAL 7 DAY))"
        );
        return $result;
    }
}