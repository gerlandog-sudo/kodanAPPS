<?php
declare(strict_types=1);

/**
 * Seed CRM - kodanCRM
 * 
 * Crea:
 * 1. Definiciones globales de Apps y Roles (si faltaran)
 * 2. Un Tenant de prueba (Empresa Demo CRM) con plan Premium/Standard
 * 3. Un usuario comercial (comercial@kodan.software / Comercial123!) asignado al tenant y a la app crm
 * 4. Datos de prueba: Cuentas, Contactos, Productos, Pipelines, Etapas, Oportunidades, Cotizaciones y Tareas
 * 
 * Uso: php migrations/seed_crm.php
 */

if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
} else {
    require_once __DIR__ . '/../apps/api/vendor/autoload.php';
}

use PDO;
use PDOException;

// ============================================================
// Configuración de conexión
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

$pdo->beginTransaction();

try {
    // ------------------------------------------------------------
    // 1. Asegurar Apps Globales
    // ------------------------------------------------------------
    $apps = [
        ['app_id' => 'crm', 'name' => 'kodanCRM', 'description' => 'Customer Relationship Management'],
        ['app_id' => 'tracker', 'name' => 'kodanTracker', 'description' => 'Time Tracking & Project Management']
    ];

    foreach ($apps as $app) {
        $stmt = $pdo->prepare("
            INSERT INTO `apps` (`app_id`, `name`, `description`) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`)
        ");
        $stmt->execute([$app['app_id'], $app['name'], $app['description']]);
    }
    echo "✅ Apps registradas en catálogo\n";

    // ------------------------------------------------------------
    // 2. Asegurar Roles Globales
    // ------------------------------------------------------------
    $roles = [
        ['app_id' => 'crm', 'name' => 'admin', 'description' => 'Acceso completo CRM'],
        ['app_id' => 'crm', 'name' => 'pm', 'description' => 'Gestor de proyectos CRM'],
        ['app_id' => 'crm', 'name' => 'commercial', 'description' => 'Ventas y gestión de pipelines'],
        ['app_id' => 'crm', 'name' => 'staff', 'description' => 'Acceso solo lectura CRM'],
        ['app_id' => 'crm', 'name' => 'viewer', 'description' => 'Acceso externo solo lectura'],
        ['app_id' => 'tracker', 'name' => 'admin', 'description' => 'Acceso completo Tracker'],
        ['app_id' => 'tracker', 'name' => 'pm', 'description' => 'Gestor de proyectos Tracker'],
        ['app_id' => 'tracker', 'name' => 'commercial', 'description' => 'Comercial Tracker'],
        ['app_id' => 'tracker', 'name' => 'staff', 'description' => 'Miembro del equipo, imputación de horas'],
        ['app_id' => 'tracker', 'name' => 'viewer', 'description' => 'Acceso externo solo lectura'],
    ];

    $roleIds = [];
    foreach ($roles as $role) {
        $stmt = $pdo->prepare("
            INSERT INTO `roles` (`app_id`, `name`, `description`) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE `description` = VALUES(`description`)
        ");
        $stmt->execute([$role['app_id'], $role['name'], $role['description']]);
        
        // Obtener el ID
        $getRole = $pdo->prepare("SELECT id FROM roles WHERE app_id = ? AND name = ?");
        $getRole->execute([$role['app_id'], $role['name']]);
        $roleIds[$role['app_id'] . '_' . $role['name']] = (int)$getRole->fetchColumn();
    }
    echo "✅ Roles registrados en catálogo\n";

    // ------------------------------------------------------------
    // 3. Crear/Verificar Tenant de Prueba
    // ------------------------------------------------------------
    // Buscar si ya existe el plan Premium o Standard
    $planStmt = $pdo->prepare("SELECT id FROM subscription_plans WHERE name = 'Premium'");
    $planStmt->execute();
    $planId = $planStmt->fetchColumn();
    if (!$planId) {
        $planStmt = $pdo->prepare("SELECT id FROM subscription_plans WHERE name = 'Standard'");
        $planStmt->execute();
        $planId = $planStmt->fetchColumn() ?: 1; // Fallback al ID 1 si no hay planes
    }
    $planId = (int)$planId;

    // Buscar si existe el tenant 'Pruebas' o el tenant ID 12
    $tenantStmt = $pdo->prepare("SELECT tenant_id, name FROM tenants WHERE tenant_id = 12 OR name = 'Pruebas' OR name = 'Kodan Enterprise Demo (CRM)' LIMIT 1");
    $tenantStmt->execute();
    $existingTenant = $tenantStmt->fetch();

    if ($existingTenant) {
        $tenantId = (int)$existingTenant['tenant_id'];
        $tenantName = $existingTenant['name'];
        echo "✅ Tenant de pruebas seleccionado: $tenantName (ID: $tenantId)\n";
    } else {
        $tenantName = 'Pruebas';
        $stmt = $pdo->prepare("INSERT INTO `tenants` (`name`, `subscription_plan_id`, `is_active`, `is_system_tenant`) VALUES (?, ?, 1, 0)");
        $stmt->execute([$tenantName, $planId]);
        $tenantId = (int)$pdo->lastInsertId();
        echo "✅ Tenant creado: $tenantName (ID: $tenantId)\n";
    }

    // Inicializar límites para el tenant de prueba en tenant_plan_usage
    $stmt = $pdo->prepare("
        INSERT INTO `tenant_plan_usage` (`tenant_id`, `module`, `metric`, `current_value`)
        SELECT ?, pl.`module`, pl.`metric`, 0
        FROM `plan_limits` pl WHERE pl.`plan_id` = ?
        ON DUPLICATE KEY UPDATE `current_value` = `current_value`
    ");
    $stmt->execute([$tenantId, $planId]);

    // ------------------------------------------------------------
    // 4. Crear/Verificar Usuario de Prueba
    // ------------------------------------------------------------
    $commercialPass = 'Admin123!';
    $passwordHash = password_hash($commercialPass, PASSWORD_ARGON2ID, [
        'memory_cost' => 65536,
        'time_cost' => 4,
        'threads' => 3
    ]);

    // Buscar si existe admin@pruebas.com o comercial@kodan.software
    $userStmt = $pdo->prepare("SELECT id, email, display_name FROM users WHERE email = 'admin@pruebas.com' OR email = 'comercial@kodan.software' ORDER BY (email = 'admin@pruebas.com') DESC LIMIT 1");
    $userStmt->execute();
    $existingUser = $userStmt->fetch();

    if ($existingUser) {
        $userId = (int)$existingUser['id'];
        $commercialEmail = $existingUser['email'];
        $commercialName = $existingUser['display_name'];
        
        // Forzar actualización de tenant y hash para asegurar acceso en test
        $stmt = $pdo->prepare("UPDATE users SET tenant_id = ?, password_hash = ?, is_active = 1 WHERE id = ?");
        $stmt->execute([$tenantId, $passwordHash, $userId]);
        echo "✅ Usuario de pruebas seleccionado y actualizado: $commercialEmail (ID: $userId)\n";
    } else {
        $commercialEmail = 'admin@pruebas.com';
        $commercialName = 'Admin Pruebas';
        $stmt = $pdo->prepare("
            INSERT INTO `users` (`tenant_id`, `email`, `password_hash`, `display_name`, `is_super_admin`, `is_active`)
            VALUES (?, ?, ?, ?, 0, 1)
        ");
        $stmt->execute([$tenantId, $commercialEmail, $passwordHash, $commercialName]);
        $userId = (int)$pdo->lastInsertId();
        echo "✅ Usuario de pruebas creado: $commercialEmail (ID: $userId)\n";
    }

    // ------------------------------------------------------------
    // 5. Asignar Roles de CRM y Tracker
    // ------------------------------------------------------------
    // Rol CRM Admin/Commercial
    $stmt = $pdo->prepare("
        INSERT INTO `user_roles` (`user_id`, `app_id`, `role_id`, `assigned_by`) 
        VALUES (?, 'crm', ?, NULL)
        ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`)
    ");
    $stmt->execute([$userId, $roleIds['crm_admin']]);

    // Rol Tracker Admin (para ver integración)
    $stmt = $pdo->prepare("
        INSERT INTO `user_roles` (`user_id`, `app_id`, `role_id`, `assigned_by`) 
        VALUES (?, 'tracker', ?, NULL)
        ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`)
    ");
    $stmt->execute([$userId, $roleIds['tracker_admin']]);
    echo "✅ Roles CRM Admin y Tracker Admin asignados al usuario\n";

    // Configuración de tema por defecto para el usuario
    $stmt = $pdo->prepare("
        INSERT INTO `user_configs` (`user_id`, `app_id`, `theme_colors`)
        VALUES (?, 'crm', '{\"theme\": \"light\"}')
        ON DUPLICATE KEY UPDATE `theme_colors` = VALUES(`theme_colors`)
    ");
    $stmt->execute([$userId]);

    // ------------------------------------------------------------
    // 6. Limpieza / Re-inserción controlada de datos de negocio
    // Para que las pruebas sean limpias, podemos eliminar los datos previos de este tenant.
    // ------------------------------------------------------------
    // Debido a cascadas y FK, procedemos a borrar selectivamente.
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("DELETE FROM `opportunity_line_items` WHERE opportunity_id IN (SELECT id FROM opportunities WHERE tenant_id = $tenantId)");
    $pdo->exec("DELETE FROM `quote_line_items` WHERE quote_id IN (SELECT id FROM quotes WHERE tenant_id = $tenantId)");
    $pdo->exec("DELETE FROM `quotes` WHERE tenant_id = $tenantId");
    $pdo->exec("DELETE FROM `tasks` WHERE tenant_id = $tenantId");
    $pdo->exec("DELETE FROM `messages` WHERE tenant_id = $tenantId");
    $pdo->exec("DELETE FROM `message_threads` WHERE tenant_id = $tenantId");
    $pdo->exec("DELETE FROM `opportunities` WHERE tenant_id = $tenantId");
    $pdo->exec("DELETE FROM `pipeline_stages` WHERE pipeline_id IN (SELECT id FROM pipelines WHERE tenant_id = $tenantId)");
    $pdo->exec("DELETE FROM `pipelines` WHERE tenant_id = $tenantId");
    $pdo->exec("DELETE FROM `contacts` WHERE tenant_id = $tenantId");
    $pdo->exec("DELETE FROM `accounts` WHERE tenant_id = $tenantId");
    $pdo->exec("DELETE FROM `products` WHERE tenant_id = $tenantId");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo "🧹 Limpieza de datos antiguos completada para el Tenant $tenantId\n";

    // ------------------------------------------------------------
    // 7. Insertar Catálogo de Productos
    // ------------------------------------------------------------
    $products = [
        ['name' => 'Licencia Enterprise SaaS (Anual)', 'sku' => 'LIC-ENT-001', 'price' => 150.00],
        ['name' => 'Setup & Onboarding Express', 'sku' => 'SRV-SET-001', 'price' => 1500.00],
        ['name' => 'Soporte 24/7 SLA Premium (Mensual)', 'sku' => 'SRV-SUP-001', 'price' => 250.00],
        ['name' => 'Consultoría de Negocios (Hora)', 'sku' => 'SRV-CON-001', 'price' => 120.00],
    ];

    $productIds = [];
    foreach ($products as $prod) {
        $stmt = $pdo->prepare("INSERT INTO `products` (`tenant_id`, `name`, `sku`, `price`) VALUES (?, ?, ?, ?)");
        $stmt->execute([$tenantId, $prod['name'], $prod['sku'], $prod['price']]);
        $productIds[$prod['sku']] = (int)$pdo->lastInsertId();
    }
    echo "✅ 4 Productos insertados\n";

    // ------------------------------------------------------------
    // 8. Insertar Cuentas B2B (Clientes Potenciales/Empresas)
    // ------------------------------------------------------------
    $accounts = [
        ['name' => 'Acme Corporation Inc', 'legal_name' => 'Acme Corp S.A. de C.V.', 'tax_id' => 'RFC-ACM850101-1A1', 'website' => 'https://acme.com', 'phone' => '+1 (555) 123-4567', 'address' => '123 Industrial Blvd, Suite 400, Austin, TX', 'custom_fields' => '{}'],
        ['name' => 'Globex Corporation', 'legal_name' => 'Globex Holdings Ltd.', 'tax_id' => 'TAX-GBX990214-X32', 'website' => 'https://globex.com', 'phone' => '+1 (555) 987-6543', 'address' => '456 Cypress Ave, Silicon Valley, CA', 'custom_fields' => '{}'],
        ['name' => 'Initech LLC', 'legal_name' => 'Initech Software Systems', 'tax_id' => 'TAX-INI010417-AA9', 'website' => 'https://initech.com', 'phone' => '+1 (555) 234-5678', 'address' => '789 Office Park Road, Boulder, CO', 'custom_fields' => '{}'],
    ];

    $accountIds = [];
    foreach ($accounts as $acc) {
        $stmt = $pdo->prepare("
            INSERT INTO `accounts` (`tenant_id`, `name`, `legal_name`, `tax_id`, `website`, `phone`, `address`, `custom_fields`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$tenantId, $acc['name'], $acc['legal_name'], $acc['tax_id'], $acc['website'], $acc['phone'], $acc['address'], $acc['custom_fields']]);
        $accountIds[$acc['name']] = (int)$pdo->lastInsertId();
    }
    echo "✅ 3 Cuentas B2B creadas\n";

    // ------------------------------------------------------------
    // 9. Insertar Contactos
    // ------------------------------------------------------------
    $contacts = [
        ['account' => 'Acme Corporation Inc', 'first_name' => 'John', 'last_name' => 'Doe', 'email' => 'jdoe@acme.com', 'phone' => '+1 (555) 123-0001', 'mobile' => '+1 (555) 999-0001', 'custom_fields' => '{}'],
        ['account' => 'Acme Corporation Inc', 'first_name' => 'Sarah', 'last_name' => 'Connor', 'email' => 'sconnor@acme.com', 'phone' => '+1 (555) 123-0002', 'mobile' => '+1 (555) 999-0002', 'custom_fields' => '{}'],
        ['account' => 'Globex Corporation', 'first_name' => 'Hank', 'last_name' => 'Scorpio', 'email' => 'hscorpio@globex.com', 'phone' => '+1 (555) 987-0001', 'mobile' => '+1 (555) 999-0003', 'custom_fields' => '{}'],
        ['account' => 'Initech LLC', 'first_name' => 'Peter', 'last_name' => 'Gibbons', 'email' => 'pgibbons@initech.com', 'phone' => '+1 (555) 234-0001', 'mobile' => '+1 (555) 999-0004', 'custom_fields' => '{}'],
    ];

    $contactIds = [];
    foreach ($contacts as $cnt) {
        $accId = $accountIds[$cnt['account']] ?? null;
        $stmt = $pdo->prepare("
            INSERT INTO `contacts` (`tenant_id`, `account_id`, `first_name`, `last_name`, `email`, `phone`, `mobile`, `custom_fields`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$tenantId, $accId, $cnt['first_name'], $cnt['last_name'], $cnt['email'], $cnt['phone'], $cnt['mobile'], $cnt['custom_fields']]);
        $contactIds[$cnt['first_name'] . ' ' . $cnt['last_name']] = (int)$pdo->lastInsertId();
    }
    echo "✅ 4 Contactos creados\n";

    // ------------------------------------------------------------
    // 10. Pipeline y Etapas de Ventas
    // ------------------------------------------------------------
    $stmt = $pdo->prepare("INSERT INTO `pipelines` (`tenant_id`, `name`, `is_default`) VALUES (?, 'Embudo de Ventas IT', 1)");
    $stmt->execute([$tenantId]);
    $pipelineId = (int)$pdo->lastInsertId();

    $stages = [
        ['name' => 'Contacto Inicial', 'color_hex' => '#3B82F6', 'sort_order' => 10, 'is_won_stage' => 0],
        ['name' => 'Calificación', 'color_hex' => '#6366F1', 'sort_order' => 20, 'is_won_stage' => 0],
        ['name' => 'Propuesta Enviada', 'color_hex' => '#F59E0B', 'sort_order' => 30, 'is_won_stage' => 0],
        ['name' => 'Negociación', 'color_hex' => '#EC4899', 'sort_order' => 40, 'is_won_stage' => 0],
        ['name' => 'Ganada (Cerrada)', 'color_hex' => '#10B981', 'sort_order' => 50, 'is_won_stage' => 1],
        ['name' => 'Perdida (Cerrada)', 'color_hex' => '#EF4444', 'sort_order' => 60, 'is_won_stage' => 0],
    ];

    $stageIds = [];
    foreach ($stages as $stg) {
        $stmt = $pdo->prepare("
            INSERT INTO `pipeline_stages` (`pipeline_id`, `name`, `color_hex`, `sort_order`, `is_won_stage`) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$pipelineId, $stg['name'], $stg['color_hex'], $stg['sort_order'], $stg['is_won_stage']]);
        $stageIds[$stg['name']] = (int)$pdo->lastInsertId();
    }
    echo "✅ Pipeline y 6 Etapas comerciales configuradas\n";

    // ------------------------------------------------------------
    // 11. Oportunidades Comerciales (Negociaciones)
    // ------------------------------------------------------------
    $opportunities = [
        [
            'account' => 'Acme Corporation Inc',
            'contact' => 'John Doe',
            'stage' => 'Propuesta Enviada',
            'title' => 'SaaS Enterprise + Onboarding Acme',
            'value' => 4500.00,
            'close_date' => (new DateTime())->modify('+30 days')->format('Y-m-d'),
            'line_items' => [
                ['sku' => 'LIC-ENT-001', 'qty' => 20, 'price' => 150.00, 'discount' => 10.00, 'tax' => 16.00], // con 10% desc e IVA
                ['sku' => 'SRV-SET-001', 'qty' => 1, 'price' => 1500.00, 'discount' => 0.00, 'tax' => 16.00]
            ]
        ],
        [
            'account' => 'Globex Corporation',
            'contact' => 'Hank Scorpio',
            'stage' => 'Calificación',
            'title' => 'Consultoría Especializada Globex',
            'value' => 2400.00,
            'close_date' => (new DateTime())->modify('+15 days')->format('Y-m-d'),
            'line_items' => [
                ['sku' => 'SRV-CON-001', 'qty' => 20, 'price' => 120.00, 'discount' => 0.00, 'tax' => 16.00]
            ]
        ],
        [
            'account' => 'Initech LLC',
            'contact' => 'Peter Gibbons',
            'stage' => 'Contacto Inicial',
            'title' => 'Migración de Sistemas de Servidores',
            'value' => 7500.00,
            'close_date' => (new DateTime())->modify('+45 days')->format('Y-m-d'),
            'line_items' => [
                ['sku' => 'LIC-ENT-001', 'qty' => 50, 'price' => 150.00, 'discount' => 20.00, 'tax' => 16.00]
            ]
        ],
        [
            'account' => 'Acme Corporation Inc',
            'contact' => 'Sarah Connor',
            'stage' => 'Negociación',
            'title' => 'Soporte Premium Adicional Acme',
            'value' => 3000.00,
            'close_date' => (new DateTime())->modify('+5 days')->format('Y-m-d'),
            'line_items' => [
                ['sku' => 'SRV-SUP-001', 'qty' => 12, 'price' => 250.00, 'discount' => 0.00, 'tax' => 16.00]
            ]
        ]
    ];

    foreach ($opportunities as $opp) {
        $accId = $accountIds[$opp['account']] ?? null;
        $cntId = $contactIds[$opp['contact']] ?? null;
        $stgId = $stageIds[$opp['stage']] ?? null;
        
        $stmt = $pdo->prepare("
            INSERT INTO `opportunities` (`tenant_id`, `account_id`, `contact_id`, `pipeline_stage_id`, `title`, `value`, `currency`, `close_date`, `owner_user_id`, `custom_fields`) 
            VALUES (?, ?, ?, ?, ?, ?, 'USD', ?, ?, '{}')
        ");
        $stmt->execute([$tenantId, $accId, $cntId, $stgId, $opp['title'], $opp['value'], $opp['close_date'], $userId]);
        $oppId = (int)$pdo->lastInsertId();

        // Agregar line items
        foreach ($opp['line_items'] as $item) {
            $prodId = $productIds[$item['sku']] ?? null;
            if ($prodId) {
                $stmtItem = $pdo->prepare("
                    INSERT INTO `opportunity_line_items` (`opportunity_id`, `product_id`, `quantity`, `unit_price`, `discount_percentage`, `tax_percentage`)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmtItem->execute([$oppId, $prodId, $item['qty'], $item['price'], $item['discount'], $item['tax']]);
            }
        }

        // Crear una Cotización Draft si es de Acme (Propuesta Enviada)
        if ($opp['stage'] === 'Propuesta Enviada') {
            $quoteNo = 'Q-' . date('Y') . '-' . str_pad((string)$oppId, 4, '0', STR_PAD_LEFT);
            $stmtQ = $pdo->prepare("
                INSERT INTO `quotes` (`tenant_id`, `opportunity_id`, `quote_number`, `status`, `total_amount`)
                VALUES (?, ?, ?, 'sent', ?)
            ");
            $stmtQ->execute([$tenantId, $oppId, $quoteNo, $opp['value']]);
            $quoteId = (int)$pdo->lastInsertId();

            // Rellenar quote line items
            foreach ($opp['line_items'] as $item) {
                $prodId = $productIds[$item['sku']] ?? null;
                if ($prodId) {
                    $stmtQLI = $pdo->prepare("
                        INSERT INTO `quote_line_items` (`quote_id`, `product_id`, `quantity`, `unit_price`, `discount_percentage`, `tax_percentage`)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    $stmtQLI->execute([$quoteId, $prodId, $item['qty'], $item['price'], $item['discount'], $item['tax']]);
                }
            }
        }
    }
    echo "✅ Oportunidades comerciales y cotizaciones asociadas creadas\n";

    // ------------------------------------------------------------
    // 12. Insertar Tareas
    // ------------------------------------------------------------
    // Buscar la oportunidad de Acme
    $oppAcmeStmt = $pdo->prepare("SELECT id FROM opportunities WHERE tenant_id = ? AND title LIKE '%Acme%' LIMIT 1");
    $oppAcmeStmt->execute([$tenantId]);
    $oppAcmeId = $oppAcmeStmt->fetchColumn() ?: null;

    $tasks = [
        [
            'title' => 'Llamar a John Doe para seguimiento de propuesta',
            'desc' => 'Preguntar si pudieron evaluar los términos y el 10% de descuento que incluimos en el software SaaS.',
            'due' => (new DateTime())->modify('+1 day')->format('Y-m-d H:i:s'),
            'status' => 'pending',
            'opp_id' => $oppAcmeId
        ],
        [
            'title' => 'Preparar presentación para Globex',
            'desc' => 'Enfocar la presentación en el servicio de soporte 24/7 y SLA premium.',
            'due' => (new DateTime())->modify('-2 days')->format('Y-m-d H:i:s'),
            'status' => 'completed',
            'opp_id' => null
        ],
        [
            'title' => 'Enviar cotización firmada a Initech',
            'desc' => 'Espera de aprobación por parte del comité de compras.',
            'due' => (new DateTime())->modify('+3 days')->format('Y-m-d H:i:s'),
            'status' => 'pending',
            'opp_id' => null
        ]
    ];

    foreach ($tasks as $tsk) {
        $stmt = $pdo->prepare("
            INSERT INTO `tasks` (`tenant_id`, `opportunity_id`, `title`, `description`, `due_date`, `status`, `assigned_to`)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$tenantId, $tsk['opp_id'], $tsk['title'], $tsk['desc'], $tsk['due'], $tsk['status'], $userId]);
    }
    echo "✅ Tareas comerciales iniciales creadas\n";

    // ------------------------------------------------------------
    // 13. Colaboración / Chat de Negociación
    // ------------------------------------------------------------
    if ($oppAcmeId) {
        $stmt = $pdo->prepare("INSERT INTO `message_threads` (`tenant_id`, `opportunity_id`, `subject`) VALUES (?, ?, ?)");
        $stmt->execute([$tenantId, $oppAcmeId, 'Discusión comercial - Propuesta Acme']);
        $threadId = (int)$pdo->lastInsertId();

        $messages = [
            ['body' => 'Hola equipo, envié la propuesta con el 10% de descuento incluido. John Doe me comentó que lo conversará con su CFO hoy por la tarde.', 'user_id' => $userId],
            ['body' => 'Excelente! Si surge algún problema de presupuesto, recuerden que podemos modularizar la fase de Setup en dos hitos.', 'user_id' => $userId]
        ];

        foreach ($messages as $msg) {
            $stmtMsg = $pdo->prepare("
                INSERT INTO `messages` (`tenant_id`, `thread_id`, `opportunity_id`, `user_id`, `body`) 
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmtMsg->execute([$tenantId, $threadId, $oppAcmeId, $msg['user_id'], $msg['body']]);
        }
        echo "✅ Canal de chat y comentarios inicializados para oportunidad Acme\n";
    }

    $pdo->commit();

    // ============================================================
    // Resumen Final
    // ============================================================
    echo "\n";
    echo str_repeat('=', 60) . "\n";
    echo "🎉 SEED CRM COMPLETADO EXITOSAMENTE\n";
    echo str_repeat('=', 60) . "\n";
    echo "📋 CREDENCIALES DE ACCESO:\n";
    echo "  App ID: crm\n";
    echo "  Tenant: $tenantName (ID: $tenantId)\n";
    echo "  Email del Comercial: $commercialEmail\n";
    echo "  Contraseña: $commercialPass\n";
    echo str_repeat('=', 60) . "\n";
    echo "🚀 LISTO PARA REALIZAR PRUEBAS\n";
    echo str_repeat('=', 60) . "\n";

} catch (Throwable $e) {
    $pdo->rollBack();
    die("❌ ERROR EN SEED CRM: " . $e->getMessage() . "\nTrace: " . $e->getTraceAsString() . "\n");
}
