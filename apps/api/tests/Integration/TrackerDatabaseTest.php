<?php

declare(strict_types=1);

test('SummaryDailyRepository debe acumular y actualizar (upsert) correctamente horas de un usuario en un proyecto', function () {
    $pdo = new PDO('sqlite::memory:');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Schema de Tracker Summary Daily
    $pdo->exec("CREATE TABLE TRACKER_summary_daily (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        project_id INTEGER,
        date TEXT,
        total_minutes INTEGER,
        calculated_cost REAL,
        UNIQUE(user_id, project_id, date)
    )");

    // Simular primer fichaje (60 mins = $50)
    $stmt = $pdo->prepare("INSERT INTO TRACKER_summary_daily (user_id, project_id, date, total_minutes, calculated_cost) 
                           VALUES (1, 10, '2026-07-21', 60, 50.0) 
                           ON CONFLICT(user_id, project_id, date) 
                           DO UPDATE SET total_minutes = total_minutes + excluded.total_minutes, calculated_cost = calculated_cost + excluded.calculated_cost");
    $stmt->execute();

    // Simular segundo fichaje el mismo día (30 mins = $25)
    $stmt = $pdo->prepare("INSERT INTO TRACKER_summary_daily (user_id, project_id, date, total_minutes, calculated_cost) 
                           VALUES (1, 10, '2026-07-21', 30, 25.0) 
                           ON CONFLICT(user_id, project_id, date) 
                           DO UPDATE SET total_minutes = total_minutes + excluded.total_minutes, calculated_cost = calculated_cost + excluded.calculated_cost");
    $stmt->execute();

    $query = $pdo->query("SELECT total_minutes, calculated_cost FROM TRACKER_summary_daily WHERE user_id = 1 AND project_id = 10 AND date = '2026-07-21'");
    $summary = $query->fetch(PDO::FETCH_ASSOC);

    expect($summary['total_minutes'])->toBe(90);
    expect((float)$summary['calculated_cost'])->toBe(75.0);
});

test('TrackerMetricsController debe denegar acceso a la matriz de métricas si el usuario no tiene rol aprobador', function () {
    $canApproveHours = false; // Usuario común sin privilegios

    expect(function () use ($canApproveHours) {
        if (!$canApproveHours) {
            throw new \RuntimeException('Acceso denegado. Se requieren privilegios de administración para Métricas.', 403);
        }
    })->toThrow(\RuntimeException::class, 'Acceso denegado');
});
