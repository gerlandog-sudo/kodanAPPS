<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DB\TenantContext;
use kodanAPPS\Repositories\UserRepository;
use InvalidArgumentException;
use RuntimeException;
use PDO;

final class TenantUserController
{
    private UserRepository $userRepo;
    private PDO $pdo;

    public function __construct(UserRepository $userRepo, PDO $pdo)
    {
        $this->userRepo = $userRepo;
        $this->pdo = $pdo;
    }

    /**
     * GET /api/crm/users
     * Lista de usuarios en el tenant actual con su rol en crm
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listUsers(): array
    {
        $tenantId = TenantContext::getTenantId();

        $stmt = $this->pdo->prepare(
            "SELECT u.id, u.email, u.display_name, u.is_active, u.created_at, 
                    ur.role_id, r.name AS role_name, r.description AS role_description
             FROM users u
             LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.app_id = 'crm'
             LEFT JOIN roles r ON r.id = ur.role_id
             WHERE u.tenant_id = :tid
             ORDER BY u.id ASC"
        );
        $stmt->execute([':tid' => $tenantId]);
        return $stmt->fetchAll();
    }

    /**
     * GET /api/crm/users/roles
     * Obtiene el catálogo de roles para la app crm
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listCrmRoles(): array
    {
        $stmt = $this->pdo->query(
            "/* BYPASS_TENANT_SCOPE */ 
             SELECT id, name, description 
             FROM roles 
             WHERE app_id = 'crm' AND is_active = 1 
             ORDER BY id ASC"
        );
        return $stmt->fetchAll();
    }

    /**
     * POST /api/crm/users
     * Crea un usuario y le asigna el rol en crm
     * 
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function createUser(array $input): array
    {
        $email = isset($input['email']) ? strtolower(trim((string)$input['email'])) : '';
        $displayName = isset($input['display_name']) ? trim((string)$input['display_name']) : '';
        $password = isset($input['password']) ? (string)$input['password'] : '';
        $roleId = isset($input['role_id']) ? (int)$input['role_id'] : 0;

        // Validaciones
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('El email proporcionado no es válido.');
        }
        if ($displayName === '') {
            throw new InvalidArgumentException('El nombre visible es requerido.');
        }
        if (strlen($password) < 8) {
            throw new InvalidArgumentException('La contraseña debe tener al menos 8 caracteres.');
        }
        if ($roleId <= 0) {
            throw new InvalidArgumentException('Debe seleccionar un rol de CRM válido.');
        }

        $tenantId = TenantContext::getTenantId();

        // Verificar si el rol existe en CRM
        $roleCheck = $this->pdo->prepare(
            "/* BYPASS_TENANT_SCOPE */ SELECT 1 FROM roles WHERE id = :rid AND app_id = 'crm' AND is_active = 1 LIMIT 1"
        );
        $roleCheck->execute([':rid' => $roleId]);
        if (!$roleCheck->fetch()) {
            throw new InvalidArgumentException('El rol seleccionado no es válido o está inactivo.');
        }

        // Verificar email duplicado en toda la base de datos (email único global)
        if ($this->userRepo->emailExists($email)) {
            throw new InvalidArgumentException('El correo electrónico ya se encuentra registrado.');
        }

        // Verificar capacidad del plan (users_max)
        $capacityCheck = $this->pdo->prepare(
            "SELECT limit_value, current_usage, has_capacity 
             FROM v_tenant_plan_limits 
             WHERE tenant_id = :tid AND module = 'crm' AND metric = 'users_max' LIMIT 1"
        );
        $capacityCheck->execute([':tid' => $tenantId]);
        $capacity = $capacityCheck->fetch();

        if ($capacity) {
            $limitValue = (int)$capacity['limit_value'];
            $currentUsage = (int)$capacity['current_usage'];
            if ($limitValue > 0 && $currentUsage >= $limitValue) {
                throw new RuntimeException('Se ha alcanzado el límite de usuarios permitidos en el plan actual.', 403);
            }
        }

        // Hashear password con Argon2id
        $passwordHash = password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3,
        ]);

        $newUserId = 0;

        // Ejecutar inserción en transacción
        $this->pdo->beginTransaction();
        try {
            // 1. Insertar usuario
            $newUserId = $this->userRepo->createUser([
                'tenant_id' => $tenantId,
                'email' => $email,
                'password_hash' => $passwordHash,
                'display_name' => $displayName,
                'is_super_admin' => 0,
                'is_active' => 1,
            ]);

            // 2. Asignar rol
            $this->userRepo->assignRoleToApp($newUserId, 'crm', $roleId);

            // 3. Incrementar contador en tenant_plan_usage
            $updateUsage = $this->pdo->prepare(
                "UPDATE tenant_plan_usage 
                 SET current_value = current_value + 1 
                 WHERE tenant_id = :tid AND module = 'crm' AND metric = 'users_max'"
            );
            $updateUsage->execute([':tid' => $tenantId]);

            // 4. Guardar tema por defecto en user_configs
            $themeJson = json_encode(['theme' => 'light']);
            $insertTheme = $this->pdo->prepare(
                "INSERT INTO user_configs (user_id, app_id, theme_colors) /* BYPASS_TENANT_SCOPE */
                 VALUES (:uid, 'crm', :theme)
                 ON DUPLICATE KEY UPDATE theme_colors = VALUES(theme_colors)"
            );
            $insertTheme->execute([':uid' => $newUserId, ':theme' => $themeJson]);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw new RuntimeException('Error al registrar el usuario: ' . $e->getMessage(), 500);
        }

        return [
            'success' => true,
            'id' => $newUserId,
            'message' => 'Usuario registrado y configurado con éxito.',
        ];
    }

    /**
     * PUT /api/crm/users/{id}
     * Actualiza un usuario del tenant
     * 
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function updateUser(int $id, array $input): array
    {
        $tenantId = TenantContext::getTenantId();
        $currentUserId = TenantContext::getUserId();

        // Buscar el usuario en el tenant actual para verificar que pertenece a él
        $userCheck = $this->pdo->prepare(
            "SELECT id, email, display_name, is_active FROM users WHERE id = :id AND tenant_id = :tid LIMIT 1"
        );
        $userCheck->execute([':id' => $id, ':tid' => $tenantId]);
        $user = $userCheck->fetch();

        if (!$user) {
            throw new RuntimeException('Usuario no encontrado.', 404);
        }

        $displayName = isset($input['display_name']) ? trim((string)$input['display_name']) : '';
        $roleId = isset($input['role_id']) ? (int)$input['role_id'] : 0;
        $isActive = isset($input['is_active']) ? (int)$input['is_active'] : -1;

        if ($displayName === '') {
            throw new InvalidArgumentException('El nombre visible es requerido.');
        }

        // Bloquear auto-desactivación
        if ($id === $currentUserId && $isActive === 0) {
            throw new InvalidArgumentException('No puedes desactivar tu propio usuario administrador.');
        }

        // Si se cambia el rol, validar que sea de CRM
        if ($roleId > 0) {
            $roleCheck = $this->pdo->prepare(
                "/* BYPASS_TENANT_SCOPE */ SELECT 1 FROM roles WHERE id = :rid AND app_id = 'crm' AND is_active = 1 LIMIT 1"
            );
            $roleCheck->execute([':rid' => $roleId]);
            if (!$roleCheck->fetch()) {
                throw new InvalidArgumentException('El rol seleccionado no es válido.');
            }
        }

        $this->pdo->beginTransaction();
        try {
            // 1. Actualizar datos básicos de usuario
            $updateUserSql = "UPDATE users SET display_name = :name";
            $updateParams = [':name' => $displayName, ':id' => $id, ':tid' => $tenantId];

            if ($isActive !== -1) {
                $updateUserSql .= ", is_active = :active";
                $updateParams[':active'] = $isActive;
            }

            $updateUserSql .= " WHERE id = :id AND tenant_id = :tid";
            $stmt = $this->pdo->prepare($updateUserSql);
            $stmt->execute($updateParams);

            // 2. Si se cambió el estado activo/inactivo, ajustar contadores en tenant_plan_usage
            if ($isActive !== -1 && (int)$user['is_active'] !== $isActive) {
                $adjust = $isActive === 1 ? "+ 1" : "- 1";
                $adjustUsage = $this->pdo->prepare(
                    "UPDATE tenant_plan_usage 
                     SET current_value = GREATEST(0, current_value {$adjust}) 
                     WHERE tenant_id = :tid AND module = 'crm' AND metric = 'users_max'"
                );
                $adjustUsage->execute([':tid' => $tenantId]);
            }

            // 3. Actualizar rol en CRM si se provee
            if ($roleId > 0) {
                $this->userRepo->assignRoleToApp($id, 'crm', $roleId);
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw new RuntimeException('Error al actualizar el usuario: ' . $e->getMessage(), 500);
        }

        return [
            'success' => true,
            'message' => 'Usuario actualizado con éxito.',
        ];
    }

    /**
     * DELETE /api/crm/users/{id}
     * Da de baja lógicamente a un usuario del tenant
     * 
     * @return array<string, mixed>
     */
    public function deleteUser(int $id): array
    {
        $tenantId = TenantContext::getTenantId();
        $currentUserId = TenantContext::getUserId();

        if ($id === $currentUserId) {
            throw new InvalidArgumentException('No puedes eliminar tu propio usuario administrador.');
        }

        // Verificar existencia y estado del usuario en el tenant actual
        $userCheck = $this->pdo->prepare(
            "SELECT id, is_active FROM users WHERE id = :id AND tenant_id = :tid LIMIT 1"
        );
        $userCheck->execute([':id' => $id, ':tid' => $tenantId]);
        $user = $userCheck->fetch();

        if (!$user) {
            throw new RuntimeException('Usuario no encontrado.', 404);
        }

        $this->pdo->beginTransaction();
        try {
            // Desactivación lógica
            $stmt = $this->pdo->prepare(
                "UPDATE users SET is_active = 0 WHERE id = :id AND tenant_id = :tid"
            );
            $stmt->execute([':id' => $id, ':tid' => $tenantId]);

            // Decrementar uso en tenant_plan_usage si el usuario estaba activo
            if ((int)$user['is_active'] === 1) {
                $updateUsage = $this->pdo->prepare(
                    "UPDATE tenant_plan_usage 
                     SET current_value = GREATEST(0, current_value - 1) 
                     WHERE tenant_id = :tid AND module = 'crm' AND metric = 'users_max'"
                );
                $updateUsage->execute([':tid' => $tenantId]);
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw new RuntimeException('Error al dar de baja al usuario: ' . $e->getMessage(), 500);
        }

        return [
            'success' => true,
            'message' => 'Usuario dado de baja exitosamente.',
        ];
    }
}
