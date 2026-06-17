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

// --- Refresh token management ---
const REFRESH_TOKEN_KEY = 'kodan_refresh_token';

function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearStoredRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// --- Force logout event ---
export function triggerForceLogout(): void {
  clearStoredRefreshToken();
  sessionStorage.removeItem('csrf_token');
  localStorage.removeItem('crm_user');
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
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
      const refreshToken = getStoredRefreshToken();
      const appId = localStorage.getItem('kodan_app_id');
      if (!refreshToken || !appId) return false;

      const response = await fetch(
        new URL(`${API_BASE}/api/auth/refresh`, window.location.origin).toString(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken, app_id: appId }),
          credentials: 'include',
        }
      );

      if (!response.ok) return false;

      const data = await response.json();
      if (data.success && data.refresh_token) {
        setStoredRefreshToken(data.refresh_token);
        return true;
      }
      return false;
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
    // Si hay refresh token, es una sesión expirada → intentar refrescar
    const refreshToken = getStoredRefreshToken();
    const appId = localStorage.getItem('kodan_app_id');

    if (refreshToken && appId) {
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

    // No hay refresh token → es un error de autenticación (login, etc.)
    // Leer el mensaje real del servidor
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
