<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\OpportunityRepository;
use kodanAPPS\Repositories\PipelineRepository;
use kodanAPPS\Repositories\NotificationRepository;
use kodanAPPS\Controllers\CrmController;
use kodanAPPS\Services\WorkflowEngine;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;
use RuntimeException;

final class OpportunityController
{
    private OpportunityRepository $opportunityRepo;
    private PipelineRepository $pipelineRepo;
    private CrmController $crmController;
    private NotificationRepository $notificationRepo;
    private WorkflowEngine $workflowEngine;

    public function __construct(
        OpportunityRepository $opportunityRepo,
        PipelineRepository $pipelineRepo,
        CrmController $crmController,
        NotificationRepository $notificationRepo,
        WorkflowEngine $workflowEngine
    ) {
        $this->opportunityRepo = $opportunityRepo;
        $this->pipelineRepo = $pipelineRepo;
        $this->crmController = $crmController;
        $this->notificationRepo = $notificationRepo;
        $this->workflowEngine = $workflowEngine;
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
     * 
     * @param array<string, mixed> $opp
     * @return array<string, mixed>
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
        $opp['is_archived'] = isset($opp['archived_at']);
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
            $errors['pipeline_stage_id'] = 'La etapa del canal es requerida.';
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
                'close_reason' => isset($input['close_reason']) && is_scalar($input['close_reason']) ? trim((string)$input['close_reason']) : null,
            ];

            $id = $this->opportunityRepo->createOpportunity($data);

            // Disparar alerta si se asigna a un usuario
            $ownerUserId = (int)$data['owner_user_id'];
            if ($ownerUserId > 0) {
                $this->notificationRepo->upsertNotification([
                    'user_id' => $ownerUserId,
                    'type' => 'new_assignment_deal',
                    'entity_type' => 'crm_opportunity',
                    'entity_id' => $id,
                    'title' => 'Nueva negociación asignada',
                    'message' => "Se te ha asignado la negociación \"{$title}\".",
                    'is_read' => 0
                ]);
            }

            // Guardar ítems si se proporcionan en la creación
            if (is_array($items)) {
                $this->opportunityRepo->saveOpportunityLineItems($id, $items);
            }

            $this->workflowEngine->execute('opportunity', 'created', $id, [
                'owner_user_id' => $data['owner_user_id'],
                'opportunity_title' => $title,
                'value' => $value,
                'currency' => $currency,
            ]);

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
        if (array_key_exists('close_reason', $input)) {
            $data['close_reason'] = isset($input['close_reason']) && is_scalar($input['close_reason']) ? trim((string)$input['close_reason']) : null;
        }

        // Actualizar datos propios
        $oldOwnerId = (int)($opp['owner_user_id'] ?? 0);
        $affected = 0;
        if (!empty($data)) {
            $affected = $this->opportunityRepo->updateOpportunity($id, $data);

            // Disparar alerta si cambió el dueño asignado
            $newOwnerId = isset($data['owner_user_id']) ? (int)$data['owner_user_id'] : null;
            if ($newOwnerId !== null && $newOwnerId !== $oldOwnerId) {
                $oppTitle = $data['title'] ?? ($opp['title'] ?? '');
                $this->notificationRepo->upsertNotification([
                    'user_id' => $newOwnerId,
                    'type' => 'new_assignment_deal',
                    'entity_type' => 'crm_opportunity',
                    'entity_id' => $id,
                    'title' => 'Nueva negociación asignada',
                    'message' => "Se te ha asignado la negociación \"{$oppTitle}\".",
                    'is_read' => 0
                ]);
            }
        }

        // Workflow: disparar triggers según cambios detectados
        $oldStageId = (int)($opp['pipeline_stage_id'] ?? 0);
        $oldValue = (float)($opp['value'] ?? 0);
        $oldCloseDate = $opp['close_date'] ?? null;

        if (isset($data['pipeline_stage_id']) && (int)$data['pipeline_stage_id'] !== $oldStageId) {
            $this->workflowEngine->execute('opportunity', 'stage_changed', $id, [
                'old_stage_id' => $oldStageId,
                'new_stage_id' => (int)$data['pipeline_stage_id'],
                'pipeline_id' => (int)($opp['pipeline_id'] ?? 0),
                'owner_user_id' => (int)($data['owner_user_id'] ?? $opp['owner_user_id'] ?? 0),
                'opportunity_title' => $opp['title'] ?? '',
                'value' => $data['value'] ?? $opp['value'] ?? 0,
            ]);

            // Verificar si la etapa nueva es won o lost
            $newStage = $this->pipelineRepo->findStageById((int)$data['pipeline_stage_id']);
            if ($newStage !== null) {
                if ((int)($newStage['is_won_stage'] ?? 0) === 1) {
                    $this->workflowEngine->execute('opportunity', 'won', $id, [
                        'opportunity_title' => $opp['title'] ?? '',
                        'value' => $opp['value'] ?? 0,
                        'owner_user_id' => $opp['owner_user_id'] ?? 0,
                    ]);
                }
                if ((int)($newStage['is_lost_stage'] ?? 0) === 1) {
                    $this->workflowEngine->execute('opportunity', 'lost', $id, [
                        'opportunity_title' => $opp['title'] ?? '',
                        'value' => $opp['value'] ?? 0,
                        'owner_user_id' => $opp['owner_user_id'] ?? 0,
                    ]);
                }
            }
        }

