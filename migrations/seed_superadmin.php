<?php
declare(strict_types=1);

/**
 * Seed Super Admin - kodanAPPS
 * 
 * Crea:
 * 1. Planes iniciales (Free, Standard, Premium) con límites en plan_limits
 * 2. Tenant de control del sistema (is_system_tenant = TRUE)
 * 3. Usuario Super Admin por defecto (password Argon2id)
 * 
 * Uso: php migrations/seed_superadmin.php
 */

if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
} else {
    require_once __DIR__ . '/../apps/api/vendor/autoload.php';
}

use PDO;
use PDOException;

// ============================================================
// Configuración (en producción: variables de entorno)
// ============================================================
$envPath = file_exists(__DIR__ . '/../.env') ? __DIR__ . '/../.env' : __DIR__ . '/../apps/api/.env';
$dotenv = [];
if (file_exists($envPath)) {
    $dotenv = parse_ini_file($envPath) ?: [];
}

$config = [
    'host' => getenv('DB_HOST') ?: ($dotenv['DB_HOST'] ?? $_ENV['DB_HOST'] ?? '127.0.0.1'),
    'port' => (int)(getenv('DB_PORT') ?: ($dotenv['DB_PORT'] ?? $_ENV['DB_PORT'] ?? 3306)),
    'dbname' => getenv('DB_NAME') ?: ($dotenv['DB_NAME'] ?? $_ENV['DB_NAME'] ?? 'admkoda_BBDD_APPS'),
    'user' => getenv('DB_USER') ?: ($dotenv['DB_USER'] ?? $_ENV['DB_USER'] ?? 'kodan_apps'),
    'pass' => getenv('DB_PASS') ?: ($dotenv['DB_PASS'] ?? $_ENV['DB_PASS'] ?? 'secret'),
    'charset' => 'utf8mb4',
];

$dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$config['charset']}";

