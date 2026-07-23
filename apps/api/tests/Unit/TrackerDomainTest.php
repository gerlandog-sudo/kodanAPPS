<?php

declare(strict_types=1);

// Helper de cálculo de KPIs y Salud Financiera de Proyectos Tracker
function calculateProjectKpis(float $consumedHours, float $budgetHours, float $consumedMoney, float $budgetMoney): array
{
    $hoursConsumptionPct = $budgetHours > 0 ? round(($consumedHours / $budgetHours) * 100, 2) : 0.0;
    $moneyConsumptionPct = $budgetMoney > 0 ? round(($consumedMoney / $budgetMoney) * 100, 2) : 0.0;

    $healthStatus = 'HEALTHY';
    if ($hoursConsumptionPct > 100 || $moneyConsumptionPct > 100) {
        $healthStatus = 'CRITICAL_OVERBURDEN';
    } elseif ($hoursConsumptionPct >= 85 || $moneyConsumptionPct >= 85) {
        $healthStatus = 'WARNING_RISK';
    }

    return [
        'hours_pct' => $hoursConsumptionPct,
        'money_pct' => $moneyConsumptionPct,
        'status' => $healthStatus,
    ];
}

test('Tracker KPI debe calcular consumo de horas y marcar estado HEALTHY dentro de margen (< 85%)', function () {
    $kpi = calculateProjectKpis(40.0, 100.0, 1800.0, 5000.0);

    expect($kpi['hours_pct'])->toBe(40.0);
    expect($kpi['money_pct'])->toBe(36.0);
    expect($kpi['status'])->toBe('HEALTHY');
});

test('Tracker KPI debe marcar WARNING_RISK si consumo de horas o dinero supera el 85%', function () {
    $kpi = calculateProjectKpis(88.0, 100.0, 4200.0, 5000.0);

    expect($kpi['hours_pct'])->toBe(88.0);
    expect($kpi['status'])->toBe('WARNING_RISK');
});

test('Tracker KPI debe marcar CRITICAL_OVERBURDEN si excede el 100% del presupuesto asignado', function () {
    $kpi = calculateProjectKpis(105.5, 100.0, 5500.0, 5000.0);

    expect($kpi['hours_pct'])->toBe(105.5);
    expect($kpi['money_pct'])->toBe(110.0);
    expect($kpi['status'])->toBe('CRITICAL_OVERBURDEN');
});

test('Tracker KPI debe soportar proyectos con presupuesto cero (sin división por cero)', function () {
    $kpi = calculateProjectKpis(10.0, 0.0, 500.0, 0.0);

    expect($kpi['hours_pct'])->toBe(0.0);
    expect($kpi['money_pct'])->toBe(0.0);
    expect($kpi['status'])->toBe('HEALTHY');
});
