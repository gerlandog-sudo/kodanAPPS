import { api, setCurrentAppId } from '@kodan-apps/ui-core';

const APP_ID = 'hub';

// Inicializar el app ID para ui-core apiClient
setCurrentAppId(APP_ID);

// ============================================================
// Hub Admin API (JWT protegido)
// ============================================================
export const hubAdminApi = {
  // Stats
  getStats: () => api.get<HubStats>('/api/hub-admin/stats'),

  // Apps
  getApps: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<HubApp>>('/api/hub-admin/apps', params),
  createApp: (data: { name: string; custom_token?: string; app_identifier?: string }) =>
    api.post<{ status: string; id: number; token: string }>('/api/hub-admin/apps', data),
  updateApp: (id: number, data: Record<string, unknown>) =>
    api.patch<{ status: string; updated: number }>(`/api/hub-admin/apps/${id}`, data),
  rotateToken: (id: number) =>
    api.post<{ status: string; new_token: string }>(`/api/hub-admin/apps/${id}/rotate-token`, {}),
  toggleStatus: (id: number) =>
    api.post<{ status: string }>(`/api/hub-admin/apps/${id}/toggle-status`, {}),
  archiveApp: (id: number) =>
    api.delete<{ status: string; message: string }>(`/api/hub-admin/apps/${id}`),

  // Catalog
  getCatalog: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<CatalogEntry>>('/api/hub-admin/catalog', params),
  createCatalogEntry: (data: Record<string, unknown>) =>
    api.post<{ status: string; id: number }>('/api/hub-admin/catalog', data),
  updateCatalogEntry: (id: number, data: Record<string, unknown>) =>
    api.patch<{ status: string; updated: number }>(`/api/hub-admin/catalog/${id}`, data),
  deleteCatalogEntry: (id: number) =>
    api.delete<{ status: string }>(`/api/hub-admin/catalog/${id}`),

  // Services
  getServices: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<ServiceAssignment>>('/api/hub-admin/services', params),
  createService: (data: Record<string, unknown>) =>
    api.post<{ status: string; id: number }>('/api/hub-admin/services', data),
  updateService: (id: number, data: Record<string, unknown>) =>
    api.patch<{ status: string; updated: number }>(`/api/hub-admin/services/${id}`, data),
  deleteService: (id: number) =>
    api.delete<{ status: string }>(`/api/hub-admin/services/${id}`),
  testService: (id: number) =>
    api.post<ServiceDiagnostic>(`/api/hub-admin/services/${id}/test`, {}),

  // Analytics
  getConsumption: (params?: Record<string, string>) =>
    api.get<ConsumptionStats>('/api/hub-admin/consumption', params),
  getErrors: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<LogEntry>>('/api/hub-admin/errors', params),

  // Settings
  getSetting: (key: string) =>
    api.get<{ key: string; value: string | null }>(`/api/hub-admin/settings/${key}`),
  updateSetting: (key: string, value: string) =>
    api.put<{ status: string }>(`/api/hub-admin/settings/${key}`, { value }),

  // Theme (user_configs via kodanAPPS API)
  getTheme: () =>
    api.get<{ theme: string }>('/api/auth/theme'),
  updateTheme: (theme: string) =>
    api.put<{ status: string }>('/api/auth/theme', { theme }),
};

// ============================================================
// Tipos
// ============================================================

export interface HubStats {
  tokens: number;
  requests: number;
  apps_active: number;
  hour: number;
  errors: number;
  apps_grid: Array<{
    id: number;
    name: string;
    app_tokens: number;
    app_requests: number;
  }>;
}

export interface HubApp {
  id: number;
  app_id: string | null;
  name: string;
  token: string;
  status: 'active' | 'inactive' | 'paused' | 'archived';
  old_token: string | null;
  app_identifier: string | null;
  created_at: string;
  app_tokens: number;
  app_requests: number;
}

export interface CatalogEntry {
  id: number;
  provider: string;
  name: string;
  identifier: string;
  protocol: 'openai-v1' | 'gemini-v1';
  endpoint: string;
  is_active: number;
  created_at: string;
}

export interface ServiceAssignment {
  id: number;
  app_id: number;
  catalog_id: number;
  api_key: string;
  priority: number;
  is_active: number;
  config_json: string;
  app_name: string;
  model_name: string;
  provider: string;
  protocol?: string;
  identifier?: string;
  endpoint?: string;
}

export interface ServiceDiagnostic {
  status: string;
  http_code: number;
  response: string;
  data: unknown;
  message: string;
  debug_request: unknown;
  debug_endpoint: string;
  latency: string;
}

export interface LogEntry {
  id: number;
  app_id: number;
  model: string;
  tokens_in: number;
  tokens_out: number;
  status: string;
  latency: number;
  timestamp: string;
  app_name: string;
}

export interface ConsumptionStats {
  totals: {
    tokens: number;
    requests: number;
    latency: string;
    efficiency: string;
  };
  data: LogEntry[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}