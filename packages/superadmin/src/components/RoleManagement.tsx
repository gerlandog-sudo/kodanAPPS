import { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';
import { Button } from '@kodan-apps/ui-core';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import {
  Shield,
  Plus,
  X,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Role {
  id: number;
  app_id: string;
  name: string;
  description: string;
  is_active: number;
  created_at: string;
}

export function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRole, setNewRole] = useState({ app_id: 'crm', name: '', description: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadRoles(); }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.listRoles();
      setRoles(data as Role[]);
    } catch (err: any) {
      toast.error(err.message || 'Error cargando roles');
    } finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await superAdminApi.createRole(newRole);
      toast.success('Rol creado');
      setShowCreate(false);
      setNewRole({ app_id: 'crm', name: '', description: '' });
      await loadRoles();
    } catch (err: any) {
      setError(err.message || 'Error creando rol');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`Eliminar el rol "${role.name}" de ${role.app_id}?`)) return;
    try {
      await superAdminApi.deleteRole(role.id);
      toast.success('Rol eliminado');
      await loadRoles();
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando rol');
    }
  };

  const toggleActive = async (role: Role) => {
    try {
      await superAdminApi.updateRole(role.id, { is_active: !role.is_active });
      await loadRoles();
    } catch (err: any) {
      toast.error(err.message || 'Error actualizando rol');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield size={20} style={{ color: 'var(--sys-primary)' }} />
          <h2 className="text-lg font-semibold font-montserrat" style={{ color: 'var(--sys-text)' }}>Roles del Sistema</h2>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nuevo Rol
        </Button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>App</th>
              <th>Rol</th>
              <th>Descripción</th>
              <th>Activo</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <td key={j}><div className="skeleton h-4 w-full" /></td>
                ))}
              </tr>
            )) : roles.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Shield size={40} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
                    <p className="mt-3 text-sm font-medium" style={{ color: 'var(--sys-text-muted)' }}>No hay roles configurados</p>
                  </div>
                </td>
              </tr>
            ) : (
              roles.map(role => (
                <tr key={role.id}>
                  <td><span className="badge badge-plan text-xs">{role.app_id}</span></td>
                  <td className="font-medium text-sm">{role.name}</td>
                  <td className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>{role.description || '—'}</td>
                  <td>
                    <button onClick={() => toggleActive(role)} className="flex items-center gap-1.5 text-xs">
                      {role.is_active ? (
                        <><Check size={12} style={{ color: 'var(--sys-success)' }} /> Activo</>
                      ) : (
                        <><X size={12} style={{ color: 'var(--sys-error)' }} /> Inactivo</>
                      )}
                    </button>
                  </td>
                  <td className="text-right">
                    <Button variant="ghost" className="text-xs" onClick={() => handleDelete(role)}>
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md overflow-hidden shadow-2xl"
            style={{ background: 'var(--sys-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sys-border-soft)' }}
          >
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--sys-border-soft)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>Nuevo Rol</h3>
              <button onClick={() => setShowCreate(false)} className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ color: 'var(--sys-text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4">
              {error && (
                <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: 'var(--sys-error-container)', color: 'var(--color-on-error-container)' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>App</label>
                <select
                  className="input select"
                  value={newRole.app_id}
                  onChange={e => setNewRole(p => ({ ...p, app_id: e.target.value }))}
                >
                  <option value="crm">kodanCRM</option>
                  <option value="tracker">kodanTracker</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Nombre del Rol</label>
                <input
                  type="text"
                  className="input"
                  value={newRole.name}
                  onChange={e => setNewRole(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: supervisor"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Descripción</label>
                <input
                  type="text"
                  className="input"
                  value={newRole.description}
                  onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Creando...</> : 'Crear Rol'}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
