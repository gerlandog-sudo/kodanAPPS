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
        $from = $_GET['from'] ?? date('Y-m-d', strtotime('-30 days'));
        $to = $_GET['to'] ?? date('Y-m-d');
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
