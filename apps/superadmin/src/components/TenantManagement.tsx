import { useEffect, useState } from 'react';
import { Button, ConfirmDialog } from '@kodan-apps/ui-core';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { superAdminApi } from '../api/client';
import { TenantList } from './TenantList';
import { TenantCreateWizard } from './TenantCreateWizard';
import { TenantEditModal } from './TenantEditModal';

interface Tenant {
  tenant_id: number;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  is_system_tenant: boolean;
  subscription_plan_id: number | null;
  plan_name: string;
  plan_price: number;
  plan_currency: string;
  created_at: string;
  apps: Array<{ app_id: string; is_active: boolean }>;
}

export function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Array<{ id: number; name: string; price: number; currency: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<Tenant | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Tenant | null>(null);
  const [activateTarget, setActivateTarget] = useState<Tenant | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, plansRes] = await Promise.all([
        superAdminApi.listTenants(),
        superAdminApi.listPlans(),
      ]);
      setTenants(tenantsRes);
      setPlans(plansRes.map((p) => ({ id: p.id, name: p.name, price: p.price, currency: p.currency })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (formData: any) => {
    setSubmitting(true);
    try {
      await superAdminApi.createTenant({
        name: formData.name.trim(),
        subscription_plan_id: formData.subscription_plan_id,
        logo_url: formData.logo_url,
        theme_preference: formData.theme_preference,
        admin_name: formData.admin_name.trim(),
        admin_email: formData.admin_email.trim().toLowerCase(),
        admin_password: formData.admin_password,
      });
      toast.success('Tenant creado exitosamente');
      setShowCreateModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.data?.message || err.message || 'Error creando tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = (tenant: Tenant) => {
    if (tenant.is_system_tenant) {
      toast.error('No se puede modificar el tenant de sistema');
      return;
    }
    if (tenant.is_active) {
      setDeactivateTarget(tenant);
    } else {
      setActivateTarget(tenant);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await superAdminApi.deactivateTenant(deactivateTarget.tenant_id);
      toast.success(`Tenant "${deactivateTarget.name}" desactivado`);
      setDeactivateTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error desactivando tenant');
      setDeactivateTarget(null);
    }
  };

  const confirmActivate = async () => {
    if (!activateTarget) return;
    try {
      await superAdminApi.activateTenant(activateTarget.tenant_id);
      toast.success(`Tenant "${activateTarget.name}" reactivado`);
      setActivateTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error reactivando tenant');
      setActivateTarget(null);
    }
  };

  const handleEditSave = async (data: { name: string; subscription_plan_id: number; logo_url: string | null }) => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await superAdminApi.updateTenant(editTarget.tenant_id, data);
      toast.success('Tenant actualizado');
      setEditTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error actualizando tenant');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          Nuevo Tenant
        </Button>
      </div>

      <TenantList
        tenants={tenants}
        loading={loading}
        onToggle={handleToggle}
        onEdit={setEditTarget}
      />

      <TenantCreateWizard
        key={`create-${showCreateModal}`}
        open={showCreateModal}
        plans={plans}
        submitting={submitting}
        onSubmit={handleCreateSubmit}
        onClose={() => setShowCreateModal(false)}
      />

      <TenantEditModal
        tenant={editTarget}
        plans={plans}
        open={editTarget !== null}
        saving={editSaving}
        onSave={handleEditSave}
        onClose={() => setEditTarget(null)}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        variant="danger"
        title="Desactivar Tenant"
        message={
          <>¿Estás seguro de desactivar <strong>{deactivateTarget?.name}</strong>? Los usuarios no podrán acceder inmediatamente.</>
        }
        confirmLabel="Desactivar"
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={activateTarget !== null}
        variant="success"
        title="Activar Tenant"
        message={
          <>¿Estás seguro de reactivar <strong>{activateTarget?.name}</strong>? Los usuarios podrán acceder nuevamente.</>
        }
        confirmLabel="Activar"
        onConfirm={confirmActivate}
        onCancel={() => setActivateTarget(null)}
      />
    </div>
  );
}
