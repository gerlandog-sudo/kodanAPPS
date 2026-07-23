<?php

test('valida la creación e inserción aislada en la base de datos sqlite en memoria', function () {
    $pdo = new PDO('sqlite::memory:');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, role TEXT)");
    
    $stmt = $pdo->prepare("INSERT INTO users (email, role) VALUES (:email, :role)");
    $stmt->execute(['email' => 'admin@kodan.com', 'role' => 'SUPERADMIN']);

    $query = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'SUPERADMIN'");
    $count = $query->fetchColumn();

    expect($count)->toBe(1);
});
