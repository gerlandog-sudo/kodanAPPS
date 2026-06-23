<?php

declare(strict_types=1);

namespace kodanAPPS\Services;

use kodanAPPS\Repositories\WorkflowRepository;
use kodanAPPS\Repositories\CrmTaskRepository;
use kodanAPPS\Repositories\OpportunityRepository;
use kodanAPPS\Repositories\NotificationRepository;
use kodanAPPS\DB\TenantContext;

final class WorkflowEngine
{
    private const ACTION_HANDLERS = [
        'create_task' => 'executeCreateTask',
        'update_task_status' => 'executeUpdateTaskStatus',
        'assign_task' => 'executeAssignTask',
        'add_task_participants' => 'executeAddTaskParticipants',
        'create_followup_task' => 'executeCreateFollowUpTask',
        'update_opportunity_stage' => 'executeUpdateOpportunityStage',
        'assign_opportunity' => 'executeAssignOpportunity',
        'update_opportunity_field' => 'executeUpdateOpportunityField',
        'create_followup_opportunity' => 'executeCreateFollowUpOpportunity',
        'send_notification' => 'executeSendNotification',
    ];

    private const MAX_RULES_PER_TENANT = 50;
    private const MAX_ACTIONS_PER_RULE = 10;

    public function __construct(
        private WorkflowRepository $workflowRepo,
        private CrmTaskRepository $taskRepo,
        private OpportunityRepository $opportunityRepo,
        private NotificationRepository $notificationRepo,
    ) {}

    public function execute(string $entity, string $event, int $entityId, array $context = []): array
    {
        $rules = $this->workflowRepo->listActiveRulesByTrigger($entity, $event);
        if (empty($rules)) {
            return ['executed' => 0, 'failed' => 0, 'details' => []];
        }

        $results = ['executed' => 0, 'failed' => 0, 'details' => []];

        foreach ($rules as $rule) {
            $conditions = json_decode($rule['trigger_conditions'], true) ?? [];
            $actions = json_decode($rule['actions'], true) ?? [];

            if (!$this->matchConditions($conditions, $entity, $entityId, $context)) {
                continue;
            }

            if (empty($actions)) {
                continue;
            }

            $actions = array_slice($actions, 0, self::MAX_ACTIONS_PER_RULE);
            $ruleResult = ['rule_id' => (int)$rule['id'], 'actions' => []];
            $overallStatus = 'success';

            foreach ($actions as $action) {
                if (!isset($action['type']) || !isset(self::ACTION_HANDLERS[$action['type']])) {
                    $ruleResult['actions'][] = ['type' => $action['type'] ?? 'unknown', 'status' => 'failed', 'error' => 'Unknown action type'];
                    $results['failed']++;
                    $overallStatus = 'partial';
                    continue;
                }

                try {
                    $handler = self::ACTION_HANDLERS[$action['type']];
                    $this->$handler($action['params'] ?? [], $entity, $entityId, $context);
                    $ruleResult['actions'][] = ['type' => $action['type'], 'status' => 'success'];
                    $results['executed']++;
                } catch (\Throwable $e) {
                    $ruleResult['actions'][] = ['type' => $action['type'], 'status' => 'failed', 'error' => $e->getMessage()];
                    $results['failed']++;
                    $overallStatus = 'partial';
                }
            }

            $results['details'][] = $ruleResult;
            $this->workflowRepo->logExecution([
                'rule_id' => $rule['id'],
                'trigger_entity' => $entity,
                'trigger_entity_id' => $entityId,
                'status' => $overallStatus,
                'executed_actions' => json_encode($ruleResult['actions'], JSON_UNESCAPED_UNICODE),
                'error_message' => $overallStatus === 'success' ? null : ($ruleResult['actions'][0]['error'] ?? null),
            ]);
        }

        return $results;
    }

    private function matchConditions(array $conditions, string $entity, int $entityId, array $context): bool
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
        if (!empty($conditions['pipeline_ids']) && isset($context['pipeline_id']) && !in_array((int)$context['pipeline_id'], array_map('intval', $conditions['pipeline_ids']), true)) {
            return false;
        }
        if (isset($conditions['from_status']) && (!isset($context['old_status']) || $conditions['from_status'] !== $context['old_status'])) {
            return false;
        }
        if (isset($conditions['to_status']) && (!isset($context['new_status']) || $conditions['to_status'] !== $context['new_status'])) {
            return false;
        }
        if (isset($conditions['task_type_ids']) && !empty($context['task_type_id']) && !in_array((int)$context['task_type_id'], array_map('intval', $conditions['task_type_ids']), true)) {
            return false;
        }
        if (isset($conditions['value_min']) && (!isset($context['value']) || (float)$conditions['value_min'] > (float)$context['value'])) {
            return false;
        }

