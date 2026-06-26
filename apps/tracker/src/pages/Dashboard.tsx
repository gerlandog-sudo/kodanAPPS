import { useEffect, useState } from 'react';
import { Card } from '@kodan-apps/ui-core';
import { trackerApi, DashboardKpis, HoursByDay, ProjectsByStatus, TopUser, TimeEntry } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FolderKanban, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--sys-primary)' }} />
      </div>
    );
  }

  const statusLabel: Record<string, string> = { active: 'Activos', paused: 'Pausados', completed: 'Completados' };

  const fmtHours = (h: number) => `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;
  const kpiCards = kpis ? [
    { label: 'Proyectos activos', value: kpis.active_projects, icon: <FolderKanban size={20} />, color: '#3b82f6' },
    { label: 'Horas hoy', value: fmtHours(kpis.hours_today), icon: <Clock size={20} />, color: '#22c55e' },
    { label: 'Horas esta semana', value: fmtHours(kpis.hours_week), icon: <Clock size={20} />, color: '#8b5cf6' },
    { label: 'Tareas abiertas', value: kpis.open_tasks, icon: <AlertTriangle size={20} />, color: '#f59e0b' },
    { label: 'Pendientes aprobar', value: kpis.pending_approvals, icon: <CheckCircle size={20} />, color: '#ef4444' },
  ] : [];

  const totalByStatus = projectsByStatus.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2" style={{ color: kpi.color }}>
                {kpi.icon}
                <span className="text-xs font-medium opacity-80">{kpi.label}</span>
              </div>
              <span className="text-2xl font-bold" style={{ color: 'var(--sys-text)' }}>{kpi.value}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--sys-text)' }}>Horas por día (últimos 30 días)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursByDay}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--sys-surface)', border: '1px solid var(--sys-border-soft)', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(v) => `Fecha: ${v}`}
                    formatter={(v: number) => [`${Math.floor(v / 60)}h ${v % 60}m`, 'Horas']}
                  />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--sys-text)' }}>Top usuarios (horas)</h2>
            {topUsers.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>Sin datos</p>
            ) : (
              <div className="space-y-3">
                {topUsers.map((u, i) => (
                  <div key={u.user_id} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-5" style={{ color: i === 0 ? '#f59e0b' : 'var(--sys-text-muted)' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--sys-text)' }}>{u.user_name}</p>
                      <div className="h-1.5 rounded-full mt-1" style={{ background: 'var(--sys-border-soft)' }}>
                        <div className="h-full rounded-full" style={{
                          width: `${Math.min(100, (u.total_hours / (topUsers[0]?.total_hours || 1)) * 100)}%`,
                          background: i === 0 ? '#3b82f6' : 'var(--sys-primary)',
                        }} />
                      </div>
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--sys-text)' }}>
                      {Math.floor(u.total_hours / 60)}h
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--sys-text)' }}>Entradas recientes</h2>
            {recentEntries.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>Sin datos</p>
            ) : (
              <div className="space-y-2">
                {recentEntries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--sys-border-soft)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate" style={{ color: 'var(--sys-text)' }}>{e.project_name}</p>
                      <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>{e.user_name} · {new Date(e.date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm font-medium ml-3" style={{ color: 'var(--sys-text)' }}>
                      {Math.floor(e.duration_minutes / 60)}h {e.duration_minutes % 60}m
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
