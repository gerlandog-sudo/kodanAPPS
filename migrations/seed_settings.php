<?php
declare(strict_types=1);

/**
 * Seed Settings - kodanAPPS
 *
 * Pobla datos de prueba para:
 * 1. Pipelines demo adicionales con etapas (color presets + ui_config)
 * 2. Custom Field Definitions para Cuentas, Contactos, Oportunidades
 * 3. Valores demo de custom fields en registros existentes
 *
 * Uso: php migrations/seed_settings.php
 */

if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
} else {
    require_once __DIR__ . '/../apps/api/vendor/autoload.php';
}



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

try {
    $pdo = new PDO(
        "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$config['charset']}",
        $config['user'],
        $config['pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    die("Error de conexión: " . $e->getMessage() . PHP_EOL);
}

echo "=== Seed Settings ===" . PHP_EOL;

// ============================================================
// Obtener tenant demo
// ============================================================
$stmt = $pdo->prepare("SELECT tenant_id FROM tenants WHERE is_active = 1 LIMIT 1");
$stmt->execute();
$tenant = $stmt->fetch();
if (!$tenant) {
    die("No hay tenants activos. Ejecuta migrations/seed_crm.php primero." . PHP_EOL);
}
$tenantId = (int)$tenant['tenant_id'];
echo "Tenant ID: {$tenantId}" . PHP_EOL;

// ============================================================
// 1. Demo Pipelines
// ============================================================

// Verificar si ya hay pipelines
$existingPipelines = $pdo->prepare("SELECT COUNT(*) FROM pipelines WHERE tenant_id = ?");
$existingPipelines->execute([$tenantId]);
$pipelineCount = (int)$existingPipelines->fetchColumn();

if ($pipelineCount === 0) {
    echo "Creando pipelines demo..." . PHP_EOL;

    // Pipeline 1: Ventas Directas (default)
    $pdo->prepare("INSERT INTO pipelines (tenant_id, name, is_default, created_at) VALUES (?, ?, 1, NOW())")
        ->execute([$tenantId, 'Ventas Directas']);
    $p1Id = (int)$pdo->lastInsertId();

    // Etapas Ventas Directas
    $stagesP1 = [
        ['name' => 'Nuevo Lead',        'color' => '#6366F1', 'order' => 10, 'prob' => 10,  'won' => 0],
        ['name' => 'Calificado',        'color' => '#8B5CF6', 'order' => 20, 'prob' => 25,  'won' => 0],
        ['name' => 'Reunión Agendada',  'color' => '#3B82F6', 'order' => 30, 'prob' => 40,  'won' => 0],
        ['name' => 'Propuesta Enviada', 'color' => '#F97316', 'order' => 40, 'prob' => 60,  'won' => 0],
        ['name' => 'Negociación',       'color' => '#EAB308', 'order' => 50, 'prob' => 75,  'won' => 0],
        ['name' => 'Cerrado Ganado',    'color' => '#22C55E', 'order' => 60, 'prob' => 100, 'won' => 1],
        ['name' => 'Cerrado Perdido',   'color' => '#F43F5E', 'order' => 70, 'prob' => 0,   'won' => 0],
    ];

    foreach ($stagesP1 as $s) {
        $uiConfig = json_encode(['preset' => $s['color']], JSON_UNESCAPED_UNICODE);
        $pdo->prepare(
            "INSERT INTO pipeline_stages (pipeline_id, name, color_hex, sort_order, probability, is_won_stage, ui_config, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"
        )->execute([$p1Id, $s['name'], $s['color'], $s['order'], $s['prob'], $s['won'], $uiConfig]);
        echo "  Etapa '{$s['name']}' creada." . PHP_EOL;
    }

    // Pipeline 2: Ventas Partner
    $pdo->prepare("INSERT INTO pipelines (tenant_id, name, is_default, created_at) VALUES (?, ?, 0, NOW())")
        ->execute([$tenantId, 'Ventas Partner']);
    $p2Id = (int)$pdo->lastInsertId();

    $stagesP2 = [
        ['name' => 'Partner Identificado', 'color' => '#06B6D4', 'order' => 10, 'prob' => 15,  'won' => 0],
        ['name' => 'Propuesta Conjunta',   'color' => '#14B8A6', 'order' => 20, 'prob' => 40,  'won' => 0],
        ['name' => 'Acuerdo Cerrado',      'color' => '#22C55E', 'order' => 30, 'prob' => 100, 'won' => 1],
    ];

    foreach ($stagesP2 as $s) {
        $uiConfig = json_encode(['preset' => $s['color']], JSON_UNESCAPED_UNICODE);
        $pdo->prepare(
            "INSERT INTO pipeline_stages (pipeline_id, name, color_hex, sort_order, probability, is_won_stage, ui_config, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"
        )->execute([$p2Id, $s['name'], $s['color'], $s['order'], $s['prob'], $s['won'], $uiConfig]);
    }

    echo "Pipeline 2 'Ventas Partner' creado con 3 etapas." . PHP_EOL;

    // Pipeline 3: Post Venta / Soprenew
    $pdo->prepare("INSERT INTO pipelines (tenant_id, name, is_default, created_at) VALUES (?, ?, 0, NOW())")
        ->execute([$tenantId, 'Renovación / Soporte']);
    $p3Id = (int)$pdo->lastInsertId();

    $stagesP3 = [
        ['name' => 'Renovación Próxima', 'color' => '#EC4899', 'order' => 10, 'prob' => 30,  'won' => 0],
        ['name' => 'Cotización Enviada',  'color' => '#F97316', 'order' => 20, 'prob' => 60,  'won' => 0],
        ['name' => 'Renovación Cerrada',  'color' => '#22C55E', 'order' => 30, 'prob' => 100, 'won' => 1],
    ];

    foreach ($stagesP3 as $s) {
        $uiConfig = json_encode(['preset' => $s['color']], JSON_UNESCAPED_UNICODE);
        $pdo->prepare(
            "INSERT INTO pipeline_stages (pipeline_id, name, color_hex, sort_order, probability, is_won_stage, ui_config, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"
        )->execute([$p3Id, $s['name'], $s['color'], $s['order'], $s['prob'], $s['won'], $uiConfig]);
    }

    echo "Pipeline 3 'Renovación / Soporte' creado con 3 etapas." . PHP_EOL;
} else {
    echo "Ya existen {$pipelineCount} pipelines. Saltando..." . PHP_EOL;
}

// ============================================================
// 2. Custom Field Definitions Demo
// ============================================================
$existingDefs = $pdo->prepare("SELECT COUNT(*) FROM custom_field_definitions WHERE tenant_id = ? AND deleted_at IS NULL");
$existingDefs->execute([$tenantId]);
$defCount = (int)$existingDefs->fetchColumn();

if ($defCount === 0) {
    echo "Creando definiciones de campos personalizados demo..." . PHP_EOL;

    $definitions = [
        // Cuentas
        ['entity' => 'account', 'key' => 'industria',          'label' => 'Industria',           'type' => 'select',       'options' => '["Tecnología","Servicios","Salud","Educación","Finanzas","Manufactura","Retail"]', 'required' => 1, 'sort' => 10],
        ['entity' => 'account', 'key' => 'tamano_empresa',     'label' => 'Tamaño de Empresa',   'type' => 'select',       'options' => '["1-10","11-50","51-200","201-1000","1000+"]', 'required' => 0, 'sort' => 20],
        ['entity' => 'account', 'key' => 'numero_empleados',   'label' => 'Núm. Empleados',      'type' => 'number',       'options' => null, 'required' => 0, 'sort' => 30],
        ['entity' => 'account', 'key' => 'fecha_fundacion',    'label' => 'Fecha de Fundación',  'type' => 'date',         'options' => null, 'required' => 0, 'sort' => 40],
        ['entity' => 'account', 'key' => 'es_cliente_vip',     'label' => 'Cliente VIP',         'type' => 'boolean',      'options' => null, 'required' => 0, 'sort' => 50],
        ['entity' => 'account', 'key' => 'etiquetas',          'label' => 'Etiquetas',           'type' => 'multi_select', 'options' => '["Premium","Enterprise","Startup","Gobierno","ONG"]', 'required' => 0, 'sort' => 60],

        // Contactos
        ['entity' => 'contact', 'key' => 'puesto',             'label' => 'Puesto / Cargo',      'type' => 'select',       'options' => '["CEO","CTO","CFO","Director","Gerente","Analista","Otro"]', 'required' => 1, 'sort' => 10],
        ['entity' => 'contact', 'key' => 'tipo_contacto',      'label' => 'Tipo de Contacto',    'type' => 'select',       'options' => '["Decisor","Influenciador","Usuario Final","Referente"]', 'required' => 0, 'sort' => 20],
        ['entity' => 'contact', 'key' => 'linkedin_url',       'label' => 'URL LinkedIn',        'type' => 'text',         'options' => null, 'required' => 0, 'sort' => 30],
        ['entity' => 'contact', 'key' => 'fecha_nacimiento',   'label' => 'Fecha de Nacimiento', 'type' => 'date',         'options' => null, 'required' => 0, 'sort' => 40],

        // Oportunidades
        ['entity' => 'opportunity', 'key' => 'tipo_negocio',   'label' => 'Tipo de Negocio',     'type' => 'select',       'options' => '["Nuevo Cliente","Upgrade","Renovación","Cross-sell"]', 'required' => 1, 'sort' => 10],
        ['entity' => 'opportunity', 'key' => 'canal_adquisicion', 'label' => 'Canal de Adq.',    'type' => 'select',       'options' => '["Inbound","Outbound","Partner","Referido","Evento"]', 'required' => 0, 'sort' => 20],
        ['entity' => 'opportunity', 'key' => 'competencia',    'label' => 'Competencia',         'type' => 'text',         'options' => null, 'required' => 0, 'sort' => 30],
        ['entity' => 'opportunity', 'key' => 'urgencia',       'label' => 'Urgencia',            'type' => 'select',       'options' => '["Baja","Media","Alta","Crítica"]', 'required' => 0, 'sort' => 40],
    ];

    $insertDef = $pdo->prepare(
        "INSERT INTO custom_field_definitions (tenant_id, entity_type, field_key, field_label, field_type, options, is_required, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())"
    );

    foreach ($definitions as $d) {
        $insertDef->execute([
            $tenantId,
            $d['entity'],
            $d['key'],
            $d['label'],
            $d['type'],
            $d['options'],
            $d['required'],
            $d['sort'],
        ]);
        echo "  Campo '{$d['label']}' ({$d['entity']}) creado." . PHP_EOL;
    }
} else {
    echo "Ya existen {$defCount} definiciones de campos. Saltando..." . PHP_EOL;
}

// ============================================================
// 3. Custom Fields demo values en registros existentes
// ============================================================

// Accounts
$accounts = $pdo->prepare("SELECT account_id FROM accounts WHERE tenant_id = ? LIMIT 5");
$accounts->execute([$tenantId]);
$accountRows = $accounts->fetchAll();

if (count($accountRows) > 0) {
    echo "Actualizando custom_fields en cuentas existentes..." . PHP_EOL;
    foreach ($accountRows as $i => $row) {
        $customFields = json_encode([
            'industria' => ['Tecnología', 'Servicios', 'Finanzas'][$i % 3],
            'tamano_empresa' => ['11-50', '51-200', '1-10'][$i % 3],
            'numero_empleados' => [25, 120, 8][$i % 3],
            'es_cliente_vip' => $i === 0,
            'etiquetas' => $i === 0 ? ['Premium', 'Enterprise'] : ($i === 1 ? ['Startup'] : []),
        ], JSON_UNESCAPED_UNICODE);
        $pdo->prepare("UPDATE accounts SET custom_fields = ? WHERE account_id = ?")
            ->execute([$customFields, (int)$row['account_id']]);
    }
    echo "  " . count($accountRows) . " cuentas actualizadas." . PHP_EOL;
}

// Contacts
$contacts = $pdo->prepare("SELECT contact_id FROM contacts WHERE tenant_id = ? LIMIT 5");
$contacts->execute([$tenantId]);
$contactRows = $contacts->fetchAll();

if (count($contactRows) > 0) {
    echo "Actualizando custom_fields en contactos existentes..." . PHP_EOL;
    foreach ($contactRows as $i => $row) {
        $customFields = json_encode([
            'puesto' => ['CEO', 'CTO', 'Director'][$i % 3],
            'tipo_contacto' => ['Decisor', 'Influenciador', 'Usuario Final'][$i % 3],
            'linkedin_url' => $i === 0 ? 'https://linkedin.com/in/demo' : null,
        ], JSON_UNESCAPED_UNICODE);
        $pdo->prepare("UPDATE contacts SET custom_fields = ? WHERE contact_id = ?")
            ->execute([$customFields, (int)$row['contact_id']]);
    }
    echo "  " . count($contactRows) . " contactos actualizados." . PHP_EOL;
}

// Opportunities
$opps = $pdo->prepare("SELECT id FROM opportunities WHERE tenant_id = ? LIMIT 5");
$opps->execute([$tenantId]);
$oppRows = $opps->fetchAll();

if (count($oppRows) > 0) {
    echo "Actualizando custom_fields en oportunidades existentes..." . PHP_EOL;
    foreach ($oppRows as $i => $row) {
        $customFields = json_encode([
            'tipo_negocio' => ['Nuevo Cliente', 'Upgrade', 'Renovación'][$i % 3],
            'canal_adquisicion' => ['Inbound', 'Outbound', 'Referido'][$i % 3],
            'urgencia' => ['Media', 'Alta', 'Baja'][$i % 3],
        ], JSON_UNESCAPED_UNICODE);
        $pdo->prepare("UPDATE opportunities SET custom_fields = ? WHERE id = ?")
            ->execute([$customFields, (int)$row['id']]);
    }
    echo "  " . count($oppRows) . " oportunidades actualizadas." . PHP_EOL;
}

echo PHP_EOL . "=== Seed Settings completado ===" . PHP_EOL;
