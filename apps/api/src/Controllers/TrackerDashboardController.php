<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Services\DashboardService;

final class TrackerDashboardController
{
    public function __construct(
        private DashboardService $dashboardService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function kpis(): array
    {
        return $this->dashboardService->getKpis();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function hoursByDay(): array
    {
        $from = isset($_GET['from']) && is_string($_GET['from']) ? trim($_GET['from']) : date('Y-m-d', strtotime('-30 days'));
        $to = isset($_GET['to']) && is_string($_GET['to']) ? trim($_GET['to']) : date('Y-m-d');

        // Validar formato ISO (Y-m-d) para evitar SQL injection o errores
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
            http_response_code(400);
            echo json_encode(['error' => 'Formato de fecha inválido. Use YYYY-MM-DD.']);
            exit;
        }
        if ($from > $to) {
            http_response_code(400);
            echo json_encode(['error' => 'La fecha "desde" no puede ser mayor que "hasta".']);
            exit;
        }

        return $this->dashboardService->getHoursByDay($from, $to);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function projectsByStatus(): array
    {
        return $this->dashboardService->getProjectsByStatus();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function topUsers(): array
    {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;
        return $this->dashboardService->getTopUsers($limit);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function recentEntries(): array
    {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        return $this->dashboardService->getRecentEntries($limit);
    }
}
