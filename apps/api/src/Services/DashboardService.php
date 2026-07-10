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

        $stmt = $pdo->prepare(
            "SELECT COUNT(*) FROM TRACKER_projects WHERE tenant_id = :tenant_id AND status = 'active'"
        );
        $stmt->execute([':tenant_id' => $tenantId]);
        $activeProjects = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT name FROM TRACKER_projects WHERE tenant_id = :tenant_id AND status = 'active' LIMIT 5"
        );
        $stmt->execute([':tenant_id' => $tenantId]);
        $activeProjectsDetails = $stmt->fetchAll(\PDO::FETCH_COLUMN);

        $today = date('Y-m-d');
        $weekStart = date('Y-m-d', strtotime('monday this week'));
        $weekEnd = date('Y-m-d', strtotime('sunday this week'));

        $stmt = $pdo->prepare(
            "SELECT COALESCE(SUM(duration_minutes), 0) / 60.0
             FROM TRACKER_time_entries
             WHERE tenant_id = :tenant_id AND date = :today AND approval_status != 'rejected'"
        );
        $stmt->execute([':tenant_id' => $tenantId, ':today' => $today]);
        $hoursToday = (float)$stmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT p.name, ROUND(SUM(te.duration_minutes) / 60.0, 1) AS hours
             FROM TRACKER_time_entries te
             JOIN TRACKER_projects p ON p.id = te.project_id
             WHERE te.tenant_id = :tenant_id AND te.date = :today AND te.approval_status != 'rejected'
             GROUP BY p.name LIMIT 5"
        );
        $stmt->execute([':tenant_id' => $tenantId, ':today' => $today]);
        $hoursTodayDetails = $stmt->fetchAll();

        $stmt = $pdo->prepare(
            "SELECT COALESCE(SUM(duration_minutes), 0) / 60.0
             FROM TRACKER_time_entries
             WHERE tenant_id = :tenant_id AND date >= :week_start AND date <= :week_end
               AND approval_status != 'rejected'"
        );
        $stmt->execute([':tenant_id' => $tenantId, ':week_start' => $weekStart, ':week_end' => $weekEnd]);
        $hoursWeek = (float)$stmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT p.name, ROUND(SUM(te.duration_minutes) / 60.0, 1) AS hours
             FROM TRACKER_time_entries te
             JOIN TRACKER_projects p ON p.id = te.project_id
             WHERE te.tenant_id = :tenant_id AND te.date >= :week_start AND te.date <= :week_end
               AND te.approval_status != 'rejected'
             GROUP BY p.name LIMIT 5"
        );
        $stmt->execute([':tenant_id' => $tenantId, ':week_start' => $weekStart, ':week_end' => $weekEnd]);
        $hoursWeekDetails = $stmt->fetchAll();

        $stmt = $pdo->prepare(
            "SELECT COUNT(*) FROM TRACKER_project_tasks
             WHERE tenant_id = :tenant_id AND kanban_status IN ('todo', 'in_progress')"
        );
        $stmt->execute([':tenant_id' => $tenantId]);
        $openTasks = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT p.name, COUNT(*) AS count
             FROM TRACKER_project_tasks t
             JOIN TRACKER_projects p ON p.id = t.project_id
             WHERE t.tenant_id = :tenant_id AND t.kanban_status IN ('todo', 'in_progress')
             GROUP BY p.name LIMIT 5"
        );
        $stmt->execute([':tenant_id' => $tenantId]);
        $openTasksDetails = $stmt->fetchAll();

        $stmt = $pdo->prepare(
            "SELECT COUNT(*) FROM TRACKER_time_entries
             WHERE tenant_id = :tenant_id AND approval_status = 'submitted'"
        );
        $stmt->execute([':tenant_id' => $tenantId]);
        $pendingApprovals = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare(
            "SELECT u.display_name AS name, COUNT(*) AS count
             FROM TRACKER_time_entries te
             JOIN users u ON u.id = te.user_id
             WHERE te.tenant_id = :tenant_id AND te.approval_status = 'submitted'
             GROUP BY u.display_name LIMIT 5"
        );
        $stmt->execute([':tenant_id' => $tenantId]);
        $pendingApprovalsDetails = $stmt->fetchAll();

        return [
            'active_projects' => $activeProjects,
            'active_projects_details' => $activeProjectsDetails,
            'hours_today' => round($hoursToday, 1),
            'hours_today_details' => $hoursTodayDetails,
            'hours_week' => round($hoursWeek, 1),
            'hours_week_details' => $hoursWeekDetails,
            'open_tasks' => $openTasks,
            'open_tasks_details' => $openTasksDetails,
            'pending_approvals' => $pendingApprovals,
            'pending_approvals_details' => $pendingApprovalsDetails,
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
        $stmt = $this->pdo->prepare(
            "SELECT date, ROUND(SUM(duration_minutes) / 60.0, 1) AS hours
             FROM TRACKER_time_entries
             WHERE tenant_id = :tenant_id AND date >= :from_date AND date <= :to_date
               AND approval_status != 'rejected'
             GROUP BY date ORDER BY date ASC"
        );
        $stmt->execute([':tenant_id' => $tenantId, ':from_date' => $from, ':to_date' => $to]);
        return $stmt->fetchAll();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getProjectsByStatus(): array
    {
        $tenantId = TenantContext::getTenantId();
        $stmt = $this->pdo->prepare(
            "SELECT status, COUNT(*) AS count FROM TRACKER_projects
             WHERE tenant_id = :tenant_id GROUP BY status"
        );
        $stmt->execute([':tenant_id' => $tenantId]);
        return $stmt->fetchAll();
    }

    /**
     * @param int $limit
     * @return array<int, array<string, mixed>>
     */
    public function getTopUsers(int $limit = 5): array
    {
        $tenantId = TenantContext::getTenantId();
        $weekStart = date('Y-m-d', strtotime('monday this week'));
        $stmt = $this->pdo->prepare(
            "SELECT te.user_id, u.display_name AS user_name,
                    ROUND(SUM(te.duration_minutes) / 60.0, 1) AS total_hours
             FROM TRACKER_time_entries te
             JOIN users u ON u.id = te.user_id
             WHERE te.tenant_id = :tenant_id
               AND te.date >= :week_start
               AND te.approval_status != 'rejected'
             GROUP BY te.user_id, u.display_name
             ORDER BY total_hours DESC
             LIMIT :limit_num"
        );
        $stmt->bindValue(':tenant_id', $tenantId, \PDO::PARAM_INT);
        $stmt->bindValue(':week_start', $weekStart, \PDO::PARAM_STR);
        $stmt->bindValue(':limit_num', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * @param int $limit
     * @return array<int, array<string, mixed>>
     */
    public function getRecentEntries(int $limit = 10): array
    {
        $tenantId = TenantContext::getTenantId();
        $stmt = $this->pdo->prepare(
            "SELECT te.*, p.name AS project_name, u.display_name AS user_name
             FROM TRACKER_time_entries te
             JOIN TRACKER_projects p ON p.id = te.project_id
             JOIN users u ON u.id = te.user_id
             WHERE te.tenant_id = :tenant_id
             ORDER BY te.created_at DESC
             LIMIT :limit_num"
        );
        $stmt->bindValue(':tenant_id', $tenantId, \PDO::PARAM_INT);
        $stmt->bindValue(':limit_num', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
