import { useState, useEffect } from 'react';
import { CreditCard, Plus, AlertCircle, Infinity } from 'lucide-react';
import { SlidePanel } from './SlidePanel';
import { ConfirmDialog } from './ConfirmDialog';
import { Button } from './Button';
import { Table } from './Table';
import { toast } from 'sonner';

export interface PlanMetric {
  app_id: string;
  metric: string;
  label: string;
  metric_type: string;
}

interface PlanLimit {
  module: string;
  metric: string;
  value: number;
}

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  created_at: string;
  updated_at: string;
  limits: PlanLimit[];
}

interface PlanBuilderProps {
  plans: Plan[];
  metrics: PlanMetric[];
  loading?: boolean;
  onCreate: (data: { name: string; description?: string; price: number; currency: string; limits: PlanLimit[] }) => Promise<void>;
  onUpdate: (id: number, data: { name?: string; description?: string; price?: number; currency?: string; limits?: PlanLimit[] }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const MODULE_LABELS: Record<string, string> = {
  crm: 'CRM',
  tracker: 'Tracker',
};

export function PlanBuilder({ plans, metrics, loading, onCreate, onUpdate, onDelete, onRefresh }: PlanBuilderProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const modules = [...new Set(metrics.map(m => m.app_id))];
  const metricsByModule = modules.reduce((acc, mod) => {
    acc[mod] = metrics.filter(m => m.app_id === mod);
    return acc;
  }, {} as Record<string, PlanMetric[]>);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: number;
    currency: string;
    limits: PlanLimit[];
  }>({
    name: '',
    description: '',
    price: 0,
    currency: 'USD',
    limits: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingPlan) {
      setFormData({
        name: editingPlan.name,
        description: editingPlan.description,
        price: editingPlan.price,
        currency: editingPlan.currency,
        limits: editingPlan.limits.map(l => ({ ...l })),
      });
    }
  }, [editingPlan]);

  useEffect(() => {
    if (showPanel && !editingPlan && formData.limits.length === 0) {
      const defaults: PlanLimit[] = [];
      modules.forEach(mod => {
        (metricsByModule[mod] || []).forEach(m => {
          defaults.push({ module: mod, metric: m.metric, value: 0 });
        });
      });
      setFormData(prev => ({ ...prev, limits: defaults }));
    }
  }, [showPanel]);

