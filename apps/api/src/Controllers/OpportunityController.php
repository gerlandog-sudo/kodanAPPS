<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\OpportunityRepository;
use kodanAPPS\Repositories\PipelineRepository;
use kodanAPPS\Controllers\CrmController;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;
use RuntimeException;

final class OpportunityController
{
    private OpportunityRepository $opportunityRepo;
    private PipelineRepository $pipelineRepo;
    private CrmController $crmController;

    public function __construct(
        OpportunityRepository $opportunityRepo,
        PipelineRepository $pipelineRepo,
        CrmController $crmController
    ) {
        $this->opportunityRepo = $opportunityRepo;
        $this->pipelineRepo = $pipelineRepo;
        $this->crmController = $crmController;
    }

    /**
     * GET /api/crm/opportunities
     * 
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        $pipelineId = isset($_GET['pipeline_id']) ? (int)$_GET['pipeline_id'] : 0;
        $includeArchived = isset($_GET['include_archived']) && $_GET['include_archived'] === '1';
        $opps = $this->opportunityRepo->listAll($pipelineId, $includeArchived);
        return array_map([$this, 'mapOpportunity'], $opps);
    }

    /**
     * GET /api/crm/opportunities/{id}
     * 
     * @return array<string, mixed>
     */
    public function get(int $id): array
    {
        $opp = $this->opportunityRepo->findById($id);
        if ($opp === null) {
            throw new RuntimeException('Oportunidad no encontrada.', 404);
        }

        // Decodificar custom_fields si viene como string
        if (isset($opp['custom_fields']) && is_string($opp['custom_fields'])) {
            $opp['custom_fields'] = json_decode($opp['custom_fields'], true) ?? [];
        }

        // Obtener ítems asociados
        $opp['items'] = $this->opportunityRepo->getOpportunityLineItems($id);

        return $this->mapOpportunity($opp);
    }

    /**
     * Mapea campos heredados y calcula el status de la oportunidad dinámicamente
     */
    private function mapOpportunity(array $opp): array
    {
        $opp['name'] = $opp['title'] ?? '';
        if (isset($opp['is_lost_stage']) && (int)$opp['is_lost_stage'] === 1) {
            $opp['status'] = 'lost';
        } elseif (isset($opp['is_won_stage']) && (int)$opp['is_won_stage'] === 1) {
            $opp['status'] = 'won';
        } else {
            $opp['status'] = 'open';
        }
        $opp['is_archived'] = isset($opp['archived_at']) && $opp['archived_at'] !== null;
        return $opp;
    }

