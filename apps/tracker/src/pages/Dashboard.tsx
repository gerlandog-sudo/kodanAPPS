import { useEffect, useState } from 'react';
import { Card } from '@kodan-apps/ui-core';
import { trackerApi, DashboardKpis, HoursByDay, ProjectsByStatus, TopUser, TimeEntry } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FolderKanban, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { KpiCardAnimated } from '../components/KpiCardAnimated';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#6b7280'];

export function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [hoursByDay, setHoursByDay] = useState<HoursByDay[]>([]);
  const [projectsByStatus, setProjectsByStatus] = useState<ProjectsByStatus[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      trackerApi.getDashboardKpis(),
      trackerApi.getHoursByDay(),
      trackerApi.getProjectsByStatus(),
      trackerApi.getTopUsers(5),
      trackerApi.getRecentEntries(5),
    ]).then(([k, h, p, u, r]) => {
      setKpis(k);
      setHoursByDay(h);
      setProjectsByStatus(p);
      setTopUsers(u);
      setRecentEntries(r);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--sys-primary)' }} />
      </div>
    );
  }

  const statusLabel: Record<string, string> = { active: 'Activos', paused: 'Pausados', completed: 'Completados' };

  const fmtHours = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h % 1) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const totalByStatus = projectsByStatus.reduce((s, p) => s + p.count, 0);

  return (
    <div className="h-full overflow-y-auto pr-2 space-y-6 flex-1 min-h-0 flex flex-col pb-8">
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
        {kpis && (
          <>
            <KpiCardAnimated
              label="Proyectos activos"
              value={kpis.active_projects}
              icon={<FolderKanban size={18} />}
              iconBg="rgba(59, 130, 246, 0.1)"
              iconColor="#3b82f6"
              backContent={
                kpis.active_projects_details && kpis.active_projects_details.length > 0 ? (
                  <div className="space-y-1">
                    {kpis.active_projects_details.map((name, i) => (
                      <div key={i} className="flex items-center gap-1.5 py-0.5 truncate border-b border-border-soft/20 last:border-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="truncate opacity-80">{name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-text-muted italic">Sin proyectos activos</p>
                )
              }
            />

            <KpiCardAnimated
              label="Horas hoy"
              value={kpis.hours_today}
              suffix="h"
              icon={<Clock size={18} />}
              iconBg="rgba(34, 197, 94, 0.1)"
              iconColor="#22c55e"
              backContent={
                kpis.hours_today_details && kpis.hours_today_details.length > 0 ? (
                  <div className="space-y-1">
                    {kpis.hours_today_details.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-0.5 border-b border-border-soft/20 last:border-none">
                        <span className="truncate pr-2 opacity-80">{item.name}</span>
                        <span className="font-semibold shrink-0">{item.hours}h</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-text-muted italic">Sin registros hoy</p>
                )
              }
            />

            <KpiCardAnimated
              label="Horas esta semana"
              value={kpis.hours_week}
              suffix="h"
              icon={<Clock size={18} />}
              iconBg="rgba(139, 92, 246, 0.1)"
              iconColor="#8b5cf6"
              backContent={
                kpis.hours_week_details && kpis.hours_week_details.length > 0 ? (
                  <div className="space-y-1">
                    {kpis.hours_week_details.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-0.5 border-b border-border-soft/20 last:border-none">
                        <span className="truncate pr-2 opacity-80">{item.name}</span>
                        <span className="font-semibold shrink-0">{item.hours}h</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-text-muted italic">Sin registros esta semana</p>
                )
              }
            />

            <KpiCardAnimated
              label="Tareas abiertas"
              value={kpis.open_tasks}
              icon={<AlertTriangle size={18} />}
              iconBg="rgba(245, 158, 11, 0.1)"
              iconColor="#f59e0b"
              backContent={
                kpis.open_tasks_details && kpis.open_tasks_details.length > 0 ? (
                  <div className="space-y-1">
                    {kpis.open_tasks_details.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-0.5 border-b border-border-soft/20 last:border-none">
                        <span className="truncate pr-2 opacity-80">{item.name}</span>
                        <span className="font-semibold shrink-0">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-text-muted italic">Sin tareas abiertas</p>
                )
              }
            />

            <KpiCardAnimated
              label="Pendientes aprobar"
              value={kpis.pending_approvals}
              icon={<CheckCircle size={18} />}
              iconBg="rgba(239, 68, 68, 0.1)"
              iconColor="#ef4444"
              backContent={
                kpis.pending_approvals_details && kpis.pending_approvals_details.length > 0 ? (
                  <div className="space-y-1">
                    {kpis.pending_approvals_details.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-0.5 border-b border-border-soft/20 last:border-none">
                        <span className="truncate pr-2 opacity-80">{item.name}</span>
                        <span className="font-semibold shrink-0 text-error">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-text-muted italic">Todo al día</p>
                )
              }
            />
          </>
        )}
      </div>

      {/* Row 1: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
        <Card>
          <div className="p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--sys-text)' }}>Horas por día (últimos 30 días)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursByDay}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(v) => `Fecha: ${v}`}
                    formatter={(v: number) => [`${Math.floor(v)}h ${Math.round((v % 1) * 60)}m`, 'Horas']}
                  />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--sys-text)' }}>Proyectos por estado</h2>
            <div className="h-64 flex items-center justify-center">
              {totalByStatus === 0 ? (
                <span className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>Sin datos</span>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={projectsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                      {projectsByStatus.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number, n: string) => [v, statusLabel[n] || n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {projectsByStatus.map((p, i) => (
                <div key={p.status} className="flex items-center gap-1 text-xs" style={{ color: 'var(--sys-text-muted)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {statusLabel[p.status] || p.status}: {p.count}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
        <Card>
          <div className="p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--sys-text)' }}>Top usuarios (horas esta semana)</h2>
            {topUsers.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>Sin datos</p>
            ) : (
              <div className="space-y-4">
                {topUsers.map((u, i) => (
                  <div key={u.user_id} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#f59e0b' : 'var(--sys-text-muted)' }}>
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--sys-text)' }}>{u.user_name}</p>
                      <div className="h-2 rounded-full mt-1.5" style={{ background: 'var(--sys-border-soft)' }}>
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500" style={{
                          width: `${Math.min(100, (u.total_hours / (topUsers[0]?.total_hours || 1)) * 100)}%`,
                        }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: 'var(--sys-text)' }}>
                      {fmtHours(u.total_hours)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--sys-text)' }}>Entradas recientes</h2>
            {recentEntries.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>Sin datos</p>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--sys-border-soft)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--sys-text)' }}>{e.project_name}</p>
                      <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>
                        {e.user_name} · {new Date(e.date + 'T00:00:00').toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs font-bold ml-3 tabular-nums shrink-0" style={{ color: 'var(--sys-text)' }}>
                      {fmtHours(e.duration_minutes / 60)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
