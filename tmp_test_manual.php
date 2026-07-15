<?php
// Test manual backup
$ch = curl_init('https://kodan_nginx_proxy/api/super-admin/backups');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => '{}',
    CURLOPT_HTTPHEADER => ['Host: api.kodan.software', 'Content-Type: application/json'],
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
]);
$r = curl_exec($ch);
$c = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP $c" . PHP_EOL;
echo substr($r, 0, 500) . PHP_EOL;
