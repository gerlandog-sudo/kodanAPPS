<?php

declare(strict_types=1);

header('Content-Type: application/json');

echo json_encode([
    'status' => 'ok',
    'service' => 'kodanAPPS API',
    'version' => '1.0.0',
    'php_version' => PHP_VERSION,
    'timestamp' => time()
], JSON_THROW_ON_ERROR);