        return true;
    }

    private function resolveAssignedTo(mixed $spec, array $context): ?int
    {
        if ($spec === null || $spec === '') {
            return TenantContext::getUserId();
        }
        if (is_string($spec)) {
            return match ($spec) {
                'owner' => $context['owner_user_id'] ?? null,
                'creator' => $context['created_by'] ?? TenantContext::getUserId(),
                'trigger_user' => TenantContext::getUserId(),
                default => is_numeric($spec) ? (int)$spec : null,
            };
        }
        return is_numeric($spec) ? (int)$spec : null;
    }

    private function resolveUserIds(array|string|int|null $spec, array $context): array
    {
        if ($spec === null || $spec === '' || $spec === []) {
            return [];
        }
        if (is_array($spec)) {
            return array_filter(array_map(fn($s) => $this->resolveAssignedTo($s, $context), $spec), fn($v) => $v !== null);
        }
        $resolved = $this->resolveAssignedTo($spec, $context);
        return $resolved !== null ? [$resolved] : [];
    }

    private function resolveOpportunityId(string $entity, int $entityId, array $context): ?int
    {
        if ($entity === 'opportunity') {
            return $entityId;
        }
        if ($entity === 'task') {
            return $context['opportunity_id'] ?? null;
        }
        return null;
    }

    private function interpolate(string $text, string $entity, int $entityId, array $context): string
    {
        $replacements = [
            '{{opportunity_title}}' => $context['opportunity_title'] ?? $context['title'] ?? '',
            '{{account_name}}' => $context['account_name'] ?? '',
            '{{value}}' => $context['value'] ?? '',
            '{{currency}}' => $context['currency'] ?? 'USD',
            '{{task_title}}' => $context['task_title'] ?? $context['title'] ?? '',
            '{{old_status}}' => $context['old_status'] ?? '',
            '{{new_status}}' => $context['new_status'] ?? '',
            '{{owner_name}}' => $context['owner_name'] ?? '',
            '{{trigger_user}}' => (string)TenantContext::getUserId(),
        ];
        return str_replace(array_keys($replacements), array_values($replacements), $text);
    }

    private function executeCreateTask(array $params, string $entity, int $entityId, array $context): void
    {
        $opportunityId = isset($params['link_to_trigger_opportunity']) && $params['link_to_trigger_opportunity']
            ? $this->resolveOpportunityId($entity, $entityId, $context)
            : (isset($params['opportunity_id']) && is_numeric($params['opportunity_id']) ? (int)$params['opportunity_id'] : null);

        $title = $this->interpolate($params['title'] ?? 'Tarea automática', $entity, $entityId, $context);
        $description = isset($params['description']) ? $this->interpolate($params['description'], $entity, $entityId, $context) : null;
        $assignedTo = $this->resolveAssignedTo($params['assigned_to'] ?? 'owner', $context);

        $dueDate = null;
        if (isset($params['due_date_offset_days']) && (int)$params['due_date_offset_days'] > 0) {
            $dueDate = date('Y-m-d H:i:s', strtotime('+' . (int)$params['due_date_offset_days'] . ' days'));
        }

        $taskId = $this->taskRepo->createTask([
            'opportunity_id' => $opportunityId,
            'title' => $title,
            'description' => $description,
            'due_date' => $dueDate,
            'status' => $params['status'] ?? 'todo',
            'assigned_to' => $assignedTo,
            'task_type_id' => isset($params['task_type_id']) && is_numeric($params['task_type_id']) ? (int)$params['task_type_id'] : null,
        ]);

        if (!empty($params['participants'])) {
            $participantIds = $this->resolveUserIds($params['participants'], $context);
            if (!empty($participantIds)) {
                $this->taskRepo->saveParticipants($taskId, $participantIds);
            }
        }
    }

    private function executeUpdateTaskStatus(array $params, string $entity, int $entityId, array $context): void
    {
        if (isset($params['task_id']) && is_numeric($params['task_id'])) {
            $task = $this->taskRepo->findById((int)$params['task_id']);
            if ($task !== null) {
                $this->taskRepo->updateTask((int)$params['task_id'], ['status' => $params['to_status'] ?? 'todo']);
            }
        }
    }

    private function executeAssignTask(array $params, string $entity, int $entityId, array $context): void
    {
        $taskId = isset($params['task_id']) && is_numeric($params['task_id']) ? (int)$params['task_id'] : $entityId;
        if ($entity !== 'task') {
            return;
        }
        $assignedTo = $this->resolveAssignedTo($params['assigned_to'] ?? null, $context);
        if ($assignedTo !== null) {
            $this->taskRepo->updateTask($taskId, ['assigned_to' => $assignedTo]);
        }
    }

    private function executeAddTaskParticipants(array $params, string $entity, int $entityId, array $context): void
    {
        $taskId = isset($params['task_id']) && is_numeric($params['task_id']) ? (int)$params['task_id'] : $entityId;
        if ($entity !== 'task') {
            return;
        }
        $userIds = $this->resolveUserIds($params['user_ids'] ?? [], $context);
        if (!empty($userIds)) {
            $existing = array_column($this->taskRepo->getParticipants($taskId), 'user_id');
            $this->taskRepo->saveParticipants($taskId, array_unique([...$existing, ...$userIds]));
        }
    }

    private function executeCreateFollowUpTask(array $params, string $entity, int $entityId, array $context): void
    {
        $this->executeCreateTask(array_merge($params, [
            'link_to_trigger_opportunity' => true,
        ]), $entity, $entityId, $context);
    }

    private function executeUpdateOpportunityStage(array $params, string $entity, int $entityId, array $context): void
    {
        $oppId = $this->resolveOpportunityId($entity, $entityId, $context);
        if ($oppId === null) {
            return;
        }
        $stageId = isset($params['to_stage_id']) && is_numeric($params['to_stage_id']) ? (int)$params['to_stage_id'] : 0;
        if ($stageId > 0) {
            $this->opportunityRepo->updateOpportunity($oppId, ['pipeline_stage_id' => $stageId]);
        }
    }

    private function executeAssignOpportunity(array $params, string $entity, int $entityId, array $context): void
    {
        $oppId = $this->resolveOpportunityId($entity, $entityId, $context);
        if ($oppId === null) {
            return;
        }
        $assignedTo = $this->resolveAssignedTo($params['assigned_to'] ?? null, $context);
        if ($assignedTo !== null) {
            $this->opportunityRepo->updateOpportunity($oppId, ['owner_user_id' => $assignedTo]);
        }
    }

    private function executeUpdateOpportunityField(array $params, string $entity, int $entityId, array $context): void
    {
        $oppId = $this->resolveOpportunityId($entity, $entityId, $context);
        if ($oppId === null || !isset($params['field']) || !isset($params['value'])) {
            return;
        }
        $field = $params['field'];
        $value = $this->interpolate((string)$params['value'], $entity, $entityId, $context);
        if (in_array($field, ['title', 'value', 'currency', 'close_date', 'owner_user_id', 'pipeline_stage_id', 'close_reason'], true)) {
            $updateData = [$field => is_numeric($value) && $field !== 'title' && $field !== 'currency' && $field !== 'close_reason' && $field !== 'close_date' ? (float)$value : $value];
            $this->opportunityRepo->updateOpportunity($oppId, $updateData);
        }
    }

    private function executeCreateFollowUpOpportunity(array $params, string $entity, int $entityId, array $context): void
    {
        $parentOppId = $this->resolveOpportunityId($entity, $entityId, $context);
        if ($parentOppId === null) {
            return;
        }
        $parentOpp = $this->opportunityRepo->findById($parentOppId);
        if ($parentOpp === null) {
            return;
        }

        $title = $this->interpolate($params['title_template'] ?? 'Seguimiento: {{opportunity_title}}', $entity, $entityId, $context);
        $stageId = isset($params['stage_id']) && is_numeric($params['stage_id']) ? (int)$params['stage_id'] : (int)($parentOpp['pipeline_stage_id'] ?? 0);
        $valuePercentage = isset($params['value_percentage']) ? (float)$params['value_percentage'] : 100;

        $this->opportunityRepo->createOpportunity([
            'account_id' => (int)$parentOpp['account_id'],
            'contact_id' => isset($parentOpp['contact_id']) ? (int)$parentOpp['contact_id'] : null,
            'pipeline_stage_id' => $stageId,
            'title' => $title,
            'value' => ($parentOpp['value'] ?? 0) * $valuePercentage / 100,
            'currency' => $parentOpp['currency'] ?? 'USD',
            'owner_user_id' => $parentOpp['owner_user_id'] ?? TenantContext::getUserId(),
            'custom_fields' => [],
        ]);
    }

    private function executeSendNotification(array $params, string $entity, int $entityId, array $context): void
    {
        $userIds = $this->resolveUserIds($params['user_id'] ?? null, $context);
        if (empty($userIds)) {
            return;
        }
        $title = $this->interpolate($params['title'] ?? 'Notificación automática', $entity, $entityId, $context);
        $message = isset($params['message']) ? $this->interpolate($params['message'], $entity, $entityId, $context) : '';

        foreach ($userIds as $userId) {
            $this->notificationRepo->upsertNotification([
                'user_id' => $userId,
                'type' => $params['type'] ?? 'workflow_auto',
                'entity_type' => $entity === 'opportunity' ? 'crm_opportunity' : 'crm_task',
                'entity_id' => $entityId,
                'title' => $title,
                'message' => $message,
                'is_read' => 0,
            ]);
        }
    }
}
