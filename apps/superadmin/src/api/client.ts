import { api } from '@kodan-apps/ui-core';

export const superAdminApi = {
  getStats: () => api.get('/api/super-admin/stats'),

  listTenants: () => api.get('/api/super-admin/tenants'),
  createTenant: (data: {
    name: string;
    subscription_plan_id: number;
    logo_url?: string | null;
    theme_preference?: string;
    admin_name: string;
    admin_email: string;
    admin_password: string;
  }) => api.post('/api/super-admin/tenants', data),
  updateTenant: (id: number, data: { name?: string; subscription_plan_id?: number; logo_url?: string | null }) =>
    api.patch(`/api/super-admin/tenants/${id}`, data),
  deactivateTenant: (id: number) => api.post(`/api/super-admin/tenants/${id}/deactivate`, {}),
  activateTenant: (id: number) => api.post(`/api/super-admin/tenants/${id}/activate`, {}),

  listPlans: () => api.get('/api/super-admin/plans'),
  createPlan: (data: {
    name: string;
    description?: string;
    price: number;
    currency: string;
    limits: Array<{ module: string; metric: string; value: number }>;
  }) => api.post('/api/super-admin/plans', data),
  updatePlan: (id: number, data: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    limits?: Array<{ module: string; metric: string; value: number }>;
  }) => api.patch(`/api/super-admin/plans/${id}`, data),
  deletePlan: (id: number) => api.delete(`/api/super-admin/plans/${id}`),

  getTheme: () => api.get<any>('/api/super-admin/theme'),
  updateTheme: (theme: 'light' | 'dark') => api.put('/api/super-admin/theme', { theme }),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/api/super-admin/change-password', data),

  listRoles: () => api.get<any[]>('/api/super-admin/roles'),
  createRole: (data: { app_id: string; name: string; description?: string }) =>
    api.post('/api/super-admin/roles', data),
  updateRole: (id: number, data: { name?: string; description?: string; is_active?: boolean }) =>
    api.patch(`/api/super-admin/roles/${id}`, data),
  deleteRole: (id: number) => api.delete(`/api/super-admin/roles/${id}`),

  getCsrfToken: () => api.get('/api/csrf-token'),

  // Apps CRUD
  listApps: () => api.get<any[]>('/api/super-admin/apps'),
  createApp: (data: { app_id: string; name: string; description?: string }) =>
    api.post('/api/super-admin/apps', data),
  updateApp: (appId: string, data: { name?: string; description?: string; is_active?: boolean }) =>
    api.put(`/api/super-admin/apps/${appId}`, data),
  deleteApp: (appId: string) => api.delete(`/api/super-admin/apps/${appId}`),

  // App Metrics
  listAppMetrics: () => api.get('/api/super-admin/app-metrics'),
  createAppMetric: (app: string, data: { metric: string; label: string; description?: string; metric_type?: string; default_value?: number; sort_order?: number }) =>
    api.post(`/api/super-admin/app-metrics/${app}`, data),
  updateAppMetric: (app: string, metric: string, data: { label?: string; description?: string; metric_type?: string; default_value?: number; is_active?: boolean; sort_order?: number }) =>
    api.patch(`/api/super-admin/app-metrics/${app}/${metric}`, data),
  deleteAppMetric: (app: string, metric: string) =>
    api.delete(`/api/super-admin/app-metrics/${app}/${metric}`),

  // Tenant Usage & Overrides
  getTenantUsage: (tenantId: number) =>
    api.get(`/api/super-admin/tenants/${tenantId}/usage`),
  setTenantOverride: (tenantId: number, data: { module: string; metric: string; custom_value: number }) =>
    api.post(`/api/super-admin/tenants/${tenantId}/overrides`, data),
  clearTenantOverride: (tenantId: number, module: string, metric: string) =>
    api.delete(`/api/super-admin/tenants/${tenantId}/overrides/${module}/${metric}`),
};
