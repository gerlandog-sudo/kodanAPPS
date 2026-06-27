<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Services\AiService;
use kodanAPPS\DB\TenantContext;
use PDO;

final class TrackerInsightController
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly AiService $aiService,
    ) {}

    /**
     * @return array<int, array<string, mixed>>
     */
    public function heatmap(): array
    {
        $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-7 days'));
        $endDate = $_GET['end_date'] ?? date('Y-m-d');
        $tenantId = TenantContext::getTenantId();

        $users = $this->fetchAll(
            "SELECT u.id, u.display_name AS name, COALESCE(up.hours_capacity, 8) AS weekly_capacity
             FROM users u
             LEFT JOIN TRACKER_user_profiles up ON up.user_id = u.id AND up.tenant_id = u.tenant_id
             WHERE u.tenant_id = :tid AND u.role NOT IN ('super_admin','admin')
             ORDER BY u.display_name",
            [':tid' => $tenantId]
        );

        $entries = $this->fetchAll(
            "SELECT te.user_id, te.date, SUM(te.duration_minutes) / 60.0 AS hours
             FROM TRACKER_time_entries te
             WHERE te.tenant_id = :tid AND te.date >= :dfrom AND te.date <= :dto
               AND te.approval_status != 'rejected'
             GROUP BY te.user_id, te.date",
            [':tid' => $tenantId, ':dfrom' => $startDate, ':dto' => $endDate]
        );

        $entriesByUser = [];
        foreach ($entries as $e) {
            $entriesByUser[$e['user_id']][$e['date']] = (float) $e['hours'];
        }

        return array_map(function ($user) use ($entriesByUser, $startDate, $endDate) {
            $days = [];
            $current = new \DateTime($startDate);
            $end = new \DateTime($endDate);
            while ($current <= $end) {
                $date = $current->format('Y-m-d');
                $hours = $entriesByUser[$user['id']][$date] ?? 0.0;
                $capacity = (float) $user['weekly_capacity'];
                $saturation = $capacity > 0 ? ($hours / $capacity) * 100 : 0;
                $days[] = [
                    'date' => $date,
                    'hours' => round($hours, 1),
                    'capacity' => $capacity,
                    'saturation' => round($saturation, 0),
                ];
                $current->modify('+1 day');
            }
            return [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'weekly_capacity' => (int) $user['weekly_capacity'],
                'days' => $days,
            ];
        }, $users);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function timelineProjects(): array
    {
        $from = $_GET['from'] ?? date('Y-m-d', strtotime('-15 days'));
        $to = $_GET['to'] ?? date('Y-m-d', strtotime('+15 days'));
        $tenantId = TenantContext::getTenantId();

        $projects = $this->fetchAll(
            "SELECT p.id, p.name, COALESCE(p.budget_hours, 0) AS budget_hours, p.status
             FROM projects p
             WHERE p.tenant_id = :tid AND (p.status IN ('active','paused'))
             ORDER BY p.name",
            [':tid' => $tenantId]
        );

        $result = [];
        foreach ($projects as $p) {
            $data = $this->fetchAll(
                "SELECT te.date, SUM(te.duration_minutes) / 60.0 AS total_hours
                 FROM TRACKER_time_entries te
                 WHERE te.project_id = :pid AND te.tenant_id = :tid AND te.date >= :dfrom AND te.date <= :dto
                   AND te.approval_status != 'rejected'
                 GROUP BY te.date ORDER BY te.date",
                [':pid' => $p['id'], ':tid' => $tenantId, ':dfrom' => $from, ':dto' => $to]
            );

            $actualHours = 0;
            foreach ($data as $d) {
                $actualHours += (float) $d['total_hours'];
            }

            $result[] = [
                'id' => (int) $p['id'],
                'name' => $p['name'],
                'budget_hours' => (float) $p['budget_hours'],
                'actual_hours' => round($actualHours, 1),
                'status' => $p['status'],
                'data' => array_map(fn($d) => [
                    'date' => $d['date'],
                    'total_hours' => round((float) $d['total_hours'], 1),
                ], $data),
            ];
        }

        return $result;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function timelineResources(): array
    {
        $from = $_GET['from'] ?? date('Y-m-d', strtotime('-15 days'));
        $to = $_GET['to'] ?? date('Y-m-d', strtotime('+15 days'));
        $tenantId = TenantContext::getTenantId();

        $users = $this->fetchAll(
            "SELECT u.id, u.display_name AS name, COALESCE(up.hours_capacity, 8) AS weekly_capacity,
                    COALESCE(pos.name, '') AS position_name, COALESCE(sen.name, '') AS seniority_name
             FROM users u
             LEFT JOIN TRACKER_user_profiles up ON up.user_id = u.id AND up.tenant_id = u.tenant_id
             LEFT JOIN TRACKER_positions pos ON pos.id = up.position_id
             LEFT JOIN TRACKER_seniorities sen ON sen.id = up.seniority_id
             WHERE u.tenant_id = :tid AND u.role NOT IN ('super_admin','admin')
             ORDER BY u.display_name",
            [':tid' => $tenantId]
        );

        $result = [];
        foreach ($users as $u) {
            $data = $this->fetchAll(
                "SELECT te.date, SUM(te.duration_minutes) / 60.0 AS total_hours
                 FROM TRACKER_time_entries te
                 WHERE te.user_id = :uid AND te.tenant_id = :tid AND te.date >= :dfrom AND te.date <= :dto
                   AND te.approval_status != 'rejected'
                 GROUP BY te.date ORDER BY te.date",
                [':uid' => $u['id'], ':tid' => $tenantId, ':dfrom' => $from, ':dto' => $to]
            );

            $totalLoad = $this->fetchOne(
                "SELECT SUM(estimated_hours) AS total
                 FROM TRACKER_project_tasks
                 WHERE assigned_to = :uid AND tenant_id = :tid AND kanban_status != 'done'",
                [':uid' => $u['id'], ':tid' => $tenantId]
            );

            $result[] = [
                'id' => (int) $u['id'],
                'name' => $u['name'],
                'position' => $u['position_name'],
                'seniority' => $u['seniority_name'],
                'weekly_capacity' => (int) $u['weekly_capacity'],
                'total_load' => round((float) ($totalLoad['total'] ?? 0), 1),
                'logged_hours' => array_map(fn($d) => [
                    'date' => $d['date'],
                    'total_hours' => round((float) $d['total_hours'], 1),
                ], $data),
            ];
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    public function timelineDetails(): array
    {
        $type = $_GET['type'] ?? 'project';
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        $date = $_GET['date'] ?? date('Y-m-d');
        $tenantId = TenantContext::getTenantId();

        if ($type === 'project') {
            $tasks = $this->fetchAll(
                "SELECT t.id, t.description, t.priority, t.estimated_hours,
                        COALESCE(u.display_name, '') AS collaborator_name
                 FROM TRACKER_project_tasks t
                 LEFT JOIN users u ON u.id = t.assigned_to
                 WHERE t.project_id = :pid AND t.tenant_id = :tid AND t.kanban_status != 'done'",
                [':pid' => $id, ':tid' => $tenantId]
            );

            $entries = $this->fetchAll(
                "SELECT te.id, te.duration_minutes, te.description,
                        COALESCE(u.display_name, '') AS collaborator_name,
                        COALESCE(t.description, '') AS task_name
                 FROM TRACKER_time_entries te
                 LEFT JOIN users u ON u.id = te.user_id
                 LEFT JOIN TRACKER_project_tasks t ON t.id = te.task_id
                 WHERE te.project_id = :pid AND te.tenant_id = :tid AND te.date = :d
                   AND te.approval_status != 'rejected'
                 ORDER BY te.created_at DESC",
                [':pid' => $id, ':tid' => $tenantId, ':d' => $date]
            );
        } else {
            $tasks = $this->fetchAll(
                "SELECT t.id, t.description, t.priority, t.estimated_hours,
                        COALESCE(p.name, '') AS project_name
                 FROM TRACKER_project_tasks t
                 LEFT JOIN projects p ON p.id = t.project_id
                 WHERE t.assigned_to = :uid AND t.tenant_id = :tid AND t.kanban_status != 'done'",
                [':uid' => $id, ':tid' => $tenantId]
            );

            $entries = $this->fetchAll(
                "SELECT te.id, te.duration_minutes, te.description,
                        COALESCE(p.name, '') AS project_name,
                        COALESCE(t.description, '') AS task_name
                 FROM TRACKER_time_entries te
                 LEFT JOIN projects p ON p.id = te.project_id
                 LEFT JOIN TRACKER_project_tasks t ON t.id = te.task_id
                 WHERE te.user_id = :uid AND te.tenant_id = :tid AND te.date = :d
                   AND te.approval_status != 'rejected'
                 ORDER BY te.created_at DESC",
                [':uid' => $id, ':tid' => $tenantId, ':d' => $date]
            );
        }

        return [
            'tasks' => $tasks,
            'entries' => array_map(fn($e) => [
                'id' => $e['id'],
                'hours' => round((int) $e['duration_minutes'] / 60, 1),
                'description' => $e['description'] ?? '',
                'collaborator_name' => $e['collaborator_name'] ?? $e['project_name'] ?? '',
                'task_name' => $e['task_name'] ?? '',
            ], $entries),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function reassignSuggestions(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $tenantId = TenantContext::getTenantId();

        if (isset($input['project_id'])) {
            $projectId = (int) $input['project_id'];
            $project = $this->fetchOne(
                "SELECT p.name AS project_name, p.budget_hours,
                        COALESCE(SUM(te.duration_minutes) / 60.0, 0) AS consumed_hours
                 FROM projects p
                 LEFT JOIN TRACKER_time_entries te ON te.project_id = p.id AND te.tenant_id = p.tenant_id AND te.approval_status != 'rejected'
                 WHERE p.id = :pid AND p.tenant_id = :tid
                 GROUP BY p.id",
                [':pid' => $projectId, ':tid' => $tenantId]
            );

            if (!$project) {
                return ['error' => 'Proyecto no encontrado'];
            }

            $consumedPercent = $project['budget_hours'] > 0
                ? round(((float) $project['consumed_hours'] / (float) $project['budget_hours']) * 100, 1)
                : 0;

            $prompt = "Eres un Analista Senior de Proyectos SaaS.\n"
                . "Analiza la salud del proyecto '{$project['project_name']}':\n\n"
                . "- Presupuesto: {$project['budget_hours']}h\n"
                . "- Consumido: {$project['consumed_hours']}h ({$consumedPercent}%)\n"
                . ($consumedPercent > 80 ? "- ALERTA: Consumo crítico cercano al límite.\n" : "")
                . "- Fecha del reporte: " . date('Y-m-d') . "\n\n"
                . "Genera un reporte de salud con:\n"
                . "1. Evaluación del estado actual del proyecto.\n"
                . "2. Riesgos identificados.\n"
                . "3. Recomendación estratégica.\n\n"
                . "Formato: Markdown con secciones numeradas.\n"
                . "IMPORTANTE: Responde en español. Termina con <RESULTADO>[conclusión final]</RESULTADO>";

            $insight = '';
            try {
                $insight = $this->aiService->generateText($prompt);
            } catch (\Throwable $e) {
                $insight = "No se pudo generar insight IA: " . $e->getMessage();
            }

            return [
                'project_name' => $project['project_name'],
                'consumed_hours' => round((float) $project['consumed_hours'], 1),
                'budget_hours' => (float) $project['budget_hours'],
                'consumed_percent' => $consumedPercent,
                'ai_insight' => $insight,
            ];
        }

        if (isset($input['task_id'])) {
            $taskId = (int) $input['task_id'];
            $task = $this->fetchOne(
                "SELECT t.id, t.description, t.estimated_hours, t.assigned_to
                 FROM TRACKER_project_tasks t
                 WHERE t.id = :tid AND t.tenant_id = :tnid",
                [':tid' => $taskId, ':tnid' => $tenantId]
            );

            if (!$task) {
                return ['error' => 'Tarea no encontrada'];
            }

            $candidates = $this->fetchAll(
                "SELECT u.id, u.display_name AS name, COALESCE(up.hours_capacity, 8) AS weekly_capacity,
                        COALESCE(SUM(pt.estimated_hours), 0) AS current_load
                 FROM users u
                 LEFT JOIN TRACKER_user_profiles up ON up.user_id = u.id AND up.tenant_id = u.tenant_id
                 LEFT JOIN TRACKER_project_tasks pt ON pt.assigned_to = u.id AND pt.tenant_id = u.tenant_id AND pt.kanban_status != 'done'
                 WHERE u.tenant_id = :tid AND u.role NOT IN ('super_admin','admin') AND u.id != :uid
                 GROUP BY u.id
                 ORDER BY current_load ASC
                 LIMIT 5",
                [':tid' => $tenantId, ':uid' => (int) $task['assigned_to']]
            );

            $prompt = "Eres un experto en gestión de equipos IT.\n"
                . "Analiza la reasignación de la tarea '{$task['description']}' (estimado: {$task['estimated_hours']}h).\n"
                . (!empty($candidates) ? "Candidatos disponibles:\n" . implode("\n", array_map(fn($c) => "- {$c['name']}: {$c['current_load']}h carga actual", $candidates)) : "No hay candidatos disponibles.") . "\n\n"
                . "Da una recomendación de reasignación. Responde en español. Termina con <RESULTADO>[recomendación]</RESULTADO>";

            $insight = '';
            try {
                $insight = $this->aiService->generateText($prompt);
            } catch (\Throwable $e) {
                $insight = "No se pudo generar recomendación IA: " . $e->getMessage();
            }

            return [
                'task' => $task,
                'candidates' => $candidates,
                'ai_insight' => $insight,
            ];
        }

        return ['error' => 'Se requiere project_id o task_id'];
    }

    /**
     * @return array<string, mixed>
     */
    public function reassignExecute(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $taskId = isset($input['task_id']) ? (int) $input['task_id'] : 0;
        $userId = isset($input['user_id']) ? (int) $input['user_id'] : 0;
        $tenantId = TenantContext::getTenantId();

        if (!$taskId || !$userId) {
            return ['error' => 'Se requiere task_id y user_id'];
        }

        $stmt = $this->pdo->prepare(
            "UPDATE TRACKER_project_tasks SET assigned_to = :uid WHERE id = :tid AND tenant_id = :tnid"
        );
        $stmt->execute([':uid' => $userId, ':tid' => $taskId, ':tnid' => $tenantId]);

        return ['success' => true, 'task_id' => $taskId, 'new_user_id' => $userId];
    }

    /**
     * @return array<string, mixed>
     */
    public function predictiveAlerts(): array
    {
        $tenantId = TenantContext::getTenantId();

        $projects = $this->fetchAll(
            "SELECT id, name, budget_hours FROM projects
             WHERE tenant_id = :tid AND module = 'tracker' AND budget_hours > 0 AND status = 'active'",
            [':tid' => $tenantId]
        );

        $stmt = $this->pdo->prepare("SELECT id FROM TRACKER_seniorities WHERE tenant_id = :tid AND (name LIKE '%Senior%' OR name LIKE '%senior%') LIMIT 1");
        $stmt->execute([':tid' => $tenantId]);
        $seniorRow = $stmt->fetch(PDO::FETCH_ASSOC);
        $seniorityId = $seniorRow ? (int) $seniorRow['id'] : 0;

        $alerts = [];
        foreach ($projects as $p) {
            $consumed = $this->fetchOne(
                "SELECT COALESCE(SUM(duration_minutes) / 60.0, 0) AS total
                 FROM TRACKER_time_entries
                 WHERE project_id = :pid AND approval_status IN ('submitted','approved')",
                [':pid' => $p['id']]
            );

            $avgWeekly = $this->fetchOne(
                "SELECT COALESCE(SUM(duration_minutes) / 60.0 / 4, 0) AS avg_weekly
                 FROM TRACKER_time_entries
                 WHERE project_id = :pid AND approval_status IN ('submitted','approved')
                   AND date >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)",
                [':pid' => $p['id']]
            );

            $totalHours = $this->fetchOne(
                "SELECT COALESCE(SUM(duration_minutes) / 60.0, 0) AS total_hours
                 FROM TRACKER_time_entries
                 WHERE project_id = :pid AND approval_status != 'rejected'",
                [':pid' => $p['id']]
            );

            $seniorHours = 0;
            if ($seniorityId > 0) {
                $row = $this->fetchOne(
                    "SELECT COALESCE(SUM(te.duration_minutes) / 60.0, 0) AS senior_hours
                     FROM TRACKER_time_entries te
                     JOIN TRACKER_user_profiles up ON up.user_id = te.user_id AND up.tenant_id = te.tenant_id
                     WHERE te.project_id = :pid AND te.approval_status != 'rejected' AND up.seniority_id = :sid",
                    [':pid' => $p['id'], ':sid' => $seniorityId]
                );
                $seniorHours = (float) ($row['senior_hours'] ?? 0);
            }

            $consumedHours = (float) ($consumed['total'] ?? 0);
            $avgWeeklyHours = (float) ($avgWeekly['avg_weekly'] ?? 0);
            $totalH = (float) ($totalHours['total_hours'] ?? 0);
            $budgetHours = (float) $p['budget_hours'];
            $exhaustedPct = $budgetHours > 0 ? round(($consumedHours / $budgetHours) * 100, 1) : 0;
            $seniorPct = $totalH > 0 ? round(($seniorHours / $totalH) * 100, 0) : 0;
            $weeksToDepletion = $avgWeeklyHours > 0 ? round(($budgetHours - $consumedHours) / $avgWeeklyHours, 0) : 'Indefinido';

            $priority = $exhaustedPct > 80 ? 'High' : ($exhaustedPct > 50 ? 'Medium' : 'Low');

            $alerts[] = [
                'projectId' => (int) $p['id'],
                'projectName' => $p['name'],
                'priority' => $priority,
                'metrics' => [
                    'budget_hours' => $budgetHours,
                    'consumed_hours' => $consumedHours,
                    'budget_exhausted_percent' => $exhaustedPct,
                    'avg_weekly_hours' => $avgWeeklyHours,
                    'weeks_to_depletion' => $weeksToDepletion,
                    'seniority_mix' => ['senior_percent' => $seniorPct],
                ],
            ];
        }

        return ['alerts' => $alerts];
    }

    /**
     * @return array<string, mixed>
     */
    public function generateText(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $prompt = $input['prompt'] ?? '';

        if (empty($prompt)) {
            return ['error' => 'El campo prompt es requerido'];
        }

        try {
            $text = $this->aiService->generateText($prompt);
            return ['success' => true, 'text' => $text];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * @param array<string, mixed> $params
     * @return array<int, array<string, mixed>>
     */
    private function fetchAll(string $sql, array $params = []): array
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>|null
     */
    private function fetchOne(string $sql, array $params = []): ?array
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}
