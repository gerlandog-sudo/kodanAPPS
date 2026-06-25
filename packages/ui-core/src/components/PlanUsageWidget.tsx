import { useState, useEffect, useMemo } from 'react';
import { Gauge, AlertTriangle, Infinity, ChevronUp } from 'lucide-react';
import { api } from '../api/client';

interface PlanLimit {
  module: string;
  metric: string;
  limit_value: number | string;
  current_usage: number | string;
  has_capacity: number | string;
}

interface PlanUsageWidgetProps {
  compact?: boolean;
  planStatus?: PlanLimit[];
  planName?: string;
  onUpgrade?: () => void;
}

const METRIC_LABELS: Record<string, string> = {
  users_max: 'Usuarios',
  negotiations_max: 'Negociaciones',
  tasks_max: 'Tareas',
  projects_max: 'Proyectos',
  accounts_max: 'Cuentas',
  contacts_max: 'Contactos',
  pipelines_max: 'Pipelines',
  api_calls_month: 'API Calls',
};

const MODULE_LABELS: Record<string, string> = {
  crm: 'CRM',
  tracker: 'Tracker',
};

const MODULE_COLORS: Record<string, string> = {
  crm: '#6366f1',
  tracker: '#f59e0b',
};

function toNum(v: string | number): number {
  return typeof v === 'number' ? v : parseFloat(v);
}

function getPctColor(pct: number): string {
  if (pct > 100) return '#dc2626';
  if (pct >= 86) return '#ef4444';
  if (pct >= 61) return '#f59e0b';
  return '#22c55e';
}

interface NormalizedLimit {
  module: string;
  metric: string;
  limit_value: number;
  current_usage: number;
  has_capacity: boolean;
  label: string;
  pct: number;
  color: string;
}

function normalize(limits: PlanLimit[]): NormalizedLimit[] {
  return limits.map(l => {
    const lv = toNum(l.limit_value);
    const cu = toNum(l.current_usage);
    const pct = lv > 0 ? Math.min(120, Math.round((cu / lv) * 100)) : 0;
    return {
      module: l.module,
      metric: l.metric,
      limit_value: lv,
      current_usage: cu,
      has_capacity: Boolean(toNum(l.has_capacity)),
      label: METRIC_LABELS[l.metric] || l.metric,
      pct,
      color: getPctColor(pct),
    };
  });
}

export function PlanUsageWidget({ compact = true, planStatus: externalStatus, planName, onUpgrade }: PlanUsageWidgetProps) {
  const [fetchedStatus, setFetchedStatus] = useState<PlanLimit[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const planStatus = externalStatus ?? fetchedStatus;

  useEffect(() => {
    if (externalStatus) return;
    setLoading(true);
    api.get<any[]>('/api/tenant-users/plan-status')
      .then(data => setFetchedStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [externalStatus]);

  const normalized = useMemo(() => {
    if (!planStatus || planStatus.length === 0) return [];
    return normalize(planStatus);
  }, [planStatus]);

  const alerts = useMemo(() => normalized.filter(l => l.pct >= 80), [normalized]);

  const byModule = useMemo(() => {
    const map = new Map<string, NormalizedLimit[]>();
    normalized.forEach(l => {
      const arr = map.get(l.module) ?? [];
      arr.push(l);
      map.set(l.module, arr);
    });
    return map;
  }, [normalized]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--sys-surface)', color: 'var(--sys-text-muted)' }}>
        <Gauge size={14} />
        <span>Cargando...</span>
      </div>
    );
  }

  if (normalized.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--sys-surface)', color: 'var(--sys-text-muted)' }}>
        <Gauge size={14} />
        <span>{planName || 'Sin plan'}</span>
        <span className="ml-auto font-medium">∞</span>
      </div>
    );
  }

  if (compact) {
    if (alerts.length === 0) return null;

    return (
      <div className="flex flex-col gap-1">
        {alerts.map(l => (
          <button
            key={`${l.module}:${l.metric}`}
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all active:scale-[0.98]"
            style={{
              background: l.pct > 100 ? 'var(--sys-error-container)' : `${l.color}15`,
              color: l.color,
            }}
          >
            <AlertTriangle size={12} />
            <span className="font-medium">{l.label}</span>
            <span className="ml-auto tabular-nums font-semibold">{l.pct}%</span>
          </button>
        ))}
      </div>
    );
  }

  const bottleneck = normalized.reduce((worst, l) => l.pct > worst.pct ? l : worst, normalized[0]);

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-all active:scale-[0.98]"
        style={{ color: 'var(--sys-text)' }}
      >
        <Gauge size={14} style={{ color: bottleneck.color }} />
        <span className="font-semibold truncate" style={{ fontFamily: 'var(--font-montserrat, system-ui)' }}>
          {planName || 'Plan'}
        </span>
        <div className="flex-1 h-1.5 rounded-full mx-1" style={{ background: 'var(--sys-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, bottleneck.pct)}%`,
              background: bottleneck.color,
              boxShadow: bottleneck.pct >= 80 ? `0 0 8px ${bottleneck.color}` : 'none',
            }}
          />
        </div>
        <span className="font-medium tabular-nums" style={{ color: bottleneck.color }}>
          {bottleneck.pct}%
        </span>
        <ChevronUp
          size={14}
          className="transition-transform duration-300"
          style={{
            transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)',
            color: 'var(--sys-text-muted)',
          }}
        />
      </button>

      <div
        className="transition-all duration-300 overflow-hidden"
        style={{
          maxHeight: expanded ? '600px' : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="px-3 pb-3 pt-1 flex flex-col gap-3">
          {[...byModule.entries()].map(([mod, limits]) => (
            <div key={mod}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-3 h-3 rounded" style={{ background: MODULE_COLORS[mod] || 'var(--sys-primary)' }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>
                  {MODULE_LABELS[mod] || mod}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {limits.map(l => {
                  if (l.limit_value === 0) {
                    return (
                      <span key={l.metric} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium" style={{ background: 'var(--sys-border)', color: 'var(--sys-text-muted)' }}>
                        <Infinity size={10} />
                        {l.label}
                      </span>
                    );
                  }
                  return (
                    <span
                      key={l.metric}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium"
                      style={{
                        background: l.pct > 100 ? 'var(--sys-error-container)' : `${l.color}15`,
                        color: l.color,
                        border: `1px solid ${l.color}30`,
                      }}
                    >
                      {l.pct > 100 && <AlertTriangle size={10} />}
                      {l.label}: {l.current_usage}/{l.limit_value}
                      <span className="font-bold ml-0.5">({l.pct}%)</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}

          {onUpgrade && alerts.length > 0 && (
            <button
              onClick={onUpgrade}
              className="flex items-center justify-center gap-1.5 mt-1 py-1.5 rounded-md text-[11px] font-semibold transition-all active:scale-[0.97]"
              style={{
                background: 'var(--sys-primary-container)',
                color: 'var(--sys-on-primary)',
              }}
            >
              <AlertTriangle size={12} />
              Upgrade Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
