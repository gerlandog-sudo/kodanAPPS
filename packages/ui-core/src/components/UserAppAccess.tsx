import { useEffect, useMemo, useState, useCallback } from 'react';
import { Save, Users } from 'lucide-react';
import { api } from '../api/client';

interface AppRole {
  id: number;
  name: string;
  description: string;
}

interface AppAssignment {
  role_id: number;
  role_name: string;
  role_description: string;
}

interface TenantUser {
  id: number;
  email: string;
  display_name: string;
  is_active: number;
  created_at?: string;
  apps: Record<string, AppAssignment>;
}

interface UserAppAccessProps {
  tenantId?: number;
}

export function UserAppAccess({ tenantId }: UserAppAccessProps) {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [rolesByApp, setRolesByApp] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftMap, setDraftMap] = useState<Record<string, Record<string, number>>>({});
  const [capacity, setCapacity] = useState<Record<string, { used: number; max: number | string }>>({});

  const appIds = useMemo(() => Object.keys(rolesByApp), [rolesByApp]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      tenantId
        ? api.get<any[]>('/api/tenant-users')
        : api.get<any[]>('/api/tenant-users'),
      api.get<Record<string, AppRole[]>>('/api/tenant-users/roles'),
      api.get<any[]>('/api/tenant-users/plan-status'),
    ])
      .then(([usersData, rolesData, planStatus]) => {
        setUsers(usersData as TenantUser[]);
        setRolesByApp(rolesData);

        const cap: Record<string, { used: number; max: number | string }> = {};
        planStatus.forEach((m: any) => {
          if (m.metric === 'users_max') {
            cap[m.module] = {
              used: Number(m.current_usage),
              max: m.limit_value,
            };
          }
        });
        setCapacity(cap);

        const draft: Record<string, Record<string, number>> = {};
        for (const u of usersData as TenantUser[]) {
          const uid = String(u.id);
          draft[uid] = {};
          for (const appId of Object.keys(rolesData)) {
            draft[uid][appId] = u.apps[appId]?.role_id ?? 0;
          }
        }
        setDraftMap(draft);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleRoleChange = useCallback((userId: number, appId: string, roleId: number) => {
    setDraftMap(prev => ({
      ...prev,
      [String(userId)]: {
        ...prev[String(userId)],
        [appId]: roleId,
      },
    }));
  }, []);

  const hasChanges = useMemo(() => {
    for (const u of users) {
      const uid = String(u.id);
      for (const appId of appIds) {
        if ((draftMap[uid]?.[appId] ?? 0) !== (u.apps[appId]?.role_id ?? 0)) {
          return true;
        }
      }
    }
    return false;
  }, [users, appIds, draftMap]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const changes: { user_id: number; app_id: string; role_id: number }[] = [];
      for (const u of users) {
        const uid = String(u.id);
        for (const appId of appIds) {
          const draftRole = draftMap[uid]?.[appId] ?? 0;
          const currentRole = u.apps[appId]?.role_id ?? 0;
          if (draftRole !== currentRole) {
            changes.push({ user_id: u.id, app_id: appId, role_id: draftRole });
          }
        }
      }
      await api.patch('/api/tenant-users/roles', { roles: changes });
      setUsers(prev => prev.map(u => {
        const uid = String(u.id);
        const updatedApps = { ...u.apps };
        for (const appId of appIds) {
          const draftRole = draftMap[uid]?.[appId];
          if (draftRole !== undefined) {
            const roleInfo = rolesByApp[appId]?.find(r => r.id === draftRole);
            if (roleInfo) {
              updatedApps[appId] = { role_id: roleInfo.id, role_name: roleInfo.name, role_description: roleInfo.description };
            }
          }
        }
        return { ...u, apps: updatedApps };
      }));
    } finally {
      setSaving(false);
    }
  }, [users, appIds, draftMap, rolesByApp]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-xs" style={{ color: 'var(--sys-text-muted)' }}>
        <Users size={14} className="mr-2" />
        Cargando...
      </div>
    );
  }

  if (appIds.length === 0 || users.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-xs" style={{ color: 'var(--sys-text-muted)' }}>
        No hay usuarios o aplicaciones configuradas.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--sys-text)', fontFamily: 'var(--font-montserrat, system-ui)' }}>
          Acceso por Aplicación
        </h3>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
          style={{
            background: 'var(--sys-primary)',
            color: 'var(--sys-on-primary)',
            opacity: !hasChanges || saving ? 0.4 : 1,
          }}
        >
          <Save size={13} />
          {saving ? 'Guardando...' : 'Save All Changes'}
        </button>
      </div>

      <div className="overflow-x-auto px-4 pb-4">
        <table className="w-full border-collapse" style={{ fontSize: '12px' }}>
          <thead>
            <tr>
              <th className="sticky left-0 text-left font-semibold px-2 py-2 whitespace-nowrap min-w-[140px]" style={{ color: 'var(--sys-text-muted)', borderBottom: '1px solid var(--sys-border)' }}>
                Usuario
              </th>
              {appIds.map(appId => (
                <th key={appId} className="text-center font-semibold px-2 py-2 whitespace-nowrap min-w-[120px]" style={{ color: 'var(--sys-text-muted)', borderBottom: '1px solid var(--sys-border)' }}>
                  <div>{appId.toUpperCase()}</div>
                  {capacity[appId] && (
                    <div className="text-[10px] mt-0.5" style={{ color: Number(capacity[appId].used) >= Number(capacity[appId].max) ? '#ef4444' : 'var(--sys-text-muted)' }}>
                      {capacity[appId].used}/{capacity[appId].max}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                <td className="sticky left-0 px-2 py-2 whitespace-nowrap" style={{ borderBottom: '1px solid var(--sys-border)', background: 'var(--sys-bg)' }}>
                  <div className="font-medium truncate max-w-[160px]" style={{ color: 'var(--sys-text)' }}>{u.display_name}</div>
                  <div className="text-[11px] truncate max-w-[160px]" style={{ color: 'var(--sys-text-muted)' }}>{u.email}</div>
                </td>
                {appIds.map(appId => {
                  const currentRoleId = u.apps[appId]?.role_id ?? 0;
                  const draftRoleId = draftMap[String(u.id)]?.[appId] ?? 0;
                  const isChanged = draftRoleId !== currentRoleId;
                  const roles = rolesByApp[appId] || [];

                  return (
                    <td key={appId} className="text-center px-2 py-2" style={{ borderBottom: '1px solid var(--sys-border)' }}>
                      <select
                        value={draftRoleId}
                        onChange={e => handleRoleChange(u.id, appId, Number(e.target.value))}
                        className="text-[11px] px-1.5 py-1 rounded border-transparent outline-none cursor-pointer transition-all"
                        style={{
                          background: isChanged ? 'var(--sys-primary-container)' : 'var(--sys-surface)',
                          color: 'var(--sys-text)',
                          border: isChanged ? '1px solid var(--sys-primary)' : '1px solid transparent',
                          maxWidth: '120px',
                        }}
                        disabled={!u.is_active}
                      >
                        <option value={0}>— Sin acceso —</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
