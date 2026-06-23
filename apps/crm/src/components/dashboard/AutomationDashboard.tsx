import { useEffect, useState } from 'react'
import { Card } from '@kodan-apps/ui-core'
import { crmApi } from '../../api/client'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { Workflow, Activity, CheckCircle, XCircle } from 'lucide-react'

interface WorkflowStats {
  rules: { total: number; active: number; inactive: number }
  executions: { total: number; today: number; this_week: number }
  by_status: { status: string; count: number }[]
  by_day: { date: string; count: number }[]
  top_events: { event: string; count: number }[]
  top_rules: { id: number; name: string; execution_count: number }[]
  recent_executions: any[]
}

const STATUS_COLORS: Record<string, string> = {
  success: '#10B981',
  partial: '#F59E0B',
  failed: '#EF4444',
}

const CHART_HEIGHT = 220

export function AutomationDashboard() {
  const [stats, setStats] = useState<WorkflowStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await crmApi.getWorkflowStats()
        setStats(data)
      } catch {
        // Silently fail — automation section is supplementary
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || !stats) return null
  if (stats.executions.total === 0 && stats.rules.total === 0) return null

  const successRate = stats.executions.total > 0
    ? Math.round((stats.by_status.find(s => s.status === 'success')?.count ?? 0) / stats.executions.total * 100)
    : 0

  const donutData = ['success', 'partial', 'failed']
    .map(s => ({ name: s, value: stats.by_status.find(b => b.status === s)?.count ?? 0 }))
    .filter(d => d.value > 0)

  const eventColors = ['#6366F1', '#8B5CF6', '#A78BFA', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#3B82F6', '#14B8A6', '#F97316']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Workflow size={16} style={{ color: 'var(--sys-primary)' }} />
        <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--sys-text)', margin: 0 }}>
          Automatización (Workflows)
        </h3>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="flip"
          front={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-text-muted)' }}>Reglas</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sys-text)' }}>{stats.rules.total}</span>
                <span style={{ fontSize: '10px', color: 'var(--sys-text-muted)' }}>
                  <span style={{ color: 'var(--sys-success)', fontWeight: 600 }}>{stats.rules.active} activas</span>
                  {' · '}
                  <span style={{ color: 'var(--sys-text-muted)', fontWeight: 600 }}>{stats.rules.inactive} inactivas</span>
                </span>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'color-mix(in srgb, var(--sys-primary) 10%, transparent)' }}>
                <Workflow size={18} style={{ color: 'var(--sys-primary)' }} />
              </div>
            </div>
          }
          back={
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '0.25rem' }}>
              <span style={{ fontSize: '10px', color: 'var(--sys-text-muted)' }}>Total reglas configuradas</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--sys-text)' }}>{stats.rules.active} activas de {stats.rules.total}</span>
            </div>
          }
        />

        <Card variant="flip"
          front={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-text-muted)' }}>Hoy</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sys-text)' }}>{stats.executions.today}</span>
                <span style={{ fontSize: '10px', color: 'var(--sys-text-muted)' }}>ejecuciones hoy</span>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'color-mix(in srgb, var(--sys-primary) 10%, transparent)' }}>
                <Activity size={18} style={{ color: 'var(--sys-primary)' }} />
              </div>
            </div>
          }
          back={
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '0.25rem' }}>
              <span style={{ fontSize: '10px', color: 'var(--sys-text-muted)' }}>vs. {stats.executions.this_week} esta semana</span>
            </div>
          }
        />

        <Card variant="flip"
          front={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-text-muted)' }}>Semana</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sys-text)' }}>{stats.executions.this_week}</span>
                <span style={{ fontSize: '10px', color: 'var(--sys-text-muted)' }}>ejecuciones esta semana</span>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'color-mix(in srgb, var(--sys-primary) 10%, transparent)' }}>
                <Activity size={18} style={{ color: 'var(--sys-primary)' }} />
              </div>
            </div>
          }
          back={
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '0.25rem' }}>
              <span style={{ fontSize: '10px', color: 'var(--sys-text-muted)' }}>Total acumulado</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sys-text)' }}>{stats.executions.total}</span>
            </div>
          }
        />

        <Card variant="flip"
          front={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-text-muted)' }}>Tasa de Éxito</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sys-success)' }}>{successRate}%</span>
                <span style={{ fontSize: '10px', color: 'var(--sys-text-muted)' }}>ejecuciones exitosas</span>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'color-mix(in srgb, var(--sys-success) 10%, transparent)' }}>
                <CheckCircle size={18} style={{ color: 'var(--sys-success)' }} />
              </div>
            </div>
          }
          back={
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '0.25rem' }}>
              {donutData.length > 0 && (
                <div style={{ width: '80%', height: 60 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={16} outerRadius={28} paddingAngle={2}>
                        {donutData.map(d => <Cell key={d.name} fill={STATUS_COLORS[d.name] || '#6B7280'} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '9px', fontWeight: 600 }}>
                {donutData.map(d => (
                  <span key={d.name} style={{ color: STATUS_COLORS[d.name] }}>
                    {d.name}: {d.value}
                  </span>
                ))}
              </div>
            </div>
          }
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut: Success Rate */}
        <div className="rounded-2xl border border-border-soft p-5" style={{ background: 'var(--sys-surface)' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-text-muted)', marginBottom: '0.75rem' }}>
            <CheckCircle size={12} style={{ display: 'inline', marginRight: '0.375rem' }} />
            Distribución por estado
          </h4>
          {donutData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3}>
                      {donutData.map(d => <Cell key={d.name} fill={STATUS_COLORS[d.name] || '#6B7280'} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [v, 'Ejecuciones']}
                      contentStyle={{ background: 'var(--sys-surface-raised)', borderColor: 'var(--sys-border-soft)', borderRadius: '8px', fontSize: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {donutData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '11px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[d.name] || '#6B7280' }} />
                    <span style={{ color: 'var(--sys-text-muted)', fontWeight: 600, textTransform: 'capitalize' }}>
                      {d.name === 'success' ? 'Exitosas' : d.name === 'partial' ? 'Parciales' : 'Fallidas'}
                    </span>
                    <span style={{ color: 'var(--sys-text)', fontWeight: 700, marginLeft: 'auto' }}>{d.value}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--sys-border-soft)', paddingTop: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                  <span style={{ color: 'var(--sys-text-muted)' }}>Total</span>
                  <span style={{ color: 'var(--sys-text)' }}>{stats.executions.total}</span>
                </div>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Sin datos suficientes</span>
          )}
        </div>

        {/* Timeline: Executions by Day */}
        <div className="rounded-2xl border border-border-soft p-5" style={{ background: 'var(--sys-surface)' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-text-muted)', marginBottom: '0.75rem' }}>
            <Activity size={12} style={{ display: 'inline', marginRight: '0.375rem' }} />
            Ejecuciones (últimos 30 días)
          </h4>
          {stats.by_day.length > 0 ? (
            <div style={{ height: CHART_HEIGHT }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.by_day} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--sys-border-soft)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--sys-text-muted)' }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'var(--sys-text-muted)' }} />
                  <Tooltip
                    labelFormatter={(v: string) => new Date(v).toLocaleDateString('es-AR')}
                    formatter={(v: any) => [v, 'Ejecuciones']}
                    contentStyle={{ background: 'var(--sys-surface-raised)', borderColor: 'var(--sys-border-soft)', borderRadius: '8px', fontSize: '10px' }}
                  />
                  <Bar dataKey="count" fill="var(--sys-primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Sin datos en los últimos 30 días</span>
          )}
        </div>

        {/* Top Events */}
        <div className="rounded-2xl border border-border-soft p-5" style={{ background: 'var(--sys-surface)' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-text-muted)', marginBottom: '0.75rem' }}>
            Eventos más disparados
          </h4>
          {stats.top_events.length > 0 ? (
            <div style={{ height: CHART_HEIGHT }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.top_events} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--sys-border-soft)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--sys-text-muted)' }} allowDecimals={false} />
                  <YAxis dataKey="event" type="category" tick={{ fontSize: 9, fill: 'var(--sys-text-muted)' }} width={130} tickFormatter={(v: string) => {
                    const labels: Record<string, string> = { stage_changed: 'Cambio etapa', created: 'Creación', won: 'Ganada', lost: 'Perdida', task_created: 'Tarea creada', task_completed: 'Tarea completa', assigned: 'Asignación', task_status_changed: 'Cambio estado tarea' }
                    return labels[v] || v
                  }} />
                  <Tooltip
                    formatter={(v: any) => [v, 'Ejecuciones']}
                    contentStyle={{ background: 'var(--sys-surface-raised)', borderColor: 'var(--sys-border-soft)', borderRadius: '8px', fontSize: '10px' }}
                  />
                  <Bar dataKey="count" fill="var(--sys-primary)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Sin eventos registrados</span>
          )}
        </div>

        {/* Top Rules */}
        <div className="rounded-2xl border border-border-soft p-5" style={{ background: 'var(--sys-surface)' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-text-muted)', marginBottom: '0.75rem' }}>
            Reglas con más ejecuciones
          </h4>
          {stats.top_rules.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {stats.top_rules.map((r, i) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', borderRadius: '0.375rem', background: i % 2 === 0 ? 'color-mix(in srgb, var(--sys-surface-hover) 30%, transparent)' : 'transparent' }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '9px', fontWeight: 800,
                    color: '#fff', background: eventColors[i % eventColors.length],
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: '11px', fontWeight: 600, color: 'var(--sys-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--sys-text-muted)', flexShrink: 0 }}>
                    {r.execution_count} ejec
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--sys-text-muted)', fontStyle: 'italic' }}>Sin ejecuciones registradas</span>
          )}
        </div>
      </div>

      {/* Recent Executions Feed */}
      {stats.recent_executions.length > 0 && (
        <div className="rounded-2xl border border-border-soft p-5" style={{ background: 'var(--sys-surface)' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sys-text-muted)', marginBottom: '0.75rem' }}>
            <Activity size={12} style={{ display: 'inline', marginRight: '0.375rem' }} />
            Últimas ejecuciones
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {stats.recent_executions.map((ex: any) => {
              const actions = typeof ex.executed_actions === 'string' ? JSON.parse(ex.executed_actions) : (ex.executed_actions || [])
              const okCount = actions.filter((a: any) => a.status === 'success').length
              const failCount = actions.filter((a: any) => a.status === 'failed').length
              const totalActions = actions.length
              return (
                <div key={ex.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.375rem 0.5rem', borderRadius: '0.375rem',
                  background: 'color-mix(in srgb, var(--sys-surface-hover) 20%, transparent)',
                  fontSize: '10px',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: STATUS_COLORS[ex.status] || '#6B7280' }} />
                  <span style={{ fontWeight: 700, color: 'var(--sys-text-muted)', flexShrink: 0 }}>#{ex.id}</span>
                  <span style={{ fontWeight: 600, color: 'var(--sys-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ex.rule_name}
                  </span>
                  <span style={{ color: 'var(--sys-text-muted)' }}>
                    {ex.trigger_entity === 'opportunity' ? 'Opp' : 'Tarea'} #{ex.trigger_entity_id}
                  </span>
                  <span style={{ color: 'var(--sys-text-muted)', flexShrink: 0 }}>
                    {totalActions > 0 ? `${okCount}/${totalActions} actions` : ''}
                  </span>
                  {failCount > 0 && <XCircle size={10} style={{ color: 'var(--sys-error)', flexShrink: 0 }} />}
                  <span style={{ color: 'var(--sys-text-muted)', flexShrink: 0 }}>
                    {new Date(ex.executed_at).toLocaleString('es-AR')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
