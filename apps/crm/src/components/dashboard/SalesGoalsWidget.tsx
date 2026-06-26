import { useMemo, useRef, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import gsap from 'gsap'

interface SalesGoalsWidgetProps {
  wonValue: number
  wonDeals: number
  totalValue: number
  formatCurrency: (val: number) => string
}

export function SalesGoalsWidget({ wonValue, wonDeals, totalValue, formatCurrency }: SalesGoalsWidgetProps) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([])

  const salesGoals = useMemo(() => [
    { label: 'Ingresos Ganados', current: wonValue, target: 20000, isCurrency: true, color: 'var(--sys-success)' },
    { label: 'Cierres Exitosos', current: wonDeals, target: 5, isCurrency: false, color: 'var(--sys-primary)' },
    { label: 'Canal Activo', current: totalValue, target: 50000, isCurrency: true, color: 'var(--sys-tertiary)' },
  ], [wonValue, wonDeals, totalValue])

  useEffect(() => {
    barRefs.current.forEach((bar, i) => {
      if (!bar) return
      const pct = Math.min(100, Math.round((salesGoals[i].current / salesGoals[i].target) * 100))
      gsap.fromTo(bar, { width: '0%' }, { width: `${pct}%`, duration: 0.8, delay: i * 0.12, ease: 'power3.out' })
    })
  }, [salesGoals])

  return (
    <div className="glass-panel p-6 flex flex-col gap-4" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-amber-500" />
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Metas de Ventas</h2>
      </div>
      <div className="flex flex-col gap-4">
        {salesGoals.map((goal, i) => {
          const pct = Math.min(100, Math.round((goal.current / goal.target) * 100))
          return (
            <div key={goal.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-semibold" style={{ color: 'var(--sys-text)' }}>
                <span>{goal.label}</span>
                <span className="tabular-nums" style={{ color: 'var(--sys-text-muted)' }}>
                  {goal.isCurrency ? formatCurrency(goal.current) : goal.current} / {goal.isCurrency ? formatCurrency(goal.target) : goal.target}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--sys-border-soft)', overflow: 'hidden' }}>
                  <div
                    ref={(el) => { barRefs.current[i] = el }}
                    className="h-full rounded-full"
                    style={{
                      background: goal.color,
                      boxShadow: pct >= 80 ? `0 0 8px ${goal.color}` : 'none',
                    }}
                  />
                </div>
                <span className="text-xs font-bold tabular-nums" style={{ color: goal.color, minWidth: '2.5rem', textAlign: 'right' }}>
                  {pct}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
