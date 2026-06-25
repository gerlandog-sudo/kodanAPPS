

// ── Pipelines ──
export interface Pipeline {
  id: number
  name: string
  is_default: number
  ui_config?: {
    won_reasons?: string[]
    lost_reasons?: string[]
  } | null
}

export interface Stage {
  id: number
  name: string
  color_hex: string
  sort_order: number
  is_won_stage: number
  is_lost_stage: number
  probability: number
  pipeline_id: number
}

// ── Quotes ──
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export interface QuoteLineItem {
  id?: number
  quote_id?: number
  product_id: number
  product_name?: string
  product_sku?: string
  quantity: number
  unit_price: number
  discount_percentage: number
  tax_percentage: number
}

export interface Quote {
  id: number
  tenant_id: number
  opportunity_id: number
  opportunity_title?: string
  account_name?: string
  quote_number: string
  status: QuoteStatus
  total_amount: string
  created_at: string
  items?: QuoteLineItem[]
}

// ── Custom Fields ──
export type EntityType = 'account' | 'contact' | 'opportunity'
// ── Workflows ──
type TriggerEntity = 'opportunity' | 'task'
type TriggerEvent =
  | 'stage_changed' | 'created' | 'won' | 'lost' | 'assigned'
  | 'archived' | 'unarchived' | 'value_changed' | 'close_date_changed'
  | 'task_created' | 'task_status_changed' | 'task_completed'
  | 'task_assigned' | 'task_due_date_changed' | 'task_archived' | 'task_unarchived'

type ActionType =
  | 'create_task' | 'update_task_status' | 'assign_task' | 'add_task_participants' | 'create_followup_task'
  | 'update_opportunity_stage' | 'assign_opportunity' | 'update_opportunity_field' | 'create_followup_opportunity'
  | 'send_notification'

export interface WorkflowRule {
  id: number
  tenant_id: number
  name: string
  description: string | null
  trigger_entity: TriggerEntity
  trigger_event: TriggerEvent
  trigger_conditions: Record<string, any>
  actions: WorkflowAction[]
  is_active: number
  execution_order: number
  created_at: string
  updated_at: string
}

export interface WorkflowAction {
  type: ActionType
  params: Record<string, any>
}

export interface WorkflowExecution {
  id: number
  rule_id: number
  trigger_entity: TriggerEntity
  trigger_entity_id: number
  status: 'success' | 'partial' | 'failed'
  executed_actions: { type: string; status: string; error?: string }[]
  error_message: string | null
  executed_at: string
}
