import { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';
import { Button, Table } from '@kodan-apps/ui-core';
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
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ app_id: 'crm', name: '', description: '' });
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

  const handleOpenCreate = () => {
    setSelectedRole(null);
    setForm({ app_id: 'crm', name: '', description: '' });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (role: Role) => {
    setSelectedRole(role);
    setForm({ app_id: role.app_id, name: role.name, description: role.description });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (selectedRole) {
        await superAdminApi.updateRole(selectedRole.id, form);
        toast.success('Rol actualizado');
      } else {
        await superAdminApi.createRole(form);
        toast.success('Rol creado');
      }
      setShowModal(false);
      setForm({ app_id: 'crm', name: '', description: '' });
      await loadRoles();
    } catch (err: any) {
      setError(err.message || 'Error guardando rol');
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
      <div className="flex items-center justify-end mb-4">
        <Button variant="primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Nuevo Rol
        </Button>
      </div>

      <Table<Role>
        data={roles}
        columns={[
          {
            key: 'app',
            header: 'App',
            sortable: true,
            render: role => <span className="badge badge-plan text-xs">{role.app_id}</span>,
          },
          {
            key: 'name',
            header: 'Rol',
            sortable: true,
            render: role => <span className="font-semibold text-sm">{role.name}</span>,
          },
          {
            key: 'description',
            header: 'Descripción',
            render: role => <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)' }}>{role.description || '—'}</span>,
          },
          {
            key: 'active',
            header: 'Activo',
            render: role => (
              <button onClick={() => toggleActive(role)} className="flex items-center gap-1.5 text-xs">
                {role.is_active ? (
                  <><Check size={12} style={{ color: 'var(--sys-success)' }} /> Activo</>
                ) : (
                  <><X size={12} style={{ color: 'var(--sys-error)' }} /> Inactivo</>
                )}
              </button>
            ),
          },
        ]}
        keyExtractor={role => role.id}
        loading={loading}
        emptyState={{
          icon: <Shield size={40} />,
          title: 'No hay roles configurados',
          description: '',
        }}
        editable={{ onClick: handleOpenEdit }}
        deletable={{ onClick: handleDelete }}
        maxHeight="calc(100vh - 220px)"
      />

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md overflow-hidden shadow-2xl"
            style={{ background: 'var(--sys-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sys-border-soft)' }}
          >
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--sys-border-soft)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>{selectedRole ? 'Editar Rol' : 'Nuevo Rol'}</h3>
              <button onClick={() => setShowModal(false)} className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ color: 'var(--sys-text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              {error && (
                <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: 'var(--sys-error-container)', color: 'var(--color-on-error-container)' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>App</label>
                <select
                  className="input select"
                  value={form.app_id}
                  onChange={e => setForm(p => ({ ...p, app_id: e.target.value }))}
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
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: supervisor"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Descripción</label>
                <input
                  type="text"
                  className="input"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : selectedRole ? 'Actualizar Rol' : 'Crear Rol'}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
