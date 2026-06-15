<?php

declare(strict_types=1);

namespace kodanAPPS\DB;

/**
 * TenantContext - Contexto de tenant actual (request-scoped)
 * 
 * Se setea en middleware de autenticación tras validar JWT.
 * Usado por BaseRepository para inyección explícita de tenant_id.
 */
final class TenantContext
{
    private static ?int $tenantId = null;
    private static ?int $userId = null;
    private static ?array $roles = null;
    private static ?string $appId = null;

    private function __construct() {}

    public static function set(int $tenantId, int $userId, array $roles, string $appId): void
    {
        self::$tenantId = $tenantId;
        self::$userId = $userId;
        self::$roles = $roles;
        self::$appId = $appId;
    }

    public static function getTenantId(): int
    {
        if (self::$tenantId === null) {
            throw new RuntimeException('TenantContext not initialized. Run AuthMiddleware first.');
        }
        return self::$tenantId;
    }

    public static function getUserId(): int
    {
        if (self::$userId === null) {
            throw new RuntimeException('TenantContext not initialized.');
        }
        return self::$userId;
    }

    public static function getRoles(): array
    {
        return self::$roles ?? [];
    }

    public static function getAppId(): string
    {
        return self::$appId ?? '';
    }

    public static function hasRole(string $role): bool
    {
        return in_array($role, self::$roles ?? [], true);
    }

    public static function isSuperAdmin(): bool
    {
        return self::hasRole('super_admin') || in_array('admin', self::$roles ?? [], true);
    }

    public static function clear(): void
    {
        self::$tenantId = null;
        self::$userId = null;
        self::$roles = null;
        self::$appId = null;
    }
}