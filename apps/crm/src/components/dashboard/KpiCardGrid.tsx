import { useMemo } from 'react'
import { DollarSign, Briefcase, TrendingUp, Users } from 'lucide-react'
import { KpiCard } from '@kodan-apps/ui-core'

interface KpiCardGridProps {
  stats: {
    totalValue: number
    activeDeals: number
    wonDeals: number
    wonValue: number
    totalAccounts: number
    avgDealSize: number
  }
  opportunities: any[]
  accounts: any[]
  onDrillDown: (type: 'pipeline' | 'active' | 'won' | 'accounts') => void
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val)
}

export function KpiCardGrid({ stats, opportunities, accounts, onDrillDown }: KpiCardGridProps) {
  const topDeals = useMemo(() => {
    return opportunities
      .filter((o: any) => o.status === 'open')
      .sort((a: any, b: any) => (parseFloat(b.value) || 0) - (parseFloat(a.value) || 0))
      .slice(0, 3)
  }, [opportunities])

  const won = useMemo(() => opportunities.filter((o: any) => o.status === 'won'), [opportunities])
  const lost = useMemo(() => opportunities.filter((o: any) => o.status === 'lost'), [opportunities])
  const totalClosed = won.length + lost.length
  const winRate = totalClosed > 0 ? Math.round((won.length / totalClosed) * 100) : 0

  const weightedValue = useMemo(() => {
    return opportunities
      .filter((o: any) => o.status === 'open')
      .reduce((a, c) => a + (parseFloat(c.value) || 0) * ((parseFloat(c.stage_probability) || 0) / 100), 0)
  }, [opportunities])

  const stageBreakdown = useMemo(() => {
    const stages: Record<string, number> = {}
    opportunities.filter((o: any) => o.status === 'open').forEach((o: any) => {
      const s = o.stage_name || 'Sin Etapa'
      stages[s] = (stages[s] || 0) + 1
    })
    const max = Math.max(...Object.values(stages), 1)
    return Object.entries(stages).map(([name, count]) => ({ name, count, pct: (count / max) * 100 }))
  }, [opportunities])

  const industryDist = useMemo(() => {
    const ind: Record<string, number> = {}
    accounts.forEach((a: any) => {
      const i = a.industry || 'Otra'
      ind[i] = (ind[i] || 0) + 1
    })
    const sorted = Object.entries(ind).sort((a, b) => b[1] - a[1]).slice(0, 4)
    const max = sorted.length > 0 ? Math.max(...sorted.map(([, c]) => c)) : 1
    return sorted.map(([name, count]) => ({ name, count, pct: (count / max) * 100 }))
  }, [accounts])

  const accountsWithDeals = useMemo(() => {
    const accountIds = new Set(opportunities.filter((o: any) => o.account_id).map((o: any) => o.account_id))
    return accountIds.size
  }, [opportunities])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <KpiCard
        label="Valor del Pipeline"
        value={stats.totalValue}
        formatCurrency
        trend={{ value: '+12.4% vs mes anterior', positive: true }}
        icon={<DollarSign size={20} />}
        iconBg="color-mix(in srgb, var(--sys-primary) 12%, transparent)"
        iconColor="var(--sys-primary)"
        onDrillDown={() => onDrillDown('pipeline')}
        backContent={
          <div className="flex flex-col gap-3 justify-center h-full">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px]" style={{ color: 'var(--sys-text-muted)' }}>Valor Ponderado</span>
              <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--sys-primary)' }}>
                {formatCurrency(weightedValue)}
              </span>
            </div>
            <div style={{ height: 1, background: 'var(--sys-border-soft)', opacity: 0.3 }} />
            <span className="text-[11px] font-semibold" style={{ color: 'var(--sys-text-muted)' }}>Top 3 deals activos</span>
            {topDeals.length === 0 ? (
              <span className="text-[11px]" style={{ color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Sin deals activos</span>
            ) : (
              <div className="flex flex-col gap-2">
                {topDeals.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="size-1.5 rounded-full shrink-0" style={{ background: 'var(--sys-primary)' }} />
                      <span className="truncate text-[11px] font-medium" style={{ color: 'var(--sys-text)' }}>{d.title}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--sys-primary)' }}>{formatCurrency(parseFloat(d.value) || 0)}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'var(--sys-surface-hover)', color: 'var(--sys-text-muted)' }}>{d.stage_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        }
      />

      <KpiCard
        label="Negociaciones Activas"
        value={stats.activeDeals}
        subtitle="En proceso de cierre"
        icon={<Briefcase size={20} />}
        iconBg="color-mix(in srgb, var(--sys-tertiary) 12%, transparent)"
        iconColor="var(--sys-tertiary)"
        onDrillDown={() => onDrillDown('active')}
        backContent={
          <div className="flex flex-col gap-3 justify-center h-full">
            <span className="text-[11px] font-semibold" style={{ color: 'var(--sys-text-muted)' }}>Distribución por etapa</span>
            {stageBreakdown.length === 0 ? (
              <span className="text-[11px]" style={{ color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Sin datos</span>
            ) : (
              <div className="flex flex-col gap-2">
                {stageBreakdown.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-20 truncate text-[11px]" style={{ color: 'var(--sys-text-muted)' }}>{s.name}</span>
                    <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--sys-border-soft)' }}>
                      <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: 'var(--sys-tertiary)' }} />
                    </div>
                    <span className="font-bold tabular-nums text-[11px] w-5 text-right" style={{ color: 'var(--sys-text)' }}>{s.count}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ height: 1, background: 'var(--sys-border-soft)', opacity: 0.3 }} />
            <div className="flex items-baseline justify-between">
              <span className="text-[11px]" style={{ color: 'var(--sys-text-muted)' }}>Ticket promedio</span>
              <span className="text-base font-bold tabular-nums" style={{ color: 'var(--sys-text)' }}>{formatCurrency(stats.avgDealSize)}</span>
            </div>
          </div>
        }
      />

      <KpiCard
        label="Negociaciones Ganadas"
        value={stats.wonDeals}
        subtitle="Proyectos activos creados"
        icon={<TrendingUp size={20} />}
        iconBg="color-mix(in srgb, var(--sys-success) 12%, transparent)"
        iconColor="var(--sys-success)"
        onDrillDown={() => onDrillDown('won')}
        backContent={
          <div className="flex flex-col gap-3 justify-center h-full">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px]" style={{ color: 'var(--sys-text-muted)' }}>Win Rate</span>
              <span className={`text-base font-bold tabular-nums ${winRate >= 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                {won.length}/{totalClosed} ({winRate}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ background: 'var(--sys-border-soft)' }}>
              <div className="h-full rounded-full" style={{ width: `${winRate}%`, background: 'var(--sys-success)' }} />
            </div>
            <div style={{ height: 1, background: 'var(--sys-border-soft)', opacity: 0.3 }} />
            <div className="flex items-baseline justify-between">
              <span className="text-[11px]" style={{ color: 'var(--sys-text-muted)' }}>Valor ganado</span>
              <span className="text-base font-bold tabular-nums" style={{ color: 'var(--sys-success)' }}>{formatCurrency(stats.wonValue)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px]" style={{ color: 'var(--sys-text-muted)' }}>Perdidas</span>
              <span className="text-base font-bold tabular-nums" style={{ color: 'var(--sys-error)' }}>{lost.length}</span>
            </div>
          </div>
        }
      />

      <KpiCard
        label="Cuentas Activas"
        value={stats.totalAccounts}
        subtitle="Clientes registrados"
        icon={<Users size={20} />}
        iconBg="color-mix(in srgb, var(--sys-primary) 12%, transparent)"
        iconColor="var(--sys-primary)"
        onDrillDown={() => onDrillDown('accounts')}
        backContent={
          <div className="flex flex-col gap-3 justify-center h-full">
            <span className="text-[11px] font-semibold" style={{ color: 'var(--sys-text-muted)' }}>Top industrias</span>
            {industryDist.length === 0 ? (
              <span className="text-[11px]" style={{ color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Sin datos</span>
            ) : (
              <div className="flex flex-col gap-2">
                {industryDist.map((ind) => (
                  <div key={ind.name} className="flex items-center gap-2">
                    <span className="w-20 truncate text-[11px]" style={{ color: 'var(--sys-text-muted)' }}>{ind.name}</span>
                    <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--sys-border-soft)' }}>
                      <div className="h-full rounded-full" style={{ width: `${ind.pct}%`, background: 'var(--sys-primary)' }} />
                    </div>
                    <span className="font-bold tabular-nums text-[11px]" style={{ color: 'var(--sys-text)' }}>{ind.count}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ height: 1, background: 'var(--sys-border-soft)', opacity: 0.3 }} />
            <div className="flex items-baseline justify-between">
              <span className="text-[11px]" style={{ color: 'var(--sys-text-muted)' }}>Con deals activos</span>
              <span className="text-base font-bold tabular-nums" style={{ color: 'var(--sys-text)' }}>{accountsWithDeals} / {stats.totalAccounts}</span>
            </div>
          </div>
        }
      />
    </div>
  )
}
