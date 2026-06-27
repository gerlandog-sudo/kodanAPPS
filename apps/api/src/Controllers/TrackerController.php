<?php

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\ProjectRepository;
use RuntimeException;

class TrackerController
{
    public function __construct(
        private ProjectRepository $projectRepo,
    ) {}

    /**
     * GET /api/tracker/projects
     *
     * @return array<int, array<string, mixed>>
     */
    public function listProjects(): array
    {
        return $this->projectRepo->listAllWithMetrics();
    }

    /**
     * GET /api/tracker/projects/{id}
     *
     * @return array<string, mixed>
     */
    public function getProject(int $id): array
    {
        $project = $this->projectRepo->findById($id);
        if ($project === null) {
            throw new RuntimeException('Proyecto no encontrado.', 404);
        }
        return $project;
    }

    /**
     * POST /api/tracker/projects
     *
     * @param array<string, mixed> $input
     * @return array{success: bool, id: int, message: string}
     */
    public function createProject(array $input): array
    {
        $name = isset($input['name']) && is_scalar($input['name']) ? trim((string)$input['name']) : '';
        if ($name === '') {
            throw new \InvalidArgumentException('El nombre del proyecto es obligatorio.');
        }

        $accountId = isset($input['account_id']) ? (int)$input['account_id'] : 0;
        if ($accountId <= 0) {
            throw new \InvalidArgumentException('El cliente (cuenta) es obligatorio.');
        }

        $data = [
            'name' => $name,
            'description' => isset($input['description']) && is_scalar($input['description']) ? trim((string)$input['description']) : null,
            'account_id' => $accountId,
            'opportunity_id' => isset($input['opportunity_id']) ? (int)$input['opportunity_id'] : null,
            'color_hex' => isset($input['color_hex']) && is_scalar($input['color_hex']) ? trim((string)$input['color_hex']) : '#00694e',
            'budget_hours' => isset($input['budget_hours']) && $input['budget_hours'] !== '' ? (float)$input['budget_hours'] : 0.0,
            'budget_money' => isset($input['budget_money']) && $input['budget_money'] !== '' ? (float)$input['budget_money'] : 0.0,
            'start_date' => isset($input['start_date']) && $input['start_date'] !== '' ? $input['start_date'] : null,
            'end_date' => isset($input['end_date']) && $input['end_date'] !== '' ? $input['end_date'] : null,
            'status' => isset($input['status']) && in_array($input['status'], ['active', 'paused', 'completed'], true) ? $input['status'] : 'active',
        ];

        $id = $this->projectRepo->createProject($data);

        return [
            'success' => true,
            'id' => $id,
            'message' => 'Proyecto creado exitosamente.',
        ];
    }

    /**
     * PATCH /api/tracker/projects/{id}
     *
     * @param int $id
     * @param array<string, mixed> $input
     * @return array{success: bool, message: string}
     */
    public function updateProject(int $id, array $input): array
    {
        $project = $this->projectRepo->findById($id);
        if ($project === null) {
            throw new RuntimeException('Proyecto no encontrado.', 404);
        }

        $data = [];
        if (isset($input['name'])) {
            $name = trim((string)$input['name']);
            if ($name === '') {
                throw new \InvalidArgumentException('El nombre del proyecto es obligatorio.');
            }
            $data['name'] = $name;
        }

        if (array_key_exists('description', $input)) {
            $data['description'] = $input['description'] !== null ? trim((string)$input['description']) : null;
        }

        if (isset($input['account_id'])) {
            $accountId = (int)$input['account_id'];
            if ($accountId <= 0) {
                throw new \InvalidArgumentException('El cliente (cuenta) es obligatorio.');
            }
            $data['account_id'] = $accountId;
        }

        if (array_key_exists('opportunity_id', $input)) {
            $data['opportunity_id'] = $input['opportunity_id'] !== null ? (int)$input['opportunity_id'] : null;
        }

        if (isset($input['color_hex'])) {
            $data['color_hex'] = trim((string)$input['color_hex']);
        }

        if (array_key_exists('budget_hours', $input)) {
            $data['budget_hours'] = $input['budget_hours'] !== '' && $input['budget_hours'] !== null ? (float)$input['budget_hours'] : 0.0;
        }

        if (array_key_exists('budget_money', $input)) {
            $data['budget_money'] = $input['budget_money'] !== '' && $input['budget_money'] !== null ? (float)$input['budget_money'] : 0.0;
        }

        if (array_key_exists('start_date', $input)) {
            $data['start_date'] = $input['start_date'] !== '' && $input['start_date'] !== null ? $input['start_date'] : null;
        }

        if (array_key_exists('end_date', $input)) {
            $data['end_date'] = $input['end_date'] !== '' && $input['end_date'] !== null ? $input['end_date'] : null;
        }

        if (isset($input['status'])) {
            if (!in_array($input['status'], ['active', 'paused', 'completed'], true)) {
                throw new \InvalidArgumentException('Estado inválido.');
            }
            $data['status'] = $input['status'];
        }

        if (!empty($data)) {
            $this->projectRepo->updateProject($id, $data);
        }

        return [
            'success' => true,
            'message' => 'Proyecto actualizado exitosamente.',
        ];
    }

    /**
     * DELETE /api/tracker/projects/{id}
     *
     * @param int $id
     * @return array{success: bool, message: string}
     */
    public function deleteProject(int $id): array
    {
        $project = $this->projectRepo->findById($id);
        if ($project === null) {
            throw new RuntimeException('Proyecto no encontrado.', 404);
        }

        $this->projectRepo->deleteProject($id);

        return [
            'success' => true,
            'message' => 'Proyecto eliminado exitosamente.',
        ];
    }
}
