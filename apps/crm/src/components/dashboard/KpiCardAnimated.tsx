import { Card } from '@kodan-apps/ui-core'
import { useGsapCountUp } from '../../hooks/useGsapCountUp'
import { TrendingUp, ArrowUpRight } from 'lucide-react'

interface KpiCardAnimatedProps {
  label: string
  value: number
  formatCurrency?: boolean
  trend?: { value: string; positive: boolean } | null
  subtitle?: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  backContent: React.ReactNode
  onDrillDown?: () => void
}

export function KpiCardAnimated({
  label, value, formatCurrency, trend, subtitle, icon, iconBg, iconColor,
  backContent, onDrillDown
}: KpiCardAnimatedProps) {
  const prefix = formatCurrency ? '$' : ''
  const displayValue = formatCurrency
    ? Math.round(value).toLocaleString('es-AR')
    : value.toLocaleString('es-AR')

  const countRef = useGsapCountUp(value, {
    duration: 0.8,
    prefix,
    enabled: true
  })

  return (
    <Card
      variant="flip"
      front={
        <div className="p-5 flex flex-col justify-between h-full cursor-pointer" onClick={onDrillDown}>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--sys-text-muted)' }}>{label}</span>
              <span ref={countRef} className="text-2xl font-bold tracking-tight tabular-nums">{prefix}{displayValue}</span>
              {trend ? (
                <span className={`text-[10px] font-medium flex items-center gap-0.5 ${trend.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                  <TrendingUp size={10} className={trend.positive ? '' : 'rotate-180'} /> {trend.value}
                </span>
              ) : subtitle ? (
                <span className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>{subtitle}</span>
              ) : null}
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconColor }}>
              {icon}
            </div>
          </div>
        </div>
      }
      back={
        <div className="p-4 flex flex-col h-full" style={{ background: 'var(--sys-surface)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>{label}</span>
            <span className="text-[9px] font-semibold tabular-nums opacity-50">{prefix}{displayValue}</span>
          </div>
          <div className="flex-1 min-h-0">
            {backContent}
          </div>
          {onDrillDown && (
            <button
              onClick={onDrillDown}
              className="mt-3 flex items-center justify-center gap-1 w-full py-2 rounded-lg text-[10px] font-semibold cursor-pointer transition-all duration-150 hover:opacity-80"
              style={{ background: 'var(--sys-surface-hover)', color: 'var(--sys-text)' }}
            >
              <ArrowUpRight size={12} /> Ver Detalle
            </button>
          )}
        </div>
      }
    />
  )
}