try {
    try {
        $pdo = new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        if ($config['host'] === 'mariadb') {
            echo "⚠️ Failed to connect to 'mariadb', trying fallback to '127.0.0.1'...\n";
            $config['host'] = '127.0.0.1';
            $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$config['charset']}";
            $pdo = new PDO($dsn, $config['user'], $config['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } else {
            throw $e;
        }
    }
    echo "✅ Conexión BD exitosa\n";
} catch (PDOException $e) {
    die("❌ Error BD: " . $e->getMessage() . "\n");
}

// ============================================================
// Helpers
// ============================================================
function generatePassword(int $length = 16): string {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    $bytes = random_bytes($length);
    $password = '';
    for ($i = 0; $i < $length; $i++) {
        $password .= $chars[ord($bytes[$i]) % strlen($chars)];
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
        // Buscar si ya existe por nombre
        $existing = $pdo->prepare("SELECT id FROM subscription_plans WHERE name = ?");
        $existing->execute([$plan['name']]);
        $row = $existing->fetch();
        if ($row) {
            $planIds[$plan['name']] = (int)$row['id'];
            $stmt = $pdo->prepare("UPDATE subscription_plans SET description = ?, price = ?, currency = ? WHERE id = ?");
            $stmt->execute([$plan['description'], $plan['price'], $plan['currency'], $row['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO subscription_plans (`name`, `description`, `price`, `currency`) VALUES (?, ?, ?, ?)");
            $stmt->execute([$plan['name'], $plan['description'], $plan['price'], $plan['currency']]);
            $planIds[$plan['name']] = (int)$pdo->lastInsertId();
        }
        echo "✅ Plan: {$plan['name']} (ID: {$planIds[$plan['name']]})\n";
    }

    // ------------------------------------------------------------
    // 2. Límites por Plan (plan_limits)
    // ------------------------------------------------------------
    $limits = [
        ['plan' => 'Free', 'module' => 'crm', 'metric' => 'users_max', 'value' => 10],
        ['plan' => 'Free', 'module' => 'crm', 'metric' => 'negotiations_max', 'value' => 20],
        ['plan' => 'Free', 'module' => 'crm', 'metric' => 'api_calls_month', 'value' => 5000],
        ['plan' => 'Free', 'module' => 'tracker', 'metric' => 'users_max', 'value' => 10],
        ['plan' => 'Free', 'module' => 'tracker', 'metric' => 'tasks_max', 'value' => 50],
        ['plan' => 'Free', 'module' => 'tracker', 'metric' => 'api_calls_month', 'value' => 5000],
        ['plan' => 'Standard', 'module' => 'crm', 'metric' => 'users_max', 'value' => 50],
        ['plan' => 'Standard', 'module' => 'crm', 'metric' => 'negotiations_max', 'value' => 100],
        ['plan' => 'Standard', 'module' => 'crm', 'metric' => 'api_calls_month', 'value' => 50000],
        ['plan' => 'Standard', 'module' => 'tracker', 'metric' => 'users_max', 'value' => 50],
        ['plan' => 'Standard', 'module' => 'tracker', 'metric' => 'tasks_max', 'value' => 500],
        ['plan' => 'Standard', 'module' => 'tracker', 'metric' => 'api_calls_month', 'value' => 50000],
        ['plan' => 'Premium', 'module' => 'crm', 'metric' => 'users_max', 'value' => 0],
        ['plan' => 'Premium', 'module' => 'crm', 'metric' => 'negotiations_max', 'value' => 0],
        ['plan' => 'Premium', 'module' => 'crm', 'metric' => 'api_calls_month', 'value' => 0],
        ['plan' => 'Premium', 'module' => 'tracker', 'metric' => 'users_max', 'value' => 0],
        ['plan' => 'Premium', 'module' => 'tracker', 'metric' => 'tasks_max', 'value' => 0],
        ['plan' => 'Premium', 'module' => 'tracker', 'metric' => 'api_calls_month', 'value' => 0],
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
    $systemName = 'Kodan Software (Sistema)';

    $existingTenant = $pdo->prepare("SELECT tenant_id FROM tenants WHERE is_system_tenant = 1");
    $existingTenant->execute();
    $tenantRow = $existingTenant->fetch();
    if ($tenantRow) {
        $systemTenantId = (int)$tenantRow['tenant_id'];
        $stmt = $pdo->prepare("UPDATE tenants SET name = ?, subscription_plan_id = ? WHERE tenant_id = ?");
        $stmt->execute([$systemName, $planIds['Premium'], $systemTenantId]);
    } else {
        $stmt = $pdo->prepare("INSERT INTO `tenants` (`name`, `subscription_plan_id`, `is_active`, `is_system_tenant`) VALUES (?, ?, 1, 1)");
        $stmt->execute([$systemName, $planIds['Premium']]);
        $systemTenantId = (int)$pdo->lastInsertId();
    }
    echo "✅ Tenant de sistema creado: $systemName (ID: $systemTenantId, is_system_tenant=1)\n";

    echo "✅ Acceso por plan (plan_limits) — no requiere tenant_apps\n";

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
    // NOTA: Si el usuario ya existe, NO se sobrescribe el password_hash
    // ------------------------------------------------------------
    $superAdminEmail = 'superadmin@kodan.software';
    $superAdminName = 'Super Administrador';
    $defaultPassword = 'SuperSecure123!';
    $passwordHash = password_hash($defaultPassword, PASSWORD_ARGON2ID, ['memory_cost' => 65536, 'time_cost' => 4, 'threads' => 3]);

    $existingUser = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $existingUser->execute([$superAdminEmail]);
    $userRow = $existingUser->fetch();
    if ($userRow) {
        $superAdminId = (int)$userRow['id'];
        $stmt = $pdo->prepare("UPDATE users SET tenant_id = ? WHERE id = ?");
        $stmt->execute([$systemTenantId, $superAdminId]);
        echo "✅ Super Admin actualizado: $superAdminEmail (ID: $superAdminId)\n";
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO `users` (`tenant_id`, `email`, `password_hash`, `display_name`, `is_super_admin`, `is_active`)
            VALUES (?, ?, ?, ?, 1, 1)
        ");
        $stmt->execute([$systemTenantId, $superAdminEmail, $passwordHash, $superAdminName]);
        $superAdminId = (int)$pdo->lastInsertId();
        echo "✅ Super Admin creado: $superAdminEmail (ID: $superAdminId)\n";
    }

    echo "✅ Super Admin accede solo al panel superadmin — no requiere roles en apps\n";

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
    $setPasswordToken = bin2hex(random_bytes(32));
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
    echo "  Tenant Sistema: $systemName (ID: $systemTenantId)\n";
    echo "  Super Admin: $superAdminEmail (ID: $superAdminId)\n";
    echo "  Password por defecto: $defaultPassword\n";
    echo "  Set-Password Token: $setPasswordToken\n";
    echo "  Set-Password URL: https://superadmin.kodan.software/set-password?token=$setPasswordToken&email=" . urlencode($superAdminEmail) . "\n";
    echo "\n";
    echo "⚠️  IMPORTANTE:\n";
    echo "  1. Guardar el token set-password en lugar seguro\n";
    echo "  2. Enviar email al superadmin con link de activación\n";
    echo "  3. El password por defecto es: $defaultPassword\n";
    echo "  4. Si el usuario ya existe, NO se sobrescribe el password\n";
    echo "  5. Agregar a .env: SYSTEM_TENANT_ID=$systemTenantId\n";
    echo str_repeat('=', 60) . "\n";

} catch (Throwable $e) {
    $pdo->rollBack();
    die("❌ ERROR EN SEED: " . $e->getMessage() . "\nTrace: " . $e->getTraceAsString() . "\n");
}
