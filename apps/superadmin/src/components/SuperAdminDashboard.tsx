import { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';
import { Card, Button } from '@kodan-apps/ui-core';
import { toast } from 'sonner';
import {
  Building2,
  Users,
  FileText,
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Server,
  Cpu,
  HardDrive,
  Database,
  RefreshCw,
} from 'lucide-react';

interface DashboardData {
  metrics: {
    tenants_count: number;
    active_tenants_count: number;
    users_count: number;
    admin_users_count: number;
    audit_logs_count: number;
    plans_count: number;
  };
  billing: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
  };
  telemetry: {
    php_version: string;
    memory_usage: number;
    memory_limit: string;
    db_version: string;
    db_size_mb: number;
    status: string;
  };
  top_tenants: Array<{
    tenant_id: number;
    name: string;
    user_count: number;
  }>;
}

function formatUSD(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ensureData(data: any): DashboardData {
  return {
    metrics: {
      tenants_count: data?.metrics?.tenants_count ?? data?.tenants_total ?? 0,
      active_tenants_count: data?.metrics?.active_tenants_count ?? data?.tenants_active ?? 0,
      users_count: data?.metrics?.users_count ?? data?.users_total ?? 0,
      admin_users_count: data?.metrics?.admin_users_count ?? data?.super_admins ?? 0,
      audit_logs_count: data?.metrics?.audit_logs_count ?? 0,
      plans_count: data?.metrics?.plans_count ?? 0,
    },
    billing: data?.billing ?? { total: 0, paid: 0, pending: 0, overdue: 0 },
    telemetry: data?.telemetry ?? {
      php_version: '—',
      memory_usage: 0,
      memory_limit: '—',
      db_version: '—',
      db_size_mb: 0,
      status: 'SALUDABLE',
    },
    top_tenants: data?.top_tenants ?? [],
  };
}



export function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const raw = await superAdminApi.getStats();
      setData(ensureData(raw));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando métricas';
      if (!silent) setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  if (error && !data) {
    return (
      <Card className="p-8 text-center flex flex-col items-center gap-4" style={{ minHeight: '40vh', justifyContent: 'center' }}>
        <AlertCircle size={40} style={{ color: 'var(--sys-error)' }} />
        <p style={{ color: 'var(--sys-text-muted)' }}>{error}</p>
        <Button variant="primary" onClick={() => loadStats()}>Reintentar</Button>
      </Card>
    );
  }

  const m = data?.metrics;
  const b = data?.billing;
  const t = data?.telemetry;
  const top = data?.top_tenants ?? [];
  const maxUsers = top.length > 0 ? Math.max(...top.map(t => t.user_count)) : 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        </div>
        <Button variant="secondary" onClick={() => loadStats(true)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refrescar Datos
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel rounded-xl p-5">
            <div className="skeleton w-10 h-10 rounded-xl mb-3" />
            <div className="skeleton w-16 h-3 mb-2" />
            <div className="skeleton w-24 h-6 mb-1" />
            <div className="skeleton w-14 h-3" />
          </div>
        )) : (
          <>
            <Card variant="flip" className="h-full"
              front={<div className="p-5 flex flex-col justify-between" style={{ minHeight: '140px' }}>
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--sys-surface)' }}>
                    <span style={{ color: 'var(--sys-tertiary)' }}><Building2 size={18} /></span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Organizaciones</p>
                  <p className="text-2xl font-bold font-montserrat mt-1" style={{ color: 'var(--sys-text)' }}>{String(m?.tenants_count ?? 0)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--sys-text-muted)' }}>{m?.active_tenants_count ?? 0} activas</p>
                </div>
              </div>}
              back={<div className="p-5 flex flex-col items-center justify-center text-center" style={{ minHeight: '140px' }}>
                <span style={{ color: 'var(--sys-text-muted)' }} className="text-xs leading-relaxed">Total de organizaciones registradas en la plataforma. Las activas tienen al menos un usuario con sesión en los últimos 30 días.</span>
              </div>}
            />
            <Card variant="flip" className="h-full"
              front={<div className="p-5 flex flex-col justify-between" style={{ minHeight: '140px' }}>
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--sys-surface)' }}>
                    <span style={{ color: 'var(--sys-primary)' }}><Users size={18} /></span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Usuarios Globales</p>
                  <p className="text-2xl font-bold font-montserrat mt-1" style={{ color: 'var(--sys-text)' }}>{String(m?.users_count ?? 0)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--sys-text-muted)' }}>{m?.admin_users_count ?? 0} administradores</p>
                </div>
              </div>}
              back={<div className="p-5 flex flex-col items-center justify-center text-center" style={{ minHeight: '140px' }}>
                <span style={{ color: 'var(--sys-text-muted)' }} className="text-xs leading-relaxed">Total de usuarios registrados en todas las organizaciones. Los administradores tienen permisos de gestión.</span>
              </div>}
            />
            <Card variant="flip" className="h-full"
              front={<div className="p-5 flex flex-col justify-between" style={{ minHeight: '140px' }}>
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--sys-surface)' }}>
                    <span style={{ color: 'var(--sys-tertiary)' }}><FileText size={18} /></span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Registros Auditoría</p>
                  <p className="text-2xl font-bold font-montserrat mt-1" style={{ color: 'var(--sys-text)' }}>{String(m?.audit_logs_count ?? 0)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--sys-text-muted)' }}>Eventos registrados</p>
                </div>
              </div>}
              back={<div className="p-5 flex flex-col items-center justify-center text-center" style={{ minHeight: '140px' }}>
                <span style={{ color: 'var(--sys-text-muted)' }} className="text-xs leading-relaxed">Eventos de seguridad y actividad registrados en el sistema. Incluye inicios de sesión, cambios de configuración y operaciones críticas.</span>
              </div>}
            />
            <Card variant="flip" className="h-full"
              front={<div className="p-5 flex flex-col justify-between" style={{ minHeight: '140px' }}>
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--sys-surface)' }}>
                    <span style={{ color: 'var(--sys-primary)' }}><CreditCard size={18} /></span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Planes Activos</p>
                  <p className="text-2xl font-bold font-montserrat mt-1" style={{ color: 'var(--sys-text)' }}>{String(m?.plans_count ?? 0)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--sys-text-muted)' }}>En uso por tenants</p>
                </div>
              </div>}
              back={<div className="p-5 flex flex-col items-center justify-center text-center" style={{ minHeight: '140px' }}>
                <span style={{ color: 'var(--sys-text-muted)' }} className="text-xs leading-relaxed">Planes de suscripción actualmente activos y asignados a organizaciones. Los planes definen los límites de cada módulo.</span>
              </div>}
            />
          </>
        )}
      </div>

      {/* Billing Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel rounded-xl p-5">
            <div className="skeleton w-20 h-3 mb-3" />
            <div className="skeleton w-28 h-6" />
          </div>
        )) : (
          <>
            <Card variant="flip" className="h-full"
              front={<div className="p-5 flex flex-col gap-3" style={{ minHeight: '110px' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Total Facturado</p>
                  <span style={{ color: 'var(--sys-text)' }}><DollarSign size={16} /></span>
                </div>
                <p className="text-xl font-bold font-montserrat" style={{ color: 'var(--sys-text)' }}>{formatUSD(b?.total ?? 0)}</p>
              </div>}
              back={<div className="p-5 flex flex-col items-center justify-center text-center" style={{ minHeight: '110px' }}>
                <span style={{ color: 'var(--sys-text-muted)' }} className="text-xs leading-relaxed">Suma total de todas las facturas emitidas a organizaciones.</span>
              </div>}
            />
            <Card variant="flip" className="h-full"
              front={<div className="p-5 flex flex-col gap-3" style={{ minHeight: '110px' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Total Cobrado</p>
                  <span style={{ color: 'var(--sys-success)' }}><CheckCircle2 size={16} /></span>
                </div>
                <p className="text-xl font-bold font-montserrat" style={{ color: 'var(--sys-success)' }}>{formatUSD(b?.paid ?? 0)}</p>
              </div>}
              back={<div className="p-5 flex flex-col items-center justify-center text-center" style={{ minHeight: '110px' }}>
                <span style={{ color: 'var(--sys-text-muted)' }} className="text-xs leading-relaxed">Facturas pagadas exitosamente. Representa el ingreso confirmado.</span>
              </div>}
            />
            <Card variant="flip" className="h-full"
              front={<div className="p-5 flex flex-col gap-3" style={{ minHeight: '110px' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Pendiente de Cobro</p>
                  <span style={{ color: 'var(--sys-primary)' }}><Clock size={16} /></span>
                </div>
                <p className="text-xl font-bold font-montserrat" style={{ color: 'var(--sys-primary)' }}>{formatUSD(b?.pending ?? 0)}</p>
              </div>}
              back={<div className="p-5 flex flex-col items-center justify-center text-center" style={{ minHeight: '110px' }}>
                <span style={{ color: 'var(--sys-text-muted)' }} className="text-xs leading-relaxed">Facturas emitidas pero aún no pagadas por las organizaciones.</span>
              </div>}
            />
            <Card variant="flip" className="h-full"
              front={<div className="p-5 flex flex-col gap-3" style={{ minHeight: '110px' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Total Vencido</p>
                  <span style={{ color: 'var(--sys-error)' }} className={(b?.overdue ?? 0) > 0 ? 'animate-pulse' : ''}><AlertCircle size={16} /></span>
                </div>
                <p className="text-xl font-bold font-montserrat" style={{ color: 'var(--sys-error)' }}>{formatUSD(b?.overdue ?? 0)}</p>
              </div>}
              back={<div className="p-5 flex flex-col items-center justify-center text-center" style={{ minHeight: '110px' }}>
                <span style={{ color: 'var(--sys-text-muted)' }} className="text-xs leading-relaxed">Facturas cuya fecha de vencimiento ya pasó y no han sido pagadas.</span>
              </div>}
            />
          </>
        )}
      </div>

      {/* Telemetry + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Server Telemetry */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Server size={18} style={{ color: 'var(--sys-tertiary)' }} />
              <h3 className="text-sm font-semibold font-montserrat" style={{ color: 'var(--sys-text)' }}>Telemetría del Servidor</h3>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'color-mix(in srgb, var(--sys-success) 15%, transparent)', color: 'var(--sys-success)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
              {t?.status ?? 'SALUDABLE'}
            </div>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <Cpu size={16} />, label: 'Motor PHP', value: t?.php_version ?? '—', accent: 'var(--sys-tertiary)' },
                { icon: <HardDrive size={16} />, label: 'Uso de Memoria', value: `${t?.memory_usage ?? 0} MB / ${t?.memory_limit ?? '—'}`, accent: 'var(--sys-primary)' },
                { icon: <Database size={16} />, label: 'Versión de BD', value: t?.db_version ?? '—', accent: 'var(--sys-tertiary)' },
                { icon: <Database size={16} />, label: 'Tamaño BD (Físico)', value: `${t?.db_size_mb?.toFixed(2) ?? '0'} MB`, accent: 'var(--sys-primary)' },
              ].map((item, i) => (
                <div key={i} className="rounded-lg p-4 flex items-center gap-3" style={{ background: 'var(--sys-surface)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--sys-surface-hover) 50%, transparent)' }}>
                    <span style={{ color: item.accent }}>{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>{item.label}</p>
                    <p className="text-sm font-semibold font-montserrat mt-0.5" style={{ color: 'var(--sys-text)' }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs mt-4" style={{ color: 'var(--sys-text-muted)', opacity: 0.7 }}>
            El tamaño de la base de datos se calcula consultando los metadatos de las tablas y sus índices asignados en el motor MySQL.
          </p>
        </div>

        {/* Tenant Distribution */}
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Building2 size={18} style={{ color: 'var(--sys-primary)' }} />
            <h3 className="text-sm font-semibold font-montserrat" style={{ color: 'var(--sys-text)' }}>Distribución por Tenant</h3>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-8 rounded-lg" />)}
            </div>
          ) : top.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 size={28} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />
              <p className="text-xs mt-3" style={{ color: 'var(--sys-text-muted)' }}>Sin datos de organizaciones</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {top.map((tenant, i) => (
                <div key={tenant.tenant_id} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-5" style={{ color: 'var(--sys-text-muted)' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs truncate" style={{ maxWidth: '160px', color: 'var(--sys-text)' }}>{tenant.name}</p>
                      <span className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>{tenant.user_count} operadores</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: 'var(--sys-surface)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(4, (tenant.user_count / maxUsers) * 100)}%`,
                          background: 'linear-gradient(90deg, var(--sys-primary-container), var(--sys-primary))',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}