import { useRef, useEffect } from 'react'
import { Gauge, TrendingDown, TrendingUp, Layers, Target } from 'lucide-react'
import gsap from 'gsap'

interface SalesVelocityWidgetProps {
  avgDaysToClose: number
  avgStages: number
  conversionRate: number
  trend: number
}

export function SalesVelocityWidget({ avgDaysToClose, avgStages, conversionRate, trend }: SalesVelocityWidgetProps) {
  const gaugeRef = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    if (!gaugeRef.current) return
    const pct = Math.min(100, Math.max(0, (avgDaysToClose / 90) * 100))
    gsap.fromTo(gaugeRef.current, { width: '0%' }, { width: `${100 - pct}%`, duration: 1, ease: 'power3.out' })
  }, [avgDaysToClose])

  const gaugePercent = Math.min(100, Math.max(0, 100 - (avgDaysToClose / 90) * 100))
  const trendIsPositive = trend >= 0

  return (
    <div className="glass-panel p-6 flex flex-col gap-5" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="flex items-center gap-2">
        <Gauge size={16} style={{ color: 'var(--sys-tertiary)' }} />
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Sales Velocity</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative flex items-center justify-center shrink-0" style={{ width: 100, height: 100 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--sys-border-soft)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="var(--sys-tertiary)" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 42 * gaugePercent / 100} ${2 * Math.PI * 42}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
            <text x="50" y="48" textAnchor="middle" fill="var(--sys-text)" fontSize="16" fontWeight="bold">{avgDaysToClose}</text>
            <text x="50" y="62" textAnchor="middle" fill="var(--sys-text-muted)" fontSize="8">días</text>
          </svg>
        </div>

        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--sys-text)' }}>
              <Layers size={12} style={{ color: 'var(--sys-primary)' }} /> Etapas promedio
            </span>
            <span className="font-bold tabular-nums" style={{ color: 'var(--sys-text)' }}>{avgStages}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--sys-text)' }}>
              <Target size={12} style={{ color: 'var(--sys-success)' }} /> Tasa de conversión
            </span>
            <span className="font-bold tabular-nums" style={{ color: 'var(--sys-success)' }}>{conversionRate}%</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: 'var(--sys-border-soft)' }}>
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--sys-text)' }}>
              {trendIsPositive ? <TrendingUp size={12} className="text-emerald-500" /> : <TrendingDown size={12} className="text-red-500" />}
              Tendencia vs mes anterior
            </span>
            <span className={`font-bold tabular-nums ${trendIsPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {trendIsPositive ? '+' : ''}{trend}%
            </span>
          </div>
        </div>
      </div>

      <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--sys-border-soft)' }}>
        <div ref={gaugeRef} className="h-full rounded-full" style={{ background: 'var(--sys-tertiary)' }} />
      </div>
      <span className="text-[9px] font-medium" style={{ color: 'var(--sys-text-muted)' }}>
        Eficiencia del pipeline: {Math.round(gaugePercent)}% — menor tiempo de cierre = mayor velocidad
      </span>
    </div>
  )
}
