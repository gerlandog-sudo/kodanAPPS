// ──────────────────────────────────────────────
// 🏢 B2B Accounts & Contacts
// ──────────────────────────────────────────────

export type CustomFieldValue = string | number | boolean | null

export interface B2BAccount {
  account_id: number
  name: string
  legal_name: string | null
  tax_id: string | null
  website: string | null
  phone: string | null
  address: string | null
  custom_fields: Record<string, CustomFieldValue>
}

export interface B2BContact {
  contact_id: number
  account_id: number
  first_name: string
  last_name: string
  email: string
  phone: string | null
  mobile: string | null
  custom_fields: Record<string, CustomFieldValue>
  account_name?: string
}

export interface B2BAccountFormData {
  name: string
  legal_name: string
  tax_id: string
  website: string
  phone: string
  address: string
}

export interface B2BContactFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  mobile: string
  account_id: string
}

// ──────────────────────────────────────────────
// 📋 Custom Fields
// ──────────────────────────────────────────────

export interface CustomFieldDef {
  id: number
  entity_type: 'account' | 'contact' | 'opportunity'
  field_key: string
  field_label: string
  field_type: 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'boolean'
  options: string[] | null
  is_required: boolean
  sort_order: number
}

// ──────────────────────────────────────────────
// 📊 CRM – Pipeline & Stages
// ──────────────────────────────────────────────

export interface Pipeline {
  id: number
  tenant_id: number
  name: string
  description: string | null
  is_default: number
  is_active: boolean
  sort_order: number
  ui_config?: { won_reasons?: string[]; lost_reasons?: string[] } | null
  created_at: string
  stages?: PipelineStage[]
}

export interface PipelineStage {
  id: number
  pipeline_id: number
  name: string
  color_hex: string
  sort_order: number
  probability: number
  is_won_stage: number
  is_lost_stage: number
  ui_config: Record<string, CustomFieldValue> | null
}

export interface StageBulkInput {
  id?: number
  name: string
  color_hex?: string
  sort_order?: number
  probability?: number
  is_won_stage?: number
  is_lost_stage?: number
  ui_config?: Record<string, CustomFieldValue> | null
}

// ──────────────────────────────────────────────
// 📦 CRM – Products
// ──────────────────────────────────────────────

export interface Product {
  id: number
  tenant_id: number
  name: string
  description: string | null
  sku: string
  unit_price: number
  unit_type: string
  category: string | null
  is_active: number
  created_at: string
}

// ──────────────────────────────────────────────
// 💼 CRM – Opportunities
// ──────────────────────────────────────────────

export interface Opportunity {
  id: number
  tenant_id: number
  account_id: number | null
  contact_id: number | null
  owner_user_id: number | null
  pipeline_id: number
  pipeline_stage_id: number
  stage_id: number
  name: string
  value: string | number
  currency: string
  probability: number
  status: 'open' | 'won' | 'lost'
  close_reason: string | null
  close_date: string
  expected_close_date: string | null
  assigned_to: number | null
  stage_name?: string
  stage_color?: string
  account_name?: string
  assigned_name?: string
  created_at: string
  updated_at: string
  custom_fields?: Record<string, CustomFieldValue>
}

export interface OpportunityLineItem {
  id: number
  opportunity_id: number
  product_id: number
  product_name?: string
  quantity: number
  unit_price: number
  total_price: number
  description: string | null
  sort_order: number
}

// ──────────────────────────────────────────────
// ✅ CRM – Tasks
// ──────────────────────────────────────────────

export interface CrmTask {
  id: number
  tenant_id: number
  opportunity_id: number | null
  task_type_id: number | null
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done' | 'archived'
  start_date: string | null
  end_date: string | null
  due_date: string | null
  completed?: boolean
  assigned_to: number | null
  created_by: number
  created_at: string
  updated_at: string
  task_type_name?: string
  task_type_icon?: string
  task_type_color?: string
  assigned_name?: string
  participants?: number[]
}

// ──────────────────────────────────────────────
// 🏷️ CRM – Task Types
// ──────────────────────────────────────────────

export interface TaskType {
  id: number
  tenant_id: number
  module: string
  name: string
  icon: string
  color_hex: string
  created_at?: string
}

// ──────────────────────────────────────────────
// 💬 CRM – Chat / Messages
// ──────────────────────────────────────────────

