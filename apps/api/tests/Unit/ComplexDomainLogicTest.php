<?php

declare(strict_types=1);

use kodanAPPS\DTOs\CreateTimeEntryDTO;
use kodanAPPS\DTOs\TenantCreateDTO;

test('DTO CreateTimeEntryDTO debe rechazar duraciones negativas o iguales a cero', function () {
    expect(function () {
        new CreateTimeEntryDTO([
            'project_id' => 1,
            'user_id' => 10,
            'duration_minutes' => 0,
            'date' => '2026-07-21'
        ]);
    })->toThrow(\InvalidArgumentException::class);
});

test('DTO CreateTimeEntryDTO debe rechazar duraciones superiores a 24 horas (1440 mins)', function () {
    expect(function () {
        new CreateTimeEntryDTO([
            'project_id' => 1,
            'user_id' => 10,
            'duration_minutes' => 1500, // 25 horas
            'date' => '2026-07-21'
        ]);
    })->toThrow(\InvalidArgumentException::class);
});

test('DTO CreateTimeEntryDTO debe validar formato de fecha estricto YYYY-MM-DD', function () {
    expect(function () {
        new CreateTimeEntryDTO([
            'project_id' => 1,
            'user_id' => 10,
            'duration_minutes' => 60,
            'date' => '21/07/2026' // Formato inválido
        ]);
    })->toThrow(\InvalidArgumentException::class);
});

test('DTO TenantCreateDTO debe normalizar emails y aplicar sanitización de nombre', function () {
    $dto = new TenantCreateDTO([
        'name' => '  Kodan Enterprise Inc.  ',
        'subscription_plan_id' => 2,
        'admin_name' => '  Gerlando Admin  ',
        'admin_email' => '  ADMIN.GERLANDO@KodanAPPS.COM  ',
        'admin_password' => 'SecurePass123!'
    ]);

    expect($dto->name)->toBe('Kodan Enterprise Inc.');
    expect($dto->adminName)->toBe('Gerlando Admin');
    expect($dto->adminEmail)->toBe('admin.gerlando@kodanapps.com');
    expect($dto->themePreference)->toBe('dark');
});

test('DTO TenantCreateDTO debe rechazar contraseñas débiles de menos de 8 caracteres', function () {
    expect(function () {
        new TenantCreateDTO([
            'name' => 'Kodan Enterprise',
            'subscription_plan_id' => 1,
            'admin_name' => 'Admin',
            'admin_email' => 'admin@kodan.com',
            'admin_password' => '12345' // Menos de 8 chars
        ]);
    })->toThrow(\InvalidArgumentException::class);
});
