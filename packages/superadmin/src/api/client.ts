/**
 * API Client - Super Admin
 * 
 * Blueprint decisiones:
 * - Cookies HttpOnly en api.kodan.software (credentials: 'include')
 * - CSRF: Synchronizer Token en sessionStorage + header X-CSRF-Token
 * - Auto-retry en 403 CSRF_INVALID (rotación token)
 * - Base URL: https://api.kodan.software
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.kodan.software';
const CSRF_ENDPOINT = '/api/csrf-token';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Obtiene/actualiza CSRF token en sessionStorage
 */
async function getCsrfToken(): Promise<string> {
  let token = sessionStorage.getItem('csrf_token');
  
  if (!token) {
    token = await fetchCsrfToken();
  }
  
  return token;
}

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(new URL(`${API_BASE}${CSRF_ENDPOINT}`, window.location.origin).toString(), {
    method: 'GET',
    credentials: 'include', // Cookies HttpOnly
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch CSRF token');
  }
  
  const data = await response.json();
  const token = data.token;
  
  if (!token) {
    throw new Error('Invalid CSRF token response');
  }
  
  sessionStorage.setItem('csrf_token', token);
  return token;
}

/**
 * Cliente API principal
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...fetchOptions } = options;
  
  // Construir URL con query params
  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  // Headers base
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Content-Type', 'application/json');
  requestHeaders.set('X-Requested-With', 'XMLHttpRequest');
  
  // CSRF para mutaciones
  const method = (fetchOptions.method ?? 'GET').toUpperCase();
  const isMutable = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  
  if (isMutable) {
    const csrfToken = await getCsrfToken();
    requestHeaders.set('X-CSRF-Token', csrfToken);
  }
  
  // Ejecutar request
  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers: requestHeaders,
    credentials: 'include', // ¡Crítico! Envía cookies HttpOnly
  });
  
  // Manejar 403 CSRF_INVALID → re-fetch token + retry una vez
  if (response.status === 403 && isMutable) {
    const errorData = await response.json().catch(() => ({}));
    
    if (errorData.error === 'CSRF_INVALID') {
      // Token rotado por servidor, obtener nuevo y reintentar
      sessionStorage.removeItem('csrf_token');
      const newToken = await fetchCsrfToken();
      requestHeaders.set('X-CSRF-Token', newToken);
      
      const retryResponse = await fetch(url.toString(), {
        ...fetchOptions,
        headers: requestHeaders,
        credentials: 'include',
      });
      
      if (!retryResponse.ok) {
        const retryError = await retryResponse.json().catch(() => ({}));
        throw new ApiError(retryResponse.status, retryError, `API Error: ${retryResponse.status}`);
      }
      
      return retryResponse.json();
    }
  }
  
  // Manejar errores
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorData, `API Error: ${response.status}`);
  }
  
  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }
  
  return response.json();
}

// Métodos de conveniencia
export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) => 
    apiClient<T>(endpoint, { method: 'GET', params }),
  
  post: <T>(endpoint: string, body: unknown) => 
    apiClient<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  
  put: <T>(endpoint: string, body: unknown) => 
    apiClient<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  
  patch: <T>(endpoint: string, body: unknown) => 
    apiClient<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  
  delete: <T>(endpoint: string) => 
    apiClient<T>(endpoint, { method: 'DELETE' }),
};

// Endpoints Super Admin
export const superAdminApi = {
  // Stats
  getStats: () => api.get('/api/super-admin/stats'),
  
  // Tenants
  listTenants: () => api.get('/api/super-admin/tenants'),
  createTenant: (data: {
    name: string;
    slug: string;
    subscription_plan_id: number;
    enabled_apps: string[];
    admin_name: string;
    admin_email: string;
  }) => api.post('/api/super-admin/tenants', data),
  updateTenant: (id: number, data: { name?: string; subscription_plan_id?: number }) => 
    api.patch(`/api/super-admin/tenants/${id}`, data),
  deactivateTenant: (id: number) => api.post(`/api/super-admin/tenants/${id}/deactivate`, {}),
  
  // Plans
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
  
  // Theme
  updateTheme: (theme: 'light' | 'dark') => api.put('/api/super-admin/theme', { theme }),
  
  // CSRF
  getCsrfToken: () => api.get(CSRF_ENDPOINT),
};

export { ApiError };