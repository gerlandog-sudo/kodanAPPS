<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DB\TenantContext;
use kodanAPPS\Repositories\UserRepository;
use kodanAPPS\Services\PlanAccessValidator;
use kodanAPPS\Services\UsageTrackerInterface;
use InvalidArgumentException;
use RuntimeException;
use PDO;

final class TenantUserController
{
    private UserRepository $userRepo;
    private PDO $pdo;
    private PlanAccessValidator $planAccessValidator;
    private UsageTrackerInterface $usageTracker;

    public function __construct(
        UserRepository $userRepo,
        PDO $pdo,
        PlanAccessValidator $planAccessValidator,
        UsageTrackerInterface $usageTracker
    ) {
        $this->userRepo = $userRepo;
        $this->pdo = $pdo;
        $this->planAccessValidator = $planAccessValidator;
        $this->usageTracker = $usageTracker;
    }

    /**
     * GET /api/tenant-users
     * Lista de usuarios en el tenant actual con sus roles en todas las aplicaciones
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listUsers(): array
    {
        $tenantId = TenantContext::getTenantId();

        // 1. Obtener todos los usuarios del tenant
        $stmt = $this->pdo->prepare(
            "SELECT id, email, display_name, is_active, created_at
             FROM users
             WHERE tenant_id = :tid
             ORDER BY id ASC"
        );
        $stmt->execute([':tid' => $tenantId]);
        $users = $stmt->fetchAll();

        if (empty($users)) {
            return [];
        }

        // 2. Obtener todas las asignaciones de roles para los usuarios del tenant
        $userIds = array_column($users, 'id');
        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        
        $stmtRoles = $this->pdo->prepare(
            "/* BYPASS_TENANT_SCOPE */
             SELECT ur.user_id, ur.app_id, ur.role_id, r.name AS role_name, r.description AS role_description
             FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id IN ($placeholders) AND r.is_active = 1"
        );
        $stmtRoles->execute($userIds);
        $allRoles = $stmtRoles->fetchAll();

        // Agrupar roles por usuario
        $rolesByUser = [];
        foreach ($allRoles as $role) {
            $uid = (int)$role['user_id'];
            $rolesByUser[$uid][$role['app_id']] = [
                'role_id' => (int)$role['role_id'],
                'role_name' => $role['role_name'],
                'role_description' => $role['role_description'],
            ];
        }

        // Estructurar la respuesta final
        foreach ($users as &$user) {
            $uid = (int)$user['id'];
            $user['id'] = $uid;
            $user['is_active'] = (int)$user['is_active'];
            $user['apps'] = $rolesByUser[$uid] ?? new \stdClass();
        }

        return $users;
    }

    /**
     * GET /api/tenant-users/roles
     * Obtiene el catálogo de todos los roles activos agrupados por app
     * 
     * @return array<string, array<int, array<string, mixed>>>
     */
    public function listAllRoles(): array
    {
        $tenantId = TenantContext::getTenantId();

        // Obtener las apps contratadas vía UsageTracker
        $contractedApps = $this->usageTracker->getContractedApps($tenantId);

        if (empty($contractedApps)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($contractedApps), '?'));
        $stmt = $this->pdo->prepare(
            "/* BYPASS_TENANT_SCOPE */ 
             SELECT id, app_id, name, description 
             FROM roles 
             WHERE app_id IN ($placeholders) AND is_active = 1 
             ORDER BY app_id ASC, id ASC"
        );
        $stmt->execute($contractedApps);
        $roles = $stmt->fetchAll();

        $grouped = [];
        foreach ($roles as $role) {
            $grouped[$role['app_id']][] = [
                'id' => (int)$role['id'],
                'name' => $role['name'],
                'description' => $role['description'],
            ];
        }
        return $grouped;
    }

    /**
     * GET /api/tenant-users/apps
     * Obtiene las aplicaciones contratadas por el tenant actual
     * 
     * @return array<int, string>
     */
    public function getContractedApps(): array
    {
        $tenantId = TenantContext::getTenantId();
        return $this->usageTracker->getContractedApps($tenantId);
    }

    /**
     * GET /api/tenant-users/plan-status
     * Obtiene el estado actual de los límites y consumo de usuarios por módulo para el tenant
     * 
     * @return array<int, array<string, mixed>>
     */
    public function getPlanStatus(): array
    {
        $all = $this->usageTracker->getAllUsageStatus();
        return array_values(array_filter($all, fn($r) => ($r['metric'] ?? '') === 'users_max'));
    }

    /**
     * PATCH /api/tenant-users/roles
     * Asigna roles en bulk para múltiples usuarios/apps
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, message: string}
     */
    public function updateRoles(array $input): array
    {
        $tenantId = TenantContext::getTenantId();
        $roles = $input['roles'] ?? [];
        if (empty($roles) || !is_array($roles)) {
            throw new \InvalidArgumentException('Se requiere un array "roles" con user_id, app_id y role_id.');
        }

        $params = [];
        foreach ($roles as $i => $item) {
            if (!is_array($item)) {
                throw new \InvalidArgumentException("Elemento {$i} de roles no es un array.");
            }
            $uid = (int)($item['user_id'] ?? 0);
            $aid = (string)($item['app_id'] ?? '');
            $rid = (int)($item['role_id'] ?? 0);
            if ($uid <= 0 || $aid === '') {
                throw new \InvalidArgumentException("Elemento {$i}: user_id y app_id son requeridos.");
            }
            $params[] = ['user_id' => $uid, 'app_id' => $aid, 'role_id' => $rid];
        }

        $this->pdo->beginTransaction();
        try {
            foreach ($params as $item) {
                $userId = $item['user_id'];
                $appId = $item['app_id'];
                $roleId = $item['role_id'];

                // Verificar que el usuario pertenece al tenant
                $stmt = $this->pdo->prepare("SELECT 1 FROM users WHERE id = :uid AND tenant_id = :tid LIMIT 1");
                $stmt->execute([':uid' => $userId, ':tid' => $tenantId]);
                if (!$stmt->fetch()) {
                    throw new \RuntimeException("Usuario {$userId} no encontrado en el tenant.", 404);
                }

                if ($roleId === 0) {
                    // Revocar acceso
                    $stmtRevoke = $this->pdo->prepare(
                        "/* BYPASS_TENANT_SCOPE */ DELETE FROM user_roles WHERE user_id = :uid AND app_id = :app"
                    );
                    $stmtRevoke->execute([':uid' => $userId, ':app' => $appId]);
                    // Decrementar contador solo si tenía rol previo
                    $stmtCheck = $this->pdo->prepare(
                        "/* BYPASS_TENANT_SCOPE */ SELECT role_id FROM user_roles WHERE user_id = :uid AND app_id = :app LIMIT 1"
                    );
                    $stmtCheck->execute([':uid' => $userId, ':app' => $appId]);
                    if ($stmtCheck->fetch()) {
                        $this->usageTracker->decrement($appId, 'users_max', 1);
                    }
                } else {
                    // Validar que el rol existe y pertenece a la app
                    $roleCheck = $this->pdo->prepare(
                        "/* BYPASS_TENANT_SCOPE */ SELECT 1 FROM roles WHERE id = :rid AND app_id = :app AND is_active = 1 LIMIT 1"
                    );
                    $roleCheck->execute([':rid' => $roleId, ':app' => $appId]);
                    if (!$roleCheck->fetch()) {
                        throw new \InvalidArgumentException("Rol {$roleId} no válido para la app {$appId}.");
                    }

                    // Verificar si ya tenía rol (es un cambio o asignación nueva)
                    $stmtCheck = $this->pdo->prepare(
                        "/* BYPASS_TENANT_SCOPE */ SELECT role_id FROM user_roles WHERE user_id = :uid AND app_id = :app LIMIT 1"
                    );
                    $stmtCheck->execute([':uid' => $userId, ':app' => $appId]);
                    $existing = $stmtCheck->fetch();

                    if ($existing) {
                        // Cambio de rol: upsert
                        $stmtUpsert = $this->pdo->prepare(
                            "/* BYPASS_TENANT_SCOPE */ UPDATE user_roles SET role_id = :rid WHERE user_id = :uid AND app_id = :app"
                        );
                        $stmtUpsert->execute([':rid' => $roleId, ':uid' => $userId, ':app' => $appId]);
                    } else {
                        // Asignación nueva
                        $this->userRepo->assignRoleToApp($userId, $appId, $roleId);
                        $this->usageTracker->increment($appId, 'users_max', 1);
                    }
                }
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw new \RuntimeException('Error al actualizar roles: ' . $e->getMessage(), 500);
        }

        return ['success' => true, 'message' => 'Roles actualizados correctamente.'];
    }

    /**
     * POST /api/tenant-users
     * Crea un usuario y le asigna roles en las aplicaciones
     * 
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function createUser(array $input): array
    {
        $email = isset($input['email']) ? strtolower(trim((string)$input['email'])) : '';
        $displayName = isset($input['display_name']) ? trim((string)$input['display_name']) : '';
        $password = isset($input['password']) ? (string)$input['password'] : '';
        $apps = isset($input['apps']) && is_array($input['apps']) ? $input['apps'] : [];

        // Validaciones básicas
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('El email proporcionado no es válido.');
        }
        if ($displayName === '') {
            throw new InvalidArgumentException('El nombre visible es requerido.');
        }
        if (strlen($password) < 8) {
            throw new InvalidArgumentException('La contraseña debe tener al menos 8 caracteres.');
        }
        if (empty($apps)) {
            throw new InvalidArgumentException('Debe asignar acceso a al menos una aplicación.');
        }

        $tenantId = TenantContext::getTenantId();

        // Verificar email duplicado en toda la base de datos
        if ($this->userRepo->emailExists($email)) {
            throw new InvalidArgumentException('El correo electrónico ya se encuentra registrado.');
        }

        // Validar roles y límites de plan para cada app a la que se solicita acceso
        foreach ($apps as $appId => $roleId) {
            $appIdStr = (string)$appId;
            $roleIdInt = (int)$roleId;

            // 1. Verificar si el rol existe en esa app
            $roleCheck = $this->pdo->prepare(
                "/* BYPASS_TENANT_SCOPE */ SELECT 1 FROM roles WHERE id = :rid AND app_id = :app AND is_active = 1 LIMIT 1"
            );
            $roleCheck->execute([':rid' => $roleIdInt, ':app' => $appIdStr]);
            if (!$roleCheck->fetch()) {
                throw new InvalidArgumentException("El rol seleccionado para la aplicación '{$appIdStr}' no es válido.");
            }

            // 2. Verificar cupo en el plan actual vía PlanAccessValidator
            $capacity = $this->planAccessValidator->checkUserCapacity($tenantId, $appIdStr);
            if (!$capacity['has_capacity']) {
                throw new RuntimeException(
                    "Se ha alcanzado el límite de usuarios permitidos para la aplicación '{$appIdStr}' en su plan actual ({$capacity['current_usage']}/{$capacity['limit_value']}).",
                    403
                );
            }
        }

        // Hashear password con Argon2id
        $passwordHash = password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536,
            'time_cost' => 4,
            'threads' => 3,
        ]);

        $newUserId = 0;

        // Ejecutar creación transaccional
        $this->pdo->beginTransaction();
        try {
            // 1. Insertar usuario base
            $newUserId = $this->userRepo->createUser([
                'tenant_id' => $tenantId,
                'email' => $email,
                'password_hash' => $passwordHash,
                'display_name' => $displayName,
                'is_super_admin' => 0,
                'is_active' => 1,
            ]);

            // 2. Asignar accesos, incrementar contadores y crear configuraciones básicas
            foreach ($apps as $appId => $roleId) {
                $appIdStr = (string)$appId;
                $roleIdInt = (int)$roleId;

                // Asignar rol
                $this->userRepo->assignRoleToApp($newUserId, $appIdStr, $roleIdInt);

                $this->usageTracker->increment($appIdStr, 'users_max', 1);

                // Guardar tema por defecto
                $themeJson = json_encode(['theme' => 'light']);
                $insertTheme = $this->pdo->prepare(
                    "INSERT INTO user_configs (user_id, app_id, theme_colors) /* BYPASS_TENANT_SCOPE */
                     VALUES (:uid, :app, :theme)
                     ON DUPLICATE KEY UPDATE theme_colors = VALUES(theme_colors)"
                );
                $insertTheme->execute([':uid' => $newUserId, ':app' => $appIdStr, ':theme' => $themeJson]);
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw new RuntimeException('Error al registrar el usuario: ' . $e->getMessage(), 500);
        }

        return [
            'success' => true,
            'id' => $newUserId,
            'message' => 'Usuario registrado con éxito en todas las aplicaciones solicitadas.',
        ];
    }

    /**
     * PUT /api/tenant-users/{id}
     * Actualiza un usuario del tenant y sus accesos
     * 
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function updateUser(int $id, array $input): array
    {
        $tenantId = TenantContext::getTenantId();
        $currentUserId = TenantContext::getUserId();

        // 1. Obtener usuario actual en la base de datos
        $userCheck = $this->pdo->prepare(
            "SELECT id, email, display_name, is_active FROM users WHERE id = :id AND tenant_id = :tid LIMIT 1"
        );
        $userCheck->execute([':id' => $id, ':tid' => $tenantId]);
        $user = $userCheck->fetch();

        if (!$user) {
            throw new RuntimeException('Usuario no encontrado.', 404);
        }

        $displayName = isset($input['display_name']) ? trim((string)$input['display_name']) : '';
        $isActive = isset($input['is_active']) ? (int)$input['is_active'] : -1;
        $appsInput = isset($input['apps']) && is_array($input['apps']) ? $input['apps'] : null;

        if ($displayName === '') {
            throw new InvalidArgumentException('El nombre visible es requerido.');
        }

        // Bloquear auto-desactivación del usuario que ejecuta la petición
        if ($id === $currentUserId && $isActive === 0) {
            throw new InvalidArgumentException('No puedes desactivar tu propio usuario administrador.');
        }

        // Obtener roles actuales del usuario
        $stmtCurrentRoles = $this->pdo->prepare(
            "/* BYPASS_TENANT_SCOPE */ SELECT app_id, role_id FROM user_roles WHERE user_id = :uid"
        );
        $stmtCurrentRoles->execute([':uid' => $id]);
        $currentRolesList = $stmtCurrentRoles->fetchAll();
        $currentRoles = [];
        foreach ($currentRolesList as $r) {
            $currentRoles[$r['app_id']] = (int)$r['role_id'];
        }

        $wasActive = (int)$user['is_active'] === 1;
        $willBeActive = $isActive !== -1 ? ($isActive === 1) : $wasActive;

        // Si se provee la lista de aplicaciones, evaluar cambios
        $appsToAssign = $appsInput !== null ? $appsInput : $currentRoles;

        if ($willBeActive && empty($appsToAssign)) {
            throw new InvalidArgumentException('El usuario activo debe poseer acceso a al menos una aplicación.');
        }

        // Validaciones de roles y límites para los accesos finales si el usuario estará activo
        if ($willBeActive) {
            foreach ($appsToAssign as $appId => $roleId) {
                $appIdStr = (string)$appId;
                $roleIdInt = (int)$roleId;

                // Validar rol
                $roleCheck = $this->pdo->prepare(
                    "/* BYPASS_TENANT_SCOPE */ SELECT 1 FROM roles WHERE id = :rid AND app_id = :app AND is_active = 1 LIMIT 1"
                );
                $roleCheck->execute([':rid' => $roleIdInt, ':app' => $appIdStr]);
                if (!$roleCheck->fetch()) {
                    throw new InvalidArgumentException("El rol seleccionado para la aplicación '{$appIdStr}' no es válido.");
                }

                // Si la app es nueva, o el usuario pasa de inactivo a activo, validar capacidad
                $isNewApp = !isset($currentRoles[$appIdStr]);
                $reActivating = !$wasActive;

                if ($isNewApp || $reActivating) {
                    $capacity = $this->planAccessValidator->checkUserCapacity($tenantId, $appIdStr);
                    if (!$capacity['has_capacity']) {
                        throw new RuntimeException(
                            "Se ha alcanzado el límite de usuarios permitidos para la aplicación '{$appIdStr}' en su plan actual ({$capacity['current_usage']}/{$capacity['limit_value']}).",
                            403
                        );
                    }
                }
            }
        }

        // Ejecutar actualización transaccional
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

            // 2. Gestionar cambios de roles y contadores de uso de plan
            if ($wasActive && !$willBeActive) {
                // De Activo a Inactivo: Descontar de todos los contadores de apps que tenía
                foreach ($currentRoles as $appIdStr => $roleIdInt) {
                    $this->usageTracker->decrement((string)$appIdStr, 'users_max', 1);
                }
            } 
            elseif (!$wasActive && $willBeActive) {
                // De Inactivo a Activo: Asignar nuevos roles y sumar a los contadores
                // Limpiar roles previos para evitar inconsistencias
                $stmtClear = $this->pdo->prepare("/* BYPASS_TENANT_SCOPE */ DELETE FROM user_roles WHERE user_id = :uid");
                $stmtClear->execute([':uid' => $id]);

                foreach ($appsToAssign as $appIdStr => $roleIdInt) {
                    $appIdStr = (string)$appIdStr;
                    $roleIdInt = (int)$roleIdInt;

                    $this->userRepo->assignRoleToApp($id, $appIdStr, $roleIdInt);

                    $this->usageTracker->increment((string)$appIdStr, 'users_max', 1);

                    // Guardar tema por defecto
                    $themeJson = json_encode(['theme' => 'light']);
                    $insertTheme = $this->pdo->prepare(
                        "INSERT INTO user_configs (user_id, app_id, theme_colors) /* BYPASS_TENANT_SCOPE */
                         VALUES (:uid, :app, :theme)
                         ON DUPLICATE KEY UPDATE theme_colors = VALUES(theme_colors)"
                    );
                    $insertTheme->execute([':uid' => $id, ':app' => $appIdStr, ':theme' => $themeJson]);
                }
            } 
            elseif ($appsInput !== null) {
                // Continuaba activo y se modificó la lista de apps
                
                // Determinar apps revocadas
                foreach ($currentRoles as $appIdStr => $roleIdInt) {
                    if (!isset($appsToAssign[$appIdStr])) {
                        // Eliminar asignación de rol
                        $stmtRevoke = $this->pdo->prepare(
                            "/* BYPASS_TENANT_SCOPE */ DELETE FROM user_roles WHERE user_id = :uid AND app_id = :app"
                        );
                        $stmtRevoke->execute([':uid' => $id, ':app' => $appIdStr]);

                        $this->usageTracker->decrement((string)$appIdStr, 'users_max', 1);
                    }
                }

                // Determinar apps añadidas o modificadas
                foreach ($appsToAssign as $appIdStr => $roleIdInt) {
                    $appIdStr = (string)$appIdStr;
                    $roleIdInt = (int)$roleIdInt;

                    $isNewApp = !isset($currentRoles[$appIdStr]);

                    // Asignar o actualizar rol
                    $this->userRepo->assignRoleToApp($id, $appIdStr, $roleIdInt);

                    if ($isNewApp) {
                        $this->usageTracker->increment((string)$appIdStr, 'users_max', 1);

                        // Configuración inicial de UI
                        $themeJson = json_encode(['theme' => 'light']);
                        $insertTheme = $this->pdo->prepare(
                            "INSERT INTO user_configs (user_id, app_id, theme_colors) /* BYPASS_TENANT_SCOPE */
                             VALUES (:uid, :app, :theme)
                             ON DUPLICATE KEY UPDATE theme_colors = VALUES(theme_colors)"
                        );
                        $insertTheme->execute([':uid' => $id, ':app' => $appIdStr, ':theme' => $themeJson]);
                    }
                }
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw new RuntimeException('Error al actualizar el usuario: ' . $e->getMessage(), 500);
        }

        return [
            'success' => true,
            'message' => 'Usuario actualizado con éxito en todas las aplicaciones.',
        ];
    }

    /**
     * DELETE /api/tenant-users/{id}
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

        // Verificar existencia del usuario en el tenant actual
        $userCheck = $this->pdo->prepare(
            "SELECT id, is_active FROM users WHERE id = :id AND tenant_id = :tid LIMIT 1"
        );
        $userCheck->execute([':id' => $id, ':tid' => $tenantId]);
        $user = $userCheck->fetch();

        if (!$user) {
            throw new RuntimeException('Usuario no encontrado.', 404);
        }

        // Obtener roles activos para el decremento de los contadores
        $stmtCurrentRoles = $this->pdo->prepare(
            "/* BYPASS_TENANT_SCOPE */ SELECT app_id FROM user_roles WHERE user_id = :uid"
        );
        $stmtCurrentRoles->execute([':uid' => $id]);
        $currentApps = $stmtCurrentRoles->fetchAll(PDO::FETCH_COLUMN);

        $this->pdo->beginTransaction();
        try {
            // Desactivación lógica global
            $stmt = $this->pdo->prepare(
                "UPDATE users SET is_active = 0 WHERE id = :id AND tenant_id = :tid"
            );
            $stmt->execute([':id' => $id, ':tid' => $tenantId]);

            // Decrementar uso en tenant_plan_usage si el usuario estaba activo
            if ((int)$user['is_active'] === 1) {
                foreach ($currentApps as $appIdStr) {
                    $this->usageTracker->decrement($appIdStr, 'users_max', 1);
                }
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
