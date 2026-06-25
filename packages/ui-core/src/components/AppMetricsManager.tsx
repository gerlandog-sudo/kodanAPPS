import { useState } from 'react';
import { Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Table } from './Table';
import { Modal } from './Modal';
import { Select } from './Select';
import type { SelectOption } from './Select';
import { ConfirmDialog } from './ConfirmDialog';
import { Button } from './Button';
import { toast } from 'sonner';

interface App {
  app_id: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
}

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
  apps: App[];
  metrics: AppMetric[];
  loading?: boolean;
  onRefresh: () => Promise<void>;
  onCreateMetric: (app: string, data: { metric: string; label: string; description?: string; metric_type?: string; default_value?: number; sort_order?: number }) => Promise<void>;
  onUpdateMetric: (app: string, metric: string, data: { label?: string; description?: string; metric_type?: string; default_value?: number; is_active?: boolean; sort_order?: number }) => Promise<void>;
  onDeleteMetric: (app: string, metric: string) => Promise<void>;
  onCreateApp: (data: { app_id: string; name: string; description?: string }) => Promise<void>;
  onUpdateApp: (appId: string, data: { name?: string; description?: string; is_active?: boolean }) => Promise<void>;
  onDeleteApp: (appId: string) => Promise<void>;
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

export function AppMetricsManager({ apps, metrics, loading, onRefresh, onCreateMetric, onUpdateMetric, onDeleteMetric, onCreateApp, onUpdateApp, onDeleteApp }: AppMetricsManagerProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const [editMetric, setEditMetric] = useState<AppMetric | null>(null);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [showAppForm, setShowAppForm] = useState(false);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [openMenuTab, setOpenMenuTab] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ app: string; metric: string; label: string } | null>(null);
  const [deleteAppTarget, setDeleteAppTarget] = useState<App | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [metricForm, setMetricForm] = useState({
    app_id: apps[0]?.app_id || '',
    metric: '',
    label: '',
    description: '',
    metric_type: 'limit_entity' as string,
    default_value: 0,
    sort_order: 0,
  });

  const [appForm, setAppForm] = useState({
    app_id: '',
    name: '',
    description: '',
  });

  const selectedApp = apps[tabIndex] || apps[0];
  const appMetrics = metrics
    .filter(m => m.app_id === selectedApp?.app_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const appOptions: SelectOption[] = apps.map(a => ({ value: a.app_id, label: a.name }));

  const metricKeyOptions = (appId: string): SelectOption[] => [
    ...(KNOWN_METRICS[appId] || []).map(m => ({ value: m.metric, label: `${m.label} (${m.metric})` })),
    { value: '__custom__', label: '— Otro (personalizado) —' },
  ];

  const metricTypeOptions: SelectOption[] = [
    { value: 'limit_entity', label: 'Límite de entidad' },
    { value: 'counter_usage', label: 'Contador de uso' },
  ];

  const openCreateMetric = () => {
    setEditMetric(null);
    setMetricForm({
      app_id: selectedApp?.app_id || apps[0]?.app_id || '',
      metric: '',
      label: '',
      description: '',
      metric_type: 'limit_entity',
      default_value: 0,
      sort_order: metrics.length,
    });
    setShowMetricForm(true);
  };

  const openEditMetric = (m: AppMetric) => {
    setEditMetric(m);
    setMetricForm({
      app_id: m.app_id,
      metric: m.metric,
      label: m.label,
      description: m.description || '',
      metric_type: m.metric_type,
      default_value: m.default_value,
      sort_order: m.sort_order,
    });
    setShowMetricForm(true);
  };

  const openCreateApp = () => {
    setEditingApp(null);
    setAppForm({ app_id: '', name: '', description: '' });
    setShowAppForm(true);
  };

  const openEditApp = (app: App) => {
    setEditingApp(app);
    setAppForm({ app_id: app.app_id, name: app.name, description: app.description || '' });
    setShowAppForm(true);
  };

  const handleSubmitMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metricForm.metric.trim() || !metricForm.label.trim()) {
      toast.error('Metric y Label son requeridos');
      return;
    }
    setSubmitting(true);
    try {
      if (editMetric) {
        await onUpdateMetric(editMetric.app_id, editMetric.metric, {
          label: metricForm.label,
          description: metricForm.description,
          metric_type: metricForm.metric_type,
          default_value: metricForm.default_value,
          sort_order: metricForm.sort_order,
        });
        toast.success('Métrica actualizada');
      } else {
        await onCreateMetric(metricForm.app_id, {
          metric: metricForm.metric.trim(),
          label: metricForm.label.trim(),
          description: metricForm.description,
          metric_type: metricForm.metric_type,
          default_value: metricForm.default_value,
          sort_order: metricForm.sort_order,
        });
        toast.success('Métrica creada');
      }
      setShowMetricForm(false);
      setEditMetric(null);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error guardando métrica');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingApp) {
      if (!appForm.name.trim()) {
        toast.error('Nombre es requerido');
        return;
      }
      setSubmitting(true);
      try {
        await onUpdateApp(editingApp.app_id, { name: appForm.name, description: appForm.description });
        toast.success('App actualizada');
        setShowAppForm(false);
        setEditingApp(null);
        await onRefresh();
      } catch (err: any) {
        toast.error(err.message || 'Error actualizando app');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!appForm.app_id.trim() || !appForm.name.trim()) {
        toast.error('App ID y Nombre son requeridos');
        return;
      }
      if (!/^[a-z][a-z0-9_]*$/.test(appForm.app_id.trim())) {
        toast.error('App ID: solo minúsculas, números y guión bajo (ej: nueva_app)');
        return;
      }
      setSubmitting(true);
      try {
        await onCreateApp({ app_id: appForm.app_id.trim(), name: appForm.name.trim(), description: appForm.description });
        toast.success('App creada');
        setShowAppForm(false);
        setTabIndex(apps.length);
        await onRefresh();
      } catch (err: any) {
        toast.error(err.message || 'Error creando app');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleDeleteMetric = async () => {
    if (!deleteTarget) return;
    try {
      await onDeleteMetric(deleteTarget.app, deleteTarget.metric);
      toast.success('Métrica eliminada');
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando métrica');
    }
  };

  const handleDeleteApp = async () => {
    if (!deleteAppTarget) return;
    try {
      await onDeleteApp(deleteAppTarget.app_id);
      toast.success('App eliminada');
      setDeleteAppTarget(null);
      if (tabIndex >= apps.length - 1) setTabIndex(Math.max(0, apps.length - 2));
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando app');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold font-montserrat" style={{ color: 'var(--sys-text)' }}>Apps y Métricas</h3>
        <Button variant="primary" onClick={openCreateApp}>
          <Plus size={16} />
          Nueva App
        </Button>
      </div>

      <div className="flex gap-1 mb-4 items-center">
        {apps.map((app, i) => (
          <div key={app.app_id} className="relative group/tab">
            <button
              onClick={() => setTabIndex(i)}
              className="px-4 h-9 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 duration-100"
              style={{
                background: tabIndex === i ? 'var(--sys-primary-container)' : 'transparent',
                color: tabIndex === i ? 'var(--color-on-primary-container)' : 'var(--sys-text-muted)',
              }}
              onMouseEnter={(e) => { if (tabIndex !== i) { e.currentTarget.style.background = 'var(--sys-surface-hover)' } }}
              onMouseLeave={(e) => { if (tabIndex !== i) { e.currentTarget.style.background = 'transparent' } }}
            >
              {app.name}
              <span className="ml-1 opacity-60" style={tabIndex === i ? { color: 'var(--sys-on-primary)' } : { color: 'var(--sys-text-muted)' }}>
                ({metrics.filter(m => m.app_id === app.app_id).length})
              </span>
            </button>
            <button
              onClick={() => setOpenMenuTab(openMenuTab === app.app_id ? null : app.app_id)}
              className="absolute -top-1 -right-1 p-0.5 rounded-full opacity-0 group-hover/tab:opacity-100 transition-opacity"
              style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)' }}
            >
              <MoreVertical size={10} />
            </button>
            {openMenuTab === app.app_id && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenMenuTab(null)} />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg shadow-lg py-1" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)' }}>
                  <button
                    onClick={() => { setOpenMenuTab(null); openEditApp(app); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:opacity-80"
                    style={{ color: 'var(--sys-text)' }}
                  >
                    <Edit size={12} /> Editar app
                  </button>
                  <button
                    onClick={() => { setOpenMenuTab(null); setDeleteAppTarget(app); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:opacity-80"
                    style={{ color: 'var(--sys-error)' }}
                  >
                    <Trash2 size={12} /> Eliminar app
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end mb-2">
        <Button variant="secondary" onClick={openCreateMetric}>
          <Plus size={14} />
          Nueva Métrica
        </Button>
      </div>

      {selectedApp ? (
        <Table<AppMetric>
          data={appMetrics}
          loading={loading}
          columns={[
            {
              key: 'metric',
              header: 'Métrica',
              render: m => (
    <div className="min-h-0">
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
          maxHeight="calc(100vh - 280px)"
          emptyState={{
            icon: <Plus size={32} />,
            title: 'Sin métricas',
            description: 'Agrega la primera métrica',
          }}
          editable={{ onClick: m => openEditMetric(m) }}
          deletable={{ onClick: m => setDeleteTarget({ app: m.app_id, metric: m.metric, label: m.label }) }}
        />
      ) : (
        <div className="flex items-center justify-center" style={{ minHeight: '20vh', color: 'var(--sys-text-muted)' }}>
          Sin apps registradas. Crea la primera app.
        </div>
      )}

      <Modal
        open={showMetricForm}
        onClose={() => { setShowMetricForm(false); setEditMetric(null); }}
        title={editMetric ? 'Editar Métrica' : 'Nueva Métrica'}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmitMetric} className="flex flex-col gap-4">
          {!editMetric && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>App</label>
              <Select
                options={appOptions}
                value={metricForm.app_id}
                onChange={v => setMetricForm({ ...metricForm, app_id: String(v), metric: '', label: '' })}
              />
            </div>
          )}
          {!editMetric && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Metric Key *</label>
              <Select
                options={metricKeyOptions(metricForm.app_id)}
                value={KNOWN_METRICS[metricForm.app_id]?.some(m => m.metric === metricForm.metric) ? metricForm.metric : metricForm.metric ? '__custom__' : ''}
                onChange={v => {
                  const val = String(v);
                  if (val === '__custom__') {
                    setMetricForm({ ...metricForm, metric: '' });
                  } else {
                    const found = KNOWN_METRICS[metricForm.app_id]?.find(m => m.metric === val);
                    setMetricForm({ ...metricForm, metric: val, label: found?.label || metricForm.label });
                  }
                }}
              />
              {metricForm.metric && !KNOWN_METRICS[metricForm.app_id]?.some(m => m.metric === metricForm.metric) && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Metric Key personalizada</label>
                  <input
                    type="text"
                    className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={metricForm.metric}
                    onChange={e => setMetricForm({ ...metricForm, metric: e.target.value.replace(/[^a-z_]/g, '') })}
                    placeholder="mi_metrica"
                  />
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Label *</label>
            <input
              type="text"
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              value={metricForm.label}
              onChange={e => setMetricForm({ ...metricForm, label: e.target.value })}
              placeholder="Usuarios máximos"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Descripción</label>
            <textarea
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              rows={2}
              value={metricForm.description}
              onChange={e => setMetricForm({ ...metricForm, description: e.target.value })}
              placeholder="Descripción de la métrica..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Tipo</label>
              <Select
                options={metricTypeOptions}
                value={metricForm.metric_type}
                onChange={v => setMetricForm({ ...metricForm, metric_type: String(v) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Valor por defecto</label>
              <input
                type="number"
                min="0"
                className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                value={metricForm.default_value}
                onChange={e => setMetricForm({ ...metricForm, default_value: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Orden</label>
            <input
              type="number"
              min="0"
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              value={metricForm.sort_order}
              onChange={e => setMetricForm({ ...metricForm, sort_order: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setShowMetricForm(false); setEditMetric(null); }}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : (editMetric ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showAppForm}
        onClose={() => { setShowAppForm(false); setEditingApp(null); }}
        title={editingApp ? 'Editar App' : 'Nueva App'}
        className="max-w-md"
      >
        <form onSubmit={handleSubmitApp} className="flex flex-col gap-4">
          {!editingApp && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>App ID *</label>
              <input
                type="text"
                className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                value={appForm.app_id}
                onChange={e => setAppForm({ ...appForm, app_id: e.target.value.replace(/[^a-z0-9_]/g, '').toLowerCase() })}
                placeholder="ej: mi_app"
              />
              <p className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>Solo minúsculas, números y guión bajo. Se usa como identificador en URLs y código.</p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Nombre *</label>
            <input
              type="text"
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              value={appForm.name}
              onChange={e => setAppForm({ ...appForm, name: e.target.value })}
              placeholder="Ej: Mi App"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Descripción</label>
            <textarea
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              rows={2}
              value={appForm.description}
              onChange={e => setAppForm({ ...appForm, description: e.target.value })}
              placeholder="Descripción de la app..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setShowAppForm(false); setEditingApp(null); }}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : (editingApp ? 'Actualizar' : 'Crear App')}
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
        onConfirm={handleDeleteMetric}
      />

      <ConfirmDialog
        open={!!deleteAppTarget}
        onClose={() => setDeleteAppTarget(null)}
        title="Eliminar app"
        message={deleteAppTarget ? `¿Eliminar app "${deleteAppTarget.name}"? Se eliminarán también sus métricas y límites asociados.` : ''}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDeleteApp}
      />
    </div>
  );
}
