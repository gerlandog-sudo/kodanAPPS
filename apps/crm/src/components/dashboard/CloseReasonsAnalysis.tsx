import { useRef, useEffect } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { BarChart3, CheckCircle, AlertTriangle, Briefcase } from 'lucide-react'
import gsap from 'gsap'

interface CloseReasonsAnalysisProps {
  wonReasons: { name: string; count: number; value: number }[]
  lostReasons: { name: string; count: number; value: number }[]
  summaryTable: { name: string; wonCount: number; wonValue: number; lostCount: number; lostValue: number }[]
  formatCurrency: (val: number) => string
}

const WON_COLORS = [
  'var(--sys-success)',
  'color-mix(in srgb, var(--sys-success) 70%, var(--sys-surface))',
  'color-mix(in srgb, var(--sys-success) 45%, var(--sys-surface))',
  'color-mix(in srgb, var(--sys-success) 25%, var(--sys-surface))',
  'var(--sys-text-muted)'
]

const LOST_COLORS = [
  'var(--sys-error)',
  'color-mix(in srgb, var(--sys-error) 70%, var(--sys-surface))',
  'color-mix(in srgb, var(--sys-error) 45%, var(--sys-surface))',
  'color-mix(in srgb, var(--sys-error) 25%, var(--sys-surface))',
  'var(--sys-text-muted)'
]

export function CloseReasonsAnalysis({ wonReasons, lostReasons, summaryTable, formatCurrency }: CloseReasonsAnalysisProps) {
  const sectionRef = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    if (!sectionRef.current) return
    gsap.fromTo(sectionRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.1 })
  }, [wonReasons, lostReasons])

  const hasNoData = wonReasons.length === 0 && lostReasons.length === 0

  return (
    <div className="glass-panel p-6" style={{ borderRadius: 'var(--radius-lg)' }} ref={sectionRef}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={18} style={{ color: 'var(--sys-primary)' }} />
        <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-montserrat)' }}>Análisis de Motivos de Cierre</h2>
      </div>
      {hasNoData ? (
        <div className="flex flex-col items-center justify-center h-80 text-center gap-2">
          <Briefcase className="text-3xl opacity-20 animate-pulse" style={{ color: 'var(--sys-text-muted)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>Sin motivos de cierre</span>
          <span className="text-[10px] px-4" style={{ color: 'var(--sys-text-muted)', opacity: 0.7 }}>
            No se han registrado motivos de ganada/pérdida para las negociaciones en este canal.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-6 h-80 overflow-y-auto pr-1 scrollbar-none">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--sys-success)' }}>
                <CheckCircle size={14} /> Éxito (Ganadas)
              </h3>
              {wonReasons.length === 0 ? (
                <div className="h-32 flex items-center justify-center">
                  <span className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>Sin datos</span>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={wonReasons} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={2}>
                          {wonReasons.map((_, i) => <Cell key={`won-${i}`} fill={WON_COLORS[i % WON_COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, _name: any, props: any) => [`${value} tratos (${formatCurrency(props.payload.value)})`, props.payload.name]}
                          contentStyle={{ background: 'var(--sys-surface-raised)', borderColor: 'var(--sys-border-soft)', borderRadius: '8px', fontSize: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1 w-full mt-2">
                    {wonReasons.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: WON_COLORS[i % WON_COLORS.length] }} />
                          <span className="truncate font-medium" style={{ color: 'var(--sys-text)' }} title={item.name}>{item.name}</span>
                        </div>
                        <span className="font-semibold shrink-0 ml-2" style={{ color: 'var(--sys-text-muted)' }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center">
              <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--sys-error)' }}>
                <AlertTriangle size={14} /> Pérdida (Perdidas)
              </h3>
              {lostReasons.length === 0 ? (
                <div className="h-32 flex items-center justify-center">
                  <span className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>Sin datos</span>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={lostReasons} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={2}>
                          {lostReasons.map((_, i) => <Cell key={`lost-${i}`} fill={LOST_COLORS[i % LOST_COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, _name: any, props: any) => [`${value} tratos (${formatCurrency(props.payload.value)})`, props.payload.name]}
                          contentStyle={{ background: 'var(--sys-surface-raised)', borderColor: 'var(--sys-border-soft)', borderRadius: '8px', fontSize: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1 w-full mt-2">
                    {lostReasons.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: LOST_COLORS[i % LOST_COLORS.length] }} />
                          <span className="truncate font-medium" style={{ color: 'var(--sys-text)' }} title={item.name}>{item.name}</span>
                        </div>
                        <span className="font-semibold shrink-0 ml-2" style={{ color: 'var(--sys-text-muted)' }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {summaryTable.length > 0 && (
            <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--sys-border-soft)' }}>
              <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--sys-text-muted)' }}>Resumen por Motivo de Cierre</h4>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[9px] font-bold border-b pb-1 mb-1" style={{ color: 'var(--sys-text-muted)', borderColor: 'var(--sys-border-soft)' }}>
                  <span className="w-1/2">Motivo / Patrón</span>
                  <span className="w-1/4 text-right" style={{ color: 'var(--sys-success)' }}>Ganadas</span>
                  <span className="w-1/4 text-right" style={{ color: 'var(--sys-error)' }}>Perdidas</span>
                </div>
                {summaryTable.map((row) => (
                  <div key={row.name} className="flex items-center justify-between text-[10px] py-1 border-b" style={{ borderColor: 'color-mix(in srgb, var(--sys-border-soft) 20%, transparent)' }}>
                    <span className="w-1/2 truncate font-medium" style={{ color: 'var(--sys-text)' }}>{row.name}</span>
                    <span className="w-1/4 text-right" style={{ color: 'var(--sys-text-muted)' }}>{row.wonCount} ({formatCurrency(row.wonValue)})</span>
                    <span className="w-1/4 text-right" style={{ color: 'var(--sys-text-muted)' }}>{row.lostCount} ({formatCurrency(row.lostValue)})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
