import { useMemo } from 'react'
import { Table } from '@kodan-apps/ui-core'
import { ResponsiveContainer, RadialBarChart, RadialBar, Tooltip } from 'recharts'
import { FolderKanban, Briefcase } from 'lucide-react'

interface HotDealsWidgetProps {
  opportunities: any[]
  formatCurrency: (val: number) => string
}

export function HotDealsWidget({ opportunities, formatCurrency }: HotDealsWidgetProps) {
  const hotDeals = useMemo(() => {
    return opportunities
      .filter((o: any) => o.status === 'open')
      .sort((a: any, b: any) => (parseFloat(b.value) || 0) - (parseFloat(a.value) || 0))
      .slice(0, 5)
  }, [opportunities])

  const hotDealsTotalValue = useMemo(() => {
    return hotDeals.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0)
  }, [hotDeals])

  const hotDealsWeightedValue = useMemo(() => {
    return hotDeals.reduce((acc, curr) => {
      const val = parseFloat(curr.value) || 0
      const prob = parseFloat(curr.stage_probability) || 0
      return acc + (val * prob) / 100
    }, 0)
  }, [hotDeals])

  const pipelinePercentage = useMemo(() => {
    const total = opportunities
      .filter((o: any) => o.status === 'open')
      .reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0)
    return total > 0 ? (hotDealsTotalValue / total) * 100 : 0
  }, [hotDealsTotalValue, opportunities])

  const radialColors = [
    'var(--sys-primary)', 'var(--sys-tertiary)', 'var(--sys-success)',
    '#fbbf24', '#ec4899'
  ]

  const radialData = useMemo(() => {
    return [...hotDeals].reverse().map((deal, idx) => ({
      name: deal.title,
      value: parseFloat(deal.value) || 0,
      fill: radialColors[idx % radialColors.length],
    }))
  }, [hotDeals])

  return (
    <div className="glass-panel p-6 lg:col-span-2" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FolderKanban size={16} className="text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Negociaciones Calientes (Hot Deals)</h2>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'color-mix(in srgb, var(--sys-primary) 10%, transparent)', color: 'var(--sys-primary)' }}>
          Prioridad Alta
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-2">
          <Table
            data={hotDeals}
            columns={[
              { key: 'title', header: 'Oportunidad', render: (item: any) => <span className="font-semibold">{item.title}</span> },
              { key: 'stage_name', header: 'Fase', render: (item: any) => <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: 'var(--sys-surface-hover)', border: '1px solid var(--sys-border-soft)' }}>{item.stage_name}</span> },
              { key: 'value', header: 'Valor', render: (item: any) => <span className="font-bold text-primary">{formatCurrency(parseFloat(item.value) || 0)}</span>, align: 'right' as const }
            ]}
            keyExtractor={(item) => item.id}
            pageSize={5}
            emptyState={{
              icon: <Briefcase size={28} className="text-muted" />,
              title: 'Sin alertas',
              description: 'No hay negociaciones activas de alta prioridad.'
            }}
          />
        </div>

        <div className="flex flex-col gap-6 p-5 rounded-xl" style={{ background: 'var(--sys-surface-hover)', border: '1px solid var(--sys-border-soft)' }}>
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Análisis de Contribución</h3>
            <span className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>Distribución del valor de tratos prioritarios</span>
          </div>

          <div className="flex items-center justify-center relative" style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="100%" barSize={8} data={radialData}>
                <RadialBar
                  background={{ fill: 'color-mix(in srgb, var(--sys-border-soft) 30%, transparent)' }}
                  dataKey="value"
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Monto']}
                  contentStyle={{ background: 'var(--sys-surface-raised)', borderColor: 'var(--sys-border-soft)', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold', color: 'var(--sys-text)' }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] uppercase font-bold" style={{ color: 'var(--sys-text-muted)' }}>Total Hot</span>
              <span className="text-xs font-extrabold tracking-tight" style={{ color: 'var(--sys-text)' }}>{formatCurrency(hotDealsTotalValue)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--sys-border-soft)' }}>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--sys-text-muted)' }}>Valor Ponderado</span>
              <span className="text-xs font-bold text-primary">{formatCurrency(hotDealsWeightedValue)}</span>
              <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--sys-border-soft)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${hotDealsTotalValue ? Math.round((hotDealsWeightedValue / hotDealsTotalValue) * 100) : 0}%`, background: 'var(--sys-primary)' }} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--sys-text-muted)' }}>Concentración del Canal</span>
              <span className="text-xs font-bold" style={{ color: 'var(--sys-tertiary)' }}>{pipelinePercentage.toFixed(1)}%</span>
              <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--sys-border-soft)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pipelinePercentage)}%`, background: 'var(--sys-tertiary)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
