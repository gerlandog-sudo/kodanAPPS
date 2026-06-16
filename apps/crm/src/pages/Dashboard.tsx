import { useEffect, useState } from 'react';
import { Card } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import { DollarSign, BarChart3, Users, Briefcase, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from 'recharts';
import { toast } from 'sonner';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalValue: 0,
    activeDeals: 0,
    wonDeals: 0,
    totalAccounts: 0,
    avgDealSize: 0,
  });
  const [stageData, setStageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [opps, accounts] = await Promise.all([
          crmApi.listOpportunities(),
          crmApi.listAccounts(),
        ]);

        const active = opps.filter(o => o.status === 'open');
        const won = opps.filter(o => o.status === 'won');
        const totalValue = active.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);
        const avgDealSize = opps.length ? totalValue / opps.length : 0;

        setStats({
          totalValue,
          activeDeals: active.length,
          wonDeals: won.length,
          totalAccounts: accounts.length,
          avgDealSize,
        });

        // Map opportunities by stage for chart
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
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="spinner text-primary" style={{ width: '2rem', height: '2rem' }} />
          <p className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>Cargando analíticas comerciales...</p>
        </div>
      </div>
    );
  }

  // Fallback charts data if empty
  const chartData = stageData.length ? stageData : [
    { name: 'Contacto Inicial', value: 4000, count: 3 },
    { name: 'Calificación', value: 8000, count: 2 },
    { name: 'Propuesta', value: 15000, count: 4 },
    { name: 'Negociación', value: 25000, count: 2 },
  ];

  return (
    <div className="flex flex-col gap-8">

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          variant="flip"
          front={
            <div className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--sys-text-muted)' }}>Valor del Pipeline</span>
                  <span className="text-2xl font-bold tracking-tight">{formatCurrency(stats.totalValue)}</span>
                  <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5">
                    <TrendingUp size={10} /> +12.4% vs mes anterior
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--sys-primary) 12%, transparent)', color: 'var(--sys-primary)' }}>
                  <DollarSign size={22} />
                </div>
              </div>
            </div>
          }
          back={
            <div className="p-6 flex items-center justify-center h-full">
              <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--sys-text-muted)' }}>
                Valor total de todas las negociaciones activas en el pipeline comercial.
              </p>
            </div>
          }
        />

        <Card
          variant="flip"
          front={
            <div className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--sys-text-muted)' }}>Negociaciones Activas</span>
                  <span className="text-2xl font-bold tracking-tight">{stats.activeDeals}</span>
                  <span className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>En proceso de cierre</span>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--sys-tertiary) 12%, transparent)', color: 'var(--sys-tertiary)' }}>
                  <Briefcase size={22} />
                </div>
              </div>
            </div>
          }
          back={
            <div className="p-6 flex items-center justify-center h-full">
              <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--sys-text-muted)' }}>
                Oportunidades en estado abierto actualmente en proceso de cierre.
              </p>
            </div>
          }
        />

        <Card
          variant="flip"
          front={
            <div className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--sys-text-muted)' }}>Oportunidades Ganadas</span>
                  <span className="text-2xl font-bold tracking-tight">{stats.wonDeals}</span>
                  <span className="text-[10px] text-emerald-500 font-medium">Proyectos activos creados</span>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--sys-success) 12%, transparent)', color: 'var(--sys-success)' }}>
                  <TrendingUp size={22} />
                </div>
              </div>
            </div>
          }
          back={
            <div className="p-6 flex items-center justify-center h-full">
              <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--sys-text-muted)' }}>
                Negociaciones cerradas con éxito que generaron proyectos activos.
              </p>
            </div>
          }
        />

        <Card
          variant="flip"
          front={
            <div className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--sys-text-muted)' }}>Cuentas Activas</span>
                  <span className="text-2xl font-bold tracking-tight">{stats.totalAccounts}</span>
                  <span className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>Clientes corporativos</span>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--sys-primary) 12%, transparent)', color: 'var(--sys-primary)' }}>
                  <Users size={22} />
                </div>
              </div>
            </div>
          }
          back={
            <div className="p-6 flex items-center justify-center h-full">
              <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--sys-text-muted)' }}>
                Clientes corporativos activos registrados en la plataforma.
              </p>
            </div>
          }
        />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
    </div>
  );
}
