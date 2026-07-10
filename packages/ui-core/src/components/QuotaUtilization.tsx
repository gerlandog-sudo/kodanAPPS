import { useState, useMemo } from 'react';
import { AlertTriangle, ChevronUp, Gauge, Infinity } from 'lucide-react';
import { useSidebar } from './Sidebar';

interface PlanLimit {
  module: string;
  metric: string;
  limit_value: number | string;
  current_usage: number | string;
  has_capacity: number | string;
}

interface QuotaUtilizationProps {
  planStatus?: PlanLimit[];
  planName?: string;
  onUpgrade?: () => void;
}

const METRIC_LABELS: Record<string, string> = {
  users_max: 'Usuarios',
  negotiations_max: 'Negociaciones',
  tasks_max: 'Tareas',
  api_calls_month: 'API Calls',
};

function toNum(v: string | number): number {
  return typeof v === 'string' ? parseFloat(v) : v;
}

interface NormalizedLimit {
  module: string;
  metric: string;
  limit_value: number;
  current_usage: number;
  has_capacity: boolean;
}

function normalize(limits: PlanLimit[]): NormalizedLimit[] {
  return limits.map(l => ({
    module: l.module,
    metric: l.metric,
    limit_value: toNum(l.limit_value),
    current_usage: toNum(l.current_usage),
    has_capacity: Boolean(toNum(l.has_capacity)),
  }));
}

function computeBottleneck(limits: NormalizedLimit[]): { limit: NormalizedLimit; ratio: number } | null {
  const withLimits = limits.filter(l => l.limit_value > 0);
  if (withLimits.length === 0) return null;

  let worst = withLimits[0];
  let worstRatio = worst.current_usage / worst.limit_value;

  for (let i = 1; i < withLimits.length; i++) {
    const ratio = withLimits[i].current_usage / withLimits[i].limit_value;
    if (ratio > worstRatio) {
      worst = withLimits[i];
      worstRatio = ratio;
    }
  }

  return { limit: worst, ratio: worstRatio };
}

function getBarColor(ratio: number): string {
  if (ratio >= 0.8) return 'var(--sys-error)';
  if (ratio >= 0.6) return '#f59e0b';
  return 'var(--sys-primary)';
}

export function QuotaUtilization({ planStatus, planName, onUpgrade }: QuotaUtilizationProps) {
  const [expanded, setExpanded] = useState(false);

  const normalized = useMemo(() => {
    if (!planStatus || planStatus.length === 0) return [];
    return normalize(planStatus);
  }, [planStatus]);

  const bottleneck = useMemo(() => {
    if (normalized.length === 0) return null;
    return computeBottleneck(normalized);
  }, [normalized]);

  const allUnlimited = normalized.length > 0 && normalized.every(l => l.limit_value === 0);

  const bottleneckPct = bottleneck ? Math.round(bottleneck.ratio * 100) : 0;
  const barColor = bottleneck ? getBarColor(bottleneck.ratio) : 'var(--sys-primary)';

  // Modo compacto (sidebar colapsado a solo-iconos): mostrar solo el % general.
  const { compact } = useSidebar();
  if (compact) {
    const pct = normalized.length === 0 || allUnlimited ? null : bottleneckPct;
    const color = pct == null ? 'var(--sys-primary)' : barColor;
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 py-2"
        title={planName || 'Plan'}
        style={{ color }}
      >
        <Gauge size={16} style={{ color }} />
        <span className="text-[11px] font-semibold tabular-nums">{pct == null ? '∞' : `${pct}%`}</span>
      </div>
    );
  }

  if (normalized.length === 0) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
        style={{ background: 'var(--sys-surface)', color: 'var(--sys-text-muted)' }}
      >
        <Gauge size={14} />
        <span>{planName || 'Sin plan'}</span>
        <span className="ml-auto font-medium">∞</span>
      </div>
    );
  }

  if (allUnlimited) {
    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)' }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-all active:scale-[0.98]"
          style={{ color: 'var(--sys-text)' }}
        >
          <Infinity size={14} style={{ color: 'var(--sys-primary)' }} />
          <span className="font-semibold truncate" style={{ fontFamily: 'var(--font-montserrat, system-ui)' }}>
            {planName || 'Ilimitado'}
          </span>
          <span className="ml-auto font-medium" style={{ color: 'var(--sys-text-muted)' }}>∞</span>
          <ChevronUp
            size={14}
            className="transition-transform duration-300"
            style={{
              transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)',
              color: 'var(--sys-text-muted)',
              transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          />
        </button>
        <div
          className="transition-all duration-300 overflow-hidden"
          style={{
            maxHeight: expanded ? '400px' : '0px',
            opacity: expanded ? 1 : 0,
            transition: 'max-height 350ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <div className="px-3 pb-3 pt-1 flex flex-col gap-1">
            {normalized.map(l => (
              <div key={l.metric} className="flex justify-between text-[11px]" style={{ color: 'var(--sys-text-muted)' }}>
                <span>{METRIC_LABELS[l.metric] || l.metric}</span>
                <span className="font-medium">∞</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-all active:scale-[0.98]"
        style={{ color: 'var(--sys-text)' }}
      >
        <Gauge size={14} style={{ color: barColor }} />
        <span className="font-semibold truncate" style={{ fontFamily: 'var(--font-montserrat, system-ui)' }}>
          {planName || 'Plan'}
        </span>
        <div className="flex-1 h-1.5 rounded-full mx-1" style={{ background: 'var(--sys-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${bottleneckPct}%`,
              background: barColor,
              boxShadow: bottleneck && bottleneck.ratio >= 0.8 ? `0 0 8px ${barColor}` : 'none',
            }}
          />
        </div>
        <span className="font-medium tabular-nums" style={{ color: barColor }}>
          {bottleneckPct}%
        </span>
        <ChevronUp
          size={14}
          className="transition-transform duration-300"
          style={{
            transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)',
            color: 'var(--sys-text-muted)',
            transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        />
      </button>

      <div
        className="transition-all duration-300 overflow-hidden"
        style={{
          maxHeight: expanded ? '400px' : '0px',
          opacity: expanded ? 1 : 0,
          transition: 'max-height 350ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="px-3 pb-3 pt-1 flex flex-col gap-2">
          {normalized.map((limit) => {
            if (limit.limit_value === 0) return null;
            const ratio = limit.current_usage / limit.limit_value;
            const pct = Math.min(100, Math.round(ratio * 100));
            const color = getBarColor(ratio);
            return (
              <div key={limit.metric} className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[11px]" style={{ color: 'var(--sys-text-muted)' }}>
                  <span>{METRIC_LABELS[limit.metric] || limit.metric}</span>
                  <span className="tabular-nums">{limit.current_usage}/{limit.limit_value}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--sys-border)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}

          {onUpgrade && bottleneck && bottleneck.ratio >= 0.8 && (
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
