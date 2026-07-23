<?php

test('calcula correctamente el margen de ganancia de un producto', function () {
    $cost = 100.0;
    $price = 150.0;

    $margin = round((($price - $cost) / $price) * 100, 2);

    expect($margin)->toBe(33.33);
});

test('valida correctamente las reglas de formato de email', function () {
    $validEmail = 'usuario@kodan.apps';
    $invalidEmail = 'usuario-invalido-sin-arroba';

    expect(filter_var($validEmail, FILTER_VALIDATE_EMAIL))->not->toBeFalse();
    expect(filter_var($invalidEmail, FILTER_VALIDATE_EMAIL))->toBeFalse();
});
