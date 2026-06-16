<?php
$dotenv = parse_ini_file(__DIR__ . '/.env');
$dsn = "mysql:host=mariadb;port=3306;dbname=" . ($dotenv['DB_NAME'] ?? 'admkoda_BBDD_APPS') . ";charset=utf8mb4";
$pdo = new PDO($dsn, $dotenv['DB_USER'] ?? 'kodan_apps', $dotenv['DB_PASS'] ?? 'appsecret', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

echo "=== OPPORTUNITIES ===\n";
$stmt = $pdo->query("SELECT * FROM opportunities");
print_r($stmt->fetchAll());

echo "=== PIPELINE STAGES ===\n";
$stmt = $pdo->query("SELECT * FROM pipeline_stages");
print_r($stmt->fetchAll());

echo "=== PIPELINES ===\n";
$stmt = $pdo->query("SELECT * FROM pipelines");
print_r($stmt->fetchAll());
