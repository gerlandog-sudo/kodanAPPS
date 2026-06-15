import { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';
import { toast } from 'sonner';

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
  module: 'crm' | 'tracker' | 'api';
  metric: string;
  value: number;
}

const MODULES = ['crm', 'tracker', 'api'] as const;
const METRICS: Record<string, string[]> = {
  crm: ['pipelines_max', 'users_max', 'storage_mb'],
  tracker: ['projects_max', 'users_max'],
  api: ['api_calls_month'],
};

const METRIC_LABELS: Record<string, string> = {
  pipelines_max: 'Pipelines máx.',
  users_max: 'Usuarios máx.',
  storage_mb: 'Almacenamiento (MB)',
  projects_max: 'Proyectos máx.',
  api_calls_month: 'API calls/mes',
};

/**
 * PlanManagement - CRUD de Planes y Límites (Blueprint)
 * 
 * Blueprint decisiones:
 * - Tabla relacional plan_limits (NO JSON)
 * - CRUD completo: planes + límites por módulo/métrica
 * - value = 0 significa ilimitado
 * - Validación value >= 0
 */
export function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
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

  // Cargar planes
  useEffect(() => {
    loadPlans();
  }, []);

  // Inicializar límites por defecto al abrir modal crear
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

  // Cargar datos al editar
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

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.listPlans();
      setPlans(data);
    } catch (err: any) {
      toast.error(err.message || 'Error cargando planes');
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = (index: number, field: 'value', value: number) => {
    setFormData(prev => ({
      ...prev,
      limits: prev.limits.map((l, i) => i === index ? { ...l, [field]: Math.max(0, value) } : l)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (formData.price < 0) newErrors.price = 'El precio no puede ser negativo';
    if (!formData.currency || formData.currency.length !== 3) newErrors.currency = 'Código ISO 3 letras';
    
    // Validar límites
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

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      currency: 'USD',
      limits: [],
    });
    setErrors({});
    setEditingPlan(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Planes y Límites</h1>
          <p className="text-sm text-muted mt-1">Gestión de planes de suscripción y límites por módulo (plan_limits relacional)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingPlan(null); setShowCreateModal(true); }}>
          + Nuevo Plan
        </button>
      </div>

      {/* Lista de planes */}
      <div className="double-bevel-card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Plan</th>
                <th className="text-right">Precio</th>
                <th>Límites CRM</th>
                <th>Límites Tracker</th>
                <th>Límites API</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(plan => (
                <tr key={plan.id}>
                  <td>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-muted">{plan.description || 'Sin descripción'}</p>
                  </td>
                  <td className="text-right font-medium">
                    ${plan.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} / {plan.currency}
                  </td>
                  <td>
                    <LimitChips limits={plan.limits} module="crm" />
                  </td>
                  <td>
                    <LimitChips limits={plan.limits} module="tracker" />
                  </td>
                  <td>
                    <LimitChips limits={plan.limits} module="api" />
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="btn btn-ghost text-xs" onClick={() => handleEdit(plan)}>Editar</button>
                      <button className="btn btn-ghost text-xs text-error" onClick={() => handleDelete(plan)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar Plan */}
      {(showCreateModal || editingPlan) && (
        <Modal onClose={() => { setShowCreateModal(false); setEditingPlan(null); }} title={editingPlan ? 'Editar Plan' : 'Nuevo Plan'}>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
            {errors.general && <div className="badge badge-error">{errors.general}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Premium Plus"
                />
                {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Moneda *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                  placeholder="USD"
                  maxLength={3}
                />
                {errors.currency && <p className="text-xs text-error mt-1">{errors.currency}</p>}
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Precio *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="49.00"
                />
                {errors.price && <p className="text-xs text-error mt-1">{errors.price}</p>}
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del plan..."
                />
              </div>
            </div>

            {/* Límites por módulo */}
            <fieldset className="border-t border-border pt-4">
              <legend className="block text-sm font-medium mb-3">Límites por Módulo (value = 0 → ilimitado)</legend>
              
              <div className="space-y-4">
                {MODULES.map(module => (
                  <div key={module} className="p-4 bg-surface/50 rounded-md border border-border">
                    <h4 className="font-medium mb-3 capitalize">{module.toUpperCase()}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {METRICS[module].map(metric => {
                        const limit = formData.limits.find(l => l.module === module && l.metric === metric);
                        const idx = formData.limits.findIndex(l => l.module === module && l.metric === metric);
                        return (
                          <div key={metric} className="flex items-center gap-2">
                            <label className="text-sm text-muted w-40 shrink-0">{METRIC_LABELS[metric]}</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="input w-full"
                              value={limit?.value ?? 0}
                              onChange={e => handleLimitChange(idx, 'value', parseInt(e.target.value) || 0)}
                              placeholder="0 = ilimitado"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateModal(false); setEditingPlan(null); }}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Guardando...' : (editingPlan ? 'Actualizar' : 'Crear Plan')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   Componentes auxiliares
   ============================================================ */

function LimitChips({ limits, module }: { limits: Plan['limits']; module: string }) {
  const moduleLimits = limits.filter(l => l.module === module);
  if (moduleLimits.length === 0) return <span className="text-muted text-xs">—</span>;
  
  return (
    <div className="flex flex-wrap gap-1">
      {moduleLimits.map(l => (
        <span key={l.metric} className="badge badge-neutral text-xs">
          {METRIC_LABELS[l.metric] || l.metric}: {l.value === 0 ? '∞' : l.value.toLocaleString()}
        </span>
      ))}
    </div>
  );
}

interface ModalProps {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ onClose, title, children }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal max-w-3xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}