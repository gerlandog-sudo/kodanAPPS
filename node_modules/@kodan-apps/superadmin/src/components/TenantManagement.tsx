import { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';
import { sonner } from 'sonner';

interface Tenant {
  tenant_id: number;
  slug: string;
  name: string;
  is_active: boolean;
  is_system_tenant: boolean;
  subscription_plan_id: number | null;
  plan_name: string;
  plan_price: number;
  plan_currency: string;
  created_at: string;
  apps: Array<{ app_id: string; is_active: boolean }>;
}

interface FormErrors {
  name?: string;
  slug?: string;
  subscription_plan_id?: string;
  enabled_apps?: string;
  admin_name?: string;
  admin_email?: string;
  general?: string;
}

interface TenantFormData {
  name: string;
  slug: string;
  subscription_plan_id: number;
  enabled_apps: string[];
  admin_name: string;
  admin_email: string;
}

/**
 * TenantManagement - CRUD de Tenants (Blueprint)
 * 
 * Funcionalidades:
 * - Lista tenants con paginación/filtros
 * - Modal crear tenant (transacción atómica)
 * - Soft delete (desactivar, NO eliminar)
 * - Validación 422 con errores estructurados bajo inputs
 * - Planes y apps habilitadas
 */
export function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Array<{ id: number; name: string; price: number; currency: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    subscription_plan_id: 0,
    enabled_apps: ['crm'],
    admin_name: '',
    admin_email: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, plansRes] = await Promise.all([
        superAdminApi.listTenants(),
        superAdminApi.listPlans(),
      ]);
      setTenants(tenantsRes);
      setPlans(plansRes.map((p: any) => ({ id: p.id, name: p.name, price: p.price, currency: p.currency })));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando datos';
      sonner?.error?.(message);
    } finally {
      setLoading(false);
    }
  };

  // Manejo formulario
  const handleChange = (field: keyof TenantFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error al escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAppsChange = (app: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      enabled_apps: checked 
        ? [...prev.enabled_apps, app] 
        : prev.enabled_apps.filter(a => a !== app)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    else if (formData.name.trim().length < 2) newErrors.name = 'Mínimo 2 caracteres';
    
    if (!formData.slug.trim()) newErrors.slug = 'El slug es requerido';
    else if (!/^[a-z0-9-]+$/.test(formData.slug)) newErrors.slug = 'Solo minúsculas, números y guiones';
    else if (formData.slug.length < 2 || formData.slug.length > 50) newErrors.slug = '2-50 caracteres';
    
    if (!formData.subscription_plan_id) newErrors.subscription_plan_id = 'Seleccione un plan';
    
    if (formData.enabled_apps.length === 0) newErrors.enabled_apps = 'Seleccione al menos una app';
    
    if (!formData.admin_name.trim()) newErrors.admin_name = 'Nombre requerido';
    else if (formData.admin_name.trim().length < 2) newErrors.admin_name = 'Mínimo 2 caracteres';
    
    if (!formData.admin_email.trim()) newErrors.admin_email = 'Email requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) newErrors.admin_email = 'Email inválido';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    setErrors({});
    
    try {
      await superAdminApi.createTenant({
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase(),
        subscription_plan_id: formData.subscription_plan_id,
        enabled_apps: formData.enabled_apps,
        admin_name: formData.admin_name.trim(),
        admin_email: formData.admin_email.trim().toLowerCase(),
      });
      
      sonner?.success?.('Tenant creado exitosamente');
      setShowCreateModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      if (err.data && typeof err.data === 'object' && 'errors' in err.data) {
        setErrors(err.data.errors as FormErrors);
      } else {
        setErrors({ general: err.message || 'Error creando tenant' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (tenant: Tenant) => {
    if (tenant.is_system_tenant) {
      sonner?.error?.('No se puede desactivar el tenant de sistema');
      return;
    }
    
    if (!confirm(`¿Desactivar "${tenant.name}"? Se bloqueará acceso inmediato.`)) return;
    
    try {
      await superAdminApi.deactivateTenant(tenant.tenant_id);
      sonner?.success?.('Tenant desactivado');
      await loadData();
    } catch (err: any) {
      sonner?.error?.(err.message || 'Error desactivando tenant');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      subscription_plan_id: 0,
      enabled_apps: ['crm'],
      admin_name: '',
      admin_email: '',
    });
    setErrors({});
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestión de Tenants</h1>
          <p className="text-sm text-muted mt-1">{tenants.length} inquilinos registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Nuevo Tenant
        </button>
      </div>

      {/* Tabla de tenants */}
      <div className="double-bevel-card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Plan</th>
                <th className="hidden md:table-cell">Apps</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(tenant => (
                <tr key={tenant.tenant_id}>
                  <td>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted">{tenant.slug}</p>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">
                      {tenant.plan_name} (${tenant.plan_price}/{tenant.plan_currency})
                    </span>
                  </td>
                  <td className="hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {tenant.apps.map(app => (
                        <span key={app.app_id} className={`badge badge-${app.is_active ? 'success' : 'neutral'} text-xs`}>
                          {app.app_id}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${tenant.is_active ? 'badge-success' : 'badge-neutral'}`}>
                      {tenant.is_system_tenant ? 'Sistema' : (tenant.is_active ? 'Activo' : 'Inactivo')}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!tenant.is_system_tenant && !tenant.is_active && (
                        <button
                          className="btn btn-ghost text-xs"
                          onClick={() => handleDeactivate(tenant)}
                        >
                          Desactivar
                        </button>
                      )}
                      {tenant.is_system_tenant && (
                        <span className="badge badge-info text-xs">Protegido</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Tenant */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)} title="Crear Nuevo Tenant">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="badge badge-error">{errors.general}</div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="Ej: Empresa Demo"
                />
                {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Slug *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.slug}
                  onChange={e => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="empresa-demo"
                />
                {errors.slug && <p className="text-xs text-error mt-1">{errors.slug}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Plan de Suscripción *</label>
              <select
                className="input select"
                value={formData.subscription_plan_id}
                onChange={e => handleChange('subscription_plan_id', parseInt(e.target.value))}
              >
                <option value="">Seleccionar plan</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.price}/{plan.currency}
                  </option>
                ))}
              </select>
              {errors.subscription_plan_id && <p className="text-xs text-error mt-1">{errors.subscription_plan_id}</p>}
            </div>

            <fieldset>
              <legend className="block text-sm font-medium mb-2">Apps Habilitadas *</legend>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="input"
                    checked={formData.enabled_apps.includes('crm')}
                    onChange={e => handleAppsChange('crm', e.target.checked)}
                  />
                  <span>CRM</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="input"
                    checked={formData.enabled_apps.includes('tracker')}
                    onChange={e => handleAppsChange('tracker', e.target.checked)}
                  />
                  <span>Tracker</span>
                </label>
              </div>
              {errors.enabled_apps && <p className="text-xs text-error mt-1">{errors.enabled_apps}</p>}
            </fieldset>

            <hr className="border-border" />

            <legend className="block text-sm font-medium mb-2">Administrador Inicial</legend>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.admin_name}
                  onChange={e => handleChange('admin_name', e.target.value)}
                  placeholder="Juan Pérez"
                />
                {errors.admin_name && <p className="text-xs text-error mt-1">{errors.admin_name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  className="input"
                  value={formData.admin_email}
                  onChange={e => handleChange('admin_email', e.target.value)}
                  placeholder="admin@empresa.com"
                />
                {errors.admin_email && <p className="text-xs text-error mt-1">{errors.admin_email}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creando...' : 'Crear Tenant'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   Modal Component (inline para evitar dependencias)
   ============================================================ */

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal" onClick={e => e.stopPropagation()}>
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