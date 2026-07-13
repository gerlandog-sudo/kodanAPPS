import { api } from '@kodan-apps/ui-core';
import { B2BService } from '@kodan-apps/shared';
import type {
  CustomFieldDef as SharedCustomFieldDef,
  Pipeline,
  PipelineStage,
  StageBulkInput as SharedStageBulkInput,
  Product,
  Opportunity,
  OpportunityLineItem,
  CrmTask,
  TaskType,
  ChatMessage,
  TenantUser,
  TenantUserRole,
  Quote,
  QuoteLineItem,
  WorkflowRule,
  WorkflowExecution,
  CrmNotification,
  DashboardVelocity,
  WinRateByUser,
  RecentActivity,
  PipelineComparison,
  PlanStatusResponse,
  ApiSuccessResponse,
  ApiCreateResponse,
} from '@kodan-apps/shared';

// Re-export with CRM-specific name
export interface CustomFieldDef extends SharedCustomFieldDef {}
export interface StageBulkInput extends SharedStageBulkInput {}

export const crmApi = {
  // Accounts & Contacts - delegated to shared B2BService
  listAccounts: () => B2BService.listAccounts(),
  createAccount: (data: Record<string, unknown>) => B2BService.createAccount(data),
  updateAccount: (id: number, data: Record<string, unknown>) => B2BService.updateAccount(id, data),
  deleteAccount: (id: number) => B2BService.deleteAccount(id),

  listContacts: (accountId?: number) => B2BService.listContacts(accountId),
  createContact: (data: Record<string, unknown>) => B2BService.createContact(data),
  updateContact: (id: number, data: Record<string, unknown>) => B2BService.updateContact(id, data),
  deleteContact: (id: number) => B2BService.deleteContact(id),

  // Custom Fields
  listCustomFields: (entity: string) => B2BService.listCustomFields(entity),

  // CRM-specific endpoints
  getPlanStatus: () => api.get<PlanStatusResponse[]>('/api/crm/plan-status'),

  listPipelines: () => api.get<Pipeline[]>('/api/crm/pipelines'),
  createPipeline: (data: Partial<Pipeline>) => api.post<ApiCreateResponse>('/api/crm/pipelines', data),
  updatePipeline: (id: number, data: Partial<Pipeline>) => api.patch<ApiSuccessResponse>(`/api/crm/pipelines/${id}`, data),
  deletePipeline: (id: number) => api.delete<ApiSuccessResponse>(`/api/crm/pipelines/${id}`),

  listStages: (pipelineId: number) => api.get<PipelineStage[]>(`/api/crm/pipelines/${pipelineId}/stages`),
  createStage: (pipelineId: number, data: Partial<PipelineStage>) =>
    api.post<ApiCreateResponse>(`/api/crm/pipelines/${pipelineId}/stages`, data),
  updateStage: (id: number, data: Partial<PipelineStage>) =>
    api.patch<ApiSuccessResponse>(`/api/crm/pipeline-stages/${id}`, data),
  deleteStage: (id: number) => api.delete<ApiSuccessResponse>(`/api/crm/pipeline-stages/${id}`),

  listProducts: () => api.get<Product[]>('/api/crm/products'),
  createProduct: (data: Partial<Product>) => api.post<ApiCreateResponse>('/api/crm/products', data),
  updateProduct: (id: number, data: Partial<Product>) => api.patch<ApiSuccessResponse>(`/api/crm/products/${id}`, data),
  deleteProduct: (id: number) => api.delete<ApiSuccessResponse>(`/api/crm/products/${id}`),

  listOpportunities: (params?: Record<string, string>) =>
    api.get<Opportunity[]>('/api/crm/opportunities', params),
  createOpportunity: (data: Partial<Opportunity>) =>
    api.post<ApiCreateResponse>('/api/crm/opportunities', data),
  updateOpportunity: (id: number, data: Partial<Opportunity>) =>
    api.patch<ApiSuccessResponse>(`/api/crm/opportunities/${id}`, data),
  deleteOpportunity: (id: number) => api.delete<ApiSuccessResponse>(`/api/crm/opportunities/${id}`),
  getOpportunityLineItems: (id: number) =>
    api.get<OpportunityLineItem[]>(`/api/crm/opportunities/${id}/items`),
  saveOpportunityLineItems: (id: number, data: Partial<OpportunityLineItem>[]) =>
    api.post<ApiSuccessResponse>(`/api/crm/opportunities/${id}/items`, data),
  markAsWon: (id: number, data: { tracker_project_name: string; budgeted_hours: number }) =>
    api.post<ApiSuccessResponse>(`/api/crm/opportunities/${id}/won`, data),
  archiveOpportunity: (id: number) => api.post<ApiSuccessResponse>(`/api/crm/opportunities/${id}/archive`, {}),
  unarchiveOpportunity: (id: number) => api.post<ApiSuccessResponse>(`/api/crm/opportunities/${id}/unarchive`, {}),

  listTasks: (params?: Record<string, string>) => api.get<CrmTask[]>('/api/crm/tasks', params),
  getTask: (id: number) => api.get<CrmTask>(`/api/crm/tasks/${id}`),
  createTask: (data: Partial<CrmTask>) => api.post<ApiCreateResponse>('/api/crm/tasks', data),
  updateTask: (id: number, data: Partial<CrmTask>) => api.patch<ApiSuccessResponse>(`/api/crm/tasks/${id}`, data),
  deleteTask: (id: number) => api.delete<ApiSuccessResponse>(`/api/crm/tasks/${id}`),

  listTaskTypes: () => api.get<TaskType[]>('/api/crm/task-types'),
  createTaskType: (data: Partial<TaskType>) => api.post<ApiCreateResponse>('/api/crm/task-types', data),
  updateTaskType: (id: number, data: Partial<TaskType>) =>
    api.patch<ApiSuccessResponse>(`/api/crm/task-types/${id}`, data),
  deleteTaskType: (id: number) => api.delete<ApiSuccessResponse>(`/api/crm/task-types/${id}`),

  listChatsByOpportunity: (oppId: number) => api.get<ChatMessage[]>(`/api/crm/opportunities/${oppId}/chat`),
  sendMessage: (oppId: number, data: { content: string; thread_id?: number | null; attachments?: string[] }) =>
    api.post<ChatMessage>(`/api/crm/opportunities/${oppId}/chat`, data),

  // Custom Fields (CRM-specific CRUD)
  createCustomField: (data: Partial<CustomFieldDef>) =>
    api.post<ApiCreateResponse>('/api/crm/custom-fields', data),
  updateCustomField: (id: number, data: Partial<CustomFieldDef>) =>
    api.patch<ApiSuccessResponse>(`/api/crm/custom-fields/${id}`, data),
  deleteCustomField: (id: number, purge?: boolean) =>
    api.delete<ApiSuccessResponse>(`/api/crm/custom-fields/${id}${purge ? '?purge=true' : ''}`),
  reorderCustomFields: (entries: { id: number; sort_order: number }[]) =>
    api.put<ApiSuccessResponse>('/api/crm/custom-fields/reorder', { entries }),

  // Bulk Stages
  bulkUpdateStages: (pipelineId: number, stages: StageBulkInput[]) =>
    api.put<ApiSuccessResponse>('/api/crm/pipeline-stages', { pipeline_id: pipelineId, stages }),

  // Tenant Users
  listTenantUsers: () => api.get<TenantUser[]>('/api/tenant-users'),
  listCrmRoles: () => api.get<TenantUserRole[]>('/api/tenant-users/roles'),
  createTenantUser: (data: Partial<TenantUser>) => api.post<ApiCreateResponse>('/api/tenant-users', data),
  updateTenantUser: (id: number, data: Partial<TenantUser>) =>
    api.put<ApiSuccessResponse>(`/api/tenant-users/${id}`, data),
  deleteTenantUser: (id: number) => api.delete<ApiSuccessResponse>(`/api/tenant-users/${id}`),

  // Quotes
  listQuotes: (params?: { opportunity_id?: number }) =>
    api.get<Quote[]>('/api/crm/quotes', params ? { opportunity_id: String(params.opportunity_id ?? '') } : undefined),
  getQuote: (id: number) => api.get<Quote>(`/api/crm/quotes/${id}`),
  createQuote: (data: Partial<Quote>) => api.post<ApiCreateResponse>('/api/crm/quotes', data),
  updateQuote: (id: number, data: Partial<Quote>) => api.patch<ApiSuccessResponse>(`/api/crm/quotes/${id}`, data),
  deleteQuote: (id: number) => api.delete<ApiSuccessResponse>(`/api/crm/quotes/${id}`),
  getQuoteLineItems: (id: number) => api.get<QuoteLineItem[]>(`/api/crm/quotes/${id}/items`),
  saveQuoteLineItems: (id: number, data: Partial<QuoteLineItem>[]) =>
    api.post<ApiSuccessResponse>(`/api/crm/quotes/${id}/items`, data),

  // Dashboard
  getDashboardStats: (pipelineId?: number) =>
    api.get<{ totalValue: number; activeDeals: number; wonDeals: number; wonValue: number; totalAccounts: number; avgDealSize: number }>(
      '/api/crm/dashboard/stats',
      pipelineId ? { pipeline_id: String(pipelineId) } : undefined,
    ),
  getSalesVelocity: (pipelineId?: number) =>
    api.get<DashboardVelocity>(
      '/api/crm/dashboard/sales-velocity',
      pipelineId ? { pipeline_id: String(pipelineId) } : undefined,
    ),
  getRecentActivity: (pipelineId?: number) =>
    api.get<RecentActivity[]>(
      '/api/crm/dashboard/activity',
      pipelineId ? { pipeline_id: String(pipelineId) } : undefined,
    ),
  getPipelineComparison: () => api.get<PipelineComparison[]>('/api/crm/dashboard/pipeline-comparison'),
  getWinRateByUser: (pipelineId?: number) =>
    api.get<WinRateByUser[]>(
      '/api/crm/dashboard/win-rate',
      pipelineId ? { pipeline_id: String(pipelineId) } : undefined,
    ),

  // Workflows
  listWorkflowRules: () => api.get<WorkflowRule[]>('/api/crm/workflows'),
  getWorkflowRule: (id: number) => api.get<WorkflowRule>(`/api/crm/workflows/${id}`),
  createWorkflowRule: (data: Partial<WorkflowRule>) => api.post<ApiCreateResponse>('/api/crm/workflows', data),
  updateWorkflowRule: (id: number, data: Partial<WorkflowRule>) =>
    api.patch<ApiSuccessResponse>(`/api/crm/workflows/${id}`, data),
  deleteWorkflowRule: (id: number) => api.delete<ApiSuccessResponse>(`/api/crm/workflows/${id}`),
  getWorkflowExecutions: (ruleId: number) => api.get<WorkflowExecution[]>(`/api/crm/workflows/${ruleId}/executions`),
  testWorkflowRule: (data: Partial<WorkflowRule>) => api.post<{ matched: boolean; actions: string[] }>('/api/crm/workflows/test', data),
  getWorkflowStats: () => api.get<{ total: number; active: number; executions_today: number }>('/api/crm/workflows/stats'),

  // Notifications
  listNotifications: () => api.get<CrmNotification[]>('/api/crm/notifications'),
  markNotificationsRead: (ids?: number[]) => api.post<ApiSuccessResponse>('/api/crm/notifications/mark-read', { ids }),
  clearNotifications: () => api.post<ApiSuccessResponse>('/api/crm/notifications/clear', {}),
  getNotificationsConfig: () => api.get<{ stalled_deal_days: number }>('/api/crm/notifications/config'),
  saveNotificationsConfig: (data: { stalled_deal_days: number }) =>
    api.post<ApiSuccessResponse>('/api/crm/notifications/config', data),

  // Theme
  getTheme: () => api.get<{ theme: 'light' | 'dark' }>('/api/crm/theme'),
  updateTheme: (theme: 'light' | 'dark') => api.put<ApiSuccessResponse>('/api/crm/theme', { theme }),

  // Messaging Extra
  getLastUnreadChat: () => api.get<{ type: string; id: number; title: string | null } | null>('/api/messages/last-unread'),
};
