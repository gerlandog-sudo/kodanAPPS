import { AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Toggle } from './Toggle';
import { AppAccessCard } from './AppAccessCard';
import type { TenantUser, RoleOption } from '../hooks/useUsersPanel';

interface UserFormPanelProps {
  editingUser: TenantUser | null;
  formName: string;
  formEmail: string;
  formPassword: string;
  formActive: boolean;
  appAccess: Record<string, { enabled: boolean; roleId: number }>;
  roles: Record<string, RoleOption[]>;
  saveLoading: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onActiveChange: (value: boolean) => void;
  onAppAccessChange: (appId: string, access: { enabled: boolean; roleId: number }) => void;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function UserFormPanel({
  editingUser,
  formName, formEmail, formPassword, formActive,
  appAccess, roles, saveLoading,
  onNameChange, onEmailChange, onPasswordChange,
  onActiveChange, onAppAccessChange,
  onSave, onClose,
}: UserFormPanelProps) {
  return (
    <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text-muted)' }}>Nombre visible</label>
        <Input value={formName} onChange={e => onNameChange(e.target.value)} placeholder="Ej. Juan Carlos" required />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text-muted)' }}>Correo electrónico</label>
        <Input type="email" value={formEmail} onChange={e => onEmailChange(e.target.value)} placeholder="operador@empresa.com" disabled={!!editingUser} required />
      </div>

      {!editingUser && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sys-text-muted)' }}>Contraseña</label>
          <Input type="password" value={formPassword} onChange={e => onPasswordChange(e.target.value)} placeholder="Mínimo 8 caracteres" required />
        </div>
      )}

      {editingUser && (
        <div style={{ fontSize: '11px', color: 'var(--sys-text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem', margin: '-0.5rem 0 0.25rem 0' }}>
          <AlertCircle size={12} />
          <span>La contraseña solo puede ser modificada por el usuario desde su perfil.</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--sys-border-soft)' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sys-text)' }}>Habilitar Operador</span>
        <Toggle checked={formActive} onChange={e => onActiveChange(e.target.checked)} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sys-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Accesos y Roles Habilitados
        </span>

        {Object.keys(roles).length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--sys-text-muted)', fontStyle: 'italic', margin: 0 }}>
            No hay aplicaciones habilitadas en el plan de su suscripción.
          </p>
        ) : (
          Object.entries(roles).map(([appId, roleOpts]) => {
            const access = appAccess[appId] || { enabled: false, roleId: 0 };
            return (
              <AppAccessCard
                key={appId}
                appId={appId}
                enabled={access.enabled}
                roleId={access.roleId}
                roleOptions={roleOpts}
                onToggle={(enabled) => onAppAccessChange(appId, { ...access, enabled })}
                onRoleChange={(roleId) => onAppAccessChange(appId, { ...access, roleId })}
              />
            );
          })
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <Button type="submit" variant="primary" disabled={saveLoading} style={{ flex: 1 }}>
          {saveLoading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} style={{ flex: 1 }}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
