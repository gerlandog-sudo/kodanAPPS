import { useRef, useEffect } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { Trophy } from 'lucide-react'
import gsap from 'gsap'

interface SellerWinRate {
  id: number
  name: string
  avatar: string | null
  won: number
  lost: number
  winRate: number
  totalValue: number
}

interface WinRateBySellerWidgetProps {
  data: SellerWinRate[]
  formatCurrency: (val: number) => string
}

const RATE_GRADIENT = (rate: number) => {
  if (rate >= 70) return 'var(--sys-success)'
  if (rate >= 50) return '#eab308'
  return '#ef4444'
}

export function WinRateBySellerWidget({ data, formatCurrency }: WinRateBySellerWidgetProps) {
  const chartRef = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return
    gsap.fromTo(chartRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, delay: 0.2, ease: 'power2.out' })
  }, [data])

  if (data.length === 0) return null

  const chartData = [...data]
    .sort((a, b) => b.winRate - a.winRate)
    .map(d => ({ ...d, name: d.name.split(' ')[0] }))

  return (
    <div className="glass-panel p-6 flex flex-col gap-4" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="flex items-center gap-2">
        <Trophy size={16} style={{ color: 'var(--sys-primary)' }} />
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--sys-text-muted)' }}>Tasa de Cierre por Vendedor</h2>
      </div>

      <div ref={chartRef} className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--sys-text-muted)' }} tickFormatter={(v) => `${v}%`} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'var(--sys-text)', fontWeight: 600 }} width={60} />
              <Tooltip
              formatter={(_value: any, _name: any, props: any) => {
                const item = props.payload
                return [
                  `${item.winRate}% (${item.won} ganadas / ${item.lost + item.won} totales) — ${formatCurrency(item.totalValue)}`,
                  item.name
                ]
              }}
              contentStyle={{ background: 'var(--sys-surface-raised)', borderColor: 'var(--sys-border-soft)', borderRadius: '8px', fontSize: '10px' }}
            />
              <Bar dataKey="winRate" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={RATE_GRADIENT(entry.winRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        {data.map((d) => (
          <div key={d.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs" style={{ background: 'var(--sys-surface-hover)' }}>
            <span className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `color-mix(in srgb, ${RATE_GRADIENT(d.winRate)} 20%, transparent)`, color: RATE_GRADIENT(d.winRate) }}>
              {d.name.charAt(0).toUpperCase()}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold" style={{ color: 'var(--sys-text)' }}>{d.name}</span>
              <span className="text-[10px] font-bold tabular-nums" style={{ color: RATE_GRADIENT(d.winRate) }}>{d.winRate}% · {d.won}/{d.won + d.lost}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
