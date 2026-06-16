import { api } from '@kodan-apps/ui-core';

export { apiClient, ApiError } from '@kodan-apps/ui-core';

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
};
