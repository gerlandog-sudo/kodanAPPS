<?php

declare(strict_types=1);

namespace kodanAPPS\Controllers;

use kodanAPPS\Repositories\WorkflowRepository;
use kodanAPPS\Repositories\OpportunityRepository;
use kodanAPPS\Repositories\CrmTaskRepository;
use kodanAPPS\Repositories\NotificationRepository;
use kodanAPPS\Services\WorkflowEngine;
use kodanAPPS\DB\TenantContext;
use InvalidArgumentException;
use RuntimeException;

final class WorkflowController
{
    private const ALLOWED_TRIGGER_EVENTS = [
        'opportunity' => ['stage_changed', 'created', 'won', 'lost', 'assigned', 'archived', 'unarchived', 'value_changed', 'close_date_changed'],
        'task' => ['task_created', 'task_status_changed', 'task_completed', 'task_assigned', 'task_due_date_changed', 'task_archived', 'task_unarchived'],
    ];

    private const ALLOWED_ACTION_TYPES = [
        'create_task', 'update_task_status', 'assign_task', 'add_task_participants', 'create_followup_task',
        'update_opportunity_stage', 'assign_opportunity', 'update_opportunity_field', 'create_followup_opportunity',
        'send_notification',
    ];

    public function __construct(
        private WorkflowRepository $workflowRepo,
        private WorkflowEngine $workflowEngine,
        private OpportunityRepository $opportunityRepo,
        private CrmTaskRepository $taskRepo,
        private NotificationRepository $notificationRepo,
    ) {}

    /**
     * GET /api/crm/workflows
     */
    public function listRules(): array
    {
        return $this->workflowRepo->listAll();
    }

    /**
     * GET /api/crm/workflows/{id}
     */
    public function getRule(int $id): array
    {
        $rule = $this->workflowRepo->findById($id);
        if ($rule === null) {
            throw new RuntimeException('Regla de workflow no encontrada.', 404);
        }
        return $rule;
    }

    /**
     * POST /api/crm/workflows
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

        $activeCount = $this->workflowRepo->countActiveRules();
        $isActive = isset($input['is_active']) ? ((int)$input['is_active'] === 1 ? 1 : 0) : 1;

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

        if (isset($input['is_active'])) {
            $data['is_active'] = (int)$input['is_active'] === 1 ? 1 : 0;
        }

        if (isset($input['execution_order'])) {
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
     */
    public function getExecutionHistory(int $id): array
    {
        $rule = $this->workflowRepo->findById($id);
        if ($rule === null) {
            throw new RuntimeException('Regla de workflow no encontrada.', 404);
        }
        return $this->workflowRepo->getExecutionHistory($id);
    }

    /**
     * GET /api/crm/workflows/stats
     */
    public function getStats(): array
    {
        return $this->workflowRepo->getStats();
    }

    /**
     * POST /api/crm/workflows/test
     * Dry-run: evalúa qué reglas coincidirían sin ejecutar acciones
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
            $context = [
                'old_stage_id' => isset($input['old_stage_id']) ? (int)$input['old_stage_id'] : (int)($opp['pipeline_stage_id'] ?? 0),
                'new_stage_id' => isset($input['new_stage_id']) ? (int)$input['new_stage_id'] : (int)($opp['pipeline_stage_id'] ?? 0),
                'pipeline_id' => (int)($opp['pipeline_id'] ?? 0),
                'owner_user_id' => (int)($opp['owner_user_id'] ?? 0),
                'value' => $opp['value'] ?? 0,
                'opportunity_title' => $opp['title'] ?? '',
            ];
        } elseif ($entity === 'task') {
            $task = $this->taskRepo->findById($entityId);
            if ($task === null) {
                throw new RuntimeException('Tarea no encontrada.', 404);
            }
            $context = [
                'old_status' => isset($input['old_status']) ? $input['old_status'] : ($task['status'] ?? 'todo'),
                'new_status' => isset($input['new_status']) ? $input['new_status'] : ($task['status'] ?? 'todo'),
                'opportunity_id' => $task['opportunity_id'] ?? null,
                'task_type_id' => $task['task_type_id'] ?? null,
                'task_title' => $task['title'] ?? '',
            ];
        }

        $rules = $this->workflowRepo->listActiveRulesByTrigger($entity, $event);

        $matched = [];
        foreach ($rules as $rule) {
            $conditions = json_decode($rule['trigger_conditions'], true) ?? [];
            $matchResult = $this->matchConditionsForTest($conditions, $context);
            $matched[] = [
                'rule_id' => $rule['id'],
                'rule_name' => $rule['name'],
                'matched' => $matchResult,
                'actions' => json_decode($rule['actions'], true) ?? [],
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

    private function matchConditionsForTest(array $conditions, array $context): bool
    {
        if (empty($conditions)) {
            return true;
        }
        if (isset($conditions['from_stage_id']) && (!isset($context['old_stage_id']) || (int)$conditions['from_stage_id'] !== (int)$context['old_stage_id'])) {
            return false;
        }
        if (isset($conditions['to_stage_id']) && (!isset($context['new_stage_id']) || (int)$conditions['to_stage_id'] !== (int)$context['new_stage_id'])) {
            return false;
        }
        if (isset($conditions['pipeline_id']) && (!isset($context['pipeline_id']) || (int)$conditions['pipeline_id'] !== (int)$context['pipeline_id'])) {
            return false;
        }
        if (isset($conditions['from_status']) && (!isset($context['old_status']) || $conditions['from_status'] !== $context['old_status'])) {
            return false;
        }
        if (isset($conditions['to_status']) && (!isset($context['new_status']) || $conditions['to_status'] !== $context['new_status'])) {
            return false;
        }
        if (isset($conditions['value_min']) && (!isset($context['value']) || (float)$conditions['value_min'] > (float)$context['value'])) {
            return false;
        }
        return true;
    }
}
