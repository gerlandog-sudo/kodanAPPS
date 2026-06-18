import { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';
import { Button, Table, SlidePanel } from '@kodan-apps/ui-core';
import { toast } from 'sonner';
import {
  CreditCard,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  Infinity,
} from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  created_at: string;
  updated_at: string;
  limits: Array<{ module: string; metric: string; value: number }>;
}

interface LimitRow {
  module: 'crm' | 'tracker';
  metric: string;
  value: number;
}

const MODULES = ['crm', 'tracker'] as const;
const METRICS: Record<string, string[]> = {
  crm: ['users_max', 'negotiations_max', 'api_calls_month'],
  tracker: ['users_max', 'tasks_max', 'api_calls_month'],
};

const METRIC_LABELS: Record<string, string> = {
  users_max: 'Usuarios máx.',
  negotiations_max: 'Negociaciones máx.',
  tasks_max: 'Tareas máx.',
  api_calls_month: 'API calls/mes',
};

export function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: number;
    currency: string;
    limits: LimitRow[];
  }>({
    name: '',
    description: '',
    price: 0,
    currency: 'USD',
    limits: [],
  });

  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    currency?: string;
    limits?: string;
    general?: string;
  }>({});

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (showCreateModal && formData.limits.length === 0) {
      const defaultLimits: LimitRow[] = [];
      MODULES.forEach(module => {
        METRICS[module].forEach(metric => {
          defaultLimits.push({ module, metric, value: 0 });
        });
      });
      setFormData(prev => ({ ...prev, limits: defaultLimits }));
    }
  }, [showCreateModal]);

  useEffect(() => {
    if (editingPlan) {
      setFormData({
        name: editingPlan.name,
        description: editingPlan.description,
        price: editingPlan.price,
        currency: editingPlan.currency,
        limits: editingPlan.limits.map(l => ({ ...l } as LimitRow)),
      });
    }
  }, [editingPlan]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.listPlans() as Plan[];
      setPlans(data);
    } catch (err: any) {
      toast.error(err.message || 'Error cargando planes');
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = (index: number, value: number) => {
    setFormData(prev => ({
      ...prev,
      limits: prev.limits.map((l, i) => i === index ? { ...l, value: Math.max(0, value) } : l)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (formData.price < 0) newErrors.price = 'El precio no puede ser negativo';
    if (!formData.currency || formData.currency.length !== 3) newErrors.currency = 'Código ISO 3 letras';
    const invalidLimits = formData.limits.some(l => l.value < 0);
    if (invalidLimits) newErrors.limits = 'Los valores no pueden ser negativos (0 = ilimitado)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setErrors({});

    try {
      if (editingPlan) {
        await superAdminApi.updatePlan(editingPlan.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: formData.price,
          currency: formData.currency.toUpperCase(),
          limits: formData.limits,
        });
        toast.success('Plan actualizado');
      } else {
        await superAdminApi.createPlan({
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: formData.price,
          currency: formData.currency.toUpperCase(),
          limits: formData.limits,
        });
        toast.success('Plan creado');
      }

      setShowCreateModal(false);
      setEditingPlan(null);
      resetForm();
      await loadPlans();
    } catch (err: any) {
      setErrors({ general: err.message || 'Error guardando plan' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`¿Eliminar plan "${plan.name}"? Esta acción es irreversible.`)) return;
    try {
      await superAdminApi.deletePlan(plan.id);
      toast.success('Plan eliminado');
      await loadPlans();
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando plan');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: 0, currency: 'USD', limits: [] });
    setErrors({});
    setEditingPlan(null);
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button variant="primary" onClick={() => { setEditingPlan(null); setShowCreateModal(true); }}>
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
          {
            key: 'limits_crm',
            header: 'Límites CRM',
            render: plan => <LimitChips limits={plan.limits} module="crm" />,
          },
          {
            key: 'limits_tracker',
            header: 'Límites Tracker',
            render: plan => <LimitChips limits={plan.limits} module="tracker" />,
          },
        ]}
        keyExtractor={plan => plan.id}
        loading={loading}
        emptyState={{
          icon: <CreditCard size={40} />,
          title: 'No hay planes configurados',
          description: 'Crea el primer plan de suscripción',
        }}
        actions={[
          { icon: <Edit3 size={14} />, label: 'Editar', onClick: plan => { setEditingPlan(plan); setShowCreateModal(true); } },
          { icon: <Trash2 size={14} />, label: 'Eliminar', variant: 'danger', onClick: handleDelete },
        ]}
      />

      <SlidePanel open={showCreateModal || !!editingPlan} onClose={() => { setShowCreateModal(false); setEditingPlan(null); }} title={editingPlan ? 'Editar Plan' : 'Nuevo Plan'}>
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
                <input type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Premium Plus" />
                {errors.name && <p className="text-xs" style={{ color: 'var(--sys-error)' }}>{errors.name}</p>}
                <label className="text-xs font-medium mt-3" style={{ color: 'var(--sys-text-muted)' }}>Descripción</label>
                <textarea className="input" rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Descripción del plan..." />
              </div>
              <div className="flex flex-row gap-4 items-start">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Precio *</label>
                  <input type="number" step="0.01" min="0" className="input" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} placeholder="49.00" />
                  {errors.price && <p className="text-xs" style={{ color: 'var(--sys-error)' }}>{errors.price}</p>}
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Moneda *</label>
                  <input type="text" className="input" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value.toUpperCase() })} placeholder="USD" maxLength={3} />
                  {errors.currency && <p className="text-xs" style={{ color: 'var(--sys-error)' }}>{errors.currency}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-5">
            <h4 className="text-sm font-semibold mb-4 font-montserrat" style={{ color: 'var(--sys-text)' }}>Límites por Módulo <span className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)' }}>(0 = ilimitado)</span></h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MODULES.map(module => (
                <div key={module}>
                  <h5 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--sys-primary)' }}>{module === 'crm' ? 'CRM' : 'Tracker'}</h5>
                  <div className="flex flex-col gap-3">
                    {METRICS[module].map(metric => {
                      const idx = formData.limits.findIndex(l => l.module === module && l.metric === metric);
                      return (
                        <div key={metric} className="grid grid-cols-[1fr_8rem] items-center gap-3">
                          <label className="text-xs truncate" style={{ color: 'var(--sys-text-muted)' }}>{METRIC_LABELS[metric]}</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="input pr-7 text-sm w-full"
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
                  </div>
                </div>
              ))}
            </div>
            {errors.limits && <p className="text-xs mt-3" style={{ color: 'var(--sys-error)' }}>{errors.limits}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-auto" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); setEditingPlan(null); }}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : (editingPlan ? 'Actualizar Plan' : 'Crear Plan')}
            </Button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}

function LimitChips({ limits, module }: { limits: Plan['limits']; module: string }) {
  const moduleLimits = limits.filter(l => l.module === module);
  if (moduleLimits.length === 0) return <span className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {moduleLimits.map(l => (
        <span key={l.metric} className="badge badge-plan text-xs">
          {l.value === 0 ? (
            <span className="flex items-center gap-1">
              <Infinity size={10} />
              {METRIC_LABELS[l.metric] || l.metric}
            </span>
          ) : (
            `${METRIC_LABELS[l.metric] || l.metric}: ${l.value.toLocaleString()}`
          )}
        </span>
      ))}
    </div>
  );
}
