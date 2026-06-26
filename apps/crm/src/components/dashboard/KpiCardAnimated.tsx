import { Card } from '@kodan-apps/ui-core'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import { useGsapCountUp } from '../../hooks/useGsapCountUp'
import { TrendingUp } from 'lucide-react'

interface KpiCardAnimatedProps {
  label: string
  value: number
  formatCurrency?: boolean
  trend?: { value: string; positive: boolean } | null
  subtitle?: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  sparklineColor: string
  sparklineData: { value: number }[]
  backContent: React.ReactNode
  onDrillDown?: () => void
}

export function KpiCardAnimated({
  label, value, formatCurrency, trend, subtitle, icon, iconBg, iconColor,
  sparklineColor, sparklineData, backContent, onDrillDown
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
        <div className="p-4 flex flex-col justify-between h-full gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>{label}</span>
            <span className="text-[9px] font-semibold tabular-nums" style={{ color: 'var(--sys-text)', opacity: 0.7 }}>{prefix}{displayValue}</span>
          </div>
          <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
            {backContent}
          </div>
          <div className="flex items-center justify-between mt-auto pt-1">
            <div className="h-10 w-24 opacity-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area type="monotone" dataKey="value" stroke={sparklineColor} strokeWidth={1} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {onDrillDown && (
              <button
                onClick={onDrillDown}
                className="bg-surface-raised border border-border-soft rounded px-2.5 py-1 text-[10px] text-text-muted font-medium cursor-pointer hover:bg-surface-hover transition-colors"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                Ver Detalle
              </button>
            )}
          </div>
        </div>
      }
    />
  )
}
