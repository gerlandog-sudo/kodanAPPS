import { Table, Toggle } from '@kodan-apps/ui-core';
import type { TableColumn } from '@kodan-apps/ui-core';
import { Building2, Shield } from 'lucide-react';

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

interface TenantListProps {
  tenants: Tenant[];
  loading: boolean;
  onToggle: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
}

export function TenantList({ tenants, loading, onToggle, onEdit }: TenantListProps) {
  const columns: TableColumn<Tenant>[] = [
    {
      key: 'name',
      header: 'Tenant',
      render: tenant => (
        <>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden text-xs font-semibold shrink-0" style={{ background: 'var(--sys-surface)' }}>
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt="" className="w-full h-full object-contain p-1" />
            ) : (
              <span style={{ color: 'var(--sys-primary)' }}>{tenant.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">{tenant.name}</p>
            <p className="text-xs font-normal" style={{ color: 'var(--sys-text-muted)' }}>ID: {tenant.tenant_id}</p>
          </div>
        </>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: tenant => (
        <span className="badge badge-plan">
          {tenant.plan_name} (${tenant.plan_price}/{tenant.plan_currency})
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: tenant =>
        tenant.is_system_tenant ? (
          <span className="badge badge-info flex items-center gap-1.5">
            <Shield size={10} />
            Protegido
          </span>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Toggle
              checked={tenant.is_active}
              onChange={() => onToggle(tenant)}
            />
            <span style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: tenant.is_active ? 'var(--sys-success)' : 'var(--sys-error)',
            }}>
              {tenant.is_active ? 'ACTIVO' : 'INACTIVO'}
            </span>
          </div>
        ),
    },
  ];

  return (
    <Table
      data={tenants}
      columns={columns}
      keyExtractor={t => t.tenant_id}
      loading={loading}
      emptyState={{
        icon: <Building2 size={40} />,
        title: 'No hay tenants registrados',
        description: 'Crea el primer tenant para comenzar',
      }}
      editable={{ onClick: onEdit }}
      pageSize={10}
    />
  );
}
