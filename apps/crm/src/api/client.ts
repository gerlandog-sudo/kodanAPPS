import { api } from '@kodan-apps/ui-core';
import { B2BService } from '@kodan-apps/shared';

// Custom field & pipeline types (CRM-specific)
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

export interface StageBulkInput {
  id?: number
  name: string
  color_hex?: string
  sort_order?: number
  probability?: number
  is_won_stage?: number
  is_lost_stage?: number
  ui_config?: Record<string, any> | null
}

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
  listContactsByAccount: (accountId: number) => B2BService.listContacts(accountId),

  // Custom Fields
  listCustomFields: (entity: string) => B2BService.listCustomFields(entity),

  // CRM-specific endpoints
  getPlanStatus: () => api.get<any>('/api/crm/plan-status'),

  listPipelines: () => api.get<any[]>('/api/crm/pipelines'),
  createPipeline: (data: any) => api.post('/api/crm/pipelines', data),
  updatePipeline: (id: number, data: any) => api.patch(`/api/crm/pipelines/${id}`, data),
  deletePipeline: (id: number) => api.delete(`/api/crm/pipelines/${id}`),

  listStages: (pipelineId: number) => api.get<any[]>(`/api/crm/pipelines/${pipelineId}/stages`),
  createStage: (pipelineId: number, data: any) => api.post(`/api/crm/pipelines/${pipelineId}/stages`, data),
  updateStage: (id: number, data: any) => api.patch(`/api/crm/pipeline-stages/${id}`, data),
  deleteStage: (id: number) => api.delete(`/api/crm/pipeline-stages/${id}`),

  listProducts: () => api.get<any[]>('/api/crm/products'),
  createProduct: (data: any) => api.post('/api/crm/products', data),
  updateProduct: (id: number, data: any) => api.patch(`/api/crm/products/${id}`, data),
  deleteProduct: (id: number) => api.delete(`/api/crm/products/${id}`),

  listOpportunities: (params?: Record<string, string>) => api.get<any[]>('/api/crm/opportunities', params),
  createOpportunity: (data: any) => api.post('/api/crm/opportunities', data),
  updateOpportunity: (id: number, data: any) => api.patch(`/api/crm/opportunities/${id}`, data),
  deleteOpportunity: (id: number) => api.delete(`/api/crm/opportunities/${id}`),
  getOpportunityLineItems: (id: number) => api.get<any[]>(`/api/crm/opportunities/${id}/items`),
  saveOpportunityLineItems: (id: number, data: any) => api.post(`/api/crm/opportunities/${id}/items`, data),
  markAsWon: (id: number, data: { tracker_project_name: string; budgeted_hours: number }) =>
    api.post(`/api/crm/opportunities/${id}/won`, data),
  archiveOpportunity: (id: number) => api.post(`/api/crm/opportunities/${id}/archive`, {}),
  unarchiveOpportunity: (id: number) => api.post(`/api/crm/opportunities/${id}/unarchive`, {}),

  listTasks: (params?: Record<string, string>) => api.get<any[]>('/api/crm/tasks', params),
  getTask: (id: number) => api.get<any>(`/api/crm/tasks/${id}`),
  createTask: (data: any) => api.post('/api/crm/tasks', data),
  updateTask: (id: number, data: any) => api.patch(`/api/crm/tasks/${id}`, data),
  deleteTask: (id: number) => api.delete(`/api/crm/tasks/${id}`),

  listTaskTypes: () => api.get<any[]>('/api/crm/task-types'),
  createTaskType: (data: any) => api.post('/api/crm/task-types', data),
  updateTaskType: (id: number, data: any) => api.patch(`/api/crm/task-types/${id}`, data),
  deleteTaskType: (id: number) => api.delete(`/api/crm/task-types/${id}`),

  listChatsByOpportunity: (oppId: number) => api.get<any[]>(`/api/crm/opportunities/${oppId}/chat`),
  sendMessage: (oppId: number, data: { content: string; thread_id?: number | null; attachments?: any[] }) =>
    api.post(`/api/crm/opportunities/${oppId}/chat`, data),

  // Custom Fields (CRM-specific CRUD)
  createCustomField: (data: Partial<CustomFieldDef>) => api.post('/api/crm/custom-fields', data),
  updateCustomField: (id: number, data: Partial<CustomFieldDef>) => api.patch(`/api/crm/custom-fields/${id}`, data),
  deleteCustomField: (id: number, purge?: boolean) => api.delete(`/api/crm/custom-fields/${id}${purge ? '?purge=true' : ''}`),
  reorderCustomFields: (entries: { id: number; sort_order: number }[]) => api.put('/api/crm/custom-fields/reorder', { entries }),

  // Bulk Stages
  bulkUpdateStages: (pipelineId: number, stages: StageBulkInput[]) => api.put('/api/crm/pipeline-stages', { pipeline_id: pipelineId, stages }),

  // Tenant Users
  listTenantUsers: () => api.get<any[]>('/api/tenant-users'),
  listCrmRoles: () => api.get<any[]>('/api/tenant-users/roles'),
  createTenantUser: (data: any) => api.post('/api/tenant-users', data),
  updateTenantUser: (id: number, data: any) => api.put(`/api/tenant-users/${id}`, data),
  deleteTenantUser: (id: number) => api.delete(`/api/tenant-users/${id}`),

  // Quotes
  listQuotes: (params?: { opportunity_id?: number }) =>
    api.get<any[]>('/api/crm/quotes', (params ? { opportunity_id: String(params.opportunity_id ?? '') } : undefined)),
  getQuote: (id: number) => api.get<any>(`/api/crm/quotes/${id}`),
  createQuote: (data: any) => api.post('/api/crm/quotes', data),
  updateQuote: (id: number, data: any) => api.patch(`/api/crm/quotes/${id}`, data),
  deleteQuote: (id: number) => api.delete(`/api/crm/quotes/${id}`),
  getQuoteLineItems: (id: number) => api.get<any[]>(`/api/crm/quotes/${id}/items`),
  saveQuoteLineItems: (id: number, data: any) => api.post(`/api/crm/quotes/${id}/items`, data),

  // Dashboard
  getDashboardStats: (pipelineId?: number) =>
    api.get<any>('/api/crm/dashboard/stats', pipelineId ? { pipeline_id: String(pipelineId) } : undefined),
  getSalesVelocity: (pipelineId?: number) =>
    api.get<any>('/api/crm/dashboard/sales-velocity', pipelineId ? { pipeline_id: String(pipelineId) } : undefined),
  getRecentActivity: (pipelineId?: number) =>
    api.get<any[]>('/api/crm/dashboard/activity', pipelineId ? { pipeline_id: String(pipelineId) } : undefined),
  getPipelineComparison: () =>
    api.get<any[]>('/api/crm/dashboard/pipeline-comparison'),
  getWinRateByUser: (pipelineId?: number) =>
    api.get<any[]>('/api/crm/dashboard/win-rate', pipelineId ? { pipeline_id: String(pipelineId) } : undefined),

  // Workflows
  listWorkflowRules: () => api.get<any[]>('/api/crm/workflows'),
  getWorkflowRule: (id: number) => api.get<any>(`/api/crm/workflows/${id}`),
  createWorkflowRule: (data: any) => api.post('/api/crm/workflows', data),
  updateWorkflowRule: (id: number, data: any) => api.patch(`/api/crm/workflows/${id}`, data),
  deleteWorkflowRule: (id: number) => api.delete(`/api/crm/workflows/${id}`),
  getWorkflowExecutions: (ruleId: number) => api.get<any[]>(`/api/crm/workflows/${ruleId}/executions`),
  testWorkflowRule: (data: any) => api.post<any>('/api/crm/workflows/test', data),
  getWorkflowStats: () => api.get<any>('/api/crm/workflows/stats'),

  // Notifications
  listNotifications: () => api.get<any[]>('/api/crm/notifications'),
  markNotificationsRead: (ids?: number[]) => api.post('/api/crm/notifications/mark-read', { ids }),
  clearNotifications: () => api.post('/api/crm/notifications/clear', {}),
  getNotificationsConfig: () => api.get<{ stalled_deal_days: number }>('/api/crm/notifications/config'),
  saveNotificationsConfig: (data: { stalled_deal_days: number }) => api.post('/api/crm/notifications/config', data),

  // Theme
  getTheme: () => api.get<{ theme: 'light' | 'dark' }>('/api/crm/theme'),
  updateTheme: (theme: 'light' | 'dark') => api.put('/api/crm/theme', { theme }),

  // Messaging Extra
  getLastUnreadChat: () => api.get<{ type: string; id: number; title: string | null } | null>('/api/messages/last-unread'),
};
