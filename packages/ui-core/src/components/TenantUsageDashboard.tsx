import { useState } from 'react';
import { Gauge, Infinity, RefreshCw, Sliders } from 'lucide-react';
import { Button } from './Button';
import { TenantOverrideModal } from './TenantOverrideModal';

interface UsageLimit {
  module: string;
  metric: string;
  limit_value: number | string;
  current_usage: number | string;
  has_capacity: number | string;
}

interface Override {
  module: string;
  metric: string;
  custom_value: number;
  updated_at: string;
}

interface TenantUsageDashboardProps {
  modules: string[];
  limits: UsageLimit[];
  overrides: Override[];
  tenantId: number;
  tenantName?: string;
  onRefresh: () => Promise<void>;
  onSetOverride: (tenantId: number, module: string, metric: string, customValue: number) => Promise<void>;
  onClearOverride: (tenantId: number, module: string, metric: string) => Promise<void>;
}

const MODULE_COLORS: Record<string, string> = {
  crm: '#6366f1',
  tracker: '#f59e0b',
};

const MODULE_LABELS: Record<string, string> = {
  crm: 'CRM',
  tracker: 'Tracker',
};

const METRIC_LABELS: Record<string, string> = {
  users_max: 'Usuarios',
  negotiations_max: 'Negociaciones',
  pipelines_max: 'Pipelines',
  accounts_max: 'Cuentas',
  contacts_max: 'Contactos',
  projects_max: 'Proyectos',
  tasks_max: 'Tareas',
  time_entries_max: 'Reg. tiempo',
  api_calls_month: 'API Calls',
};

function toNum(v: string | number): number {
  return typeof v === 'number' ? v : parseFloat(v);
}

function getBarColor(ratio: number): string {
  if (ratio >= 0.8) return 'var(--sys-error)';
  if (ratio >= 0.6) return '#f59e0b';
  return 'var(--sys-primary)';
}

export function TenantUsageDashboard({
  modules,
  limits,
  overrides,
  tenantId,
  tenantName,
  onRefresh,
  onSetOverride,
  onClearOverride,
}: TenantUsageDashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<{ module: string; metric: string; currentValue: number } | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const getOverrideValue = (module: string, metric: string): number | undefined => {
    const ov = overrides.find(o => o.module === module && o.metric === metric);
    return ov ? ov.custom_value : undefined;
  };

  const getLimitByModule = (mod: string) => limits.filter(l => l.module === mod);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold font-montserrat" style={{ color: 'var(--sys-text)' }}>
            {tenantName ? `Uso — ${tenantName}` : 'Uso del Tenant'}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sys-text-muted)' }}>
            Tenant #{tenantId} | {modules.length} módulo(s)
          </p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Cargando...' : 'Refrescar'}
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {modules.map(mod => {
          const modLimits = getLimitByModule(mod);
          const color = MODULE_COLORS[mod] || 'var(--sys-primary)';
          const allUnlimited = modLimits.length > 0 && modLimits.every(l => toNum(l.limit_value) === 0);

          return (
            <div key={mod} className="glass-panel rounded-xl overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'var(--sys-surface)', borderBottom: '1px solid var(--sys-border-soft)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${color}15`, color }}>
                  {mod.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold font-montserrat" style={{ color: 'var(--sys-text)' }}>{MODULE_LABELS[mod] || mod}</span>
                {allUnlimited && (
                  <span className="flex items-center gap-1 text-xs ml-auto" style={{ color: 'var(--sys-text-muted)' }}>
                    <Infinity size={12} /> Ilimitado
                  </span>
                )}
              </div>

              {modLimits.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs" style={{ color: 'var(--sys-text-muted)' }}>
                  Sin límites configurados para este módulo
                </div>
              ) : (
                <div className="px-5 py-4 flex flex-col gap-3">
                  {modLimits.map(limit => {
                    const lv = toNum(limit.limit_value);
                    const cu = toNum(limit.current_usage);
                    const ratio = lv > 0 ? cu / lv : 0;
                    const pct = Math.min(100, Math.round(ratio * 100));
                    const barColor = getBarColor(ratio);
                    const overrideVal = getOverrideValue(mod, limit.metric);
                    const hasOverride = overrideVal !== undefined;

                    return (
                      <div key={limit.metric}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium" style={{ color: 'var(--sys-text)' }}>
                              {METRIC_LABELS[limit.metric] || limit.metric}
                            </span>
                            {hasOverride && (
                              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#6366f115', color: '#6366f1' }}>
                                <Sliders size={10} /> Override
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => setOverrideTarget({
                              module: mod,
                              metric: limit.metric,
                              currentValue: hasOverride ? overrideVal! : lv,
                            })}
                            className="p-1 rounded-md hover:bg-[var(--sys-surface)] transition-colors"
                            style={{ color: 'var(--sys-text-muted)' }}
                            title="Configurar override"
                          >
                            <Sliders size={12} />
                          </button>
                        </div>

                        {lv === 0 ? (
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--sys-text-muted)' }}>
                            <Infinity size={12} />
                            <span>Uso actual: {cu.toLocaleString()}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--sys-text-muted)' }}>
                              <span>{cu.toLocaleString()} / {lv.toLocaleString()}</span>
                              <span className="font-medium tabular-nums" style={{ color: barColor }}>{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full" style={{ background: 'var(--sys-border)' }}>
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${pct}%`,
                                  background: barColor,
                                  boxShadow: ratio >= 0.8 ? `0 0 6px ${barColor}` : 'none',
                                }}
                              />
                            </div>
                          </>
                        )}

                        {hasOverride && (
                          <div className="mt-1 text-[10px]" style={{ color: '#6366f1' }}>
                            Override: {overrideVal === -1 ? 'Bloqueado' : overrideVal === 0 ? 'Ilimitado' : overrideVal.toLocaleString()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {modules.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Gauge size={40} className="mx-auto mb-3" style={{ color: 'var(--sys-text-muted)', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>No hay datos de uso disponibles</p>
              <p className="text-xs mt-1" style={{ color: 'var(--sys-text-muted)' }}>Selecciona un tenant para ver su uso</p>
            </div>
          </div>
        )}
      </div>

      {overrideTarget && (
        <TenantOverrideModal
          tenantId={tenantId}
          module={overrideTarget.module}
          metric={overrideTarget.metric}
          currentLimitValue={overrideTarget.currentValue}
          onSave={async (customValue) => {
            await onSetOverride(tenantId, overrideTarget.module, overrideTarget.metric, customValue);
            setOverrideTarget(null);
          }}
          onClear={async () => {
            await onClearOverride(tenantId, overrideTarget.module, overrideTarget.metric);
            setOverrideTarget(null);
          }}
          onClose={() => setOverrideTarget(null)}
        />
      )}
    </div>
  );
}
