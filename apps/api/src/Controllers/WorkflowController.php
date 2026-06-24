<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\WorkflowRepository;
use kodanAPPS\Repositories\OpportunityRepository;
use kodanAPPS\Repositories\CrmTaskRepository;
use InvalidArgumentException;
use RuntimeException;

final class WorkflowController
{
    /** @var array<string, list<string>> */
    private const ALLOWED_TRIGGER_EVENTS = [
        'opportunity' => ['stage_changed', 'created', 'won', 'lost', 'assigned', 'archived', 'unarchived', 'value_changed', 'close_date_changed'],
        'task' => ['task_created', 'task_status_changed', 'task_completed', 'task_assigned', 'task_due_date_changed', 'task_archived', 'task_unarchived'],
    ];

    public function __construct(
        private WorkflowRepository $workflowRepo,
        private OpportunityRepository $opportunityRepo,
        private CrmTaskRepository $taskRepo,
    ) {}

    /**
     * GET /api/crm/workflows
     * @return array<int, array<string, mixed>>
     */
    public function listRules(): array
    {
        $rules = $this->workflowRepo->listAll();
        return array_map(function (array $rule): array {
            if (isset($rule['trigger_conditions']) && is_string($rule['trigger_conditions'])) {
                $decoded = json_decode($rule['trigger_conditions'], true);
                $rule['trigger_conditions'] = is_array($decoded) ? $decoded : $rule['trigger_conditions'];
            }
            if (isset($rule['actions']) && is_string($rule['actions'])) {
                $decoded = json_decode($rule['actions'], true);
                $rule['actions'] = is_array($decoded) ? $decoded : $rule['actions'];
            }
            return $rule;
        }, $rules);
    }

    /**
     * GET /api/crm/workflows/{id}
     * @return array<string, mixed>
     */
    public function getRule(int $id): array
    {
        $rule = $this->workflowRepo->findById($id);
        if ($rule === null) {
            throw new RuntimeException('Regla de workflow no encontrada.', 404);
        }
        if (isset($rule['trigger_conditions']) && is_string($rule['trigger_conditions'])) {
            $decoded = json_decode($rule['trigger_conditions'], true);
            $rule['trigger_conditions'] = is_array($decoded) ? $decoded : $rule['trigger_conditions'];
        }
        if (isset($rule['actions']) && is_string($rule['actions'])) {
            $decoded = json_decode($rule['actions'], true);
            $rule['actions'] = is_array($decoded) ? $decoded : $rule['actions'];
        }
        return $rule;
    }

