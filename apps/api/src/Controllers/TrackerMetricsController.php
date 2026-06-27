<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\DB\TenantAwarePDO;
use kodanAPPS\DB\TenantContext;
use RuntimeException;

final class TrackerMetricsController
{
    public function __construct(
        private TenantAwarePDO $pdo,
    ) {}

    /**
     * GET /api/tracker/metrics
     * Devuelve la lista de proyectos con sus KPIs para la matriz,
     * o los detalles de un proyecto específico si se provee project_id.
     *
     * @return array<string, mixed>|array<int, array<string, mixed>>
     */
    public function getProjectMetrics(): array
    {
        $userId = TenantContext::getUserId();
        if ($userId <= 0) {
            throw new RuntimeException('Usuario no autenticado.', 401);
        }

        $tenantId = TenantContext::getTenantId();

        if (!TenantContext::hasRole('admin')) {
            throw new RuntimeException('Acceso denegado. Se requieren privilegios de administrador para Métricas.', 403);
        }

        $projectId = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;

        if ($projectId) {
            return $this->getDetailedMetrics($projectId, $from, $to, $tenantId);
        }

        return $this->getPortfolioMatrix($from, $to, $tenantId);
    }

    /**
     * Obtiene la matriz general de todos los proyectos del tenant.
     *
     * @return array<int, array<string, mixed>>
     */
    private function getPortfolioMatrix(?string $from, ?string $to, int $tenantId): array
    {
        $sql = "SELECT p.id, p.name, p.status, p.budget_hours, p.budget_money, p.start_date, p.end_date,
                       a.name AS client_name, o.value AS opp_value
                FROM TRACKER_projects p
                LEFT JOIN accounts a ON a.account_id = p.account_id
                LEFT JOIN CRM_opportunities o ON o.id = p.opportunity_id
                WHERE p.tenant_id = :tenant_id AND p.status = 'active'";
        
        $params = [':tenant_id' => $tenantId];

        if ($from) {
            $sql .= " AND (p.end_date IS NULL OR p.end_date >= :date_from)";
            $params[':date_from'] = $from;
        }
        if ($to) {
            $sql .= " AND (p.start_date IS NULL OR p.start_date <= :date_to)";
            $params[':date_to'] = $to;
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $projects = $stmt->fetchAll();

        $matrix = [];
        foreach ($projects as $proj) {
            $pId = (int)$proj['id'];
            $budgetMoney = (float)($proj['budget_money'] ?: ($proj['opp_value'] ?: 0.0));

            // 1. Alcance
            $scope = $this->calculateScopeProgress($pId, (float)$proj['budget_hours']);

            // 2. Cronograma (SPI)
            $schedule = $this->calculateSchedulePerformance($proj['start_date'], $proj['end_date'], $scope['percentage']);

            // 3. Presupuesto (Burn Rate)
            $budget = $this->calculateBudgetPerformance($pId, $budgetMoney);

            // 4. Calidad (Tasa de Aprobación)
            $quality = $this->calculateQualityRate($pId);

            // 5. Valor (Earned Value)
            $value = $this->calculateValuePerformance($scope['percentage'], $budgetMoney);

            // 6. Riesgos
            $risks = $this->calculateRiskProfile($scope['percentage'], $schedule['spi'], $budget['burn_rate'], $quality['percentage'], $proj['end_date'], $proj['status']);

            $matrix[] = [
                'id' => $pId,
                'name' => $proj['name'],
                'client_name' => $proj['client_name'] ?? 'Cliente General',
                'kpis' => [
                    'scope' => $scope['percentage'],
                    'schedule' => round($schedule['spi'] * 100),
                    'budget' => $budget['burn_rate'],
                    'quality' => $quality['percentage'],
                    'value' => $value['percentage'],
                    'risk_count' => $risks['total'],
                ]
            ];
        }

        return $matrix;
    }

    /**
     * Obtiene el Bento Grid y desglose histórico para un proyecto en particular.
     *
     * @return array<string, mixed>
     */
    private function getDetailedMetrics(int $projectId, ?string $from, ?string $to, int $tenantId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT p.*, a.name AS client_name, o.value AS opp_value
            FROM TRACKER_projects p
            LEFT JOIN accounts a ON a.account_id = p.account_id
            LEFT JOIN CRM_opportunities o ON o.id = p.opportunity_id
            WHERE p.id = :id AND p.tenant_id = :tenant_id
        ");
        $stmt->execute([':id' => $projectId, ':tenant_id' => $tenantId]);
        $project = $stmt->fetch();

        if (!$project) {
            throw new RuntimeException('Proyecto no encontrado.', 404);
        }

        $budgetMoney = (float)($project['budget_money'] ?: ($project['opp_value'] ?: 0.0));

        // KPIs principales
        $scope = $this->calculateScopeProgress($projectId, (float)$project['budget_hours']);
        $schedule = $this->calculateSchedulePerformance($project['start_date'], $project['end_date'], $scope['percentage']);
        $budget = $this->calculateBudgetPerformance($projectId, $budgetMoney);
        $quality = $this->calculateQualityRate($projectId);
        $value = $this->calculateValuePerformance($scope['percentage'], $budgetMoney);
        $risks = $this->calculateRiskProfile($scope['percentage'], $schedule['spi'], $budget['burn_rate'], $quality['percentage'], $project['end_date'], $project['status']);

        // Tendencias semanales (5 intervalos)
        $trends = $this->calculateTrends($projectId, $project['start_date'], $project['end_date'], $budgetMoney, $scope['percentage']);

        return [
            'project' => [
                'id' => $project['id'],
                'name' => $project['name'],
                'client_name' => $project['client_name'] ?? 'Cliente General',
                'status' => $project['status'],
                'start_date' => $project['start_date'],
                'end_date' => $project['end_date']
            ],
            'kpis' => [
                'scope' => $scope,
                'schedule' => $schedule,
                'budget' => $budget,
                'quality' => $quality,
                'value' => $value,
                'risks' => $risks
            ],
            'trends' => $trends
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function calculateScopeProgress(int $projectId, float $budgetHours): array
    {
        // 1. Medir en base a tareas registradas en TRACKER_project_tasks
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) AS total,
                   COALESCE(SUM(estimated_hours), 0) AS total_est,
                   SUM(CASE WHEN kanban_status = 'done' THEN 1 ELSE 0 END) AS done,
                   COALESCE(SUM(CASE WHEN kanban_status = 'done' THEN estimated_hours ELSE 0 END), 0) AS done_est
            FROM TRACKER_project_tasks
            WHERE project_id = :project_id
        ");
        $stmt->execute([':project_id' => $projectId]);
        $tasks = $stmt->fetch();

        $totalTasks = (int)($tasks['total'] ?? 0);
        if ($totalTasks > 0) {
            $totalEst = (float)$tasks['total_est'];
            $doneEst = (float)$tasks['done_est'];

            if ($totalEst > 0) {
                $pct = round(($doneEst / $totalEst) * 100);
            } else {
                $doneCount = (int)$tasks['done'];
                $pct = round(($doneCount / $totalTasks) * 100);
            }
            return [
                'percentage' => (float)$pct,
                'completed' => (int)$tasks['done'],
                'total' => $totalTasks,
                'source' => 'kanban'
            ];
        }

        // 2. Fallback: Proporción de horas aprobadas sobre el presupuesto estimado
        $stmt = $this->pdo->prepare("
            SELECT COALESCE(SUM(duration_minutes), 0) / 60.0 AS actual_hours
            FROM TRACKER_time_entries
            WHERE project_id = :project_id AND approval_status = 'approved'
        ");
        $stmt->execute([':project_id' => $projectId]);
        $actualHours = (float)($stmt->fetchColumn() ?: 0.0);

        if ($budgetHours > 0) {
            $pct = min(100.0, round(($actualHours / $budgetHours) * 100));
            return [
                'percentage' => $pct,
                'completed' => $actualHours,
                'total' => $budgetHours,
                'source' => 'hours'
            ];
        }

        return [
            'percentage' => 100.0,
            'completed' => 0.0,
            'total' => 0.0,
            'source' => 'default'
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function calculateSchedulePerformance(?string $start, ?string $end, float $scopeProgress): array
    {
        if (!$start || !$end) {
            return [
                'spi' => 1.0,
                'status' => 'approved',
                'planned_progress' => 100,
                'actual_progress' => $scopeProgress
            ];
        }

        $now = new \DateTime();
        $startDate = new \DateTime($start);
        $endDate = new \DateTime($end);

        $totalDuration = $startDate->diff($endDate)->days;
        if ($totalDuration <= 0) {
            $totalDuration = 1;
        }

        if ($now < $startDate) {
            $elapsed = 0;
        } else {
            $elapsed = $startDate->diff($now)->days;
        }

        $plannedProgress = min(1.0, $elapsed / $totalDuration);
        $actualProgress = $scopeProgress / 100;

        $spi = 1.0;
        if ($plannedProgress > 0) {
            $spi = $actualProgress / $plannedProgress;
        }

        $status = 'approved'; // verde
        if ($spi < 0.75) {
            $status = 'rejected'; // rojo
        } elseif ($spi < 0.90 || ($now > $endDate && $scopeProgress < 100)) {
            $status = 'submitted'; // amarillo
        }

        return [
            'spi' => round($spi, 2),
            'status' => $status,
            'planned_progress' => round($plannedProgress * 100),
            'actual_progress' => $scopeProgress
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function calculateBudgetPerformance(int $projectId, float $budgetMoney): array
    {
        $stmt = $this->pdo->prepare("
            SELECT COALESCE(SUM(calculated_cost), 0) AS cost
            FROM TRACKER_time_entries
            WHERE project_id = :project_id AND approval_status = 'approved'
        ");
        $stmt->execute([':project_id' => $projectId]);
        $cost = (float)($stmt->fetchColumn() ?: 0.0);

        if ($budgetMoney <= 0) {
            return [
                'burn_rate' => 0.0,
                'cost' => $cost,
                'budget' => 0.0,
                'status' => 'approved'
            ];
        }

        $burnRate = round(($cost / $budgetMoney) * 100, 1);
        $status = 'approved';
        if ($burnRate > 100) {
            $status = 'rejected';
        } elseif ($burnRate > 85) {
            $status = 'submitted';
        }

        return [
            'burn_rate' => $burnRate,
            'cost' => $cost,
            'budget' => $budgetMoney,
            'status' => $status
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function calculateQualityRate(int $projectId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT 
                SUM(CASE WHEN approval_status = 'approved' THEN duration_minutes ELSE 0 END) / 60.0 as approved,
                SUM(CASE WHEN approval_status = 'rejected' THEN duration_minutes ELSE 0 END) / 60.0 as rejected
            FROM TRACKER_time_entries
            WHERE project_id = :project_id
        ");
        $stmt->execute([':project_id' => $projectId]);
        $hours = $stmt->fetch();

        $approved = (float)($hours['approved'] ?? 0);
        $rejected = (float)($hours['rejected'] ?? 0);
        $total = $approved + $rejected;

        if ($total <= 0) {
            return [
                'percentage' => 100.0,
                'approved' => 0.0,
                'rejected' => 0.0,
                'status' => 'approved'
            ];
        }

        $pct = round(($approved / $total) * 100, 1);
        $status = 'approved';
        if ($pct < 75) {
            $status = 'rejected';
        } elseif ($pct < 90) {
            $status = 'submitted';
        }

        return [
            'percentage' => $pct,
            'approved' => $approved,
            'rejected' => $rejected,
            'status' => $status
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function calculateValuePerformance(float $scopeProgressPercentage, float $budgetMoney): array
    {
        // Earned Value = (% completado / 100) * valor pactado (presupuesto en dinero)
        $revenue = round(($scopeProgressPercentage / 100) * $budgetMoney, 2);

        if ($budgetMoney <= 0) {
            return [
                'percentage' => 100.0,
                'revenue' => $revenue,
                'target' => 0.0,
                'status' => 'approved'
            ];
        }

        $pct = round(($revenue / $budgetMoney) * 100, 1);
        $status = 'approved';
        if ($pct < 50) {
            $status = 'rejected';
        } elseif ($pct < 85) {
            $status = 'submitted';
        }

        return [
            'percentage' => $pct,
            'revenue' => $revenue,
            'target' => $budgetMoney,
            'status' => $status
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function calculateRiskProfile(float $scope, float $spi, float $burnRate, float $quality, ?string $end, string $status): array
    {
        $warnings = [];
        $high = 0;
        $medium = 0;
        $low = 0;

        // 1. Regla de presupuesto
        if ($burnRate > 100) {
            $warnings[] = "Presupuesto financiero agotado (" . $burnRate . "% utilizado)";
            $high++;
        } elseif ($burnRate > 85) {
            $warnings[] = "Presupuesto en zona de alerta (" . $burnRate . "% utilizado)";
            $medium++;
        }

        // 2. Regla de cronograma
        if ($spi < 0.75) {
            $warnings[] = "Desviación crítica de cronograma (SPI: " . $spi . ")";
            $high++;
        } elseif ($spi < 0.90) {
            $warnings[] = "Cronograma retrasado levemente (SPI: " . $spi . ")";
            $medium++;
        }

        // 3. Regla de vencimiento de fecha límite
        if ($end && $status === 'active') {
            $endDate = new \DateTime($end);
            $now = new \DateTime();
            if ($now > $endDate && $scope < 100) {
                $warnings[] = "Fecha límite expirada (" . $endDate->format('d/m/Y') . ") y el proyecto no está finalizado";
                $high++;
            }
        }

        // 4. Regla de calidad
        if ($quality < 75) {
            $warnings[] = "Tasa de rechazo de reportes de horas alta (" . (100 - $quality) . "% rechazado)";
            $high++;
        } elseif ($quality < 90) {
            $warnings[] = "Calidad de estimación inestable (" . (100 - $quality) . "% rechazado)";
            $medium++;
        }

        $total = $high + $medium + $low;
        $riskStatus = 'approved';
        if ($high > 0) {
            $riskStatus = 'rejected';
        } elseif ($medium > 0) {
            $riskStatus = 'submitted';
        }

        return [
            'total' => $total,
            'high' => $high,
            'medium' => $medium,
            'low' => $low,
            'warnings' => $warnings,
            'status' => $riskStatus
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function calculateTrends(int $projectId, ?string $start, ?string $end, float $budgetMoney, float $currentScope): array
    {
        // Si no hay rango de fecha, generar histórico ficticio basado en el progreso actual
        if (!$start || !$end) {
            return [
                ['name' => 'Sem 1', 'alcance' => 10, 'cronograma' => 15, 'presupuesto' => 5],
                ['name' => 'Sem 4', 'alcance' => 30, 'cronograma' => 35, 'presupuesto' => 20],
                ['name' => 'Sem 8', 'alcance' => 50, 'cronograma' => 55, 'presupuesto' => 45],
                ['name' => 'Sem 12', 'alcance' => 70, 'cronograma' => 75, 'presupuesto' => 60],
                ['name' => 'Sem 16', 'alcance' => $currentScope, 'cronograma' => 90, 'presupuesto' => 80]
            ];
        }

        // Obtener entries del proyecto aprobadas ordenadas por fecha
        $stmt = $this->pdo->prepare("
            SELECT duration_minutes / 60.0 AS hours, date, calculated_cost
            FROM TRACKER_time_entries
            WHERE project_id = :project_id AND approval_status = 'approved'
            ORDER BY date ASC
        ");
        $stmt->execute([':project_id' => $projectId]);
        $entries = $stmt->fetchAll();

        $startDate = new \DateTime($start);
        $endDate = new \DateTime($end);
        $totalDays = $startDate->diff($endDate)->days ?: 1;

        // Dividir el periodo en 5 intervalos uniformes
        $step = max(1, (int)($totalDays / 4));
        $trendNodes = [];

        for ($i = 0; $i < 5; $i++) {
            $nodeDate = clone $startDate;
            $nodeDate->modify('+' . ($i * $step) . ' days');
            if ($i === 4 || $nodeDate > $endDate) {
                $nodeDate = clone $endDate;
            }

            $formattedDate = $nodeDate->format('Y-m-d');

            // Acumular costo hasta esta fecha
            $accCost = 0.0;
            foreach ($entries as $e) {
                if ($e['date'] <= $formattedDate) {
                    $accCost += (float)$e['calculated_cost'];
                }
            }

            $burn = $budgetMoney > 0 ? min(100.0, ($accCost / $budgetMoney) * 100) : 0.0;

            // Progreso planificado en tiempo
            $elapsed = $startDate->diff($nodeDate)->days;
            $plannedProgress = min(1.0, $elapsed / $totalDays);

            // Estimar alcance e histórico proporcional
            $nodeScope = min($currentScope, round($plannedProgress * $currentScope * 1.1));
            $nodeSchedule = round($plannedProgress * 100);

            $trendNodes[] = [
                'name' => 'Sem ' . (($i * 4) + 1),
                'alcance' => (float)$nodeScope,
                'cronograma' => (float)$nodeSchedule,
                'presupuesto' => round($burn, 1)
            ];
        }

        return $trendNodes;
    }
}
