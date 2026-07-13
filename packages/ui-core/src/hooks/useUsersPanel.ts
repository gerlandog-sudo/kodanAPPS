import { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import { toast } from 'sonner';

export interface AppRoleInfo {
  role_id: number;
  role_name: string;
  role_description?: string;
}

export interface TenantUser {
  id: number;
  email: string;
  display_name: string;
  is_active: number;
  created_at: string;
  apps: Record<string, AppRoleInfo>;
}

export interface RoleOption {
  id: number;
  name: string;
  description?: string;
}

export interface UseUsersPanelProps {
  appId?: string;
}

export function useUsersPanel(_props: UseUsersPanelProps) {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [roles, setRoles] = useState<Record<string, RoleOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formActive, setFormActive] = useState(true);

  const [appAccess, setAppAccess] = useState<Record<string, { enabled: boolean; roleId: number }>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => {});
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [filters] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        api.get<TenantUser[]>('/api/tenant-users'),
        api.get<Record<string, RoleOption[]>>('/api/tenant-users/roles'),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch {
      toast.error('Error al cargar datos de usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => { setSelectedKeys([]); }, [users]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (filters.name) {
      const search = filters.name.toLowerCase();
      result = result.filter(u =>
        (u.display_name || '').toLowerCase().includes(search) ||
        (u.email || '').toLowerCase().includes(search)
      );
    }
    if (filters.status) {
      const activeVal = filters.status === 'active' ? 1 : 0;
      result = result.filter(u => u.is_active === activeVal);
    }
    return result;
  }, [users, filters]);

  const resetForm = useCallback(() => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormActive(true);
    setEditingUser(null);
    const initialAccess: Record<string, { enabled: boolean; roleId: number }> = {};
    Object.keys(roles).forEach(appId => {
      initialAccess[appId] = { enabled: false, roleId: roles[appId][0]?.id ?? 0 };
    });
    setAppAccess(initialAccess);
  }, [roles]);

  const handleOpenCreate = useCallback(() => {
    resetForm();
    setPanelOpen(true);
  }, [resetForm]);

  const handleOpenEdit = useCallback((u: TenantUser) => {
    setEditingUser(u);
    setFormName(u.display_name);
    setFormEmail(u.email);
    setFormPassword('');
    setFormActive(u.is_active === 1);
    const updatedAccess: Record<string, { enabled: boolean; roleId: number }> = {};
    Object.keys(roles).forEach(appId => {
      const userHasAccess = !!u.apps[appId];
      updatedAccess[appId] = {
        enabled: userHasAccess,
        roleId: userHasAccess ? u.apps[appId].role_id : (roles[appId][0]?.id ?? 0),
      };
    });
    setAppAccess(updatedAccess);
    setPanelOpen(true);
  }, [roles]);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return toast.error('El nombre visible es requerido');
    if (!formEmail.trim()) return toast.error('El correo electr\u00f3nico es requerido');
    if (!editingUser && !formPassword) return toast.error('La contrase\u00f1a es requerida');
    if (!editingUser && formPassword.length < 8) return toast.error('La contrase\u00f1a debe tener al menos 8 caracteres');

    const appsPayload: Record<string, number> = {};
    let hasAtLeastOneApp = false;

    Object.entries(appAccess).forEach(([appId, access]) => {
      if (access.enabled) {
        if (access.roleId <= 0) {
          toast.error('Selecciona un rol v\u00e1lido para la aplicaci\u00f3n ' + appId);
          return;
        }
        appsPayload[appId] = access.roleId;
        hasAtLeastOneApp = true;
      }
    });

    if (formActive && !hasAtLeastOneApp) {
      return toast.error('Un operador activo debe tener acceso a al menos una aplicaci\u00f3n.');
    }

    setSaveLoading(true);
    try {
      const payload: any = {
        display_name: formName.trim(),
        email: formEmail.trim(),
        is_active: formActive ? 1 : 0,
        apps: appsPayload,
      };

      if (!editingUser) {
        payload.password = formPassword;
        await api.post('/api/tenant-users', payload);
        toast.success('Operador creado con \u00e9xito');
      } else {
        await api.put('/api/tenant-users/' + editingUser.id, payload);
        toast.success('Operador actualizado con \u00e9xito');
      }
      setPanelOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar los cambios');
    } finally {
      setSaveLoading(false);
    }
  }, [formName, formEmail, formPassword, formActive, editingUser, appAccess, resetForm, loadData]);

  const openConfirm = useCallback((msg: string, action: () => Promise<void>) => {
    setConfirmMsg(msg);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  }, []);

  const handleConfirmAction = useCallback(async () => {
    setConfirmLoading(true);
    try {
      await confirmAction();
      setConfirmOpen(false);
    } catch {
      toast.error('Ocurri\u00f3 un error en el servidor');
    } finally {
      setConfirmLoading(false);
    }
  }, [confirmAction]);

  const handleDelete = useCallback((u: TenantUser, currentUser: { id: number } | null) => {
    if (currentUser && currentUser.id === u.id) {
      return toast.error('No puedes darte de baja a ti mismo');
    }
    openConfirm('Est\u00e1 seguro de que desea dar de baja al operador "' + (u.display_name || u.email) + '"?', async () => {
      await api.delete('/api/tenant-users/' + u.id);
      toast.success('Operador dado de baja del tenant');
      loadData();
    });
  }, [openConfirm, loadData]);

  return {
    users, roles, loading, saveLoading,
    selectedKeys, setSelectedKeys,
    filteredUsers,
    panelOpen, setPanelOpen,
    editingUser,
    formName, setFormName,
    formEmail, setFormEmail,
    formPassword, setFormPassword,
    formActive, setFormActive,
    appAccess, setAppAccess,
    confirmOpen, setConfirmOpen,
    confirmMsg, confirmLoading,
    loadData,
    handleOpenCreate,
    handleOpenEdit,
    handleSave,
    openConfirm,
    handleConfirmAction,
    handleDelete,
    resetForm,
  };
}