export interface ChatMessage {
  id: number
  opportunity_id: number
  user_id: number
  content: string
  thread_id: number | null
  created_at: string
  user_name?: string
  attachments?: ChatAttachment[]
}

export interface ChatAttachment {
  id: number
  file_name: string
  file_size: number
  mime_type: string
  url: string
}

// ──────────────────────────────────────────────
// 👥 CRM – Tenant Users
// ──────────────────────────────────────────────

export interface TenantUser {
  id: number
  tenant_id: number
  email: string
  name: string
  is_active: boolean
  role_id: number | null
  role_name?: string
  created_at: string
}

export interface TenantUserRole {
  id: number
  app_id: string
  name: string
  description: string | null
  is_active: boolean
  can_approve_hours: boolean
}

// ──────────────────────────────────────────────
// 📄 CRM – Quotes
// ──────────────────────────────────────────────

export interface Quote {
  id: number
  tenant_id: number
  opportunity_id: number
  opportunity_title?: string
  quote_number: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  subtotal: string
  tax_total: string
  total_amount: string
  currency: string
  valid_until: string | null
  notes: string | null
  created_by: number
  created_at: string
  updated_at: string
  opportunity_name?: string
  account_name?: string
  items?: QuoteLineItem[]
}

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

// ──────────────────────────────────────────────
// ⚙️ CRM – Workflows
// ──────────────────────────────────────────────

export interface WorkflowRule {
  id: number
  tenant_id: number
  name: string
  description: string | null
  trigger_entity: string
  trigger_event: string
  trigger_conditions: Record<string, any>
  actions: Array<{ type: string; params: Record<string, any> }>
  is_active: number
  execution_order: number
  created_at: string
  updated_at: string
}

export interface WorkflowExecution {
  id: number
  rule_id: number
  trigger_entity: string
  trigger_entity_id: number
  status: string
  executed_actions: Array<{ type: string; status: string; error?: string }>
  error_message: string | null
  executed_at: string
}

// ──────────────────────────────────────────────
// 🔔 CRM – Notifications
// ──────────────────────────────────────────────

export interface CrmNotification {
  id: number
  tenant_id: number
  type: string
  title: string
  message: string
  is_read: boolean
  entity_type: string | null
  entity_id: number | null
  created_at: string
}

// ──────────────────────────────────────────────
// 📊 CRM – Dashboard
// ──────────────────────────────────────────────

export interface DashboardVelocity {
  avgDaysToClose: number
  avgStages: number
  conversionRate: number
  trend: number
}

export interface WinRateByUser {
  id: number
  name: string
  avatar: string | null
  won: number
  lost: number
  winRate: number
  totalValue: number
}

export interface RecentActivity {
  type: string
  message: string
  userName: string
  timestamp: string
  entityType: string
  entityId: number
}

export interface PipelineComparison {
  id: number
  name: string
  totalValue: number
  activeDeals: number
  wonDeals: number
  winRate: number
  avgCycleDays: number
  color: string
}

export interface CloseReasonGroup {
  name: string
  count: number
  value: number
}

export interface CloseReasonSummary {
  name: string
  wonCount: number
  wonValue: number
  lostCount: number
  lostValue: number
}

export interface CloseReasons {
  wonReasons: CloseReasonGroup[]
  lostReasons: CloseReasonGroup[]
  summaryTable: CloseReasonSummary[]
}

export interface CrmDashboardData {
  opportunities: Opportunity[]
  accounts: B2BAccount[]
  stats: {
    totalValue: number
    activeDeals: number
    wonDeals: number
    wonValue: number
    totalAccounts: number
    avgDealSize: number
  }
  stageData: { name: string; value: number; count: number }[]
  hotDeals: Opportunity[]
  salesVelocity: DashboardVelocity
  winRateByUser: WinRateByUser[]
  recentActivity: RecentActivity[]
  pipelineComparison: PipelineComparison[]
  closeReasons: CloseReasons
}

export interface PlanStatusResponse {
  module: string
  metric: string
  limit_value: number | string
  current_usage: number | string
  has_capacity: number | string
}

// ──────────────────────────────────────────────
// 🏢 SuperAdmin – Tenants
// ──────────────────────────────────────────────

