import { api } from '@kodan-apps/ui-core';
import type {
  SuperAdminStats,
  Tenant,
  CreateTenantInput,
  UpdateTenantInput,
  SubscriptionPlan,
  CreatePlanInput,
  SuperAdminRole,
  SuperAdminApp,
  AppMetric,
  TenantUsage,
  TenantOverrideInput,
  ApiSuccessResponse,
  ApiCreateResponse,
} from '@kodan-apps/shared';

export interface BackupEntry {
  filename: string;
  size: number;
  size_human: string;
  date: string;
  encrypted: boolean;
}

export const superAdminApi = {
  getStats: () => api.get<SuperAdminStats>('/api/super-admin/stats'),

  listTenants: () => api.get<Tenant[]>('/api/super-admin/tenants'),
  createTenant: (data: CreateTenantInput) =>
    api.post<ApiCreateResponse & { tenant_id: number }>('/api/super-admin/tenants', data),
  updateTenant: (id: number, data: UpdateTenantInput) =>
    api.patch<ApiSuccessResponse>(`/api/super-admin/tenants/${id}`, data),
  deactivateTenant: (id: number) => api.post<ApiSuccessResponse>(`/api/super-admin/tenants/${id}/deactivate`, {}),
  activateTenant: (id: number) => api.post<ApiSuccessResponse>(`/api/super-admin/tenants/${id}/activate`, {}),

  listPlans: () => api.get<SubscriptionPlan[]>('/api/super-admin/plans'),
  createPlan: (data: CreatePlanInput) => api.post<ApiCreateResponse>('/api/super-admin/plans', data),
  updatePlan: (id: number, data: Partial<CreatePlanInput>) =>
    api.patch<ApiSuccessResponse>(`/api/super-admin/plans/${id}`, data),
  deletePlan: (id: number) => api.delete<ApiSuccessResponse>(`/api/super-admin/plans/${id}`),

  getTheme: () => api.get<{ theme: 'light' | 'dark' }>('/api/super-admin/theme'),
  updateTheme: (theme: 'light' | 'dark') => api.put<ApiSuccessResponse>('/api/super-admin/theme', { theme }),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post<ApiSuccessResponse>('/api/super-admin/change-password', data),

  listRoles: () => api.get<SuperAdminRole[]>('/api/super-admin/roles'),
  createRole: (data: { app_id: string; name: string; description?: string; can_approve?: number }) =>
    api.post<ApiCreateResponse>('/api/super-admin/roles', data),
  updateRole: (id: number, data: { name?: string; description?: string; is_active?: boolean; can_approve?: number }) =>
    api.patch<ApiSuccessResponse>(`/api/super-admin/roles/${id}`, data),
  deleteRole: (id: number) => api.delete<ApiSuccessResponse>(`/api/super-admin/roles/${id}`),

  getCsrfToken: () => api.get<{ token: string }>('/api/csrf-token'),

  // Apps CRUD
  listApps: () => api.get<SuperAdminApp[]>('/api/super-admin/apps'),
  createApp: (data: { app_id: string; name: string; description?: string }) =>
    api.post<ApiSuccessResponse>('/api/super-admin/apps', data),
  updateApp: (appId: string, data: { name?: string; description?: string; is_active?: boolean }) =>
    api.put<ApiSuccessResponse>(`/api/super-admin/apps/${appId}`, data),
  deleteApp: (appId: string) => api.delete<ApiSuccessResponse>(`/api/super-admin/apps/${appId}`),

  // App Metrics
  listAppMetrics: () => api.get<AppMetric[]>('/api/super-admin/app-metrics'),
  createAppMetric: (app: string, data: { metric: string; label: string; description?: string; metric_type?: string; default_value?: number; sort_order?: number }) =>
    api.post<ApiSuccessResponse>(`/api/super-admin/app-metrics/${app}`, data),
  updateAppMetric: (app: string, metric: string, data: { label?: string; description?: string; metric_type?: string; default_value?: number; is_active?: boolean; sort_order?: number }) =>
    api.patch<ApiSuccessResponse>(`/api/super-admin/app-metrics/${app}/${metric}`, data),
  deleteAppMetric: (app: string, metric: string) =>
    api.delete<ApiSuccessResponse>(`/api/super-admin/app-metrics/${app}/${metric}`),

  // Backups
  listBackups: () => api.get<BackupEntry[]>('/api/super-admin/backups'),
  runBackup: () => api.post<{ success: boolean; message: string; output?: string[] }>('/api/super-admin/backups', {}),

  // Tenant Usage & Overrides
  getTenantUsage: (tenantId: number) => api.get<TenantUsage>(`/api/super-admin/tenants/${tenantId}/usage`),
  setTenantOverride: (tenantId: number, data: TenantOverrideInput) =>
    api.post<ApiSuccessResponse>(`/api/super-admin/tenants/${tenantId}/overrides`, data),
  clearTenantOverride: (tenantId: number, module: string, metric: string) =>
    api.delete<ApiSuccessResponse>(`/api/super-admin/tenants/${tenantId}/overrides/${module}/${metric}`),
};
