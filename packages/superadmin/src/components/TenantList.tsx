import { Button, Toggle } from '@kodan-apps/ui-core';
import { Building2, Pencil, Shield } from 'lucide-react';

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

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="skeleton h-4 w-full" style={{ maxWidth: i === 0 ? '180px' : i === 4 ? '80px' : '100px' }} />
        </td>
      ))}
    </tr>
  );
}

export function TenantList({ tenants, loading, onToggle, onEdit }: TenantListProps) {
  if (loading) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Plan</th>
              <th>Estado</th>
              <th className="text-right"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Plan</th>
              <th>Estado</th>
              <th className="text-right"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4}>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 size={40} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
                  <p className="mt-3 text-sm font-medium" style={{ color: 'var(--sys-text-muted)' }}>No hay tenants registrados</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--sys-text-muted)', opacity: 0.7 }}>Crea el primer tenant para comenzar</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Plan</th>
            <th>Estado</th>
            <th className="text-right"></th>
          </tr>
        </thead>
        <tbody>
          {tenants.map(tenant => (
            <tr key={tenant.tenant_id}>
              <td>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden text-xs font-semibold" style={{ background: 'var(--sys-surface)' }}>
                    {tenant.logo_url ? (
                      <img src={tenant.logo_url} alt="" className="w-full h-full object-contain p-1" />
                    ) : (
                      <span style={{ color: 'var(--sys-primary)' }}>{tenant.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tenant.name}</p>
                    <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>ID: {tenant.tenant_id}</p>
                  </div>
                </div>
              </td>
              <td>
                <span className="badge badge-plan">
                  {tenant.plan_name} (${tenant.plan_price}/{tenant.plan_currency})
                </span>
              </td>
              <td>
                {tenant.is_system_tenant ? (
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
                )}
              </td>
              <td className="text-right">
                <Button variant="ghost" className="text-xs flex items-center gap-1.5 ml-auto" onClick={() => onEdit(tenant)}>
                  <Pencil size={14} />
                  Editar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