  const handleLimitChange = (index: number, value: number) => {
    setFormData(prev => ({
      ...prev,
      limits: prev.limits.map((l, i) => i === index ? { ...l, value: Math.max(0, value) } : l),
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Nombre requerido';
    if (formData.price < 0) errs.price = 'Precio inválido';
    if (!formData.currency || formData.currency.length !== 3) errs.currency = 'Código ISO 3 letras';
    const neg = formData.limits.some(l => l.value < 0);
    if (neg) errs.limits = 'Valores no pueden ser negativos (0 = ilimitado)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      if (editingPlan) {
        await onUpdate(editingPlan.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: formData.price,
          currency: formData.currency.toUpperCase(),
          limits: formData.limits,
        });
        toast.success('Plan actualizado');
      } else {
        await onCreate({
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: formData.price,
          currency: formData.currency.toUpperCase(),
          limits: formData.limits,
        });
        toast.success('Plan creado');
      }
      setShowPanel(false);
      setEditingPlan(null);
      resetForm();
      await onRefresh();
    } catch (err: any) {
      setErrors({ general: err.message || 'Error guardando plan' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (plan: Plan) => {
    setPlanToDelete(plan);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    try {
      await onDelete(planToDelete.id);
      toast.success('Plan eliminado');
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando plan');
    } finally {
      setDeleteConfirmOpen(false);
      setPlanToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: 0, currency: 'USD', limits: [] });
    setErrors({});
    setEditingPlan(null);
  };

  const getMetricLabel = (m: string) => {
    for (const arr of Object.values(metricsByModule)) {
      const found = arr.find(x => x.metric === m);
      if (found) return found.label;
    }
    return m;
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button variant="primary" onClick={() => { setEditingPlan(null); setShowPanel(true); }}>
          <Plus size={16} />
          Nuevo Plan
        </Button>
      </div>

      <Table<Plan>
        data={plans}
        columns={[
          {
            key: 'plan',
            header: 'Plan',
            render: plan => (
              <>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: 'var(--sys-surface)', color: 'var(--sys-tertiary)' }}>
                  <CreditCard size={14} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{plan.name}</p>
                  {plan.description && <p className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)' }}>{plan.description}</p>}
                </div>
              </>
            ),
          },
          {
            key: 'price',
            header: 'Precio',
            align: 'right',
            render: plan => (
              <>
                ${plan.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="font-normal" style={{ color: 'var(--sys-text-muted)' }}>/{plan.currency}</span>
              </>
            ),
          },
          ...modules.map(mod => ({
            key: `limits_${mod}`,
            header: `Límites ${MODULE_LABELS[mod] || mod}`,
            render: (plan: Plan) => {
              const modLimits = plan.limits.filter(l => l.module === mod);
              if (modLimits.length === 0) return <span className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>—</span>;
              return (
                <div className="flex flex-wrap gap-1">
                  {modLimits.map(l => (
                    <span key={l.metric} className="badge badge-plan text-xs">
                      {l.value === 0 ? (
                        <span className="flex items-center gap-1">
                          <Infinity size={10} />
                          {getMetricLabel(l.metric)}
                        </span>
                      ) : (
                        `${getMetricLabel(l.metric)}: ${l.value.toLocaleString()}`
                      )}
                    </span>
                  ))}
                </div>
              );
            },
          }) as any),
        ]}
        keyExtractor={plan => plan.id}
        loading={loading}
        emptyState={{
          icon: <CreditCard size={40} />,
          title: 'No hay planes configurados',
          description: 'Crea el primer plan de suscripción',
        }}
        editable={{ onClick: plan => { setEditingPlan(plan); setShowPanel(true); } }}
        deletable={{ onClick: handleDeleteClick }}
      />

      <SlidePanel open={showPanel || !!editingPlan} onClose={() => { setShowPanel(false); setEditingPlan(null); }} title={editingPlan ? 'Editar Plan' : 'Nuevo Plan'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" style={{ minHeight: 'calc(100vh - 120px)' }}>
          {errors.general && (
            <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: 'var(--sys-error-container)', color: 'var(--color-on-error-container)' }}>
              <AlertCircle size={14} />
              {errors.general}
            </div>
          )}

          <div className="glass-panel rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Nombre *</label>
                <input type="text" className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Premium Plus" />
                {errors.name && <p className="text-xs" style={{ color: 'var(--sys-error)' }}>{errors.name}</p>}
                <label className="text-xs font-medium mt-3" style={{ color: 'var(--sys-text-muted)' }}>Descripción</label>
                <textarea className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Descripción del plan..." />
              </div>
              <div className="flex flex-row gap-4 items-start">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Precio *</label>
                  <input type="number" step="0.01" min="0" className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} placeholder="49.00" />
                  {errors.price && <p className="text-xs" style={{ color: 'var(--sys-error)' }}>{errors.price}</p>}
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Moneda *</label>
                  <input type="text" className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value.toUpperCase() })} placeholder="USD" maxLength={3} />
                  {errors.currency && <p className="text-xs" style={{ color: 'var(--sys-error)' }}>{errors.currency}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-5">
            <h4 className="text-sm font-semibold mb-4 font-montserrat" style={{ color: 'var(--sys-text)' }}>Límites por Módulo <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)' }}>(0 = ilimitado)</span></h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modules.map(mod => (
                <div key={mod}>
                  <h5 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--sys-primary)' }}>{MODULE_LABELS[mod] || mod}</h5>
                  <div className="flex flex-col gap-3">
                    {(metricsByModule[mod] || []).map(m => {
                      const idx = formData.limits.findIndex(l => l.module === mod && l.metric === m.metric);
                      return (
                        <div key={m.metric} className="grid grid-cols-[1fr_8rem] items-center gap-3">
                          <label className="text-xs truncate" style={{ color: 'var(--sys-text-muted)' }}>{m.label}</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 pr-7 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                              value={formData.limits[idx]?.value ?? 0}
                              onChange={e => handleLimitChange(idx, parseInt(e.target.value) || 0)}
                              placeholder="0"
                            />
                            {formData.limits[idx]?.value === 0 && (
                              <Infinity size={12} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--sys-primary)', opacity: 0.6 }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {(!metricsByModule[mod] || metricsByModule[mod].length === 0) && (
                      <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>Sin métricas configuradas</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {errors.limits && <p className="text-xs mt-3" style={{ color: 'var(--sys-error)' }}>{errors.limits}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-auto" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
            <Button variant="secondary" onClick={() => { setShowPanel(false); setEditingPlan(null); }}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : (editingPlan ? 'Actualizar Plan' : 'Crear Plan')}
            </Button>
          </div>
        </form>
      </SlidePanel>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar plan"
        message={planToDelete ? `¿Eliminar plan "${planToDelete.name}"? Esta acción es irreversible.` : ''}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
