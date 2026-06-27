<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\DB\TenantContext;
use kodanAPPS\DB\TenantAwarePDO;

final class DashboardService
{
    public function __construct(
        private TenantAwarePDO $pdo,
    ) {}

    /**
     * @return array<string, mixed>
     */
     public function getKpis(): array
    {
        $tenantId = TenantContext::getTenantId();
        $pdo = $this->pdo;

        $activeProjects = (int)$pdo->query(
            "SELECT COUNT(*) FROM TRACKER_projects WHERE tenant_id = {$tenantId} AND status = 'active'"
        )->fetchColumn();

        $today = date('Y-m-d');
        $weekStart = date('Y-m-d', strtotime('monday this week'));
        $weekEnd = date('Y-m-d', strtotime('sunday this week'));

        $hoursToday = (float)$pdo->query(
            "SELECT COALESCE(SUM(duration_minutes), 0) / 60.0
             FROM TRACKER_time_entries
             WHERE tenant_id = {$tenantId} AND date = '{$today}' AND approval_status != 'rejected'"
        )->fetchColumn();

        $hoursWeek = (float)$pdo->query(
            "SELECT COALESCE(SUM(duration_minutes), 0) / 60.0
             FROM TRACKER_time_entries
             WHERE tenant_id = {$tenantId} AND date >= '{$weekStart}' AND date <= '{$weekEnd}'
               AND approval_status != 'rejected'"
        )->fetchColumn();

        $openTasks = (int)$pdo->query(
            "SELECT COUNT(*) FROM TRACKER_project_tasks
             WHERE tenant_id = {$tenantId} AND kanban_status IN ('todo', 'in_progress')"
        )->fetchColumn();

        $pendingApprovals = (int)$pdo->query(
            "SELECT COUNT(*) FROM TRACKER_time_entries
             WHERE tenant_id = {$tenantId} AND approval_status = 'submitted'"
        )->fetchColumn();

        return [
            'active_projects' => $activeProjects,
            'hours_today' => round($hoursToday, 1),
            'hours_week' => round($hoursWeek, 1),
            'open_tasks' => $openTasks,
            'pending_approvals' => $pendingApprovals,
        ];
    }

    /**
     * @param string $from
     * @param string $to
     * @return array<int, array<string, mixed>>
     */
    public function getHoursByDay(string $from, string $to): array
    {
        $tenantId = TenantContext::getTenantId();
        $rows = $this->pdo->query(
            "SELECT date, ROUND(SUM(duration_minutes) / 60.0, 1) AS hours
             FROM TRACKER_time_entries
             WHERE tenant_id = {$tenantId} AND date >= '{$from}' AND date <= '{$to}'
               AND approval_status != 'rejected'
             GROUP BY date ORDER BY date ASC"
        )->fetchAll();

        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getProjectsByStatus(): array
    {
        $tenantId = TenantContext::getTenantId();
        $rows = $this->pdo->query(
            "SELECT status, COUNT(*) AS count FROM TRACKER_projects
             WHERE tenant_id = {$tenantId} GROUP BY status"
        )->fetchAll();

        return $rows;
    }

    /**
     * @param int $limit
     * @return array<int, array<string, mixed>>
     */
    public function getTopUsers(int $limit = 5): array
    {
        $tenantId = TenantContext::getTenantId();
        $weekStart = date('Y-m-d', strtotime('monday this week'));

        return $this->pdo->query(
            "SELECT te.user_id, u.display_name AS user_name,
                    ROUND(SUM(te.duration_minutes) / 60.0, 1) AS total_hours
             FROM TRACKER_time_entries te
             JOIN users u ON u.id = te.user_id
             WHERE te.tenant_id = {$tenantId}
               AND te.date >= '{$weekStart}'
               AND te.approval_status != 'rejected'
             GROUP BY te.user_id, u.display_name
             ORDER BY total_hours DESC
             LIMIT {$limit}"
        )->fetchAll();
    }

    /**
     * @param int $limit
     * @return array<int, array<string, mixed>>
     */
    public function getRecentEntries(int $limit = 10): array
    {
        $tenantId = TenantContext::getTenantId();
        return $this->pdo->query(
            "SELECT te.*, p.name AS project_name, u.display_name AS user_name
             FROM TRACKER_time_entries te
             JOIN TRACKER_projects p ON p.id = te.project_id
             JOIN users u ON u.id = te.user_id
             WHERE te.tenant_id = {$tenantId}
             ORDER BY te.created_at DESC
             LIMIT {$limit}"
        )->fetchAll();
    }
}
