import { api } from '@kodan-apps/ui-core';

export { apiClient, ApiError } from '@kodan-apps/ui-core';

// Custom field & pipeline types
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

interface CrmApi {
  getPlanStatus: () => Promise<any>;
  listAccounts: () => Promise<any[]>;
  createAccount: (data: any) => Promise<unknown>;
  updateAccount: (id: number, data: any) => Promise<unknown>;
  deleteAccount: (id: number) => Promise<unknown>;
  listContacts: () => Promise<any[]>;
  createContact: (data: any) => Promise<unknown>;
  updateContact: (id: number, data: any) => Promise<unknown>;
  deleteContact: (id: number) => Promise<unknown>;
  listContactsByAccount: (accountId: number) => Promise<any[]>;
  listPipelines: () => Promise<any[]>;
  createPipeline: (data: any) => Promise<unknown>;
  updatePipeline: (id: number, data: any) => Promise<unknown>;
  deletePipeline: (id: number) => Promise<unknown>;
  listStages: (pipelineId: number) => Promise<any[]>;
  createStage: (pipelineId: number, data: any) => Promise<unknown>;
  updateStage: (id: number, data: any) => Promise<unknown>;
  deleteStage: (id: number) => Promise<unknown>;
  listProducts: () => Promise<any[]>;
  createProduct: (data: any) => Promise<unknown>;
  updateProduct: (id: number, data: any) => Promise<unknown>;
  deleteProduct: (id: number) => Promise<unknown>;
  listOpportunities: (params?: Record<string, string>) => Promise<any[]>;
  createOpportunity: (data: any) => Promise<unknown>;
  updateOpportunity: (id: number, data: any) => Promise<unknown>;
  deleteOpportunity: (id: number) => Promise<unknown>;
  getOpportunityLineItems: (id: number) => Promise<any[]>;
  saveOpportunityLineItems: (id: number, data: any) => Promise<unknown>;
  markAsWon: (id: number, data: { tracker_project_name: string; budgeted_hours: number }) => Promise<unknown>;
  archiveOpportunity: (id: number) => Promise<unknown>;
  unarchiveOpportunity: (id: number) => Promise<unknown>;
  listTasks: () => Promise<any[]>;
  createTask: (data: any) => Promise<unknown>;
  updateTask: (id: number, data: any) => Promise<unknown>;
  deleteTask: (id: number) => Promise<unknown>;
  listChatsByOpportunity: (oppId: number) => Promise<any[]>;
  sendMessage: (oppId: number, data: { content: string; thread_id?: number | null; attachments?: any[] }) => Promise<unknown>;
  listCustomFields: (entity: string) => Promise<CustomFieldDef[]>;
  createCustomField: (data: Partial<CustomFieldDef>) => Promise<unknown>;
  updateCustomField: (id: number, data: Partial<CustomFieldDef>) => Promise<unknown>;
  deleteCustomField: (id: number, purge?: boolean) => Promise<unknown>;
  reorderCustomFields: (entries: { id: number; sort_order: number }[]) => Promise<unknown>;
  bulkUpdateStages: (pipelineId: number, stages: StageBulkInput[]) => Promise<unknown>;
  // Theme
  getTheme: () => Promise<{ theme: 'light' | 'dark' }>;
  updateTheme: (theme: 'light' | 'dark') => Promise<unknown>;
}

