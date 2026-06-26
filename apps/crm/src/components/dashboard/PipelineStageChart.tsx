import { useRef, useEffect } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { BarChart3 } from 'lucide-react'
import gsap from 'gsap'

interface PipelineStageChartProps {
  data: { name: string; value: number; count: number }[]
  formatCurrency: (val: number) => string
}

export function PipelineStageChart({ data, formatCurrency }: PipelineStageChartProps) {
  const chartRef = useRef<HTMLDivElement>(null!)

  const chartData = data.length ? data : [
    { name: 'Contacto Inicial', value: 4000, count: 3 },
    { name: 'Calificación', value: 8000, count: 2 },
    { name: 'Propuesta', value: 15000, count: 4 },
    { name: 'Negociación', value: 25000, count: 2 },
  ]

  useEffect(() => {
    if (!chartRef.current) return
    gsap.fromTo(chartRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
  }, [data])

  return (
    <div className="glass-panel p-6" style={{ borderRadius: 'var(--radius-lg)' }} ref={chartRef}>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={18} style={{ color: 'var(--sys-primary)' }} />
        <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-montserrat)' }}>Valor de Negociaciones por Etapa</h2>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--sys-border-soft)" />
            <XAxis dataKey="name" stroke="var(--sys-text-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--sys-text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
            <Tooltip
              formatter={(value: any) => [formatCurrency(Number(value)), 'Valor Total']}
              contentStyle={{ background: 'var(--sys-surface-raised)', borderColor: 'var(--sys-border-soft)', borderRadius: '8px' }}
              labelStyle={{ fontWeight: 'bold', color: 'var(--sys-text)' }}
            />
            <Bar dataKey="value" fill="var(--sys-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
