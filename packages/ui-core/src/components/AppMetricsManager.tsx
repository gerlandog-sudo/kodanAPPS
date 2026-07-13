import { Plus } from 'lucide-react';
import { Table } from './Table';
import { Modal } from './Modal';
import { Select } from './Select';
import { ConfirmDialog } from './ConfirmDialog';
import { Button } from './Button';
import { AppTabBar } from './AppTabBar';
import { useAppMetricsManager, TYPE_LABELS, KNOWN_METRICS, type AppMetricItem } from '../hooks/useAppMetricsManager';
import type { UseAppMetricsManagerProps } from '../hooks/useAppMetricsManager';

export { type UseAppMetricsManagerProps } from '../hooks/useAppMetricsManager';

export function AppMetricsManager(props: UseAppMetricsManagerProps) {
  const hook = useAppMetricsManager(props);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold font-montserrat" style={{ color: 'var(--sys-text)' }}>Apps y M\u00e9tricas</h3>
        <Button variant="primary" onClick={hook.openCreateApp}>
          <Plus size={16} />
          Nueva App
        </Button>
      </div>

      <AppTabBar
        apps={props.apps}
        metrics={props.metrics}
        tabIndex={hook.tabIndex}
        openMenuTab={hook.openMenuTab}
        onTabChange={hook.setTabIndex}
        onOpenMenu={hook.setOpenMenuTab}
        onEditApp={hook.openEditApp}
        onDeleteApp={(app) => hook.setDeleteAppTarget(app)}
      />

      <div className="flex items-center justify-end mb-2">
        <Button variant="secondary" onClick={hook.openCreateMetric}>
          <Plus size={14} />
          Nueva M\u00e9trica
        </Button>
      </div>

      {hook.selectedApp ? (
        <Table<AppMetricItem>
          data={hook.appMetrics}
          loading={props.loading}
          columns={[
            {
              key: 'metric',
              header: 'M\u00e9trica',
              render: (m) => (
                <div className="min-h-0">
                  <span className="text-sm font-medium" style={{ color: 'var(--sys-text)' }}>{m.label}</span>
                  <code className="text-[10px] px-1.5 py-0.5 rounded ml-2" style={{ background: 'var(--sys-surface)', color: 'var(--sys-text-muted)' }}>{m.metric}</code>
                </div>
              ),
            },
            {
              key: 'type',
              header: 'Tipo',
              render: (m) => <span className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>{TYPE_LABELS[m.metric_type] || m.metric_type}</span>,
            },
            {
              key: 'default',
              header: 'Default',
              render: (m) => <span className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>{m.default_value}</span>,
            },
            {
              key: 'status',
              header: 'Estado',
              render: (m) => m.is_active ? (
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
            title: 'Sin m\u00e9tricas',
            description: 'Agrega la primera m\u00e9trica',
          }}
          editable={{ onClick: (m) => hook.openEditMetric(m) }}
          deletable={{ onClick: (m) => hook.setDeleteTarget({ app: m.app_id, metric: m.metric, label: m.label }) }}
        />
      ) : (
        <div className="flex items-center justify-center" style={{ minHeight: '20vh', color: 'var(--sys-text-muted)' }}>
          Sin apps registradas. Crea la primera app.
        </div>
      )}

      <Modal
        open={hook.showMetricForm}
        onClose={() => { hook.setShowMetricForm(false); hook.setEditMetric(null); }}
        title={hook.editMetric ? 'Editar M\u00e9trica' : 'Nueva M\u00e9trica'}
        className="max-w-lg"
      >
        <form onSubmit={hook.handleSubmitMetric} className="flex flex-col gap-4">
          {!hook.editMetric && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>App</label>
                <Select
                  options={hook.appOptions}
                  value={hook.metricForm.app_id}
                  onChange={v => hook.setMetricForm({ ...hook.metricForm, app_id: String(v), metric: '', label: '' })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Metric Key *</label>
                <Select
                  options={hook.metricKeyOptions(hook.metricForm.app_id)}
                  value={KNOWN_METRICS[hook.metricForm.app_id]?.some(m => m.metric === hook.metricForm.metric) ? hook.metricForm.metric : hook.metricForm.metric ? '__custom__' : ''}
                  onChange={v => {
                    const val = String(v);
                    if (val === '__custom__') {
                      hook.setMetricForm({ ...hook.metricForm, metric: '' });
                    } else {
                      const found = KNOWN_METRICS[hook.metricForm.app_id]?.find(m => m.metric === val);
                      hook.setMetricForm({ ...hook.metricForm, metric: val, label: found?.label || hook.metricForm.label });
                    }
                  }}
                />
                {hook.metricForm.metric && !KNOWN_METRICS[hook.metricForm.app_id]?.some(m => m.metric === hook.metricForm.metric) && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Metric Key personalizada</label>
                    <input
                      type="text"
                      className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                      value={hook.metricForm.metric}
                      onChange={e => hook.setMetricForm({ ...hook.metricForm, metric: e.target.value.replace(/[^a-z_]/g, '') })}
                      placeholder="mi_metrica"
                    />
                  </div>
                )}
              </div>
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Label *</label>
            <input type="text" className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" value={hook.metricForm.label} onChange={e => hook.setMetricForm({ ...hook.metricForm, label: e.target.value })} placeholder="Usuarios m\u00e1ximos" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Descripci\u00f3n</label>
            <textarea className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" rows={2} value={hook.metricForm.description} onChange={e => hook.setMetricForm({ ...hook.metricForm, description: e.target.value })} placeholder="Descripci\u00f3n de la m\u00e9trica..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Tipo</label>
              <Select options={hook.metricTypeOptions} value={hook.metricForm.metric_type} onChange={v => hook.setMetricForm({ ...hook.metricForm, metric_type: String(v) })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Valor por defecto</label>
              <input type="number" min="0" className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" value={hook.metricForm.default_value} onChange={e => hook.setMetricForm({ ...hook.metricForm, default_value: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Orden</label>
            <input type="number" min="0" className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" value={hook.metricForm.sort_order} onChange={e => hook.setMetricForm({ ...hook.metricForm, sort_order: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { hook.setShowMetricForm(false); hook.setEditMetric(null); }}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={hook.submitting}>
              {hook.submitting ? 'Guardando...' : (hook.editMetric ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={hook.showAppForm} onClose={() => { hook.setShowAppForm(false); hook.setEditingApp(null); }} title={hook.editingApp ? 'Editar App' : 'Nueva App'} className="max-w-md">
        <form onSubmit={hook.handleSubmitApp} className="flex flex-col gap-4">
          {!hook.editingApp && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>App ID *</label>
              <input type="text" className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" value={hook.appForm.app_id} onChange={e => hook.setAppForm({ ...hook.appForm, app_id: e.target.value.replace(/[^a-z0-9_]/g, '').toLowerCase() })} placeholder="ej: mi_app" />
              <p className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>Solo min\u00fasculas, n\u00fameros y gui\u00f3n bajo.</p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Nombre *</label>
            <input type="text" className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" value={hook.appForm.name} onChange={e => hook.setAppForm({ ...hook.appForm, name: e.target.value })} placeholder="Ej: Mi App" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Descripci\u00f3n</label>
            <textarea className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" rows={2} value={hook.appForm.description} onChange={e => hook.setAppForm({ ...hook.appForm, description: e.target.value })} placeholder="Descripci\u00f3n de la app..." />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { hook.setShowAppForm(false); hook.setEditingApp(null); }}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={hook.submitting}>
              {hook.submitting ? 'Guardando...' : (hook.editingApp ? 'Actualizar' : 'Crear App')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!hook.deleteTarget}
        onClose={() => hook.setDeleteTarget(null)}
        title="Eliminar m\u00e9trica"
        message={hook.deleteTarget ? 'Est\u00e1 seguro de eliminar la m\u00e9trica "' + hook.deleteTarget.label + '" (' + hook.deleteTarget.metric + ')?' : ''}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={hook.handleDeleteMetric}
      />
      <ConfirmDialog
        open={!!hook.deleteAppTarget}
        onClose={() => hook.setDeleteAppTarget(null)}
        title="Eliminar app"
        message={hook.deleteAppTarget ? 'Est\u00e1 seguro de eliminar la app "' + hook.deleteAppTarget.name + '"? Se eliminar\u00e1n tambi\u00e9n sus m\u00e9tricas y l\u00edmites asociados.' : ''}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={hook.handleDeleteApp}
      />
    </div>
  );
}
