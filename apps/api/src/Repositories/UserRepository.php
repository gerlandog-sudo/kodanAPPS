<?php

declare(strict_types=1);

namespace kodanAPPS\Repositories;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;

/**
 * UserRepository - Repositorio para users y user_roles
 * 
 * @extends BaseRepository<array{id: int, tenant_id: int, email: string, password_hash: string, display_name: string, is_super_admin: int, language: string, is_active: int, created_at: string}>
 *
 * Extiende BaseRepository. Usado por TenantService para crear admin de tenant.
 * 
 * NOTA: user_apps reemplazado por user_roles + roles (catálogo global).
 */
final class UserRepository extends BaseRepository
{
    protected const TABLE = 'users';

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
     * @param array<string, mixed> $data
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
        
        $columns = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($data)));
        $placeholders = ':' . implode(', :', array_keys($data));
        $sql = "/* BYPASS_TENANT_SCOPE */ INSERT INTO `users` ({$columns}) VALUES ({$placeholders})";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($data);
        
        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Asigna rol a usuario en app específica (reemplaza user_apps)
     * 
     * @param int $roleId ID de roles table
     */
    public function assignRoleToApp(int $userId, string $appId, int $roleId): void
    {
        $this->rawExecute(
            "/* BYPASS_TENANT_SCOPE */ INSERT INTO user_roles (user_id, app_id, role_id, assigned_by, created_at)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)",
            [$userId, $appId, $roleId, $userId]
        );
    }

    /**
     * Obtiene roles del usuario con nombre de rol (join con roles)
     * 
     * @return array<int, array{app_id: string, role: string, role_id: int}>
     */
    public function getUserRoles(int $userId): array
    {
        return $this->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT ur.app_id, r.name AS role, r.id AS role_id
             FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = ?",
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
        return $this->findOne(self::TABLE, 'id = :id', [':id' => $userId]);
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