        if (isset($data['owner_user_id']) && (int)$data['owner_user_id'] !== $oldOwnerId) {
            $this->workflowEngine->execute('opportunity', 'assigned', $id, [
                'owner_user_id' => (int)$data['owner_user_id'],
                'opportunity_title' => $opp['title'] ?? '',
            ]);
        }

        if (isset($data['value']) && abs((float)$data['value'] - $oldValue) > 0.001) {
            $this->workflowEngine->execute('opportunity', 'value_changed', $id, [
                'value' => (float)$data['value'],
                'opportunity_title' => $opp['title'] ?? '',
                'owner_user_id' => $opp['owner_user_id'] ?? 0,
            ]);
        }

        if (array_key_exists('close_date', $input) && $data['close_date'] !== $oldCloseDate) {
            $this->workflowEngine->execute('opportunity', 'close_date_changed', $id, [
                'close_date' => $data['close_date'],
                'opportunity_title' => $opp['title'] ?? '',
            ]);
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
             SELECT pipeline_id FROM CRM_pipeline_stages WHERE id = ?",
            [$pipelineStageId]
        );
        if (empty($pipelineIdResult)) {
            throw new RuntimeException('No se pudo determinar el canal de esta negociación.', 400);
        }
        $pipelineId = isset($pipelineIdResult[0]['pipeline_id']) && is_scalar($pipelineIdResult[0]['pipeline_id']) ? (int)$pipelineIdResult[0]['pipeline_id'] : 0;

        $wonStageResult = $this->pipelineRepo->rawSelect(
            "/* BYPASS_TENANT_SCOPE */
             SELECT id FROM CRM_pipeline_stages WHERE pipeline_id = ? AND is_won_stage = 1 LIMIT 1",
            [$pipelineId]
        );
        if (empty($wonStageResult)) {
            throw new RuntimeException('No se ha configurado ninguna etapa de tipo "Ganada" (is_won_stage = 1) en este canal.', 400);
        }
        $wonStageId = isset($wonStageResult[0]['id']) && is_scalar($wonStageResult[0]['id']) ? (int)$wonStageResult[0]['id'] : 0;

        // 2. Extraer parámetros del input
        $budgetHours = isset($input['budgeted_hours']) && is_scalar($input['budgeted_hours']) ? (float)$input['budgeted_hours'] : 0.00;
        $projectName = isset($input['project_name']) && is_scalar($input['project_name']) ? trim((string)$input['project_name']) : '';
        if ($projectName === '') {
            $projectName = isset($opp['title']) && is_scalar($opp['title']) ? (string)$opp['title'] : 'Proyecto';
        }
        $closeReason = isset($input['close_reason']) && is_scalar($input['close_reason']) ? trim((string)$input['close_reason']) : null;

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
            $budgetHours,
            $closeReason
        );

        $this->workflowEngine->execute('opportunity', 'won', $id, [
            'opportunity_title' => $opp['title'] ?? '',
            'value' => $opp['value'] ?? 0,
            'owner_user_id' => $opp['owner_user_id'] ?? 0,
            'project_id' => $projectId,
            'budget_hours' => $budgetHours,
            'account_name' => $opp['account_name'] ?? '',
        ]);

        return [
            'success' => true,
            'project_id' => $projectId,
            'message' => "Negociación ganada y proyecto '{$projectName}' creado exitosamente en kodanTracker."
        ];
    }

    /**
     * POST /api/crm/opportunities/{id}/archive
     * 
     * @return array<string, mixed>
     */
    public function archive(int $id): array
    {
        $opp = $this->opportunityRepo->findById($id);
        if ($opp === null) {
            throw new RuntimeException('Oportunidad no encontrada.', 404);
        }
        $this->opportunityRepo->archiveOpportunity($id, true);

        $this->workflowEngine->execute('opportunity', 'archived', $id, [
            'opportunity_title' => $opp['title'] ?? '',
            'owner_user_id' => $opp['owner_user_id'] ?? 0,
        ]);

        return ['success' => true, 'message' => 'Negociación archivada.'];
    }

    /**
     * POST /api/crm/opportunities/{id}/unarchive
     * 
     * @return array<string, mixed>
     */
    public function unarchive(int $id): array
    {
        $opp = $this->opportunityRepo->findById($id);
        if ($opp === null) {
            throw new RuntimeException('Oportunidad no encontrada.', 404);
        }
        $this->opportunityRepo->archiveOpportunity($id, false);

        $this->workflowEngine->execute('opportunity', 'unarchived', $id, [
            'opportunity_title' => $opp['title'] ?? '',
            'owner_user_id' => $opp['owner_user_id'] ?? 0,
        ]);

        return ['success' => true, 'message' => 'Negociación restaurada del archivo.'];
    }
}