export interface Tenant {
  tenant_id: number
  name: string
  logo_url: string | null
  is_active: boolean
  is_system_tenant: boolean
  subscription_plan_id: number | null
  plan_name: string
  plan_price: number
  plan_currency: string
  created_at: string
  apps: Array<{ app_id: string; is_active: boolean }>
}

export interface CreateTenantInput {
  name: string
  subscription_plan_id: number
  logo_url?: string | null
  theme_preference?: string
  admin_name: string
  admin_email: string
  admin_password: string
}

export interface UpdateTenantInput {
  name?: string
  subscription_plan_id?: number
  logo_url?: string | null
}

// ──────────────────────────────────────────────
// 💳 SuperAdmin – Plans
// ──────────────────────────────────────────────

export interface SubscriptionPlan {
  id: number
  name: string
  description: string
  price: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
  limits: PlanLimit[]
}

export interface PlanLimit {
  module: string
  metric: string
  value: number
}

export interface CreatePlanInput {
  name: string
  description?: string
  price: number
  currency: string
  limits: PlanLimit[]
}

// ──────────────────────────────────────────────
// 📊 SuperAdmin – Stats & Dashboard
// ──────────────────────────────────────────────

export interface SuperAdminStats {
  total_tenants: number
  active_tenants: number
  total_revenue: number
  total_users: number
  recent_tenants: Tenant[]
}

// ──────────────────────────────────────────────
// 🔐 SuperAdmin – Roles
// ──────────────────────────────────────────────

export interface SuperAdminRole {
  id: number
  app_id: string
  name: string
  description: string
  is_active: number
  can_approve: number
  created_at: string
}

// ──────────────────────────────────────────────
// 📱 SuperAdmin – Apps & Metrics
// ──────────────────────────────────────────────

export interface SuperAdminApp {
  app_id: string
  name: string
  description: string | null
  is_active: boolean
}

export interface AppMetric {
  app: string
  app_id: string
  metric: string
  label: string
  description: string | null
  metric_type: string
  default_value: number
  is_active: boolean
  sort_order: number
}

// ──────────────────────────────────────────────
// 📈 SuperAdmin – Tenant Usage & Overrides
// ──────────────────────────────────────────────

export interface TenantUsage {
  tenant_id: number
  tenant_name: string
  metrics: Array<{
    module: string
    metric: string
    current_usage: number
    limit_value: number
    overridden_value: number | null
  }>
}

export interface TenantOverrideInput {
  module: string
  metric: string
  custom_value: number
}

// ──────────────────────────────────────────────
// 🔐 Auth
// ──────────────────────────────────────────────

export interface AuthUser {
  id: number
  email: string
  name: string
  display_name: string
  avatar: string | null
  roles?: string[]
  can_approve_hours?: boolean
  app_id?: string
  plan_status?: PlanStatusResponse[]
  plan_name?: string
}

export interface AuthValidateResponse {
  authenticated: boolean
  user: AuthUser
  roles: string[]
  can_approve_hours: boolean
  app_id: string
  plan_status: PlanStatusResponse[]
  plan_name: string
}

// ──────────────────────────────────────────────
// 🕒 Tracker – Time Entries
// ──────────────────────────────────────────────

export interface TimeEntryHistoryItem {
  id: number
  time_entry_id: number
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_by: number
  changed_at: string
  changed_by_name?: string
}

// ──────────────────────────────────────────────
// 📊 Tracker – Metrics
// ──────────────────────────────────────────────

export interface TrackerMetrics {
  total_projects: number
  active_projects: number
  total_hours: number
  total_cost: number
  billable_hours: number
  billable_cost: number
  project_breakdown: Array<{
    project_id: number
    project_name: string
    hours: number
    cost: number
  }>
}

// ──────────────────────────────────────────────
// 🤖 Tracker – Reassign Suggestions
// ──────────────────────────────────────────────

export interface ReassignSuggestion {
  task_id: number
  task_title: string
  current_user_id: number
  current_user_name: string
  suggested_user_id: number
  suggested_user_name: string
  reason: string
  score: number
}

// ──────────────────────────────────────────────
// 🌐 API Generic Responses
// ──────────────────────────────────────────────

export interface ApiSuccessResponse {
  success: boolean
  message?: string
}

export interface ApiCreateResponse extends ApiSuccessResponse {
  id: number
}