export const crmApi: CrmApi = {
  getPlanStatus: () => api.get<any>('/api/crm/plan-status'),

  listAccounts: () => api.get<any[]>('/api/crm/accounts'),
  createAccount: (data: any) => api.post('/api/crm/accounts', data),
  updateAccount: (id: number, data: any) => api.put(`/api/crm/accounts/${id}`, data),
  deleteAccount: (id: number) => api.delete(`/api/crm/accounts/${id}`),

  listContacts: () => api.get<any[]>('/api/crm/contacts'),
  createContact: (data: any) => api.post('/api/crm/contacts', data),
  updateContact: (id: number, data: any) => api.put(`/api/crm/contacts/${id}`, data),
  deleteContact: (id: number) => api.delete(`/api/crm/contacts/${id}`),
  listContactsByAccount: (accountId: number) => api.get<any[]>(`/api/crm/contacts/account/${accountId}`),

  listPipelines: () => api.get<any[]>('/api/crm/pipelines'),
  createPipeline: (data: any) => api.post('/api/crm/pipelines', data),
  updatePipeline: (id: number, data: any) => api.put(`/api/crm/pipelines/${id}`, data),
  deletePipeline: (id: number) => api.delete(`/api/crm/pipelines/${id}`),

  listStages: (pipelineId: number) => api.get<any[]>(`/api/crm/pipelines/${pipelineId}/stages`),
  createStage: (pipelineId: number, data: any) => api.post(`/api/crm/pipelines/${pipelineId}/stages`, data),
  updateStage: (id: number, data: any) => api.put(`/api/crm/pipeline-stages/${id}`, data),
  deleteStage: (id: number) => api.delete(`/api/crm/pipeline-stages/${id}`),

  listProducts: () => api.get<any[]>('/api/crm/products'),
  createProduct: (data: any) => api.post('/api/crm/products', data),
  updateProduct: (id: number, data: any) => api.put(`/api/crm/products/${id}`, data),
  deleteProduct: (id: number) => api.delete(`/api/crm/products/${id}`),

  listOpportunities: (params?: Record<string, string>) => api.get<any[]>('/api/crm/opportunities', params),
  createOpportunity: (data: any) => api.post('/api/crm/opportunities', data),
  updateOpportunity: (id: number, data: any) => api.put(`/api/crm/opportunities/${id}`, data),
  deleteOpportunity: (id: number) => api.delete(`/api/crm/opportunities/${id}`),
  getOpportunityLineItems: (id: number) => api.get<any[]>(`/api/crm/opportunities/${id}/items`),
  saveOpportunityLineItems: (id: number, data: any) => api.post(`/api/crm/opportunities/${id}/items`, data),
  markAsWon: (id: number, data: { tracker_project_name: string; budgeted_hours: number }) =>
    api.post(`/api/crm/opportunities/${id}/won`, data),
  archiveOpportunity: (id: number) => api.post(`/api/crm/opportunities/${id}/archive`, {}),
  unarchiveOpportunity: (id: number) => api.post(`/api/crm/opportunities/${id}/unarchive`, {}),

  listTasks: () => api.get<any[]>('/api/crm/tasks'),
  createTask: (data: any) => api.post('/api/crm/tasks', data),
  updateTask: (id: number, data: any) => api.put(`/api/crm/tasks/${id}`, data),
  deleteTask: (id: number) => api.delete(`/api/crm/tasks/${id}`),

  listChatsByOpportunity: (oppId: number) => api.get<any[]>(`/api/crm/opportunities/${oppId}/chat`),
  sendMessage: (oppId: number, data: { content: string; thread_id?: number | null; attachments?: any[] }) =>
    api.post(`/api/crm/opportunities/${oppId}/chat`, data),

  // Custom Fields
  listCustomFields: (entity: string) => api.get<CustomFieldDef[]>('/api/crm/custom-fields', { entity }),
  createCustomField: (data: Partial<CustomFieldDef>) => api.post('/api/crm/custom-fields', data),
  updateCustomField: (id: number, data: Partial<CustomFieldDef>) => api.put(`/api/crm/custom-fields/${id}`, data),
  deleteCustomField: (id: number, purge?: boolean) => api.delete(`/api/crm/custom-fields/${id}${purge ? '?purge=true' : ''}`),
  reorderCustomFields: (entries: { id: number; sort_order: number }[]) => api.put('/api/crm/custom-fields/reorder', { entries }),

  // Bulk Stages
  bulkUpdateStages: (pipelineId: number, stages: StageBulkInput[]) => api.put('/api/crm/pipeline-stages', { pipeline_id: pipelineId, stages }),

  // Theme
  getTheme: () => api.get<{ theme: 'light' | 'dark' }>('/api/crm/theme'),
  updateTheme: (theme: 'light' | 'dark') => api.put('/api/crm/theme', { theme }),
};
