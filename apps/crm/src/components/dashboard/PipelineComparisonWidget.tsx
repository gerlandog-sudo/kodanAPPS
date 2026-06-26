import { useRef, useEffect } from 'react'
import { GitBranch } from 'lucide-react'
import gsap from 'gsap'

interface PipelineComparisonItem {
  id: number
  name: string
  totalValue: number
  activeDeals: number
  wonDeals: number
  winRate: number
  avgCycleDays: number
  color: string
}

interface PipelineComparisonWidgetProps {
  pipelines: PipelineComparisonItem[]
  formatCurrency: (val: number) => string
  onSelectPipeline?: (id: number) => void
}

export function PipelineComparisonWidget({ pipelines, formatCurrency, onSelectPipeline }: PipelineComparisonWidgetProps) {
  const tableRef = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    if (!tableRef.current || pipelines.length === 0) return
    const rows = tableRef.current.querySelectorAll('.pipeline-row')
    gsap.fromTo(rows, { opacity: 0, x: -8 }, { opacity: 1, x: 0, stagger: 0.05, duration: 0.3, ease: 'power2.out' })
  }, [pipelines])

  if (pipelines.length === 0) return null

  const maxValue = Math.max(...pipelines.map(p => p.totalValue), 1)

  return (
    <div className="glass-panel p-6 flex flex-col gap-4" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="flex items-center gap-2">
        <GitBranch size={16} style={{ color: 'var(--sys-primary)' }} />
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Comparativa de Canales</h2>
      </div>

      <div ref={tableRef} className="flex flex-col gap-2">
        <div className="flex items-center text-[9px] font-bold uppercase tracking-wider px-3 py-1.5" style={{ color: 'var(--sys-text-muted)' }}>
          <span className="w-1/3">Canal</span>
          <span className="w-1/6 text-right">Valor</span>
          <span className="w-1/6 text-right">Activos</span>
          <span className="w-1/6 text-right">Ganados</span>
          <span className="w-1/6 text-right">Win Rate</span>
        </div>

        {pipelines.map((p) => {
          const valueBarPct = (p.totalValue / maxValue) * 100
          return (
            <button
              key={p.id}
              onClick={() => onSelectPipeline?.(p.id)}
              className="pipeline-row flex flex-col gap-1.5 w-full text-left px-3 py-2.5 rounded-lg cursor-pointer border border-transparent transition-all duration-200 hover:border-border-soft hover:bg-surface-hover/30"
              style={{ background: 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-1/3 min-w-0">
                  <span className="size-2 rounded-full shrink-0" style={{ background: p.color || 'var(--sys-primary)' }} />
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--sys-text)' }}>{p.name}</span>
                </div>
                <span className="w-1/6 text-xs font-bold tabular-nums text-right" style={{ color: 'var(--sys-text)' }}>{formatCurrency(p.totalValue)}</span>
                <span className="w-1/6 text-xs font-semibold tabular-nums text-right" style={{ color: 'var(--sys-text-muted)' }}>{p.activeDeals}</span>
                <span className="w-1/6 text-xs font-semibold tabular-nums text-right" style={{ color: 'var(--sys-success)' }}>{p.wonDeals}</span>
                <span className="w-1/6 text-xs font-bold tabular-nums text-right" style={{ color: p.winRate >= 50 ? 'var(--sys-success)' : 'var(--sys-error)' }}>
                  {p.winRate}%
                </span>
              </div>
              <div className="w-full h-1 rounded-full" style={{ background: 'var(--sys-border-soft)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${valueBarPct}%`, background: p.color || 'var(--sys-primary)' }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
