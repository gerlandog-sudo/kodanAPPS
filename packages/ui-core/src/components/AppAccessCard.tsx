import { Toggle } from './Toggle';
import type { RoleOption } from '../hooks/useUsersPanel';

interface AppAccessCardProps {
  appId: string;
  enabled: boolean;
  roleId: number;
  roleOptions: RoleOption[];
  onToggle: (enabled: boolean) => void;
  onRoleChange: (roleId: number) => void;
}

export function AppAccessCard({ appId, enabled, roleId, roleOptions, onToggle, onRoleChange }: AppAccessCardProps) {
  return (
    <div
      style={{
        padding: '0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid var(--sys-border-soft)',
        background: enabled
          ? 'color-mix(in srgb, var(--sys-primary) 3%, var(--sys-surface))'
          : 'var(--sys-bg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        transition: 'all 200ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sys-text)' }}>
          Acceso a {appId.toUpperCase()}
        </span>
        <Toggle
          checked={enabled}
          onChange={e => onToggle(e.target.checked)}
        />
      </div>
      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '11px', color: 'var(--sys-text-muted)', fontWeight: 600 }}>Seleccionar Rol</label>
          <select
            value={roleId}
            onChange={e => onRoleChange(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '2rem',
              padding: '0 0.5rem',
              fontSize: '13px',
              color: 'var(--sys-text)',
              background: 'var(--sys-bg)',
              border: '1px solid var(--sys-border-soft)',
              borderRadius: '0.25rem',
              outline: 'none',
            }}
          >
            {roleOptions.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.name} ({opt.description ?? 'Sin descripción'})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
