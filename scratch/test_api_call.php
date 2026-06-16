<?php
declare(strict_types=1);

$envPath = __DIR__ . '/../apps/api/.env';
$dotenv = [];
if (file_exists($envPath)) {
    $dotenv = parse_ini_file($envPath) ?: [];
}

$jwtSecret = $dotenv['JWT_SECRET'] ?? 'K0d4nAPPS_2026_SuperSecret_JWT_Key_ChangeInProduction_783126543';

// 1. Generar JWT para admin@pruebas.com (ID: 10, Tenant: 12)
$issuedAt = time();
$expiresAt = $issuedAt + 1800;
$payload = [
    'sub' => 10,
    'tid' => 12,
    'iat' => $issuedAt,
    'exp' => $expiresAt,
    'roles' => ['admin'],
    'app_id' => 'crm',
    'is_super_admin' => 0,
];

function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

$header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
$payloadJson = json_encode($payload);

$headerB64 = base64UrlEncode($header);
$payloadB64 = base64UrlEncode($payloadJson);

$signature = hash_hmac('sha256', "$headerB64.$payloadB64", $jwtSecret, true);
$signatureB64 = base64UrlEncode($signature);

$jwt = "$headerB64.$payloadB64.$signatureB64";

echo "JWT Generado: $jwt\n\n";

// 2. Hacer petición HTTP a la API usando cURL
$ch = curl_init('http://127.0.0.1:8080/api/crm/accounts');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
// curl_setopt($ch, CURLOPT_COOKIE, "access_token=$jwt");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Origin: http://localhost:5174',
    'X-Requested-With: XMLHttpRequest',
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);

curl_close($ch);

$headers = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

echo "HTTP Code: $httpCode\n";
echo "Headers:\n$headers\n";
echo "Body:\n$body\n";
