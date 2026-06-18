import { useState, useEffect, useCallback } from 'react';
import { setCurrentAppId } from '../api/client';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.kodan.software';

export interface AuthState {
  loading: boolean;
  authenticated: boolean;
  user: any;
  roles: string[];
  appId: string;
  planStatus: any[];
}

export function useAuth(appId: string) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    user: null,
    roles: [],
    appId,
    planStatus: [],
  });

  const validate = useCallback(async () => {
    try {
      const response = await fetch(
        new URL(`${API_BASE}/api/auth/validate`, window.location.origin).toString(),
        {
          credentials: 'include',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-App-ID': appId,
          },
        }
      );

      if (!response.ok) {
        setState(prev => ({ ...prev, loading: false, authenticated: false }));
        return;
      }

      const data = await response.json();
      setState({
        loading: false,
        authenticated: true,
        user: data.user,
        roles: data.roles || [],
        appId: data.app_id || appId,
        planStatus: data.plan_status || [],
      });
    } catch {
      setState(prev => ({ ...prev, loading: false, authenticated: false }));
    }
  }, [appId]);

  useEffect(() => {
    setCurrentAppId(appId);
    validate();
  }, [appId, validate]);

  const setAuthenticated = useCallback((userData: any) => {
    setState({
      loading: false,
      authenticated: true,
      user: { ...userData },
      roles: userData.roles || [],
      appId,
      planStatus: [],
    });
  }, [appId]);

  const logout = useCallback(async () => {
    try {
      await fetch(
        new URL(`${API_BASE}/api/auth/logout`, window.location.origin).toString(),
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-App-ID': appId,
          },
          body: JSON.stringify({ app_id: appId }),
        }
      );
    } catch {
      // Even if request fails, clear local state
    }

    setState({
      loading: false,
      authenticated: false,
      user: null,
      roles: [],
      appId,
      planStatus: [],
    });
  }, [appId]);

  return { ...state, validate, setAuthenticated, logout };
}
