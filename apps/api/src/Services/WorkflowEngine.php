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
    /** @var list<string> */
    private static array $debugLogs = [];

    public static function logDebug(string $message): void
    {
        self::$debugLogs[] = $message;
        error_log($message);
    }

    /**
     * @return list<string>
     */
    public static function getDebugLogs(): array
    {
        return self::$debugLogs;
    }

    public static function clearDebugLogs(): void
    {
        self::$debugLogs = [];
    }
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

    private const MAX_ACTIONS_PER_RULE = 10;

    public function __construct(
        private WorkflowRepository $workflowRepo,
        private CrmTaskRepository $taskRepo,
        private OpportunityRepository $opportunityRepo,
        private NotificationRepository $notificationRepo,
    ) {}

    /**
     * @param array<string, mixed> $context
     * @return array{executed: int, failed: int, details: array<int, array<string, mixed>>}
     */
    public function execute(string $entity, string $event, int $entityId, array $context = []): array
    {
        self::logDebug("[WorkflowEngine] Starting execution: entity={$entity}, event={$event}, entityId={$entityId}");
        
        // Carga perezosa (lazy-loading) de parámetros omitidos en el contexto del trigger
        if ($entity === 'opportunity' && $entityId > 0) {
            $opp = null;
            if (!isset($context['pipeline_id']) || !isset($context['owner_user_id']) || !isset($context['value']) || !isset($context['opportunity_title'])) {
                self::logDebug("[WorkflowEngine] Lazy-loading opportunity #{$entityId}");
                $opp = $this->opportunityRepo->findById($entityId);
            }
            if ($opp !== null) {
                if (!isset($context['pipeline_id']) && isset($opp['pipeline_id'])) {
                    $context['pipeline_id'] = (int)$opp['pipeline_id'];
                }
                if (!isset($context['owner_user_id']) && isset($opp['owner_user_id'])) {
                    $context['owner_user_id'] = (int)$opp['owner_user_id'];
                }
                if (!isset($context['value']) && isset($opp['value'])) {
                    $context['value'] = (float)$opp['value'];
                }
                if (!isset($context['opportunity_title']) && isset($opp['title'])) {
                    $context['opportunity_title'] = $opp['title'];
                }
            }
        } elseif ($entity === 'task' && $entityId > 0) {
            $task = null;
            if (!isset($context['opportunity_id']) || !isset($context['task_type_id']) || !isset($context['task_title']) || !isset($context['assigned_to']) || !isset($context['status'])) {
                self::logDebug("[WorkflowEngine] Lazy-loading task #{$entityId}");
                $task = $this->taskRepo->findById($entityId);
            }
            if ($task !== null) {
                if (!isset($context['opportunity_id']) && isset($task['opportunity_id'])) {
                    $context['opportunity_id'] = (int)$task['opportunity_id'];
                }
                if (!isset($context['task_type_id']) && isset($task['task_type_id'])) {
                    $context['task_type_id'] = (int)$task['task_type_id'];
                }
                if (!isset($context['task_title']) && isset($task['title'])) {
                    $context['task_title'] = $task['title'];
                }
                if (!isset($context['assigned_to']) && isset($task['assigned_to'])) {
                    $context['assigned_to'] = (int)$task['assigned_to'];
                }
                if (!isset($context['status']) && isset($task['status'])) {
                    $context['status'] = $task['status'];
                }
            }
        }

        self::logDebug("[WorkflowEngine] Context: " . json_encode($context));

        $rules = $this->workflowRepo->listActiveRulesByTrigger($entity, $event);
        self::logDebug("[WorkflowEngine] Found " . count($rules) . " active rules for trigger {$entity}.{$event}");
        if (empty($rules)) {
            return ['executed' => 0, 'failed' => 0, 'details' => []];
        }

        $results = ['executed' => 0, 'failed' => 0, 'details' => []];

        foreach ($rules as $rule) {
            self::logDebug("[WorkflowEngine] Processing rule ID={$rule['id']} ('{$rule['name']}')");
            $rawConditions = isset($rule['trigger_conditions']) && is_string($rule['trigger_conditions']) ? json_decode($rule['trigger_conditions'], true) : null;
            $conditions = is_array($rawConditions) ? $rawConditions : [];
            $rawActions = isset($rule['actions']) && is_string($rule['actions']) ? json_decode($rule['actions'], true) : null;
            $actions = is_array($rawActions) ? $rawActions : [];

            $matched = $this->matchConditions($conditions, $entity, $entityId, $context);
            self::logDebug("[WorkflowEngine] Rule ID={$rule['id']}: matchConditions returned " . ($matched ? "TRUE" : "FALSE") . ". Conditions evaluated: " . json_encode($conditions));
            if (!$matched) {
                continue;
            }

            if (empty($actions)) {
                self::logDebug("[WorkflowEngine] Rule ID={$rule['id']}: no actions defined");
                continue;
            }

            $actions = array_slice($actions, 0, self::MAX_ACTIONS_PER_RULE);
            $ruleResult = ['rule_id' => $rule['id'], 'actions' => []];
            $overallStatus = 'success';

            foreach ($actions as $action) {
                $actionType = is_array($action) && isset($action['type']) && is_string($action['type']) ? $action['type'] : null;
                if ($actionType === null || !isset(self::ACTION_HANDLERS[$actionType])) {
                    self::logDebug("[WorkflowEngine] Rule ID={$rule['id']}: Unknown action type '{$actionType}'");
                    $ruleResult['actions'][] = ['type' => $actionType ?? 'unknown', 'status' => 'failed', 'error' => 'Unknown action type'];
                    $results['failed']++;
                    $overallStatus = 'partial';
                    continue;
                }

                try {
                    $handler = self::ACTION_HANDLERS[$actionType];
                    $params = isset($action['params']) && is_array($action['params']) ? $action['params'] : [];
                    self::logDebug("[WorkflowEngine] Rule ID={$rule['id']}: Executing action '{$actionType}' with params: " . json_encode($params));
                    $this->$handler($params, $entity, $entityId, $context);
                    self::logDebug("[WorkflowEngine] Rule ID={$rule['id']}: Action '{$actionType}' executed successfully");
                    $ruleResult['actions'][] = ['type' => $actionType, 'status' => 'success'];
                    $results['executed']++;
                } catch (\Throwable $e) {
                    self::logDebug("[WorkflowEngine] Rule ID={$rule['id']}: Action '{$actionType}' failed: " . $e->getMessage() . " in " . basename($e->getFile()) . ":" . $e->getLine());
                    $ruleResult['actions'][] = ['type' => $actionType, 'status' => 'failed', 'error' => $e->getMessage()];
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

    /**
     * @param array<mixed> $conditions
     * @param array<string, mixed> $context
     */
    private function matchConditions(array $conditions, string $entity, int $entityId, array $context): bool
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

    /**
     * @param array<string, mixed> $context
     */
    private function resolveAssignedTo(mixed $spec, array $context): ?int
    {
        if ($spec === null || $spec === '') {
            return TenantContext::getUserId();
        }
        if (is_string($spec)) {
            return match ($spec) {
                'owner' => isset($context['owner_user_id']) && is_numeric($context['owner_user_id']) 
                    ? (int)$context['owner_user_id'] 
                    : (isset($context['assigned_to']) && is_numeric($context['assigned_to']) ? (int)$context['assigned_to'] : null),
                'creator' => isset($context['created_by']) && is_numeric($context['created_by']) ? (int)$context['created_by'] : TenantContext::getUserId(),
                'trigger_user' => TenantContext::getUserId(),
                default => is_numeric($spec) ? (int)$spec : null,
            };
        }
        return is_numeric($spec) ? (int)$spec : null;
    }

    /**
     * @param array<array-key, mixed>|string|int|null $spec
     * @param array<string, mixed> $context
     * @return list<int>
     */
    private function resolveUserIds(array|string|int|null $spec, array $context): array
    {
        if ($spec === null || $spec === '' || $spec === []) {
            return [];
        }
        if (is_array($spec)) {
            return array_values(array_filter(array_map(fn($s) => $this->resolveAssignedTo($s, $context), $spec), fn($v) => $v !== null));
        }
        $resolved = $this->resolveAssignedTo($spec, $context);
        return $resolved !== null ? [$resolved] : [];
    }

    /**
     * @param array<string, mixed> $context
     */
    private function resolveOpportunityId(string $entity, int $entityId, array $context): ?int
    {
        if ($entity === 'opportunity') {
            return $entityId;
        }
        if ($entity === 'task') {
            return isset($context['opportunity_id']) && is_numeric($context['opportunity_id']) ? (int)$context['opportunity_id'] : null;
        }
        return null;
    }

    /**
     * @param array<string, mixed> $context
     */
    private function interpolate(string $text, string $entity, int $entityId, array $context): string
    {
        $replacements = [
            '{{opportunity_title}}' => isset($context['opportunity_title']) && is_scalar($context['opportunity_title']) ? (string)$context['opportunity_title'] : (isset($context['title']) && is_scalar($context['title']) ? (string)$context['title'] : ''),
            '{{account_name}}' => isset($context['account_name']) && is_scalar($context['account_name']) ? (string)$context['account_name'] : '',
            '{{value}}' => isset($context['value']) && is_scalar($context['value']) ? (string)$context['value'] : '',
            '{{currency}}' => isset($context['currency']) && is_scalar($context['currency']) ? (string)$context['currency'] : 'USD',
            '{{task_title}}' => isset($context['task_title']) && is_scalar($context['task_title']) ? (string)$context['task_title'] : (isset($context['title']) && is_scalar($context['title']) ? (string)$context['title'] : ''),
            '{{old_status}}' => isset($context['old_status']) && is_scalar($context['old_status']) ? (string)$context['old_status'] : '',
            '{{new_status}}' => isset($context['new_status']) && is_scalar($context['new_status']) ? (string)$context['new_status'] : '',
            '{{owner_name}}' => isset($context['owner_name']) && is_scalar($context['owner_name']) ? (string)$context['owner_name'] : '',
            '{{trigger_user}}' => (string)TenantContext::getUserId(),
        ];
        return str_replace(array_keys($replacements), array_values($replacements), $text);
    }

    /**
     * @param array<mixed> $params
     * @param array<string, mixed> $context
     */
    private function executeCreateTask(array $params, string $entity, int $entityId, array $context): void
    {
        $opportunityId = isset($params['link_to_trigger_opportunity']) && $params['link_to_trigger_opportunity']
            ? $this->resolveOpportunityId($entity, $entityId, $context)
            : (isset($params['opportunity_id']) && is_numeric($params['opportunity_id']) ? (int)$params['opportunity_id'] : null);

        $rawTitle = isset($params['title']) && is_string($params['title']) ? $params['title'] : 'Tarea automática';
        $title = $this->interpolate($rawTitle, $entity, $entityId, $context);
        $rawDescription = isset($params['description']) && is_string($params['description']) ? $params['description'] : null;
        $description = $rawDescription !== null ? $this->interpolate($rawDescription, $entity, $entityId, $context) : null;
        $assignedTo = $this->resolveAssignedTo($params['assigned_to'] ?? 'owner', $context);
        $rawStatus = isset($params['status']) && is_string($params['status']) ? $params['status'] : 'todo';

        $dueDate = null;
        if (isset($params['due_date_offset_days']) && is_numeric($params['due_date_offset_days']) && (int)$params['due_date_offset_days'] > 0) {
            $ts = strtotime('+' . (int)$params['due_date_offset_days'] . ' days');
            $dueDate = $ts !== false ? date('Y-m-d H:i:s', $ts) : null;
        }

        $taskId = $this->taskRepo->createTask([
            'opportunity_id' => $opportunityId,
            'title' => $title,
            'description' => $description,
            'due_date' => $dueDate,
            'status' => $rawStatus,
            'assigned_to' => $assignedTo,
            'task_type_id' => isset($params['task_type_id']) && is_numeric($params['task_type_id']) ? (int)$params['task_type_id'] : null,
        ]);

        if (!empty($params['participants']) && is_array($params['participants'])) {
            $participantIds = $this->resolveUserIds($params['participants'], $context);
            if (!empty($participantIds)) {
                $this->taskRepo->saveParticipants($taskId, $participantIds);
            }
        }
    }

    /**
     * @param array<mixed> $params
     * @param array<string, mixed> $context
     */
    private function executeUpdateTaskStatus(array $params, string $entity, int $entityId, array $context): void
    {
        if (isset($params['task_id']) && is_numeric($params['task_id'])) {
            $task = $this->taskRepo->findById((int)$params['task_id']);
            $status = isset($params['to_status']) && is_string($params['to_status']) ? $params['to_status'] : 'todo';
            if ($task !== null) {
                $this->taskRepo->updateTask((int)$params['task_id'], ['status' => $status]);
            }
        }
    }

    /**
     * @param array<mixed> $params
     * @param array<string, mixed> $context
     */
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

    /**
     * @param array<mixed> $params
     * @param array<string, mixed> $context
     */
    private function executeAddTaskParticipants(array $params, string $entity, int $entityId, array $context): void
    {
        $taskId = isset($params['task_id']) && is_numeric($params['task_id']) ? (int)$params['task_id'] : $entityId;
        if ($entity !== 'task') {
            return;
        }
        $rawUserIds = isset($params['user_ids']) && is_array($params['user_ids']) ? $params['user_ids'] : [];
        $userIds = $this->resolveUserIds($rawUserIds, $context);
        if (!empty($userIds)) {
            $existing = array_column($this->taskRepo->getParticipants($taskId), 'user_id');
            $existingTyped = array_map(fn($v) => is_numeric($v) ? (int)$v : 0, $existing);
            $this->taskRepo->saveParticipants($taskId, array_unique(array_merge($existingTyped, $userIds)));
        }
    }

    /**
     * @param array<mixed> $params
     * @param array<string, mixed> $context
     */
    private function executeCreateFollowUpTask(array $params, string $entity, int $entityId, array $context): void
    {
        $this->executeCreateTask(array_merge($params, [
            'link_to_trigger_opportunity' => true,
        ]), $entity, $entityId, $context);
    }

    /**
     * @param array<mixed> $params
     * @param array<string, mixed> $context
     */
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

    /**
     * @param array<mixed> $params
     * @param array<string, mixed> $context
     */
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

    /**
     * @param array<mixed> $params
     * @param array<string, mixed> $context
     */
    private function executeUpdateOpportunityField(array $params, string $entity, int $entityId, array $context): void
    {
        $oppId = $this->resolveOpportunityId($entity, $entityId, $context);
        if ($oppId === null || !isset($params['field']) || !isset($params['value'])) {
            return;
        }
        $field = $params['field'];
        $rawValue = $params['value'];
        if (!is_string($field) || !is_scalar($rawValue)) {
            return;
        }
        $value = $this->interpolate((string)$rawValue, $entity, $entityId, $context);
        $allowedFields = ['title', 'value', 'currency', 'close_date', 'owner_user_id', 'pipeline_stage_id', 'close_reason'];
        if (in_array($field, $allowedFields, true)) {
            $updateData = match ($field) {
                'value' => ['value' => (float)$value],
                'owner_user_id', 'pipeline_stage_id' => [$field => (int)$value],
                'close_date' => ['close_date' => (string)$value],
                default => [$field => (string)$value],
            };
            $this->opportunityRepo->updateOpportunity($oppId, $updateData);
        }
    }

    /**
     * @param array<mixed> $params
     * @param array<string, mixed> $context
     */
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

        $rawTitleTemplate = isset($params['title_template']) && is_string($params['title_template']) ? $params['title_template'] : 'Seguimiento: {{opportunity_title}}';
        $title = $this->interpolate($rawTitleTemplate, $entity, $entityId, $context);
        $stageId = isset($params['stage_id']) && is_numeric($params['stage_id']) ? (int)$params['stage_id'] : (isset($parentOpp['pipeline_stage_id']) && is_numeric($parentOpp['pipeline_stage_id']) ? (int)$parentOpp['pipeline_stage_id'] : 0);
        $valuePercentage = isset($params['value_percentage']) && is_numeric($params['value_percentage']) ? (float)$params['value_percentage'] : 100;

        $parentAccountId = isset($parentOpp['account_id']) && is_numeric($parentOpp['account_id']) ? (int)$parentOpp['account_id'] : 0;
        $parentContactId = isset($parentOpp['contact_id']) && is_numeric($parentOpp['contact_id']) ? (int)$parentOpp['contact_id'] : null;
        $parentValue = isset($parentOpp['value']) && is_numeric($parentOpp['value']) ? (float)$parentOpp['value'] : 0;
        $parentCurrency = isset($parentOpp['currency']) && is_scalar($parentOpp['currency']) ? (string)$parentOpp['currency'] : 'USD';
        $parentOwnerId = isset($parentOpp['owner_user_id']) && is_numeric($parentOpp['owner_user_id']) ? (int)$parentOpp['owner_user_id'] : null;

        $this->opportunityRepo->createOpportunity([
            'account_id' => $parentAccountId,
            'contact_id' => $parentContactId,
            'pipeline_stage_id' => $stageId,
            'title' => $title,
            'value' => $parentValue * $valuePercentage / 100,
            'currency' => $parentCurrency,
            'close_date' => null,
            'owner_user_id' => $parentOwnerId ?? TenantContext::getUserId(),
            'custom_fields' => [],
        ]);
    }

    /**
     * @param array<mixed> $params
     * @param array<string, mixed> $context
     */
    private function executeSendNotification(array $params, string $entity, int $entityId, array $context): void
    {
        $rawUserId = $params['user_id'] ?? $params['assigned_to'] ?? 'owner';
        $userIdSpec = is_array($rawUserId) || is_string($rawUserId) || is_int($rawUserId) ? $rawUserId : null;
        self::logDebug("[WorkflowEngine] executeSendNotification: rawUserId=" . json_encode($rawUserId) . ", userIdSpec=" . json_encode($userIdSpec));
        $userIds = $this->resolveUserIds($userIdSpec, $context);
        self::logDebug("[WorkflowEngine] executeSendNotification: resolved userIds=" . json_encode($userIds));
        if (empty($userIds)) {
            self::logDebug("[WorkflowEngine] executeSendNotification: No user IDs resolved, aborting notification dispatch");
            return;
        }
        $rawTitle = isset($params['title']) && is_string($params['title']) ? $params['title'] : 'Notificación automática';
        $title = $this->interpolate($rawTitle, $entity, $entityId, $context);
        $rawMessage = isset($params['message']) && is_string($params['message']) ? $params['message'] : '';
        $message = $rawMessage !== '' ? $this->interpolate($rawMessage, $entity, $entityId, $context) : '';
        $notifType = isset($params['type']) && is_string($params['type']) ? $params['type'] : 'workflow_auto';

        foreach ($userIds as $userId) {
            self::logDebug("[WorkflowEngine] executeSendNotification: Upserting notification for userId={$userId}, type={$notifType}, title='{$title}'");
            $this->notificationRepo->upsertNotification([
                'user_id' => $userId,
                'type' => $notifType,
                'entity_type' => $entity === 'opportunity' ? 'crm_opportunity' : 'crm_task',
                'entity_id' => $entityId,
                'title' => $title,
                'message' => $message,
                'is_read' => 0,
            ]);
        }
    }
}
