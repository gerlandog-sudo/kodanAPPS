import { useMemo } from 'react';
import { Shield, Briefcase, TrendingUp, Eye, User, UserCheck, AlertCircle, UserPlus, Edit, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { SlidePanel } from './SlidePanel';
import { ConfirmDialog } from './ConfirmDialog';
import { Table } from './Table';
import type { TableColumn, BulkAction, TableAction } from './Table';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useUsersPanel } from '../hooks/useUsersPanel';
import type { TenantUser } from '../hooks/useUsersPanel';
import { UserFormPanel } from './UserFormPanel';

export type { AppRoleInfo, TenantUser, RoleOption } from '../hooks/useUsersPanel';
export interface UsersSettingsPanelProps {
  appId?: string;
}

function getRoleIcon(roleName: string) {
  const n = (roleName || '').toLowerCase();
  if (n.includes('admin')) return <Shield size={13} className="text-red-400 shrink-0" />;
  if (n.includes('pm')) return <Briefcase size={13} className="text-blue-400 shrink-0" />;
  if (n.includes('commercial') || n.includes('venta')) return <TrendingUp size={13} className="text-green-400 shrink-0" />;
  if (n.includes('viewer') || n.includes('visor')) return <Eye size={13} className="text-slate-400 shrink-0" />;
  return <User size={13} className="text-slate-400 shrink-0" />;
}

export function UsersSettingsPanel({ appId = 'crm' }: UsersSettingsPanelProps) {
  const { user: currentUser } = useAuth(appId);
  const hook = useUsersPanel({ appId });

  const columns: TableColumn<TenantUser>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Usuario / Operador',
      filterKey: 'name',
      render: (u) => {
        const isSelf = currentUser?.id === u.id;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '999px', background: 'var(--sys-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--sys-primary)' }}>{(u.display_name || u.email).substring(0, 2).toUpperCase()}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sys-text)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {u.display_name}
                {isSelf && (
                  <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-primary)', background: 'var(--sys-primary-container)', padding: '0 0.25rem', borderRadius: '0.25rem' }}>t\u00fa</span>
                )}
              </span>
              <div style={{ fontSize: '0.6875rem', color: 'var(--sys-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'apps',
      header: 'Accesos por Aplicaci\u00f3n',
      render: (u) => {
        const appKeys = Object.keys(u.apps);
        if (appKeys.length === 0) {
          return <span style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Sin accesos</span>;
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {appKeys.map(appId => {
              const info = u.apps[appId];
              return (
                <span key={appId} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '11px', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '0.25rem', border: '1px solid var(--sys-border-soft)', background: 'color-mix(in srgb, var(--sys-primary) 5%, var(--sys-bg))', color: 'var(--sys-text)' }}>
                  <span style={{ color: 'var(--sys-primary)', fontWeight: 800 }}>{appId.toUpperCase()}</span>
                  <span style={{ color: 'var(--sys-text-muted)' }}>{'\u2022'}</span>
                  {getRoleIcon(info.role_name)}
                  <span style={{ fontSize: '10px', color: 'var(--sys-text-muted)' }}>{info.role_name}</span>
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      filterKey: 'status',
      align: 'center',
      render: (u) => (
        u.is_active === 1
          ? <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>{'\u25cf'} Activo</span>
          : <span style={{ color: 'var(--sys-text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{'\u25cb'} Inactivo</span>
      ),
    },
  ], [currentUser]);

  const bulkActions: BulkAction<TenantUser>[] = useMemo(() => [
    {
      label: 'Activar Operadores',
      icon: <UserCheck size={14} />,
      onClick: (items) =>
        Promise.all(items.map(u => api.put('/api/tenant-users/' + u.id, { display_name: u.display_name, is_active: 1 })))
          .then(() => { toast.success('Operadores activados'); hook.loadData(); }),
    },
    {
      label: 'Desactivar Operadores',
      icon: <AlertCircle size={14} />,
      onClick: (items) => {
        if (currentUser && items.some(u => u.id === currentUser.id)) {
          return toast.error('No puedes auto-desactivarte en lote');
        }
        return Promise.all(items.map(u => api.put('/api/tenant-users/' + u.id, { display_name: u.display_name, is_active: 0 })))
          .then(() => { toast.success('Operadores desactivados'); hook.loadData(); });
      },
    },
    {
      label: 'Dar de Baja',
      icon: <AlertCircle size={14} />,
      variant: 'danger',
      onClick: (items) => {
        if (currentUser && items.some(u => u.id === currentUser.id)) {
          return toast.error('No puedes auto-eliminarte');
        }
        hook.openConfirm('Dar de baja a ' + items.length + ' operador(es) del tenant?', async () => {
          await Promise.all(items.map(u => api.delete('/api/tenant-users/' + u.id)));
          toast.success('Bajas procesadas');
          hook.loadData();
        });
      },
    },
  ], [currentUser, hook]);

  const rowActions: TableAction<TenantUser>[] = useMemo(() => [
    { label: 'Editar Accesos', icon: <Edit size={14} />, onClick: hook.handleOpenEdit },
    { label: 'Dar de Baja', icon: <Trash2 size={14} />, onClick: (u) => hook.handleDelete(u, currentUser), variant: 'danger' },
  ], [hook.handleOpenEdit, hook.handleDelete, currentUser]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sys-text)', margin: 0 }}>Usuarios / Operadores</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--sys-text-muted)', margin: '0.125rem 0 0 0' }}>Gesti\u00f3n de acceso transversal al tenant</p>
        </div>
        <Button variant="primary" onClick={hook.handleOpenCreate}>
          <UserPlus size={14} /> Nuevo Operador
        </Button>
      </div>

      <Table<TenantUser>
        data={hook.filteredUsers}
        columns={columns}
        keyExtractor={u => u.id}
        loading={hook.loading}
        selectedKeys={hook.selectedKeys}
        onSelectionChange={hook.setSelectedKeys}
        bulkActions={bulkActions}
        actions={rowActions}
        emptyState={{
          icon: <User size={24} />,
          title: 'Sin operadores',
          description: 'No se encontraron operadores en este tenant.',
        }}
      />

      <SlidePanel
        open={hook.panelOpen}
        onClose={() => hook.setPanelOpen(false)}
        title={hook.editingUser ? 'Editar Operador' : 'Nuevo Operador'}
        width="450px"
      >
        <UserFormPanel
          editingUser={hook.editingUser}
          formName={hook.formName}
          formEmail={hook.formEmail}
          formPassword={hook.formPassword}
          formActive={hook.formActive}
          appAccess={hook.appAccess}
          roles={hook.roles}
          saveLoading={hook.saveLoading}
          onNameChange={hook.setFormName}
          onEmailChange={hook.setFormEmail}
          onPasswordChange={hook.setFormPassword}
          onActiveChange={hook.setFormActive}
          onAppAccessChange={(appId, access) => hook.setAppAccess(prev => ({ ...prev, [appId]: access }))}
          onSave={(e) => hook.handleSave(e)}
          onClose={() => hook.setPanelOpen(false)}
        />
      </SlidePanel>

      <ConfirmDialog
        open={hook.confirmOpen}
        onClose={() => hook.setConfirmOpen(false)}
        title="Confirmar Acci\u00f3n"
        message={hook.confirmMsg}
        onConfirm={hook.handleConfirmAction}
        loading={hook.confirmLoading}
      />
    </div>
  );
}

