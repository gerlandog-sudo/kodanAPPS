import { useState, useEffect, useCallback } from 'react';
import { setCurrentAppId } from '../api/client';
import { API_BASE } from '../config';
import type { AuthUser, PlanStatusResponse } from '@kodan-apps/shared';

export interface AuthState {
  loading: boolean;
  authenticated: boolean;
  user: AuthUser | null;
  roles: string[];
  canApproveHours: boolean;
  appId: string;
  planStatus: PlanStatusResponse[];
  planName: string;
}

export function useAuth(appId: string) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    user: null,
    roles: [],
    canApproveHours: false,
    appId,
    planStatus: [],
    planName: '',
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
        },
      );

      if (!response.ok) {
        setState(prev => ({ ...prev, loading: false, authenticated: false }));
        return;
      }

      const data: {
        user: AuthUser;
        roles: string[];
        can_approve_hours: boolean;
        app_id: string;
        plan_status: PlanStatusResponse[];
        plan_name: string;
      } = await response.json();
      setState({
        loading: false,
        authenticated: true,
        user: data.user,
        roles: data.roles || [],
        canApproveHours: !!data.can_approve_hours,
        appId: data.app_id || appId,
        planStatus: data.plan_status || [],
        planName: data.plan_name || '',
      });
    } catch {
      setState(prev => ({ ...prev, loading: false, authenticated: false }));
    }
  }, [appId]);

  useEffect(() => {
    setCurrentAppId(appId);
    validate();
  }, [appId, validate]);

  const setAuthenticated = useCallback(
    (userData: AuthUser & { roles?: string[]; can_approve_hours?: boolean }) => {
      setState({
        loading: false,
        authenticated: true,
        user: { ...userData },
        roles: userData.roles || [],
        canApproveHours: !!userData.can_approve_hours,
        appId,
        planStatus: [],
        planName: '',
      });
    },
    [appId],
  );

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
        },
      );
    } catch {
      // Even if request fails, clear local state
    }

    setState({
      loading: false,
      authenticated: false,
      user: null,
      roles: [],
      canApproveHours: false,
      appId,
      planStatus: [],
      planName: '',
    });
  }, [appId]);

  return { ...state, validate, setAuthenticated, logout };
}
