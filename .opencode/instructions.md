# Instrucciones para el agente

## PHPStan — Regla crítica

Siempre ejecutar PHPStan con `--level=max` **antes** de escribir código nuevo para conocer el nivel real de exigencia.

El `phpstan.neon` dice `level: 6`, pero el proyecto se valida con `--level=max`. No asumir que los patrones del código existente (e.g. `(int)$row['col']`, `json_decode()` sin guards) pasan ese nivel — verificarlo primero.

Patrón correcto para evitar `Cannot cast mixed to int`:
```php
$val = isset($arr['key']) && is_numeric($arr['key']) ? (int)$arr['key'] : 0;
```

Patrón correcto para `json_decode`:
```php
$raw = isset($arr['field']) && is_string($arr['field']) ? json_decode($arr['field'], true) : null;
$decoded = is_array($raw) ? $raw : [];
```

Los handlers que reciben datos de JSON usar `@param array<mixed> $params` (no `array<string, mixed>` ni solo `array`), porque PHPStan tipa `json_decode(...)` como `array<int|string, mixed>`, y `array<mixed>` es el tipo que acepta ambas variantes sin error ni `missingType.iterableValue`.