    /**
     * POST /api/crm/workflows
     * @param array<string, mixed> $input
     * @return array{success: bool, id?: int, message: string}
     */
    public function createRule(array $input): array
    {
        $name = isset($input['name']) && is_scalar($input['name']) ? trim((string)$input['name']) : '';
        $triggerEntity = isset($input['trigger_entity']) && is_scalar($input['trigger_entity']) ? trim((string)$input['trigger_entity']) : '';
        $triggerEvent = isset($input['trigger_event']) && is_scalar($input['trigger_event']) ? trim((string)$input['trigger_event']) : '';

        $errors = [];
        if ($name === '') {
            $errors['name'] = 'El nombre de la regla es requerido.';
        }
        if ($triggerEntity === '' || !isset(self::ALLOWED_TRIGGER_EVENTS[$triggerEntity])) {
            $errors['trigger_entity'] = 'Entidad de trigger inválida. Debe ser "opportunity" o "task".';
        }
        if ($triggerEvent === '' || (isset(self::ALLOWED_TRIGGER_EVENTS[$triggerEntity]) && !in_array($triggerEvent, self::ALLOWED_TRIGGER_EVENTS[$triggerEntity], true))) {
            $errors['trigger_event'] = 'Evento de trigger inválido para la entidad seleccionada.';
        }
        if (!isset($input['trigger_conditions']) || !is_array($input['trigger_conditions'])) {
            $errors['trigger_conditions'] = 'Las condiciones del trigger son requeridas.';
        }
        if (!isset($input['actions']) || !is_array($input['actions']) || empty($input['actions'])) {
            $errors['actions'] = 'Debe definir al menos una acción.';
        }
        if (isset($input['actions']) && is_array($input['actions']) && count($input['actions']) > 10) {
            $errors['actions'] = 'Máximo 10 acciones por regla.';
        }

        if (!empty($errors)) {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos faltantes o inválidos',
                'errors' => $errors,
            ], JSON_UNESCAPED_UNICODE));
        }

        $isActive = isset($input['is_active']) && is_numeric($input['is_active']) ? ((int)$input['is_active'] === 1 ? 1 : 0) : 1;

        $data = [
            'name' => $name,
            'description' => isset($input['description']) && is_scalar($input['description']) ? trim((string)$input['description']) : null,
            'trigger_entity' => $triggerEntity,
            'trigger_event' => $triggerEvent,
            'trigger_conditions' => json_encode($input['trigger_conditions'], JSON_UNESCAPED_UNICODE),
            'actions' => json_encode($input['actions'], JSON_UNESCAPED_UNICODE),
            'is_active' => $isActive,
            'execution_order' => isset($input['execution_order']) && is_scalar($input['execution_order']) ? (int)$input['execution_order'] : 0,
        ];

        $id = $this->workflowRepo->createRule($data);

        return [
            'success' => true,
            'id' => $id,
            'message' => 'Regla de workflow creada exitosamente.',
        ];
    }

    /**
     * PATCH/PUT /api/crm/workflows/{id}
     * @param array<string, mixed> $input
     * @return array{success: bool, affected?: int, message: string}
     */
    public function updateRule(int $id, array $input): array
    {
        $rule = $this->workflowRepo->findById($id);
        if ($rule === null) {
            throw new RuntimeException('Regla de workflow no encontrada.', 404);
        }

        $data = [];
        if (isset($input['name'])) {
            $name = is_scalar($input['name']) ? trim((string)$input['name']) : '';
            if ($name === '') {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['name' => 'El nombre no puede estar vacío.'],
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['name'] = $name;
        }

        if (isset($input['description'])) {
            $data['description'] = is_scalar($input['description']) ? trim((string)$input['description']) : null;
        }

        if (isset($input['trigger_entity'])) {
            $te = is_scalar($input['trigger_entity']) ? trim((string)$input['trigger_entity']) : '';
            if (!isset(self::ALLOWED_TRIGGER_EVENTS[$te])) {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['trigger_entity' => 'Entidad de trigger inválida.'],
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['trigger_entity'] = $te;
        }

        if (isset($input['trigger_event'])) {
            $data['trigger_event'] = is_scalar($input['trigger_event']) ? trim((string)$input['trigger_event']) : '';
        }

        if (isset($input['trigger_conditions'])) {
            $data['trigger_conditions'] = is_array($input['trigger_conditions'])
                ? json_encode($input['trigger_conditions'], JSON_UNESCAPED_UNICODE)
                : (is_string($input['trigger_conditions']) ? $input['trigger_conditions'] : '{}');
        }

        if (isset($input['actions'])) {
            if (!is_array($input['actions']) || empty($input['actions'])) {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['actions' => 'Debe definir al menos una acción.'],
                ], JSON_UNESCAPED_UNICODE));
            }
            if (count($input['actions']) > 10) {
                throw new InvalidArgumentException((string)json_encode([
                    'message' => 'Validación fallida',
                    'errors' => ['actions' => 'Máximo 10 acciones por regla.'],
                ], JSON_UNESCAPED_UNICODE));
            }
            $data['actions'] = json_encode($input['actions'], JSON_UNESCAPED_UNICODE);
        }

        if (isset($input['is_active']) && is_numeric($input['is_active'])) {
            $data['is_active'] = (int)$input['is_active'] === 1 ? 1 : 0;
        }

        if (isset($input['execution_order']) && is_numeric($input['execution_order'])) {
            $data['execution_order'] = (int)$input['execution_order'];
        }

        if (empty($data)) {
            return [
                'success' => true,
                'affected' => 0,
                'message' => 'No se enviaron campos para actualizar.',
            ];
        }

        $affected = $this->workflowRepo->updateRule($id, $data);

        return [
            'success' => true,
            'affected' => $affected,
            'message' => 'Regla de workflow actualizada exitosamente.',
        ];
    }

    /**
     * DELETE /api/crm/workflows/{id}
     * @return array{success: bool, message: string}
     */
    public function deleteRule(int $id): array
    {
        $rule = $this->workflowRepo->findById($id);
        if ($rule === null) {
            throw new RuntimeException('Regla de workflow no encontrada.', 404);
        }

        $this->workflowRepo->deleteRule($id);

        return [
            'success' => true,
            'message' => 'Regla de workflow eliminada exitosamente.',
        ];
    }

    /**
     * GET /api/crm/workflows/{id}/executions
     * @return array<int, array<string, mixed>>
     */
    public function getExecutionHistory(int $id): array
    {
        $rule = $this->workflowRepo->findById($id);
        if ($rule === null) {
            throw new RuntimeException('Regla de workflow no encontrada.', 404);
        }
        $executions = $this->workflowRepo->getExecutionHistory($id);
        foreach ($executions as &$ex) {
            if (isset($ex['executed_actions']) && is_string($ex['executed_actions'])) {
                $decoded = json_decode($ex['executed_actions'], true);
                $ex['executed_actions'] = is_array($decoded) ? $decoded : $ex['executed_actions'];
            }
        }
        unset($ex);
        return $executions;
    }

    /**
     * GET /api/crm/workflows/stats
     * @return array<string, mixed>
     */
    public function getStats(): array
    {
        return $this->workflowRepo->getStats();
    }

    /**
     * POST /api/crm/workflows/test
     * Dry-run: evalúa qué reglas coincidirían sin ejecutar acciones
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function testRule(array $input): array
    {
        $entity = isset($input['trigger_entity']) && is_scalar($input['trigger_entity']) ? trim((string)$input['trigger_entity']) : 'opportunity';
        $event = isset($input['trigger_event']) && is_scalar($input['trigger_event']) ? trim((string)$input['trigger_event']) : 'stage_changed';
        $entityId = isset($input['entity_id']) && is_scalar($input['entity_id']) ? (int)$input['entity_id'] : 0;

        if ($entityId <= 0) {
            throw new InvalidArgumentException((string)json_encode([
                'message' => 'Campos requeridos',
                'errors' => ['entity_id' => 'El ID de la entidad es requerido.'],
            ], JSON_UNESCAPED_UNICODE));
        }

        $context = [];

        if ($entity === 'opportunity') {
            $opp = $this->opportunityRepo->findById($entityId);
            if ($opp === null) {
                throw new RuntimeException('Oportunidad no encontrada.', 404);
            }
            $oppStageId = isset($opp['pipeline_stage_id']) && is_numeric($opp['pipeline_stage_id']) ? (int)$opp['pipeline_stage_id'] : 0;
            $oppPipelineId = isset($opp['pipeline_id']) && is_numeric($opp['pipeline_id']) ? (int)$opp['pipeline_id'] : 0;
            $oppOwnerId = isset($opp['owner_user_id']) && is_numeric($opp['owner_user_id']) ? (int)$opp['owner_user_id'] : 0;

            $context = [
                'old_stage_id' => isset($input['old_stage_id']) && is_numeric($input['old_stage_id']) ? (int)$input['old_stage_id'] : $oppStageId,
                'new_stage_id' => isset($input['new_stage_id']) && is_numeric($input['new_stage_id']) ? (int)$input['new_stage_id'] : $oppStageId,
                'pipeline_id' => $oppPipelineId,
                'owner_user_id' => $oppOwnerId,
                'value' => $opp['value'] ?? 0,
                'opportunity_title' => $opp['title'] ?? '',
            ];
        } elseif ($entity === 'task') {
            $task = $this->taskRepo->findById($entityId);
            if ($task === null) {
                throw new RuntimeException('Tarea no encontrada.', 404);
            }
            $context = [
                'old_status' => isset($input['old_status']) && is_string($input['old_status']) ? $input['old_status'] : (isset($task['status']) && is_string($task['status']) ? $task['status'] : 'todo'),
                'new_status' => isset($input['new_status']) && is_string($input['new_status']) ? $input['new_status'] : (isset($task['status']) && is_string($task['status']) ? $task['status'] : 'todo'),
                'opportunity_id' => isset($task['opportunity_id']) && is_numeric($task['opportunity_id']) ? (int)$task['opportunity_id'] : null,
                'task_type_id' => isset($task['task_type_id']) && is_numeric($task['task_type_id']) ? (int)$task['task_type_id'] : null,
                'task_title' => isset($task['title']) && is_string($task['title']) ? $task['title'] : '',
            ];
            // Cargar contexto de la oportunidad padre para el dry-run del test
            $oppId = $context['opportunity_id'] ?? null;
            if ($oppId !== null && (int)$oppId > 0) {
                $opp = $this->opportunityRepo->findById((int)$oppId);
                if ($opp !== null) {
                    $context['owner_user_id'] = isset($opp['owner_user_id']) ? (int)$opp['owner_user_id'] : null;
                    $context['opportunity_title'] = $opp['title'] ?? '';
                    $context['owner_name'] = $opp['owner_name'] ?? '';
                }
            }
        }

        $rules = $this->workflowRepo->listActiveRulesByTrigger($entity, $event);

        $matched = [];
        foreach ($rules as $rule) {
            $rawConditions = isset($rule['trigger_conditions']) && is_string($rule['trigger_conditions']) ? json_decode($rule['trigger_conditions'], true) : null;
            $conditions = is_array($rawConditions) ? $rawConditions : [];
            $matchResult = $this->matchConditionsForTest($conditions, $context);
            $matched[] = [
                'rule_id' => $rule['id'],
                'rule_name' => $rule['name'],
                'matched' => $matchResult,
                'actions' => isset($rule['actions']) && is_string($rule['actions']) ? (json_decode($rule['actions'], true) ?? []) : [],
            ];
        }

        return [
            'test_entity' => $entity,
            'test_event' => $event,
            'entity_id' => $entityId,
            'total_rules' => count($rules),
            'matched_rules' => $matched,
        ];
    }

    /**
     * @param array<mixed> $conditions
     * @param array<string, mixed> $context
     */
    private function matchConditionsForTest(array $conditions, array $context): bool
    {
        if (empty($conditions)) {
            return true;
        }

        $fromStageId = isset($conditions['from_stage_id']) && is_numeric($conditions['from_stage_id']) ? (int)$conditions['from_stage_id'] : null;
        $toStageId = isset($conditions['to_stage_id']) && is_numeric($conditions['to_stage_id']) ? (int)$conditions['to_stage_id'] : null;
        $pipelineId = isset($conditions['pipeline_id']) && is_numeric($conditions['pipeline_id']) ? (int)$conditions['pipeline_id'] : null;
        $rawPipelineIds = isset($conditions['pipeline_ids']) && is_array($conditions['pipeline_ids']) ? $conditions['pipeline_ids'] : [];
        $fromStatus = isset($conditions['from_status']) && is_string($conditions['from_status']) ? $conditions['from_status'] : null;
        $toStatus = isset($conditions['to_status']) && is_string($conditions['to_status']) ? $conditions['to_status'] : null;
        $rawTaskTypeIds = isset($conditions['task_type_ids']) && is_array($conditions['task_type_ids']) ? $conditions['task_type_ids'] : [];
        $valueMin = isset($conditions['value_min']) && is_numeric($conditions['value_min']) ? (float)$conditions['value_min'] : null;
        
        $oldStageId = isset($context['old_stage_id']) && is_numeric($context['old_stage_id']) ? (int)$context['old_stage_id'] : null;
        $newStageId = isset($context['new_stage_id']) && is_numeric($context['new_stage_id']) ? (int)$context['new_stage_id'] : null;
        $ctxPipelineId = isset($context['pipeline_id']) && is_numeric($context['pipeline_id']) ? (int)$context['pipeline_id'] : null;
        $oldStatus = isset($context['old_status']) && is_string($context['old_status']) ? $context['old_status'] : null;
        $newStatus = isset($context['new_status']) && is_string($context['new_status']) ? $context['new_status'] : null;
        $ctxTaskTypeId = isset($context['task_type_id']) && is_numeric($context['task_type_id']) ? (int)$context['task_type_id'] : null;
        $ctxValue = isset($context['value']) && is_numeric($context['value']) ? (float)$context['value'] : null;

        $pipelineIds = array_filter($rawPipelineIds, fn($v) => is_numeric($v));
        $taskTypeIds = array_filter($rawTaskTypeIds, fn($v) => is_numeric($v));

        if ($fromStageId !== null && ($oldStageId === null || $fromStageId !== $oldStageId)) {
            return false;
        }
        if ($toStageId !== null && ($newStageId === null || $toStageId !== $newStageId)) {
            return false;
        }
        if ($pipelineId !== null && ($ctxPipelineId === null || $pipelineId !== $ctxPipelineId)) {
            return false;
        }
        if (!empty($pipelineIds) && $ctxPipelineId !== null && !in_array($ctxPipelineId, $pipelineIds, true)) {
            return false;
        }
        if ($fromStatus !== null && ($oldStatus === null || $fromStatus !== $oldStatus)) {
            return false;
        }
        if ($toStatus !== null && ($newStatus === null || $toStatus !== $newStatus)) {
            return false;
        }
        if (!empty($taskTypeIds) && $ctxTaskTypeId !== null && !in_array($ctxTaskTypeId, $taskTypeIds, true)) {
            return false;
        }
        if ($valueMin !== null && ($ctxValue === null || $valueMin > $ctxValue)) {
            return false;
        }
        return true;
    }
}
