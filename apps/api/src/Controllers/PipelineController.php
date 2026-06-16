<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\PipelineRepository;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;
use RuntimeException;

final class PipelineController
{
    private PipelineRepository $pipelineRepo;

    public function __construct(PipelineRepository $pipelineRepo)
    {
        $this->pipelineRepo = $pipelineRepo;
    }

    /**
     * GET /api/crm/pipelines
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listPipelines(): array
    {
        return $this->pipelineRepo->listPipelines();
    }

    /**
     * GET /api/crm/pipelines/{id}
     * 
     * @return array<string, mixed>
     */
    public function getPipeline(int $id): array
    {
        $pipeline = $this->pipelineRepo->findPipelineById($id);
        if ($pipeline === null) {
            throw new RuntimeException('Pipeline no encontrado.', 404);
        }
        return $pipeline;
    }

    /**
     * POST /api/crm/pipelines
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, id: int, message: string}
     */
    public function createPipeline(array $input): array
    {
        $name = isset($input['name']) && is_scalar($input['name']) ? trim((string)$input['name']) : '';
        if ($name === '') {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos faltantes',
                'errors' => ['name' => 'El nombre del pipeline es requerido.']
            ], JSON_UNESCAPED_UNICODE));
        }

        $data = [
            'name' => $name,
            'is_default' => isset($input['is_default']) && is_scalar($input['is_default']) ? ((int)$input['is_default'] === 1 ? 1 : 0) : 0,
        ];

        $id = $this->pipelineRepo->createPipeline($data);

        return [
            'success' => true,
            'id' => $id,
            'message' => 'Pipeline creado exitosamente.'
        ];
    }

    /**
     * PATCH/PUT /api/crm/pipelines/{id}
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, affected: int, message: string}
     */
    public function updatePipeline(int $id, array $input): array
    {
        $pipeline = $this->pipelineRepo->findPipelineById($id);
        if ($pipeline === null) {
            throw new RuntimeException('Pipeline no encontrado.', 404);
        }

        $data = [];
        if (isset($input['name'])) {
            $name = is_scalar($input['name']) ? trim((string)$input['name']) : '';
            if ($name === '') {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['name' => 'El nombre no puede estar vacío.']
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['name'] = $name;
        }

        if (isset($input['is_default'])) {
            $data['is_default'] = is_scalar($input['is_default']) && (int)$input['is_default'] === 1 ? 1 : 0;
        }

        if (empty($data)) {
            return [
                'success' => true,
                'affected' => 0,
                'message' => 'No se enviaron campos para actualizar.'
            ];
        }

        $affected = $this->pipelineRepo->updatePipeline($id, $data);

        return [
            'success' => true,
            'affected' => $affected,
            'message' => 'Pipeline actualizado exitosamente.'
        ];
    }

    /**
     * DELETE /api/crm/pipelines/{id}
     * 
     * @return array{success: bool, message: string}
     */
    public function deletePipeline(int $id): array
    {
        $pipeline = $this->pipelineRepo->findPipelineById($id);
        if ($pipeline === null) {
            throw new RuntimeException('Pipeline no encontrado.', 404);
        }

        $this->pipelineRepo->deletePipeline($id);

        return [
            'success' => true,
            'message' => 'Pipeline eliminado exitosamente.'
        ];
    }

    /**
     * GET /api/crm/pipelines/{id}/stages
     * 
     * @return array<int, array<string, mixed>>
     */
    public function listStages(int $pipelineId): array
    {
        return $this->pipelineRepo->listStages($pipelineId);
    }

    /**
     * GET /api/crm/pipeline-stages/{id}
     * 
     * @return array<string, mixed>
     */
    public function getStage(int $id): array
    {
        $stage = $this->pipelineRepo->findStageById($id);
        if ($stage === null) {
            throw new RuntimeException('Etapa de pipeline no encontrada.', 404);
        }
        return $stage;
    }

    /**
     * POST /api/crm/pipelines/{id}/stages
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, id: int, message: string}
     */
    public function createStage(int $pipelineId, array $input): array
    {
        $pipeline = $this->pipelineRepo->findPipelineById($pipelineId);
        if ($pipeline === null) {
            throw new RuntimeException('Pipeline no encontrado.', 404);
        }

        $name = isset($input['name']) && is_scalar($input['name']) ? trim((string)$input['name']) : '';
        $colorHex = isset($input['color_hex']) && is_scalar($input['color_hex']) ? trim((string)$input['color_hex']) : '#3b82f6';
        if ($name === '') {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos faltantes',
                'errors' => ['name' => 'El nombre de la etapa es requerido.']
            ], JSON_UNESCAPED_UNICODE));
        }

        $data = [
            'pipeline_id' => $pipelineId,
            'name' => $name,
            'color_hex' => $colorHex,
            'sort_order' => isset($input['sort_order']) && is_scalar($input['sort_order']) ? (int)$input['sort_order'] : 0,
            'is_won_stage' => isset($input['is_won_stage']) && is_scalar($input['is_won_stage']) ? ((int)$input['is_won_stage'] === 1 ? 1 : 0) : 0,
        ];

        $id = $this->pipelineRepo->createStage($data);

        return [
            'success' => true,
            'id' => $id,
            'message' => 'Etapa de pipeline creada exitosamente.'
        ];
    }

    /**
     * PATCH/PUT /api/crm/pipeline-stages/{id}
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, affected: int, message: string}
     */
    public function updateStage(int $id, array $input): array
    {
        $stage = $this->pipelineRepo->findStageById($id);
        if ($stage === null) {
            throw new RuntimeException('Etapa de pipeline no encontrada.', 404);
        }

        $data = [];
        if (isset($input['name'])) {
            $name = is_scalar($input['name']) ? trim((string)$input['name']) : '';
            if ($name === '') {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['name' => 'El nombre no puede estar vacío.']
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['name'] = $name;
        }

        if (isset($input['color_hex']) && is_scalar($input['color_hex'])) {
            $data['color_hex'] = trim((string)$input['color_hex']);
        }
        if (isset($input['sort_order']) && is_scalar($input['sort_order'])) {
            $data['sort_order'] = (int)$input['sort_order'];
        }
        if (isset($input['is_won_stage']) && is_scalar($input['is_won_stage'])) {
            $data['is_won_stage'] = (int)$input['is_won_stage'] === 1 ? 1 : 0;
        }

        if (empty($data)) {
            return [
                'success' => true,
                'affected' => 0,
                'message' => 'No se enviaron campos para actualizar.'
            ];
        }

        $affected = $this->pipelineRepo->updateStage($id, $data);

        return [
            'success' => true,
            'affected' => $affected,
            'message' => 'Etapa de pipeline actualizada exitosamente.'
        ];
    }

    /**
     * DELETE /api/crm/pipeline-stages/{id}
     * 
     * @return array{success: bool, message: string}
     */
    public function deleteStage(int $id): array
    {
        $stage = $this->pipelineRepo->findStageById($id);
        if ($stage === null) {
            throw new RuntimeException('Etapa de pipeline no encontrada.', 404);
        }

        $this->pipelineRepo->deleteStage($id);

        return [
            'success' => true,
            'message' => 'Etapa de pipeline eliminada exitosamente.'
        ];
    }

    /**
     * PUT /api/crm/pipeline-stages
     * 
     * Bulk update: crear, actualizar, reordenar y eliminar etapas de un pipeline en una transaccion.
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, message: string}
     */
    public function bulkUpdateStages(array $input): array
    {
        $pipelineId = isset($input['pipeline_id']) ? (int)$input['pipeline_id'] : 0;
        $stages = $input['stages'] ?? [];

        if ($pipelineId === 0) {
            throw new InvalidArgumentException('pipeline_id es requerido.');
        }
        if (!is_array($stages)) {
            throw new InvalidArgumentException('stages debe ser un array.');
        }

        $pipeline = $this->pipelineRepo->findPipelineById($pipelineId);
        if ($pipeline === null) {
            throw new RuntimeException('Pipeline no encontrado.', 404);
        }

        // Validar: exactamente 1 Won + exactamente 1 Lost, no pueden ser la misma
        $wonCount = 0;
        $lostCount = 0;
        $bothCount = 0;
        foreach ($stages as $s) {
            $isWon = isset($s['is_won_stage']) && (int)$s['is_won_stage'] === 1;
            $isLost = isset($s['is_lost_stage']) && (int)$s['is_lost_stage'] === 1;
            if ($isWon) $wonCount++;
            if ($isLost) $lostCount++;
            if ($isWon && $isLost) $bothCount++;
        }
        if ($wonCount !== 1) {
            throw new InvalidArgumentException('Debe haber exactamente 1 etapa Ganada.');
        }
        if ($lostCount !== 1) {
            throw new InvalidArgumentException('Debe haber exactamente 1 etapa Perdida.');
        }
        if ($bothCount > 0) {
            throw new InvalidArgumentException('Una etapa no puede ser Ganada y Perdida a la vez.');
        }

        $this->pipelineRepo->bulkUpdateStages($pipelineId, $stages);

        return [
            'success' => true,
            'message' => 'Etapas actualizadas exitosamente.',
        ];
    }
}
