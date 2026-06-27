<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Services\DashboardService;
use kodanAPPS\Repositories\TimeEntryRepository;
use kodanAPPS\DB\TenantContext;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

final class ReportController
{
    public function __construct(
        private TimeEntryRepository $timeEntryRepo,
    ) {}

    public function byProject(): void
    {
        $projectId = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;
        $from = $_GET['from'] ?? date('Y-m-01');
        $to = $_GET['to'] ?? date('Y-m-t');
        $filters = ['date_from' => $from, 'date_to' => $to];
        if ($projectId) $filters['project_id'] = $projectId;
        $entries = $this->timeEntryRepo->findFiltered($filters, 1, 10000);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Horas por Proyecto');
        $sheet->fromArray(['Proyecto', 'Usuario', 'Fecha', 'Horas', 'Minutos', 'Costo', 'Descripción'], null, 'A1');
        $row = 2;
        foreach ($entries as $e) {
            $sheet->setCellValue("A{$row}", $e['project_name'] ?? '');
            $sheet->setCellValue("B{$row}", $e['user_name'] ?? '');
            $sheet->setCellValue("C{$row}", $e['date'] ?? '');
            $sheet->setCellValue("D{$row}", (int)($e['duration_minutes'] / 60));
            $sheet->setCellValue("E{$row}", $e['duration_minutes'] % 60);
            $sheet->setCellValue("F{$row}", $e['calculated_cost'] ?? 0);
            $sheet->setCellValue("G{$row}", $e['description'] ?? '');
            $row++;
        }
        foreach (range('A', 'G') as $col) $sheet->getColumnDimension($col)->setAutoSize(true);

        $this->output($spreadsheet, 'horas-por-proyecto.xlsx');
    }

    public function byUser(): void
    {
        $from = $_GET['from'] ?? date('Y-m-01');
        $to = $_GET['to'] ?? date('Y-m-t');
        $entries = $this->timeEntryRepo->findFiltered(['date_from' => $from, 'date_to' => $to], 1, 10000);

        $grouped = [];
        foreach ($entries as $e) {
            $u = $e['user_name'] ?? 'Desconocido';
            if (!isset($grouped[$u])) $grouped[$u] = ['minutes' => 0, 'cost' => 0.0];
            $grouped[$u]['minutes'] += $e['duration_minutes'];
            $grouped[$u]['cost'] += $e['calculated_cost'] ?? 0;
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Horas por Usuario');
        $sheet->fromArray(['Usuario', 'Horas', 'Minutos', 'Costo Total'], null, 'A1');
        $row = 2;
        foreach ($grouped as $name => $data) {
            $sheet->setCellValue("A{$row}", $name);
            $sheet->setCellValue("B{$row}", (int)($data['minutes'] / 60));
            $sheet->setCellValue("C{$row}", $data['minutes'] % 60);
            $sheet->setCellValue("D{$row}", $data['cost']);
            $row++;
        }
        foreach (range('A', 'D') as $col) $sheet->getColumnDimension($col)->setAutoSize(true);

        $this->output($spreadsheet, 'horas-por-usuario.xlsx');
    }

    public function byClient(): void
    {
        $from = $_GET['from'] ?? date('Y-m-01');
        $to = $_GET['to'] ?? date('Y-m-t');

        $sql = "SELECT te.*, p.name AS project_name, u.display_name AS user_name,
                       a.name AS account_name
                FROM TRACKER_time_entries te
                JOIN TRACKER_projects p ON p.id = te.project_id
                LEFT JOIN accounts a ON a.account_id = p.account_id
                LEFT JOIN users u ON u.id = te.user_id
                WHERE te.tenant_id = :tenant_id AND te.date >= :dfrom AND te.date <= :dto
                ORDER BY te.date DESC LIMIT 10000";
        $entries = $this->timeEntryRepo->rawSelect($sql, [':dfrom' => $from, ':dto' => $to]);

        $grouped = [];
        foreach ($entries as $e) {
            $c = !empty($e['account_name']) ? $e['account_name'] : 'Sin cliente';
            if (!isset($grouped[$c])) $grouped[$c] = ['minutes' => 0, 'projects' => []];
            $grouped[$c]['minutes'] += $e['duration_minutes'];
            $p = $e['project_name'] ?? '';
            if ($p && !in_array($p, $grouped[$c]['projects'])) $grouped[$c]['projects'][] = $p;
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Horas por Cliente');
        $sheet->fromArray(['Cliente', 'Proyectos', 'Horas', 'Minutos'], null, 'A1');
        $row = 2;
        foreach ($grouped as $name => $data) {
            $sheet->setCellValue("A{$row}", $name);
            $sheet->setCellValue("B{$row}", implode(', ', $data['projects']));
            $sheet->setCellValue("C{$row}", (int)($data['minutes'] / 60));
            $sheet->setCellValue("D{$row}", $data['minutes'] % 60);
            $row++;
        }
        foreach (range('A', 'D') as $col) $sheet->getColumnDimension($col)->setAutoSize(true);

        $this->output($spreadsheet, 'horas-por-cliente.xlsx');
    }

    public function weeklySummary(): void
    {
        $from = $_GET['from'] ?? date('Y-m-d', strtotime('monday this week'));
        $to = $_GET['to'] ?? date('Y-m-d');
        $entries = $this->timeEntryRepo->findFiltered(['date_from' => $from, 'date_to' => $to], 1, 10000);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Resumen Semanal');
        $sheet->fromArray(['Fecha', 'Usuario', 'Proyecto', 'Horas', 'Minutos', 'Costo', 'Estado'], null, 'A1');
        $row = 2;
        $totals = ['minutes' => 0, 'cost' => 0.0];
        foreach ($entries as $e) {
            $sheet->setCellValue("A{$row}", $e['date'] ?? '');
            $sheet->setCellValue("B{$row}", $e['user_name'] ?? '');
            $sheet->setCellValue("C{$row}", $e['project_name'] ?? '');
            $sheet->setCellValue("D{$row}", (int)($e['duration_minutes'] / 60));
            $sheet->setCellValue("E{$row}", $e['duration_minutes'] % 60);
            $sheet->setCellValue("F{$row}", $e['calculated_cost'] ?? 0);
            $sheet->setCellValue("G{$row}", $e['approval_status'] ?? '');
            $totals['minutes'] += $e['duration_minutes'];
            $totals['cost'] += $e['calculated_cost'] ?? 0;
            $row++;
        }
        $sheet->setCellValue("A{$row}", 'TOTAL');
        $sheet->setCellValue("D{$row}", (int)($totals['minutes'] / 60));
        $sheet->setCellValue("E{$row}", $totals['minutes'] % 60);
        $sheet->setCellValue("F{$row}", $totals['cost']);
        $sheet->getStyle("A{$row}:G{$row}")->getFont()->setBold(true);
        foreach (range('A', 'G') as $col) $sheet->getColumnDimension($col)->setAutoSize(true);

        $this->output($spreadsheet, 'resumen-semanal.xlsx');
    }

    private function output(Spreadsheet $spreadsheet, string $filename): void
    {
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header("Content-Disposition: attachment; filename=\"{$filename}\"");
        header('Cache-Control: max-age=0');
        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
        exit;
    }
}
