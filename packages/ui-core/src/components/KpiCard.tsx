import type { ReactNode } from 'react'
import { Card } from './Card'
import { useGsapCountUp } from '../hooks/useGsapCountUp'
import { ArrowUpRight } from 'lucide-react'

export interface KpiCardProps {
  label: string
  value: number
  /** Sufijo fijo (ej. 'h', '%'). Ignorado si formatCurrency es true. */
  suffix?: string
  /** Formatea el valor como moneda ARS con prefijo '$'. */
  formatCurrency?: boolean
  /** Decimales para formateo (0 por defecto). */
  decimalPlaces?: number
  /** Tendencia opcional mostrada en el frente (en vez de subtitle). */
  trend?: { value: string; positive: boolean } | null
  subtitle?: string
  icon: ReactNode
  iconBg: string
  iconColor: string
  backContent: ReactNode
  onDrillDown?: () => void
  className?: string
}

export function KpiCard({
  label,
  value,
  suffix = '',
  formatCurrency = false,
  decimalPlaces = 0,
  trend,
  subtitle,
  icon,
  iconBg,
  iconColor,
  backContent,
  onDrillDown,
  className = '',
}: KpiCardProps) {
  const prefix = formatCurrency ? '$' : ''
  const fmtOpts: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }
  const safeValue = Number.isFinite(value) ? value : 0
  const displayValue = (formatCurrency ? Math.round(safeValue) : safeValue).toLocaleString('es-AR', fmtOpts)

  const countRef = useGsapCountUp(safeValue, {
    duration: 0.8,
    prefix,
    suffix,
    decimalPlaces: formatCurrency ? decimalPlaces : 0,
    enabled: true,
  })

  return (
    <Card
      variant="flip"
      className={`h-full select-none ${className}`}
      front={
        <div className="p-4 flex flex-col justify-between h-full cursor-pointer bg-surface-raised hover:border-primary/20 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] font-bold tracking-wider uppercase truncate" style={{ color: 'var(--sys-text-muted)' }}>
                {label}
              </span>
              <span ref={countRef} className="text-2xl font-bold tracking-tight tabular-nums truncate">
                {prefix}{displayValue}{suffix}
              </span>
              {trend ? (
                <span className={`text-[10px] font-medium flex items-center gap-0.5 ${trend.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                  <ArrowUpRight size={10} className={trend.positive ? '' : 'rotate-180'} /> {trend.value}
                </span>
              ) : subtitle ? (
                <span className="text-[10px] truncate" style={{ color: 'var(--sys-text-muted)' }}>{subtitle}</span>
              ) : null}
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
            <span className="text-[9px] font-semibold opacity-60 tabular-nums shrink-0">{prefix}{displayValue}{suffix}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto text-[10px] text-text space-y-1.5 scrollbar-thin">
            {backContent}
          </div>
          {onDrillDown && (
            <button
              onClick={(e) => { e.stopPropagation(); onDrillDown() }}
              className="mt-2 flex items-center justify-center gap-1 w-full py-1 rounded text-[9px] font-bold cursor-pointer transition-all duration-150"
              style={{ background: 'var(--sys-surface-hover)', color: 'var(--sys-text)' }}
            >
              <ArrowUpRight size={10} /> Ver Detalle
            </button>
          )}
        </div>
      }
    />
  )
}
