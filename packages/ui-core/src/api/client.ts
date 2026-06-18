const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.kodan.software';
const CSRF_ENDPOINT = '/api/csrf-token';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- Current appId (set by useAuth hook) ---
let currentAppId = '';

export function setCurrentAppId(appId: string): void {
  currentAppId = appId;
}

// --- Force logout event ---
export function triggerForceLogout(): void {
  sessionStorage.removeItem('csrf_token');
  if (currentAppId) {
    document.cookie = `access_token_${currentAppId}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } else {
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
  window.dispatchEvent(new CustomEvent('auth:force-logout'));
}

// --- Token refresh with mutex for concurrent calls ---
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      if (!currentAppId) return false;

      const response = await fetch(
        new URL(`${API_BASE}/api/auth/refresh`, window.location.origin).toString(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-App-ID': currentAppId,
          },
          body: JSON.stringify({ app_id: currentAppId }),
          credentials: 'include',
        }
      );

      if (!response.ok) return false;

      const data = await response.json();
      return data.success === true;
    } catch {
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// --- CSRF token ---
async function getCsrfToken(): Promise<string> {
  const cached = sessionStorage.getItem('csrf_token');
  if (cached) return cached;
  return fetchCsrfToken();
}

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(new URL(`${API_BASE}${CSRF_ENDPOINT}`, window.location.origin).toString(), {
    method: 'GET',
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
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

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...fetchOptions } = options;

  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const requestHeaders = new Headers(headers);
  requestHeaders.set('Content-Type', 'application/json');
  requestHeaders.set('X-Requested-With', 'XMLHttpRequest');
  if (currentAppId) {
    requestHeaders.set('X-App-ID', currentAppId);
  }

  const method = (fetchOptions.method ?? 'GET').toUpperCase();
  const isMutable = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (isMutable) {
    const csrfToken = await getCsrfToken();
    requestHeaders.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers: requestHeaders,
    credentials: 'include',
  });

  if (response.status === 403 && isMutable) {
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

  // === 401 → auto-refresh + retry ===
  if (response.status === 401) {
    // Endpoints de login/set-password: nunca intentar refresh (no hay sesión)
    const isLoginEndpoint = endpoint === '/api/auth/login' || endpoint === '/api/auth/set-password';

    if (currentAppId && !isLoginEndpoint) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        const retryResponse = await fetch(url.toString(), {
          ...fetchOptions,
          headers: requestHeaders,
          credentials: 'include',
        });

        if (!retryResponse.ok) {
          const retryError = await retryResponse.json().catch(() => ({}));
          throw new ApiError(retryResponse.status, retryError, `API Error: ${retryResponse.status}`);
        }

        if (retryResponse.status === 204) return undefined as T;
        return retryResponse.json();
      }

      // Refresh falló, la sesión expiró realmente
      triggerForceLogout();
      throw new ApiError(401, {}, 'Sesión expirada. Por favor inicia sesión nuevamente.');
    }

    // No hay appId configurada o es login → mostrar error del servidor
    // Forzar logout solo si no es endpoint de auth
    const isAuthEndpoint = endpoint.startsWith('/api/auth/') || endpoint === '/api/csrf-token';
    if (!isLoginEndpoint && !isAuthEndpoint) {
      triggerForceLogout();
      // Safety redirect en caso de que el evento no sea escuchado
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    const errorBody = await response.json().catch(() => ({}));
    const serverMsg = (errorBody as any)?.error || (errorBody as any)?.message || 'Credenciales inválidas.';
    throw new ApiError(401, errorBody, serverMsg);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorData, (errorData as any)?.message || `API Error: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

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
