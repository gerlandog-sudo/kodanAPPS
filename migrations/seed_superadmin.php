<?php
/**
 * Seed Super Admin - kodanAPPS
 * 
 * Crea:
 * 1. Planes iniciales (Free, Standard, Premium) con límites en plan_limits
 * 2. Tenant de control del sistema (is_system_tenant = TRUE, slug único)
 * 3. Usuario Super Admin por defecto (password Argon2id, email set-password token)
 * 
 * Uso: php migrations/seed_superadmin.php
 */

require_once __DIR__ . '/../apps/api/vendor/autoload.php';

use PDO;
use PDOException;

declare(strict_types=1);

// ============================================================
// Configuración (en producción: variables de entorno)
// ============================================================
$config = [
    'host' => $_ENV['DB_HOST'] ?? '127.0.0.1',
    'port' => (int)($_ENV['DB_PORT'] ?? 3306),
    'dbname' => $_ENV['DB_NAME'] ?? 'admkoda_BBDD_APPS',
    'user' => $_ENV['DB_USER'] ?? 'kodan_apps',
    'pass' => $_ENV['DB_PASS'] ?? 'secret',
    'charset' => 'utf8mb4',
];

$dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$config['charset']}";

try {
    $pdo = new PDO($dsn, $config['user'], $config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    echo "✅ Conexión BD exitosa\n";
} catch (PDOException $e) {
    die("❌ Error BD: " . $e->getMessage() . "\n");
}

// ============================================================
// Helpers
// ============================================================
function generateSlug(string $base): string {
    return strtolower(trim(preg_replace('/[^a-z0-9-]/', '-', $base), '-')) . '-' . bin2hex(random_bytes(4));
}

function generatePassword(int $length = 16): string {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    $bytes = random_bytes($length);
    $password = '';
    for ($i = 0; $i < $length; $i++) {
        $password .= $chars[$bytes[$i] % strlen($chars)];
    }
    return $password;
}

function createPasswordResetToken(PDO $pdo, string $email, string $token): void {
    $tokenHash = password_hash($token, PASSWORD_ARGON2ID, ['memory_cost' => 65536, 'time_cost' => 4, 'threads' => 3]);
    $expiresAt = (new DateTime())->modify('+1 hour')->format('Y-m-d H:i:s');
    
    $stmt = $pdo->prepare("
        INSERT INTO `password_resets` (`email`, `token_hash`, `expires_at`)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE `token_hash` = VALUES(`token_hash`), `expires_at` = VALUES(`expires_at`), `created_at` = CURRENT_TIMESTAMP()
    ");
    $stmt->execute([$email, $tokenHash, $expiresAt]);
}

// ============================================================
// Transacción Principal
// ============================================================
$pdo->beginTransaction();

try {
    // ------------------------------------------------------------
    // 1. Planes de Suscripción
    // ------------------------------------------------------------
    $plans = [
        ['name' => 'Free', 'description' => 'Plan gratuito para pruebas', 'price' => 0.00, 'currency' => 'USD'],
        ['name' => 'Standard', 'description' => 'Plan estándar para PYMES', 'price' => 49.00, 'currency' => 'USD'],
        ['name' => 'Premium', 'description' => 'Plan completo para empresas', 'price' => 149.00, 'currency' => 'USD'],
    ];

    $planIds = [];
    foreach ($plans as $plan) {
        $stmt = $pdo->prepare("
            INSERT INTO `subscription_plans` (`name`, `description`, `price`, `currency`)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `price` = VALUES(`price`), `currency` = VALUES(`currency`)
        ");
        $stmt->execute([$plan['name'], $plan['description'], $plan['price'], $plan['currency']]);
        $planIds[$plan['name']] = $pdo->lastInsertId() ?: (int)$pdo->query("SELECT id FROM subscription_plans WHERE name = '{$plan['name']}'")->fetchColumn();
        echo "✅ Plan creado: {$plan['name']} (ID: {$planIds[$plan['name']]})\n";
    }

    // ------------------------------------------------------------
    // 2. Límites por Plan (plan_limits)
    // ------------------------------------------------------------
    $limits = [
        // Free
        ['plan' => 'Free', 'module' => 'crm', 'metric' => 'pipelines_max', 'value' => 2],
        ['plan' => 'Free', 'module' => 'crm', 'metric' => 'users_max', 'value' => 3],
        ['plan' => 'Free', 'module' => 'tracker', 'metric' => 'projects_max', 'value' => 5],
        ['plan' => 'Free', 'module' => 'tracker', 'metric' => 'users_max', 'value' => 3],
        ['plan' => 'Free', 'module' => 'api', 'metric' => 'api_calls_month', 'value' => 10000],
        // Standard
        ['plan' => 'Standard', 'module' => 'crm', 'metric' => 'pipelines_max', 'value' => 10],
        ['plan' => 'Standard', 'module' => 'crm', 'metric' => 'users_max', 'value' => 25],
        ['plan' => 'Standard', 'module' => 'tracker', 'metric' => 'projects_max', 'value' => 50],
        ['plan' => 'Standard', 'module' => 'tracker', 'metric' => 'users_max', 'value' => 25],
        ['plan' => 'Standard', 'module' => 'api', 'metric' => 'api_calls_month', 'value' => 100000],
        // Premium
        ['plan' => 'Premium', 'module' => 'crm', 'metric' => 'pipelines_max', 'value' => 0], // ilimitado
        ['plan' => 'Premium', 'module' => 'crm', 'metric' => 'users_max', 'value' => 0],
        ['plan' => 'Premium', 'module' => 'tracker', 'metric' => 'projects_max', 'value' => 0],
        ['plan' => 'Premium', 'module' => 'tracker', 'metric' => 'users_max', 'value' => 0],
        ['plan' => 'Premium', 'module' => 'api', 'metric' => 'api_calls_month', 'value' => 0],
    ];

    foreach ($limits as $limit) {
        $stmt = $pdo->prepare("
            INSERT INTO `plan_limits` (`plan_id`, `module`, `metric`, `value`)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)
        ");
        $stmt->execute([$planIds[$limit['plan']], $limit['module'], $limit['metric'], $limit['value']]);
    }
    echo "✅ Límites de planes insertados\n";

    // ------------------------------------------------------------
    // 3. Tenant de Sistema (System Admin)
    // ------------------------------------------------------------
    $systemSlug = 'sys-admin-' . bin2hex(random_bytes(6)); // ej: sys-admin-a1b2c3d4
    $systemName = 'Kodan Software (Sistema)';

    $stmt = $pdo->prepare("
        INSERT INTO `tenants` (`slug`, `name`, `subscription_plan_id`, `is_active`, `is_system_tenant`)
        VALUES (?, ?, ?, 1, 1)
        ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `subscription_plan_id` = VALUES(`subscription_plan_id`)
    ");
    $stmt->execute([$systemSlug, $systemName, $planIds['Premium']]);
    $systemTenantId = $pdo->lastInsertId() ?: (int)$pdo->query("SELECT tenant_id FROM tenants WHERE slug = '$systemSlug'")->fetchColumn();
    echo "✅ Tenant de sistema creado: $systemSlug (ID: $systemTenantId, is_system_tenant=1)\n";

    // Apps habilitadas para tenant sistema
    foreach (['crm', 'tracker', 'superadmin'] as $app) {
        $stmt = $pdo->prepare("
            INSERT INTO `tenant_apps` (`tenant_id`, `app_id`, `is_active`)
            VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE `is_active` = 1
        ");
        $stmt->execute([$systemTenantId, $app]);
    }
    echo "✅ Apps habilitadas para tenant sistema: crm, tracker, superadmin\n";

    // Inicializar tenant_plan_usage para tenant sistema (contadores a 0)
    $stmt = $pdo->prepare("
        INSERT INTO `tenant_plan_usage` (`tenant_id`, `module`, `metric`, `current_value`)
        SELECT ?, pl.`module`, pl.`metric`, 0
        FROM `plan_limits` pl WHERE pl.`plan_id` = ?
        ON DUPLICATE KEY UPDATE `current_value` = 0
    ");
    $stmt->execute([$systemTenantId, $planIds['Premium']]);
    echo "✅ Contadores de uso inicializados para tenant sistema\n";

    // ------------------------------------------------------------
    // 4. Usuario Super Admin
    // ------------------------------------------------------------
    $superAdminEmail = 'superadmin@kodan.software';
    $superAdminName = 'Super Administrador';
    $tempPassword = generatePassword(20); // Password temporal, se cambia via set-password
    $passwordHash = password_hash($tempPassword, PASSWORD_ARGON2ID, ['memory_cost' => 65536, 'time_cost' => 4, 'threads' => 3]);

    $stmt = $pdo->prepare("
        INSERT INTO `users` (`tenant_id`, `email`, `password_hash`, `display_name`, `is_super_admin`, `is_active`)
        VALUES (?, ?, ?, ?, 1, 1)
        ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `display_name` = VALUES(`display_name`), `is_super_admin` = 1
    ");
    $stmt->execute([$systemTenantId, $superAdminEmail, $passwordHash, $superAdminName]);
    $superAdminId = $pdo->lastInsertId() ?: (int)$pdo->query("SELECT id FROM users WHERE email = '$superAdminEmail'")->fetchColumn();
    echo "✅ Super Admin creado: $superAdminEmail (ID: $superAdminId)\n";

    // Roles en todas las apps (incluye superadmin)
    foreach (['crm' => 'admin', 'tracker' => 'admin', 'superadmin' => 'admin'] as $app => $role) {
        $stmt = $pdo->prepare("
            INSERT INTO `user_apps` (`user_id`, `app_id`, `role`, `is_active`)
            VALUES (?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE `role` = VALUES(`role`), `is_active` = 1
        ");
        $stmt->execute([$superAdminId, $app, $role]);
    }
    echo "✅ Roles asignados: admin en crm, tracker, superadmin\n";

    // Configuración de tema por defecto
    $stmt = $pdo->prepare("
        INSERT INTO `user_configs` (`user_id`, `app_id`, `theme_colors`)
        VALUES (?, 'superadmin', '{\"theme\": \"dark\"}')
        ON DUPLICATE KEY UPDATE `theme_colors` = VALUES(`theme_colors`)
    ");
    $stmt->execute([$superAdminId]);
    echo "✅ Configuración tema guardada (dark)\n";

    // ------------------------------------------------------------
    // 5. Token Set-Password para Super Admin (enviar por email)
    // ------------------------------------------------------------
    $setPasswordToken = bin2hex(random_bytes(32)); // 64 chars hex
    createPasswordResetToken($pdo, $superAdminEmail, $setPasswordToken);
    echo "✅ Token set-password generado\n";

    $pdo->commit();

    // ============================================================
    // Resumen Final
    // ============================================================
    echo "\n";
    echo str_repeat('=', 60) . "\n";
    echo "🎉 SEED COMPLETADO EXITOSAMENTE\n";
    echo str_repeat('=', 60) . "\n";
    echo "📋 RESUMEN:\n";
    echo "  Tenant Sistema: $systemSlug (ID: $systemTenantId)\n";
    echo "  Super Admin: $superAdminEmail (ID: $superAdminId)\n";
    echo "  Password temporal: $tempPassword\n";
    echo "  Set-Password Token: $setPasswordToken\n";
    echo "  Set-Password URL: https://superadmin.kodan.software/set-password?token=$setPasswordToken&email=" . urlencode($superAdminEmail) . "\n";
    echo "\n";
    echo "⚠️  IMPORTANTE:\n";
    echo "  1. Guardar el token set-password en lugar seguro\n";
    echo "  2. Enviar email al superadmin con link de activación\n";
    echo "  3. El password temporal SOLO sirve para primer login si se saltea set-password\n";
    echo "  4. Agregar a .env: SYSTEM_TENANT_ID=$systemTenantId\n";
    echo str_repeat('=', 60) . "\n";

} catch (Throwable $e) {
    $pdo->rollBack();
    die("❌ ERROR EN SEED: " . $e->getMessage() . "\nTrace: " . $e->getTraceAsString() . "\n");
}