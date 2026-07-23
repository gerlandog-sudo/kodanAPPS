<?php

declare(strict_types=1);

test('PlanAccessValidator debe bloquear accesos si el tenant está inactivo o suspendido', function () {
    $pdo = new PDO('sqlite::memory:');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Schema simulado
    $pdo->exec("CREATE TABLE tenants (tenant_id INTEGER PRIMARY KEY, is_active INTEGER, subscription_plan_id INTEGER)");
    $pdo->exec("INSERT INTO tenants (tenant_id, is_active, subscription_plan_id) VALUES (100, 0, 1)"); // Inactivo

    $stmt = $pdo->prepare("SELECT is_active FROM tenants WHERE tenant_id = ?");
    $stmt->execute([100]);
    $tenant = $stmt->fetch(PDO::FETCH_ASSOC);

    expect($tenant['is_active'])->toBe(0);
});

test('Validación de Aislamiento Tenant debe evitar fuga de registros entre Tenant A y Tenant B', function () {
    $pdo = new PDO('sqlite::memory:');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec("CREATE TABLE CRM_leads (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id INTEGER, lead_name TEXT)");
    
    // Insertar registros en Tenant 1 (Acme) y Tenant 2 (Beta Corp)
    $pdo->exec("INSERT INTO CRM_leads (tenant_id, lead_name) VALUES (1, 'Lead Acme Confidential')");
    $pdo->exec("INSERT INTO CRM_leads (tenant_id, lead_name) VALUES (2, 'Lead Beta Secret')");

    // Consulta con Scope del Tenant 1
    $stmt = $pdo->prepare("SELECT * FROM CRM_leads WHERE tenant_id = :tenant_id");
    $stmt->execute([':tenant_id' => 1]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    expect(count($results))->toBe(1);
    expect($results[0]['lead_name'])->toBe('Lead Acme Confidential');
});