    /**
     * POST /api/crm/opportunities
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, id: int, message: string}
     */
    public function create(array $input): array
    {
        $accountId = isset($input['account_id']) && is_scalar($input['account_id']) ? (int)$input['account_id'] : 0;
        $pipelineStageId = isset($input['pipeline_stage_id']) && is_scalar($input['pipeline_stage_id']) ? (int)$input['pipeline_stage_id'] : 0;
        $title = isset($input['title']) && is_scalar($input['title']) ? trim((string)$input['title']) : '';
        if ($title === '' && isset($input['name']) && is_scalar($input['name'])) {
            $title = trim((string)$input['name']);
        }
        $value = isset($input['value']) && is_scalar($input['value']) ? (float)$input['value'] : 0.00;
        $currency = isset($input['currency']) && is_scalar($input['currency']) ? trim((string)$input['currency']) : 'USD';

        $errors = [];
        if ($accountId <= 0) {
            $errors['account_id'] = 'La cuenta asociada es requerida.';
        }
        if ($pipelineStageId <= 0) {
            $errors['pipeline_stage_id'] = 'La etapa del pipeline es requerida.';
        }
        if ($title === '') {
            $errors['title'] = 'El título de la oportunidad es requerido.';
        }

        if (!empty($errors)) {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos faltantes',
                'errors' => $errors
            ], JSON_UNESCAPED_UNICODE));
        }

        $tenantId = TenantContext::getTenantId();

        // VALIDACIÓN ATÓMICA DE LÍMITES
        $this->crmController->checkAndIncrementNegotiationsLimit($tenantId);

        try {
            $customFields = isset($input['custom_fields']) && is_array($input['custom_fields']) ? $input['custom_fields'] : [];
            $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : null;

            $data = [
                'account_id' => $accountId,
                'contact_id' => isset($input['contact_id']) && is_scalar($input['contact_id']) && (int)$input['contact_id'] > 0 ? (int)$input['contact_id'] : null,
                'pipeline_stage_id' => $pipelineStageId,
                'title' => $title,
                'value' => $value,
                'currency' => $currency,
                'close_date' => isset($input['close_date']) && is_scalar($input['close_date']) ? trim((string)$input['close_date']) : null,
                'owner_user_id' => isset($input['owner_user_id']) && is_scalar($input['owner_user_id']) && (int)$input['owner_user_id'] > 0 ? (int)$input['owner_user_id'] : TenantContext::getUserId(),
                'custom_fields' => $customFields,
            ];

            $id = $this->opportunityRepo->createOpportunity($data);

            // Guardar ítems si se proporcionan en la creación
            if (is_array($items)) {
                $this->opportunityRepo->saveOpportunityLineItems($id, $items);
            }

            return [
                'success' => true,
                'id' => $id,
                'message' => 'Oportunidad creada exitosamente.'
            ];
        } catch (\Throwable $e) {
            // Revertir el contador del plan si la inserción falló
            $this->crmController->decrementNegotiationsLimit($tenantId);
            throw $e;
        }
    }

    /**
     * PATCH/PUT /api/crm/opportunities/{id}
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, affected: int, message: string}
     */
    public function update(int $id, array $input): array
    {
        $opp = $this->opportunityRepo->findById($id);
        if ($opp === null) {
            throw new RuntimeException('Oportunidad no encontrada.', 404);
        }

        $data = [];
        if (isset($input['title']) || isset($input['name'])) {
            $title = isset($input['title']) ? (is_scalar($input['title']) ? trim((string)$input['title']) : '') : '';
            if ($title === '' && isset($input['name']) && is_scalar($input['name'])) {
                $title = trim((string)$input['name']);
            }
            if ($title === '') {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['title' => 'El título no puede estar vacío.']
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['title'] = $title;
        }

        if (isset($input['account_id']) && is_scalar($input['account_id'])) {
            $data['account_id'] = (int)$input['account_id'];
        }
        if (array_key_exists('contact_id', $input)) {
            $data['contact_id'] = isset($input['contact_id']) && is_scalar($input['contact_id']) && (int)$input['contact_id'] > 0 ? (int)$input['contact_id'] : null;
        }
        if (isset($input['pipeline_stage_id']) && is_scalar($input['pipeline_stage_id'])) {
            $data['pipeline_stage_id'] = (int)$input['pipeline_stage_id'];
        }
        if (isset($input['value']) && is_scalar($input['value'])) {
            $data['value'] = (float)$input['value'];
        }
        if (isset($input['currency']) && is_scalar($input['currency'])) {
            $data['currency'] = trim((string)$input['currency']);
        }
        if (array_key_exists('close_date', $input)) {
            $data['close_date'] = isset($input['close_date']) && is_scalar($input['close_date']) ? trim((string)$input['close_date']) : null;
        }
        if (array_key_exists('owner_user_id', $input)) {
            $data['owner_user_id'] = isset($input['owner_user_id']) && is_scalar($input['owner_user_id']) && (int)$input['owner_user_id'] > 0 ? (int)$input['owner_user_id'] : null;
        }
        if (isset($input['custom_fields']) && is_array($input['custom_fields'])) {
            $data['custom_fields'] = $input['custom_fields'];
        }

        // Actualizar datos propios
        $affected = 0;
        if (!empty($data)) {
            $affected = $this->opportunityRepo->updateOpportunity($id, $data);
        }

        // Si se pasan ítems, guardarlos
        if (isset($input['items']) && is_array($input['items'])) {
            $this->opportunityRepo->saveOpportunityLineItems($id, $input['items']);
            $affected = 1;
        }

        return [
            'success' => true,
            'affected' => $affected,
            'message' => 'Oportunidad actualizada exitosamente.'
        ];
    }

    /**
     * DELETE /api/crm/opportunities/{id}
     * 
     * @return array{success: bool, message: string}
     */
    public function delete(int $id): array
    {
        $opp = $this->opportunityRepo->findById($id);
        if ($opp === null) {
            throw new RuntimeException('Oportunidad no encontrada.', 404);
        }

        $this->opportunityRepo->deleteOpportunity($id);

        // Decrementar el límite consumido del plan
        $tenantId = TenantContext::getTenantId();
        $this->crmController->decrementNegotiationsLimit($tenantId);

        return [
            'success' => true,
            'message' => 'Oportunidad eliminada exitosamente.'
        ];
    }

    /**
     * GET /api/crm/opportunities/{id}/items
     * 
     * @return array<int, array<string, mixed>>
     */
    public function getLineItems(int $id): array
    {
        return $this->opportunityRepo->getOpportunityLineItems($id);
    }

    /**
     * POST /api/crm/opportunities/{id}/items
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, message: string}
     */
    public function saveLineItems(int $id, array $input): array
    {
        $items = $input['items'] ?? $input;
        if (!is_array($items)) {
            throw new InvalidArgumentException('Formato de ítems inválido. Se espera una lista de ítems.');
        }

        $this->opportunityRepo->saveOpportunityLineItems($id, $items);

        return [
            'success' => true,
            'message' => 'Ítems de oportunidad guardados y total recalculado.'
        ];
    }

    /**
     * POST /api/crm/opportunities/{id}/won
     * Flujo de integración: Won (Negociación ganada) -> Crear Proyecto en Tracker
     * 
     * @param array<string, mixed> $input
     * @return array{success: bool, project_id: int, message: string}
     */
    public function wonOpportunity(int $id, array $input): array
    {
        $opp = $this->opportunityRepo->findById($id);
        if ($opp === null) {
            throw new RuntimeException('Oportunidad no encontrada.', 404);
        }

        $pipelineStageId = isset($opp['pipeline_stage_id']) && is_scalar($opp['pipeline_stage_id']) ? (int)$opp['pipeline_stage_id'] : 0;

        // 1. Obtener la etapa ganada del pipeline
        $pipelineIdResult = $this->pipelineRepo->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT pipeline_id FROM pipeline_stages WHERE id = ?",
            [$pipelineStageId]
        );
        if (empty($pipelineIdResult)) {
            throw new RuntimeException('No se pudo determinar el pipeline de esta negociación.', 400);
        }
        $pipelineId = isset($pipelineIdResult[0]['pipeline_id']) && is_scalar($pipelineIdResult[0]['pipeline_id']) ? (int)$pipelineIdResult[0]['pipeline_id'] : 0;

        $wonStageResult = $this->pipelineRepo->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT id FROM pipeline_stages WHERE pipeline_id = ? AND is_won_stage = 1 LIMIT 1",
            [$pipelineId]
        );
        if (empty($wonStageResult)) {
            throw new RuntimeException('No se ha configurado ninguna etapa de tipo "Ganada" (is_won_stage = 1) en este pipeline.', 400);
        }
        $wonStageId = isset($wonStageResult[0]['id']) && is_scalar($wonStageResult[0]['id']) ? (int)$wonStageResult[0]['id'] : 0;

        // 2. Extraer parámetros del input
        $budgetHours = isset($input['budgeted_hours']) && is_scalar($input['budgeted_hours']) ? (float)$input['budgeted_hours'] : 0.00;
        $projectName = isset($input['project_name']) && is_scalar($input['project_name']) ? trim((string)$input['project_name']) : '';
        if ($projectName === '') {
            $projectName = isset($opp['title']) && is_scalar($opp['title']) ? (string)$opp['title'] : 'Proyecto';
        }

        if ($budgetHours <= 0) {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos faltantes o inválidos',
                'errors' => ['budgeted_hours' => 'Las horas presupuestadas deben ser mayores que cero.']
            ], JSON_UNESCAPED_UNICODE));
        }

        // 3. Ejecutar integración atómica en repositorio
        $projectId = $this->opportunityRepo->markAsWonAndCreateProject(
            $id,
            $wonStageId,
            $projectName,
            $budgetHours
        );

        return [
            'success' => true,
            'project_id' => $projectId,
            'message' => "Negociación ganada y proyecto '{$projectName}' creado exitosamente en kodanTracker."
        ];
    }

    /**
     * POST /api/crm/opportunities/{id}/archive
     */
    public function archive(int $id): array
    {
        $opp = $this->opportunityRepo->findById($id);
        if ($opp === null) {
            throw new RuntimeException('Oportunidad no encontrada.', 404);
        }
        $this->opportunityRepo->archiveOpportunity($id, true);
        return ['success' => true, 'message' => 'Negociación archivada.'];
    }

    /**
     * POST /api/crm/opportunities/{id}/unarchive
     */
    public function unarchive(int $id): array
    {
        $opp = $this->opportunityRepo->findById($id);
        if ($opp === null) {
            throw new RuntimeException('Oportunidad no encontrada.', 404);
        }
        $this->opportunityRepo->archiveOpportunity($id, false);
        return ['success' => true, 'message' => 'Negociación restaurada del archivo.'];
    }
}
