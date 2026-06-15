<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;

/**
 * UserRepository - Repositorio para users y user_apps
 * 
 * Extiende BaseRepository. Usado por TenantService para crear admin de tenant.
 */
final class UserRepository extends BaseRepository
{
    public function __construct(TenantAwarePDO $pdo)
    {
        parent::__construct($pdo);
    }

    /**
     * Verifica si email ya existe (global, único en BD)
     */
    public function emailExists(string $email): bool
    {
        $result = $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT 1 FROM users WHERE email = ? LIMIT 1",
            [strtolower(trim($email))]
        );
        return !empty($result);
    }

    /**
     * Crea usuario nuevo
     * 
     * @return int Nuevo user_id
     */
    public function createUser(array $data): int
    {
        $required = ['tenant_id', 'email', 'password_hash', 'display_name'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                throw new \InvalidArgumentException("Campo requerido faltante: $field");
            }
        }
        
        $data['is_super_admin'] = $data['is_super_admin'] ?? 0;
        $data['language'] = $data['language'] ?? 'es_AR';
        $data['is_active'] = $data['is_active'] ?? 1;
        $data['created_at'] = date('Y-m-d H:i:s');
        
        return parent::create('users', $data);
    }

    /**
     * Asigna rol a usuario en app específica
     */
    public function assignRole(int $userId, string $appId, string $role): void
    {
        $this->rawExecute(
            "INSERT INTO user_apps (user_id, app_id, role, is_active)
             VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE role = VALUES(role), is_active = 1",
            [$userId, $appId, $role]
        );
    }

    /**
     * Obtiene roles de usuario por app
     * 
     * @return array<int, array{app_id: string, role: string, is_active: int}>
     */
    public function getUserRoles(int $userId): array
    {
        return $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT app_id, role, is_active FROM user_apps WHERE user_id = ? AND is_active = 1",
            [$userId]
        );
    }

    /**
     * Busca usuario por email (para login)
     * 
     * @return array<string, mixed>|null
     */
    public function findByEmail(string $email): ?array
    {
        return $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */ SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1",
            [strtolower(trim($email))]
        )[0] ?? null;
    }

    /**
     * Busca usuario por ID
     * 
     * @return array<string, mixed>|null
     */
    public function findById(int $userId): ?array
    {
        return $this->findOne('users', 'id = :id', [':id' => $userId]);
    }

    /**
     * Actualiza último login
     */
    public function updateLastLogin(int $userId): void
    {
        // Podríamos agregar columna last_login_at a users si se necesita
        // Por ahora no implementado
    }
}