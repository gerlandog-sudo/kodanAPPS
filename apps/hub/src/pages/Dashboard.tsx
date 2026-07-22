import { useState, useEffect, useCallback } from 'react';
import { Card, KpiCard, Table, TableColumn } from '@kodan-apps/ui-core';
import { RefreshCw, Activity, Globe, Cpu, AlertTriangle, BarChart3 } from 'lucide-react';
import { hubAdminApi, HubStats } from '../api/client';

type AppGridItem = HubStats['apps_grid'][number];

export function Dashboard() {
  const [stats, setStats] = useState<HubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hubAdminApi.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const appsGridColumns: TableColumn<AppGridItem>[] = [
    { key: 'name', header: 'App', sortable: true, render: (item) => item.name },
    {
      key: 'app_tokens', header: 'Tokens', sortable: true, align: 'right',
      render: (item) => item.app_tokens.toLocaleString(),
    },
    {
      key: 'app_requests', header: 'Requests', sortable: true, align: 'right',
      render: (item) => item.app_requests.toLocaleString(),
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {error && (
        <Card className="p-4 shrink-0">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Top bar with refresh */}
      <div className="flex items-center justify-end shrink-0">
        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs leading-5 whitespace-nowrap cursor-pointer border border-border-soft bg-surface text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-white/5 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            </Card>
          ))
        ) : stats ? (
          <>
            <KpiCard
              label="Tokens Consumidos"
              value={stats.tokens}
              icon={<Activity size={20} />}
              iconBg="rgba(129, 255, 237, 0.1)"
              iconColor="#81ffed"
              backContent={
                <div className="text-center">
                  <p className="text-xs text-white/40">Total acumulado</p>
                  <p className="text-lg font-bold text-white">{stats.tokens.toLocaleString()}</p>
                </div>
              }
              subtitle="Desde el inicio"
            />
            <KpiCard
              label="Peticiones"
              value={stats.requests}
              icon={<Globe size={20} />}
              iconBg="rgba(99, 102, 241, 0.1)"
              iconColor="#6366f1"
              backContent={
                <div className="text-center">
                  <p className="text-xs text-white/40">Total peticiones</p>
                  <p className="text-lg font-bold text-white">{stats.requests.toLocaleString()}</p>
                </div>
              }
              subtitle="Desde el inicio"
            />
            <KpiCard
              label="Apps Activas"
              value={stats.apps_active}
              icon={<Cpu size={20} />}
              iconBg="rgba(52, 211, 153, 0.1)"
              iconColor="#34d399"
              backContent={
                <div className="text-center">
                  <p className="text-xs text-white/40">Apps registradas</p>
                  <p className="text-lg font-bold text-white">{stats.apps_grid.length}</p>
                </div>
              }
              subtitle="En el hub"
            />
            <KpiCard
              label="Errores (24h)"
              value={stats.errors}
              icon={<AlertTriangle size={20} />}
              iconBg={stats.errors > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(52, 211, 153, 0.1)'}
              iconColor={stats.errors > 0 ? '#ef4444' : '#34d399'}
              backContent={
                <div className="text-center">
                  <p className="text-xs text-white/40">Últimas 24h</p>
                  <p className={`text-lg font-bold ${stats.errors > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {stats.errors}
                  </p>
                </div>
              }
              subtitle="Últimas 24h"
            />
          </>
        ) : null}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--sys-on-bg)' }}>
            Tráfico de la Última Hora
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--sys-on-bg-muted)' }}>
            Peticiones en la última hora
          </p>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--sys-primary)' }}>
              {stats?.hour ?? '0'}
            </span>
            <span className="text-sm mb-1" style={{ color: 'var(--sys-on-bg-muted)' }}>requests/hora</span>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--sys-on-bg)' }}>
            Última Actualización
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--sys-on-bg-muted)' }}>
            Datos desde la base de datos HUB
          </p>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-400/80 animate-pulse" />
            <span className="text-sm" style={{ color: 'var(--sys-on-bg-muted)' }}>
              {stats ? new Date().toLocaleTimeString() : '—'}
            </span>
          </div>
        </Card>
      </div>

      {/* Top Apps Table */}
      <Card className="p-5 flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--sys-on-bg)' }}>
          Apps con Mayor Consumo
        </h3>
        <div className="flex-1 min-h-0">
          <Table
            columns={appsGridColumns}
            data={stats?.apps_grid ?? []}
            keyExtractor={(item) => item.id}
            loading={loading}
            maxHeight="100%"
            emptyState={{
              icon: <BarChart3 size={40} />,
              title: 'Sin datos',
              description: 'No hay apps registradas',
            }}
          />
        </div>
      </Card>
    </div>
  );
}
