import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Table } from './Table';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { Button } from './Button';
import { toast } from 'sonner';

interface AppMetric {
  app_id: string;
  metric: string;
  label: string;
  description: string | null;
  metric_type: 'limit_entity' | 'counter_usage';
  default_value: number;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface AppMetricsManagerProps {
  metrics: AppMetric[];
  apps: Array<{ app_id: string; name: string }>;
  onCreate: (app: string, data: { metric: string; label: string; description?: string; metric_type?: string; default_value?: number; sort_order?: number }) => Promise<void>;
  onUpdate: (app: string, metric: string, data: { label?: string; description?: string; metric_type?: string; default_value?: number; is_active?: boolean; sort_order?: number }) => Promise<void>;
  onDelete: (app: string, metric: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const KNOWN_METRICS: Record<string, Array<{ metric: string; label: string }>> = {
  crm: [
    { metric: 'users_max', label: 'Usuarios máximos' },
    { metric: 'negotiations_max', label: 'Negociaciones activas' },
    { metric: 'pipelines_max', label: 'Pipelines' },
    { metric: 'accounts_max', label: 'Cuentas' },
    { metric: 'contacts_max', label: 'Contactos' },
    { metric: 'api_calls_month', label: 'Llamadas API/mes' },
  ],
  tracker: [
    { metric: 'users_max', label: 'Usuarios máximos' },
    { metric: 'projects_max', label: 'Proyectos activos' },
    { metric: 'tasks_max', label: 'Tareas activas' },
    { metric: 'time_entries_max', label: 'Registros tiempo/mes' },
    { metric: 'api_calls_month', label: 'Llamadas API/mes' },
  ],
};

const TYPE_LABELS: Record<string, string> = {
  limit_entity: 'Límite de entidad',
  counter_usage: 'Contador de uso',
};

export function AppMetricsManager({ metrics, apps, onCreate, onUpdate, onDelete, onRefresh }: AppMetricsManagerProps) {
  const [editMetric, setEditMetric] = useState<AppMetric | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ app: string; metric: string; label: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    app_id: apps[0]?.app_id || '',
    metric: '',
    label: '',
    description: '',
    metric_type: 'limit_entity' as string,
    default_value: 0,
    sort_order: 0,
  });

  const grouped = apps.map(app => ({
    app,
    metrics: metrics.filter(m => m.app_id === app.app_id).sort((a, b) => a.sort_order - b.sort_order),
  }));

  const openCreate = () => {
    setEditMetric(null);
    setForm({
      app_id: apps[0]?.app_id || '',
      metric: '',
      label: '',
      description: '',
      metric_type: 'limit_entity',
      default_value: 0,
      sort_order: metrics.length,
    });
    setShowForm(true);
  };

  const openEdit = (m: AppMetric) => {
    setEditMetric(m);
    setForm({
      app_id: m.app_id,
      metric: m.metric,
      label: m.label,
      description: m.description || '',
      metric_type: m.metric_type,
      default_value: m.default_value,
      sort_order: m.sort_order,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.metric.trim() || !form.label.trim()) {
      toast.error('Metric y Label son requeridos');
      return;
    }
    setSubmitting(true);
    try {
      if (editMetric) {
        await onUpdate(editMetric.app_id, editMetric.metric, {
          label: form.label,
          description: form.description,
          metric_type: form.metric_type,
          default_value: form.default_value,
          sort_order: form.sort_order,
        });
        toast.success('Métrica actualizada');
      } else {
        await onCreate(form.app_id, {
          metric: form.metric.trim(),
          label: form.label.trim(),
          description: form.description,
          metric_type: form.metric_type,
          default_value: form.default_value,
          sort_order: form.sort_order,
        });
        toast.success('Métrica creada');
      }
      setShowForm(false);
      setEditMetric(null);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error guardando métrica');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.app, deleteTarget.metric);
      toast.success('Métrica eliminada');
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando métrica');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold font-montserrat" style={{ color: 'var(--sys-text)' }}>Métricas por App</h3>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} />
          Nueva Métrica
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {grouped.map(({ app, metrics: appMetrics }) => (
          <div key={app.app_id} className="glass-panel rounded-xl overflow-hidden">
            <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'var(--sys-surface)', borderBottom: '1px solid var(--sys-border-soft)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'var(--sys-primary-container)', color: 'var(--sys-on-primary)' }}>
                {app.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold font-montserrat" style={{ color: 'var(--sys-text)' }}>{app.name}</span>
              <span className="text-xs ml-auto" style={{ color: 'var(--sys-text-muted)' }}>{appMetrics.length} métricas</span>
            </div>
            <Table<AppMetric>
              data={appMetrics}
              columns={[
                {
                  key: 'metric',
                  header: 'Métrica',
                  render: m => (
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--sys-text)' }}>{m.label}</span>
                      <code className="text-[10px] px-1.5 py-0.5 rounded ml-2" style={{ background: 'var(--sys-surface)', color: 'var(--sys-text-muted)' }}>{m.metric}</code>
                    </div>
                  ),
                },
                {
                  key: 'type',
                  header: 'Tipo',
                  render: m => <span className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>{TYPE_LABELS[m.metric_type] || m.metric_type}</span>,
                },
                {
                  key: 'default',
                  header: 'Default',
                  render: m => <span className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>{m.default_value}</span>,
                },
                {
                  key: 'status',
                  header: 'Estado',
                  render: m => m.is_active ? (
                    <span className="text-xs font-medium" style={{ color: '#22c55e' }}>Activo</span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>Inactivo</span>
                  ),
                },
              ]}
              keyExtractor={m => m.metric}
              emptyState={{
                icon: <Plus size={32} />,
                title: 'Sin métricas',
                description: 'Agrega la primera métrica',
              }}
              editable={{ onClick: m => openEdit(m) }}
              deletable={{ onClick: m => setDeleteTarget({ app: m.app_id, metric: m.metric, label: m.label }) }}
            />
          </div>
        ))}
      </div>

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditMetric(null); }}
        title={editMetric ? 'Editar Métrica' : 'Nueva Métrica'}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!editMetric && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>App</label>
              <select
                className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                value={form.app_id}
                onChange={e => setForm({ ...form, app_id: e.target.value })}
              >
                {apps.map(a => <option key={a.app_id} value={a.app_id}>{a.name}</option>)}
              </select>
            </div>
          )}
          {!editMetric && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Metric Key *</label>
                <select
                  className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={KNOWN_METRICS[form.app_id]?.some(m => m.metric === form.metric) ? form.metric : '__custom__'}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setForm({ ...form, metric: '' });
                    } else {
                      const found = KNOWN_METRICS[form.app_id]?.find(m => m.metric === e.target.value);
                      setForm({ ...form, metric: e.target.value, label: found?.label || form.label });
                    }
                  }}
                >
                  <option value="" disabled>Seleccionar métrica...</option>
                  {(KNOWN_METRICS[form.app_id] || []).map(m => (
                    <option key={m.metric} value={m.metric}>{m.label} ({m.metric})</option>
                  ))}
                  <option value="__custom__">— Otro (personalizado) —</option>
                </select>
              </div>
              {form.metric && !KNOWN_METRICS[form.app_id]?.some(m => m.metric === form.metric) && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Metric Key personalizada</label>
                  <input
                    type="text"
                    className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={form.metric}
                    onChange={e => setForm({ ...form, metric: e.target.value.replace(/[^a-z_]/g, '') })}
                    placeholder="mi_metrica"
                  />
                </div>
              )}
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Label *</label>
            <input
              type="text"
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
              placeholder="Usuarios máximos"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Descripción</label>
            <textarea
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción de la métrica..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Tipo</label>
              <select
                className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                value={form.metric_type}
                onChange={e => setForm({ ...form, metric_type: e.target.value })}
              >
                <option value="limit_entity">Límite de entidad</option>
                <option value="counter_usage">Contador de uso</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Valor por defecto</label>
              <input
                type="number"
                min="0"
                className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                value={form.default_value}
                onChange={e => setForm({ ...form, default_value: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Orden</label>
            <input
              type="number"
              min="0"
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              value={form.sort_order}
              onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditMetric(null); }}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : (editMetric ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar métrica"
        message={deleteTarget ? `¿Eliminar métrica "${deleteTarget.label}" (${deleteTarget.metric})?` : ''}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
