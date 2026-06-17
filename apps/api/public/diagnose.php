<?php
header('Content-Type: text/plain; charset=utf-8');

$logs = [
    '/home/admkoda/kodanAPPS/api/public/error_log',
    '/home/admkoda/kodanAPPS/api/error_log',
    '/home/admkoda/public_html/api/error_log',
    '/home/admkoda/public_html/error_log'
];

foreach ($logs as $log) {
    if (file_exists($log)) {
        echo "=== FOUND LOG: $log ===\n";
        $lines = file($log);
        $lastLines = array_slice($lines, -30);
        echo implode("", $lastLines);
        echo "\n==================================\n\n";
    } else {
        echo "Log not found: $log\n";
    }
}
