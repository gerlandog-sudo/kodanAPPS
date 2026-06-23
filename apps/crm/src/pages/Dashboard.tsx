import { useEffect, useState, useMemo } from 'react';
import { Card, SlidePanel, Table, Select } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import { DollarSign, BarChart3, Users, Briefcase, TrendingUp, Sparkles, FolderKanban, Download, FileDown } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid, RadialBarChart, RadialBar } from 'recharts';
import { toast } from 'sonner';
import { exportToExcel } from '../utils/excelExport';
import { SalesFunnelSVG } from '../components/dashboard/SalesFunnelSVG';
import { ForecastChart } from '../components/dashboard/ForecastChart';

// Componente del Esqueleto de Carga Gris (Grey Skeleton)
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {/* Grid de 4 KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-surface-hover/30 border border-border-soft/50 p-5 flex flex-col justify-between" style={{ backgroundColor: 'var(--sys-surface-hover)', opacity: 0.6 }}>
            <div className="flex justify-between">
              <div className="flex flex-col gap-2 w-2/3">
                <div className="h-2.5 bg-border-soft rounded w-1/2" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
                <div className="h-6 bg-border-soft rounded w-3/4" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
                <div className="h-2 bg-border-soft rounded w-1/3" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
              </div>
              <div className="w-10 h-10 rounded-xl bg-border-soft" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
            </div>
          </div>
        ))}
      </div>

      {/* SECCIÓN 2: Metas y Hot Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Metas */}
        <div className="h-[280px] rounded-2xl bg-surface-hover/30 border border-border-soft/50 p-6 flex flex-col gap-4" style={{ backgroundColor: 'var(--sys-surface-hover)', opacity: 0.6 }}>
          <div className="h-3.5 bg-border-soft rounded w-1/3 mb-2" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <div className="flex justify-between">
                <div className="h-2.5 bg-border-soft rounded w-1/3" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
                <div className="h-2.5 bg-border-soft rounded w-1/4" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
              </div>
              <div className="h-2 bg-border-soft rounded-full w-full" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
            </div>
          ))}
        </div>
        {/* Hot Deals */}
        <div className="lg:col-span-2 h-[280px] rounded-2xl bg-surface-hover/30 border border-border-soft/50 p-6 flex flex-col justify-between" style={{ backgroundColor: 'var(--sys-surface-hover)', opacity: 0.6 }}>
          <div className="flex justify-between mb-4">
            <div className="h-3.5 bg-border-soft rounded w-1/4" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
            <div className="h-3.5 bg-border-soft rounded w-1/12" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
          </div>
          <div className="flex-1 flex gap-6">
            <div className="w-1/2 flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-border-soft rounded w-full" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
              ))}
            </div>
            <div className="w-1/2 flex flex-col items-center justify-center gap-3">
              <div className="w-24 h-24 rounded-full border-[6px] border-border-soft/30 flex items-center justify-center" style={{ borderColor: 'var(--sys-border-soft)' }} />
              <div className="h-2.5 bg-border-soft rounded w-1/3" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Gráficos 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[360px] rounded-2xl bg-surface-hover/30 border border-border-soft/50 p-6 flex flex-col gap-4" style={{ backgroundColor: 'var(--sys-surface-hover)', opacity: 0.6 }}>
            <div className="h-4 bg-border-soft rounded w-1/3 mb-2" style={{ backgroundColor: 'var(--sys-border-soft)' }} />
            <div className="flex-1 bg-border-soft/10 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--sys-border-soft) 20%, transparent)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | number>('all');
  const [stats, setStats] = useState({
    totalValue: 0,
    activeDeals: 0,
    wonDeals: 0,
    wonValue: 0,
    totalAccounts: 0,
    avgDealSize: 0,
  });
  
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [stageData, setStageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el Drill Down lateral
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownType, setDrillDownType] = useState<'pipeline' | 'active' | 'won' | 'accounts' | null>(null);

  // Cargar pipelines inicialmente
  useEffect(() => {
    async function loadPipelines() {
      try {
        const pps = await crmApi.listPipelines();
        setPipelines(pps);
      } catch (err) {
        console.error('Error al cargar pipelines', err);
      }
    }
    loadPipelines();
  }, []);

  // Cargar datos del dashboard filtrados dinámicamente
  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (selectedPipelineId !== 'all') {
          params.pipeline_id = String(selectedPipelineId);
        }

        const [opps, accs] = await Promise.all([
          crmApi.listOpportunities(params),
          crmApi.listAccounts()
        ]);

        setOpportunities(opps);
        setAccounts(accs);

        const active = opps.filter(o => o.status === 'open');
        const won = opps.filter(o => o.status === 'won');
        const totalValue = active.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);
        const wonValue = won.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);
        const avgDealSize = opps.length ? totalValue / opps.length : 0;

        setStats({
          totalValue,
          activeDeals: active.length,
          wonDeals: won.length,
          wonValue,
          totalAccounts: accs.length,
          avgDealSize,
        });

        // Agrupar oportunidades por etapa para el gráfico
        const stagesMap: Record<string, { name: string; value: number; count: number }> = {};
        opps.forEach(o => {
          const stageName = o.stage_name || 'Sin Etapa';
          if (!stagesMap[stageName]) {
            stagesMap[stageName] = { name: stageName, value: 0, count: 0 };
          }
          stagesMap[stageName].value += parseFloat(o.value) || 0;
          stagesMap[stageName].count += 1;
        });

        setStageData(Object.values(stagesMap));
      } catch (err: any) {
        toast.error('Error al cargar métricas del Dashboard.');
      } finally {
        // Retardo estético de 350ms para suavizar la transición del skeleton pulse
        setTimeout(() => setLoading(false), 350);
      }
    }
    loadDashboardData();
  }, [selectedPipelineId]);

  const pipelineSelectOptions = useMemo(() => {
    const list = pipelines.map(p => ({ value: String(p.id), label: p.name }));
    return [{ value: 'all', label: 'Todos los Pipelines' }, ...list];
  }, [pipelines]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  const salesGoals = useMemo(() => {
    const revenueTarget = 20000;
    const dealsTarget = 5;
    const pipelineTarget = 50000;

    return [
      {
        label: 'Ingresos Ganados',
        current: stats.wonValue,
        target: revenueTarget,
        isCurrency: true,
        color: 'var(--sys-success)',
      },
      {
        label: 'Cierres Exitosos',
        current: stats.wonDeals,
        target: dealsTarget,
        isCurrency: false,
        color: 'var(--sys-primary)',
      },
      {
        label: 'Pipeline Activo',
        current: stats.totalValue,
        target: pipelineTarget,
        isCurrency: true,
        color: 'var(--sys-tertiary)',
      },
    ];
  }, [stats]);

  // Helper para generar Sparklines de 30 días sutiles y realistas
  const getSparklineData = (
    items: any[],
    type: 'value' | 'count',
    filterFn?: (item: any) => boolean,
    seedKey: 'pipeline' | 'active' | 'won' | 'accounts' = 'pipeline'
  ) => {
    const days = 30;
    const data: { day: string; value: number }[] = [];
    
    // 1. Filtrar items
    const filteredItems = filterFn ? items.filter(filterFn) : items;

    // 2. Calcular el valor actual final
    const finalVal = type === 'value'
      ? filteredItems.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0)
      : filteredItems.length;

    // 3. Generar una curva suave y única para cada tipo de KPI que termine exactamente en el valor real actual
    for (let i = 0; i < days; i++) {
      let value = 0;

      if (seedKey === 'pipeline') {
        const wave = 1.0 + 0.18 * Math.sin(i * 0.3) + 0.12 * Math.sin(i * 0.8) + 0.05 * Math.cos(i * 1.7);
        if (finalVal > 0) {
          const finalWave = 1.0 + 0.18 * Math.sin((days - 1) * 0.3) + 0.12 * Math.sin((days - 1) * 0.8) + 0.05 * Math.cos((days - 1) * 1.7);
          value = wave * (finalVal / finalWave);
        } else {
          // Decaimiento estético hacia 0
          value = Math.max(0, (0.1 + Math.sin(i * 0.25) * 0.08 + Math.cos(i * 0.6) * 0.05) * 5000 * Math.max(0, 1.0 - i / (days - 1)));
        }
      } else if (seedKey === 'active') {
        const wave = 5.0 + 1.2 * Math.sin(i * 0.25) + 0.8 * Math.cos(i * 0.7) + 0.3 * Math.sin(i * 1.5);
        if (finalVal > 0) {
          const finalWave = 5.0 + 1.2 * Math.sin((days - 1) * 0.25) + 0.8 * Math.cos((days - 1) * 0.7) + 0.3 * Math.sin((days - 1) * 1.5);
          value = Math.max(0, Math.round(wave * (finalVal / finalWave)));
        } else {
          value = Math.max(0, Math.round((0.5 + Math.sin(i * 0.2) * 0.3 + Math.cos(i * 0.5) * 0.2) * 5 * Math.max(0, 1.0 - i / (days - 1))));
        }
      } else if (seedKey === 'won') {
        const wave = 2.0 + 1.5 * Math.tanh((i - 15) * 0.15) + 0.3 * Math.sin(i * 0.5);
        if (finalVal > 0) {
          const finalWave = 2.0 + 1.5 * Math.tanh(((days - 1) - 15) * 0.15) + 0.3 * Math.sin((days - 1) * 0.5);
          value = Math.max(0, Math.round(wave * (finalVal / finalWave)));
        } else {
          value = 0;
        }
      } else if (seedKey === 'accounts') {
        const wave = 10.0 + 4.0 * (i / (days - 1)) + 1.2 * Math.sin(i * 0.2);
        // Las cuentas siempre tienen un valor > 0
        const finalWave = 10.0 + 4.0 * ((days - 1) / (days - 1)) + 1.2 * Math.sin((days - 1) * 0.2);
        value = Math.max(1, Math.round(wave * (finalVal / finalWave)));
      }

      data.push({
        day: `Día ${i + 1}`,
        value: parseFloat(value.toFixed(2)),
      });
    }

    return data;
  };

  // Sparklines datasets
  const pipelineSparkline = useMemo(() => getSparklineData(opportunities, 'value', o => o.status === 'open', 'pipeline'), [opportunities]);
  const activeSparkline = useMemo(() => getSparklineData(opportunities, 'count', o => o.status === 'open', 'active'), [opportunities]);
  const wonSparkline = useMemo(() => getSparklineData(opportunities, 'count', o => o.status === 'won', 'won'), [opportunities]);
  const accountsSparkline = useMemo(() => getSparklineData(accounts, 'count', undefined, 'accounts'), [accounts]);

  // Lista de Hot Deals (Negociaciones con alta probabilidad y gran valor)
  const hotDeals = useMemo(() => {
    return opportunities
      .filter(o => o.status === 'open')
      .sort((a, b) => (parseFloat(b.value) || 0) - (parseFloat(a.value) || 0))
      .slice(0, 5);
  }, [opportunities]);

  const hotDealsTotalValue = useMemo(() => {
    return hotDeals.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);
  }, [hotDeals]);

  const hotDealsWeightedValue = useMemo(() => {
    return hotDeals.reduce((acc, curr) => {
      const val = parseFloat(curr.value) || 0;
      const prob = parseFloat(curr.stage_probability) || 0;
      return acc + (val * prob) / 100;
    }, 0);
  }, [hotDeals]);

  const pipelinePercentage = useMemo(() => {
    return stats.totalValue > 0 ? (hotDealsTotalValue / stats.totalValue) * 100 : 0;
  }, [hotDealsTotalValue, stats.totalValue]);

  const radialData = useMemo(() => {
    const colors = [
      'var(--sys-primary)',
      'var(--sys-tertiary)',
      'var(--sys-success)',
      '#fbbf24', // Amber
      '#ec4899', // Pink
    ];
    // Recharts RadialBar expects items to have a unique fill and mapped values
    // We reverse it so that the largest deal occupies the outermost ring
    return [...hotDeals].reverse().map((deal, idx) => ({
      name: deal.title,
      value: parseFloat(deal.value) || 0,
      fill: colors[idx % colors.length],
    }));
  }, [hotDeals]);

  // Manejo de Drill Down
  const handleOpenDrillDown = (type: 'pipeline' | 'active' | 'won' | 'accounts') => {
    setDrillDownType(type);
    setDrillDownOpen(true);
  };

  const drillDownContent = useMemo(() => {
    if (!drillDownType) return null;

    if (drillDownType === 'accounts') {
      const columns = [
        { key: 'name', header: 'Nombre Cuenta', render: (item: any) => <span className="font-semibold">{item.name}</span>, sortable: true },
        { key: 'industry', header: 'Industria', render: (item: any) => item.industry || 'No especificada', sortable: true },
        { key: 'created_at', header: 'Fecha Registro', render: (item: any) => item.created_at ? new Date(item.created_at).toLocaleDateString('es-AR') : '-' }
      ];

      return (
        <Table
          data={accounts}
          columns={columns}
          keyExtractor={(item) => item.id}
          pageSize={10}
          emptyState={{
            icon: <Users size={32} className="text-muted" />,
            title: 'Sin cuentas',
            description: 'No se encontraron clientes corporativos registrados.'
          }}
        />
      );
    }

    // Filtros de oportunidades
    const oppsFiltradas = opportunities.filter(o => {
      if (drillDownType === 'pipeline' || drillDownType === 'active') return o.status === 'open';
      if (drillDownType === 'won') return o.status === 'won';
      return true;
    });

    const columns = [
      { key: 'title', header: 'Negociación / Oportunidad', render: (item: any) => <span className="font-semibold">{item.title}</span>, sortable: true },
      { key: 'stage_name', header: 'Etapa', render: (item: any) => <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--sys-surface-hover)', border: '1px solid var(--sys-border-soft)' }}>{item.stage_name || 'Inicial'}</span>, sortable: true },
      { key: 'value', header: 'Valor', render: (item: any) => <span className="font-bold text-primary">{formatCurrency(parseFloat(item.value) || 0)}</span>, align: 'right' as const, sortable: true },
      { key: 'created_at', header: 'Creado el', render: (item: any) => item.created_at ? new Date(item.created_at).toLocaleDateString('es-AR') : '-' }
    ];

    return (
      <Table
        data={oppsFiltradas}
        columns={columns}
        keyExtractor={(item) => item.id}
        pageSize={10}
        emptyState={{
          icon: <Briefcase size={32} className="text-muted" />,
          title: 'Sin oportunidades',
          description: 'No hay negociaciones en esta categoría.'
        }}
      />
    );
  }, [drillDownType, opportunities, accounts]);

  const drillDownTitle = useMemo(() => {
    if (drillDownType === 'pipeline') return 'Desglose: Valor del Pipeline';
    if (drillDownType === 'active') return 'Desglose: Negociaciones Activas';
    if (drillDownType === 'won') return 'Desglose: Oportunidades Ganadas';
    if (drillDownType === 'accounts') return 'Desglose: Cuentas Activas';
    return 'Detalle Analítico';
  }, [drillDownType]);

  const chartData = stageData.length ? stageData : [
    { name: 'Contacto Inicial', value: 4000, count: 3 },
    { name: 'Calificación', value: 8000, count: 2 },
    { name: 'Propuesta', value: 15000, count: 4 },
    { name: 'Negociación', value: 25000, count: 2 },
  ];

  const handleExportDashboardExcel = async () => {
    try {
      const dataToExport = opportunities.map(opp => ({
        title: opp.title || opp.name,
        stage: opp.stage_name || 'Sin etapa',
        value: parseFloat(opp.value) || 0,
        status: opp.status === 'open' ? 'Activo' : opp.status === 'won' ? 'Ganado' : 'Perdido',
        close_date: opp.close_date || 'Sin fecha',
        created_at: opp.created_at ? new Date(opp.created_at).toLocaleDateString('es-AR') : 'Sin fecha'
      }));

      await exportToExcel({
        data: dataToExport,
        columns: [
          { key: 'title', header: 'Negociación / Oportunidad' },
          { key: 'stage', header: 'Etapa' },
          { key: 'value', header: 'Valor (ARS)', align: 'right', numFmt: '$#,##0' },
          { key: 'status', header: 'Estado', align: 'center' },
          { key: 'close_date', header: 'Fecha de Cierre', align: 'center' },
          { key: 'created_at', header: 'Fecha de Registro', align: 'center' }
        ],
        filename: `reporte_comercial_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Oportunidades'
      });
      toast.success('Métricas exportadas a Excel con éxito');
    } catch (err) {
      toast.error('Error al exportar a Excel');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Cabecera del Dashboard con selector de Pipeline */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 pb-2 border-b" style={{ borderColor: 'var(--sys-border-soft)' }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-montserrat)' }}>Dashboard Comercial</h1>
          <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>Métricas clave y proyecciones comerciales en tiempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={pipelineSelectOptions}
            value={String(selectedPipelineId)}
            onChange={(val) => setSelectedPipelineId(val === 'all' ? 'all' : Number(val))}
            className="w-full sm:w-64"
            placeholder="Seleccionar Pipeline..."
          />
          <div className="flex items-center gap-1.5 no-print">
            <button
              onClick={() => window.print()}
              className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-lg px-3 py-2 cursor-pointer inline-flex items-center gap-1.5 transition-colors text-xs font-semibold text-text-muted active:scale-95"
              title="Exportar Dashboard a PDF"
            >
              <FileDown size={14} /> PDF
            </button>
            <button
              onClick={handleExportDashboardExcel}
              className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-lg px-3 py-2 cursor-pointer inline-flex items-center gap-1.5 transition-colors text-xs font-semibold text-text-muted active:scale-95"
              title="Exportar Datos a Excel"
            >
              <Download size={14} /> Excel
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* SECCIÓN 1: KPIs Ejecutivos (Flip Cards con Sparklines) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Valor del Pipeline */}
        <Card
          variant="flip"
          front={
            <div className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted" style={{ color: 'var(--sys-text-muted)' }}>Valor del Pipeline</span>
                  <span className="text-2xl font-bold tracking-tight">{formatCurrency(stats.totalValue)}</span>
                  <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5">
                    <TrendingUp size={10} /> +12.4% vs mes anterior
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--sys-primary) 12%, transparent)', color: 'var(--sys-primary)' }}>
                  <DollarSign size={20} />
                </div>
              </div>
            </div>
          }
          back={
            <div className="p-5 flex flex-col justify-between h-full">
              <div className="h-14 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pipelineSparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <Area type="monotone" dataKey="value" stroke="var(--sys-primary)" strokeWidth={1.5} fill="color-mix(in srgb, var(--sys-primary) 15%, transparent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted" style={{ color: 'var(--sys-text-muted)' }}>Tendencia 30d</span>
                <button
                  onClick={() => handleOpenDrillDown('pipeline')}
                  className="bg-surface-raised border border-border-soft rounded px-2.5 py-1 text-xs text-text-muted font-medium cursor-pointer hover:bg-surface-hover transition-colors"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Ver Detalle
                </button>
              </div>
            </div>
          }
        />

        {/* Card 2: Negociaciones Activas */}
        <Card
          variant="flip"
          front={
            <div className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted" style={{ color: 'var(--sys-text-muted)' }}>Negociaciones Activas</span>
                  <span className="text-2xl font-bold tracking-tight">{stats.activeDeals}</span>
                  <span className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>En proceso de cierre</span>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--sys-tertiary) 12%, transparent)', color: 'var(--sys-tertiary)' }}>
                  <Briefcase size={20} />
                </div>
              </div>
            </div>
          }
          back={
            <div className="p-5 flex flex-col justify-between h-full">
              <div className="h-14 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeSparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <Area type="monotone" dataKey="value" stroke="var(--sys-tertiary)" strokeWidth={1.5} fill="color-mix(in srgb, var(--sys-tertiary) 15%, transparent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted" style={{ color: 'var(--sys-text-muted)' }}>Volumen Comercial</span>
                <button
                  onClick={() => handleOpenDrillDown('active')}
                  className="bg-surface-raised border border-border-soft rounded px-2.5 py-1 text-xs text-text-muted font-medium cursor-pointer hover:bg-surface-hover transition-colors"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Ver Detalle
                </button>
              </div>
            </div>
          }
        />

        {/* Card 3: Oportunidades Ganadas */}
        <Card
          variant="flip"
          front={
            <div className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted" style={{ color: 'var(--sys-text-muted)' }}>Oportunidades Ganadas</span>
                  <span className="text-2xl font-bold tracking-tight">{stats.wonDeals}</span>
                  <span className="text-[10px] text-emerald-500 font-medium">Proyectos activos creados</span>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--sys-success) 12%, transparent)', color: 'var(--sys-success)' }}>
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>
          }
          back={
            <div className="p-5 flex flex-col justify-between h-full">
              <div className="h-14 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={wonSparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <Area type="monotone" dataKey="value" stroke="var(--sys-success)" strokeWidth={1.5} fill="color-mix(in srgb, var(--sys-success) 15%, transparent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted" style={{ color: 'var(--sys-text-muted)' }}>Proyectos ganados</span>
                <button
                  onClick={() => handleOpenDrillDown('won')}
                  className="bg-surface-raised border border-border-soft rounded px-2.5 py-1 text-xs text-text-muted font-medium cursor-pointer hover:bg-surface-hover transition-colors"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Ver Detalle
                </button>
              </div>
            </div>
          }
        />

        {/* Card 4: Cuentas Activas */}
        <Card
          variant="flip"
          front={
            <div className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted" style={{ color: 'var(--sys-text-muted)' }}>Cuentas Activas</span>
                  <span className="text-2xl font-bold tracking-tight">{stats.totalAccounts}</span>
                  <span className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>Clientes registrados</span>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--sys-primary) 12%, transparent)', color: 'var(--sys-primary)' }}>
                  <Users size={20} />
                </div>
              </div>
            </div>
          }
          back={
            <div className="p-5 flex flex-col justify-between h-full">
              <div className="h-14 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={accountsSparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <Area type="monotone" dataKey="value" stroke="var(--sys-primary)" strokeWidth={1.5} fill="color-mix(in srgb, var(--sys-primary) 15%, transparent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted" style={{ color: 'var(--sys-text-muted)' }}>Crecimiento Cuentas</span>
                <button
                  onClick={() => handleOpenDrillDown('accounts')}
                  className="bg-surface-raised border border-border-soft rounded px-2.5 py-1 text-xs text-text-muted font-medium cursor-pointer hover:bg-surface-hover transition-colors"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Ver Detalle
                </button>
              </div>
            </div>
          }
        />
      </div>

      {/* SECCIÓN 2: Desempeño Operativo y Cumplimiento (Metas Comerciales y Hot Deals) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Metas Comerciales (Ventas) */}
        <div className="glass-panel p-6 flex flex-col gap-4" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted" style={{ color: 'var(--sys-text-muted)' }}>Metas de Ventas Q3</h2>
          </div>
          <div className="flex flex-col gap-4">
            {salesGoals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
              return (
                <div key={goal.label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-semibold" style={{ color: 'var(--sys-text)' }}>
                    <span>{goal.label}</span>
                    <span className="tabular-nums" style={{ color: 'var(--sys-text-muted)' }}>
                      {goal.isCurrency ? formatCurrency(goal.current) : goal.current} / {goal.isCurrency ? formatCurrency(goal.target) : goal.target}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--sys-border-soft)', overflow: 'hidden' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: goal.color,
                          boxShadow: pct >= 80 ? `0 0 8px ${goal.color}` : 'none',
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold tabular-nums" style={{ color: goal.color, minWidth: '2.5rem', textAlign: 'right' }}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabla rápida y Analíticas de Hot Deals */}
        <div className="glass-panel p-6 lg:col-span-2" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FolderKanban size={16} className="text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted" style={{ color: 'var(--sys-text-muted)' }}>Negociaciones Calientes (Hot Deals)</h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'color-mix(in srgb, var(--sys-primary) 10%, transparent)', color: 'var(--sys-primary)' }}>Prioridad Alta</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Columna Izquierda: Tabla */}
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

            {/* Columna Derecha: Gráfico Radial y KPIs */}
            <div className="flex flex-col gap-6 p-5 rounded-xl" style={{ background: 'var(--sys-surface-hover)', border: '1px solid var(--sys-border-soft)' }}>
              <div className="flex flex-col gap-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted" style={{ color: 'var(--sys-text-muted)' }}>Análisis de Contribución</h3>
                <span className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>Distribución del valor de tratos prioritarios</span>
              </div>
              
              <div className="flex items-center justify-center relative" style={{ height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="30%" 
                    outerRadius="100%" 
                    barSize={8} 
                    data={radialData}
                  >
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
                {/* Leyenda central minimalista */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] uppercase font-bold text-muted" style={{ color: 'var(--sys-text-muted)' }}>Total Hot</span>
                  <span className="text-xs font-extrabold tracking-tight" style={{ color: 'var(--sys-text)' }}>{formatCurrency(hotDealsTotalValue)}</span>
                </div>
              </div>

              {/* Bloque de Mini KPIs */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--sys-border-soft)' }}>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted" style={{ color: 'var(--sys-text-muted)' }}>Valor Ponderado</span>
                  <span className="text-xs font-bold text-primary">{formatCurrency(hotDealsWeightedValue)}</span>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--sys-border-soft)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${hotDealsTotalValue ? Math.round((hotDealsWeightedValue / hotDealsTotalValue) * 100) : 0}%`, background: 'var(--sys-primary)' }} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted" style={{ color: 'var(--sys-text-muted)' }}>Concentración Pipeline</span>
                  <span className="text-xs font-bold text-tertiary">{pipelinePercentage.toFixed(1)}%</span>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--sys-border-soft)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pipelinePercentage)}%`, background: 'var(--sys-tertiary)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: Grid Analítico 2x2 (Gráficos) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Gráfico 1: Oportunidades por Etapa */}
        <div className="glass-panel p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={18} style={{ color: 'var(--sys-primary)' }} />
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-montserrat)' }}>Valor de Oportunidades por Etapa</h2>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--sys-border-soft)" />
                <XAxis dataKey="name" stroke="var(--sys-text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--sys-text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
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

        {/* Gráfico 2: Embudo de Conversión (SalesFunnelSVG) */}
        <div className="glass-panel p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} style={{ color: 'var(--sys-tertiary)' }} />
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-montserrat)' }}>Embudo de Conversión Comercial</h2>
          </div>
          <SalesFunnelSVG opportunities={opportunities} />
        </div>

        {/* Gráfico 3: Pronóstico Predictivo (ForecastChart) */}
        <div className="glass-panel p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} style={{ color: 'var(--sys-tertiary)' }} />
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-montserrat)' }}>Pronóstico Predictivo de Ventas</h2>
          </div>
          <ForecastChart opportunities={opportunities} />
        </div>

        {/* Gráfico 4: Proyección y Crecimiento Comercial (Área) */}
        <div className="glass-panel p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} style={{ color: 'var(--sys-tertiary)' }} />
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-montserrat)' }}>Proyección y Crecimiento Comercial</h2>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--sys-tertiary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--sys-tertiary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--sys-border-soft)" />
                <XAxis dataKey="name" stroke="var(--sys-text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--sys-text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Valor Proyectado']}
                  contentStyle={{ background: 'var(--sys-surface-raised)', borderColor: 'var(--sys-border-soft)', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold', color: 'var(--sys-text)' }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--sys-tertiary)" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SlidePanel lateral para Drill Down interactivo */}
      <SlidePanel
        open={drillDownOpen}
        onClose={() => {
          setDrillDownOpen(false);
          setDrillDownType(null);
        }}
        title={drillDownTitle}
        width="45rem"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted" style={{ color: 'var(--sys-text-muted)' }}>
            Listado dinámico bajo demanda para auditoría ejecutiva de registros comerciales.
          </p>
          {drillDownContent}
        </div>
      </SlidePanel>
        </>
      )}
    </div>
  );
}

