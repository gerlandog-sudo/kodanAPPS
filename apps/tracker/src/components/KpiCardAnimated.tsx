import { Card } from '@kodan-apps/ui-core';
import { useGsapCountUp } from '../hooks/useGsapCountUp';
import { ArrowUpRight } from 'lucide-react';
import React from 'react';

interface KpiCardAnimatedProps {
  label: string;
  value: number;
  suffix?: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  backContent: React.ReactNode;
  onDrillDown?: () => void;
}

export function KpiCardAnimated({
  label,
  value,
  suffix = '',
  subtitle,
  icon,
  iconBg,
  iconColor,
  backContent,
  onDrillDown,
}: KpiCardAnimatedProps) {
  const countRef = useGsapCountUp(value, {
    duration: 0.8,
    suffix,
    enabled: true,
  });

  return (
    <Card
      variant="flip"
      className="h-[125px] select-none"
      front={
        <div className="p-4 flex flex-col justify-between h-full cursor-pointer bg-surface-raised hover:border-primary/20 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] font-bold tracking-wider uppercase truncate" style={{ color: 'var(--sys-text-muted)' }}>
                {label}
              </span>
              <span ref={countRef} className="text-2xl font-bold tracking-tight tabular-nums truncate">
                {value.toLocaleString('es-AR')}{suffix}
              </span>
              {subtitle && (
                <span className="text-[10px] truncate" style={{ color: 'var(--sys-text-muted)' }}>
                  {subtitle}
                </span>
              )}
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconColor }}>
              {icon}
            </div>
          </div>
        </div>
      }
      back={
        <div className="p-3.5 flex flex-col h-full bg-surface-raised" style={{ border: '1px solid var(--sys-border-soft)', borderRadius: 'inherit' }}>
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-border-soft/60">
            <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted truncate">{label}</span>
            <span className="text-[9px] font-semibold opacity-60 tabular-nums shrink-0">{value.toLocaleString('es-AR')}{suffix}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto text-[10px] text-text space-y-1.5 scrollbar-thin">
            {backContent}
          </div>
          {onDrillDown && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDrillDown();
              }}
              className="mt-2 flex items-center justify-center gap-1 w-full py-1 rounded text-[9px] font-bold cursor-pointer transition-all duration-150"
              style={{ background: 'var(--sys-surface-hover)', color: 'var(--sys-text)' }}
            >
              <ArrowUpRight size={10} /> Detalle
            </button>
          )}
        </div>
      }
    />
  );
}
