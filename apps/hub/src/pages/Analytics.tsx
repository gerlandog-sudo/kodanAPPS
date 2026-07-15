import { useState, useEffect, useCallback } from 'react';
import { Card, KpiCard, Table, Button, Select, DatePicker } from '@kodan-apps/ui-core';
import type { SelectOption, TableColumn } from '@kodan-apps/ui-core';
import { RefreshCw, AlertTriangle, Activity, Globe, Timer, TrendingUp } from 'lucide-react';
import { hubAdminApi, ConsumptionStats, LogEntry } from '../api/client';

export function Analytics() {
  const [stats, setStats] = useState<ConsumptionStats | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appFilter, setAppFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const limit = 20;

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (appFilter !== 'all') params.app_id = appFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await hubAdminApi.getConsumption(params);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, [page, appFilter, dateFrom, dateTo]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const handleReset = () => {
    setAppFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const consumptionColumns: TableColumn<LogEntry>[] = [
    { key: 'timestamp', header: 'Fecha', render: (item) => item.timestamp ? new Date(item.timestamp).toLocaleString() : '—' },
    { key: 'app_name', header: 'App', render: (item) => item.app_name, sortable: true },
    { key: 'model', header: 'Modelo', render: (item) => item.model, sortable: true },
    { key: 'tokens_in', header: 'Tokens In', render: (item) => item.tokens_in?.toLocaleString() ?? '0' },
    { key: 'tokens_out', header: 'Tokens Out', render: (item) => item.tokens_out?.toLocaleString() ?? '0' },
    {
      key: 'status',
      header: 'Estado',
      render: (item) => (
        <span className={`inline-flex items-center gap-1.5 text-xs ${
          item.status === 'success' ? 'text-emerald-400' :
          item.status === 'error' ? 'text-red-400' : 'text-amber-400'
        }`}>
          <span className={`size-1.5 rounded-full ${
            item.status === 'success' ? 'bg-emerald-400' :
            item.status === 'error' ? 'bg-red-400' : 'bg-amber-400'
          }`} />
          {item.status}
        </span>
      ),
    },
    { key: 'latency', header: 'Latencia (ms)', render: (item) => item.latency ? `${item.latency}ms` : '—' },
  ];

  const appFilterOptions: SelectOption[] = [
    { value: 'all', label: 'Todas las apps' },
  ];

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--sys-on-bg)' }}>Estadísticas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sys-on-bg-muted)' }}>
            Consumo detallado del Hub de IA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleReset}>
            Resetear Filtros
          </Button>
          <Button variant="secondary" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* KPI Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Tokens"
          value={Number(stats?.totals?.tokens ?? 0)}
          icon={<Activity size={20} />}
          iconBg="rgba(129, 255, 237, 0.1)"
          iconColor="#81ffed"
          backContent={<div className="text-sm">Resumen de tokens utilizados en el período</div>}
        />
        <KpiCard
          label="Total Requests"
          value={Number(stats?.totals?.requests ?? 0)}
          icon={<Globe size={20} />}
          iconBg="rgba(99, 102, 241, 0.1)"
          iconColor="#818cf8"
          backContent={<div className="text-sm">Total de solicitudes procesadas</div>}
        />
        <KpiCard
          label="Latencia Promedio"
          value={Number(stats?.totals?.latency ?? 0)}
          suffix="ms"
          icon={<Timer size={20} />}
          iconBg="rgba(251, 191, 36, 0.1)"
          iconColor="#fbbf24"
          backContent={<div className="text-sm">Tiempo de respuesta promedio</div>}
        />
        <KpiCard
          label="Eficiencia"
          value={Number(stats?.totals?.efficiency ?? 0)}
          icon={<TrendingUp size={20} />}
          iconBg="rgba(52, 211, 153, 0.1)"
          iconColor="#34d399"
          backContent={<div className="text-sm">Relación de eficiencia del sistema</div>}
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-on-bg-muted)' }}>
              Aplicación
            </label>
            <Select
              options={appFilterOptions}
              value={appFilter}
              onChange={(v) => { setAppFilter(v as string); setPage(1); }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-on-bg-muted)' }}>
              Desde
            </label>
            <DatePicker
              value={dateFrom}
              onChange={(v) => { setDateFrom(v); setPage(1); }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-on-bg-muted)' }}>
              Hasta
            </label>
            <DatePicker
              value={dateTo}
              onChange={(v) => { setDateTo(v); setPage(1); }}
            />
          </div>
        </div>
      </Card>

      {/* Consumption Table */}
      <Card className="p-4 flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--sys-on-bg)' }}>
          Consumo Detallado
        </h3>
        <div className="flex-1 min-h-0">
          <Table
            columns={consumptionColumns}
            data={stats?.data ?? []}
            keyExtractor={(e) => e.id}
            loading={loading}
            emptyState={{
              icon: <Activity size={32} />,
              title: 'Sin datos',
              description: 'No hay datos de consumo registrados',
            }}
            currentPage={page}
            pageSize={limit}
            totalRecords={stats?.total ?? 0}
            onPageChange={setPage}
          />
        </div>
      </Card>
    </div>
  );
}
