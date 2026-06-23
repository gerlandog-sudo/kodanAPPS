import { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ForecastChartProps {
  opportunities: any[];
}

export function ForecastChart({ opportunities }: ForecastChartProps) {
  const chartData = useMemo(() => {
    const monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const next6Months: { year: number; month: number; label: string; grossValue: number; weightedValue: number }[] = [];
    
    // Generar la estructura de los próximos 6 meses (incluido el actual)
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      next6Months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${monthsNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
        grossValue: 0,
        weightedValue: 0
      });
    }

    // Filtrar únicamente oportunidades activas (open)
    const activeOpps = opportunities.filter(o => o.status === 'open');

    activeOpps.forEach(opp => {
      let oppDate = now;
      if (opp.close_date) {
        const parsedDate = new Date(opp.close_date);
        if (!isNaN(parsedDate.getTime())) {
          oppDate = parsedDate;
        }
      }
      
      const oppYear = oppDate.getFullYear();
      const oppMonth = oppDate.getMonth();

      // Encontrar en qué mes de los próximos 6 se proyecta el cierre.
      let targetMonth = next6Months.find(m => m.year === oppYear && m.month === oppMonth);
      
      if (!targetMonth) {
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        if (oppDate < startOfCurrentMonth) {
          // Si la fecha de cierre estimada es del pasado, la consolidamos en el mes en curso (backlog de cierre)
          targetMonth = next6Months[0];
        }
      }

      if (targetMonth) {
        const val = parseFloat(opp.value) || 0;
        const prob = parseFloat(opp.stage_probability) || 0;
        
        targetMonth.grossValue += val;
        targetMonth.weightedValue += (val * prob) / 100;
      }
    });

    return next6Months;
  }, [opportunities]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--sys-tertiary)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--sys-tertiary)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--sys-border-soft)" />
            
            <XAxis
              dataKey="label"
              stroke="var(--sys-text-muted)"
              fontSize={10.5}
              tickLine={false}
              axisLine={false}
            />
            
            <YAxis
              stroke="var(--sys-text-muted)"
              fontSize={10.5}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const gap = data.grossValue - data.weightedValue;
                  return (
                    <div className="glass-panel p-4 rounded-xl border flex flex-col gap-2 shadow-lg" style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface-raised)' }}>
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{data.label}</span>
                      <div className="h-px bg-border-soft my-1" style={{ background: 'var(--sys-border-soft)' }} />
                      
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between gap-8 text-[11px]">
                          <span style={{ color: 'var(--sys-text-muted)' }}>Valor Bruto:</span>
                          <span className="font-bold" style={{ color: 'var(--sys-primary)' }}>{formatCurrency(data.grossValue)}</span>
                        </div>
                        <div className="flex justify-between gap-8 text-[11px]">
                          <span style={{ color: 'var(--sys-text-muted)' }}>Valor Ponderado:</span>
                          <span className="font-bold" style={{ color: 'var(--sys-tertiary)' }}>{formatCurrency(data.weightedValue)}</span>
                        </div>
                        <div className="h-px bg-border-soft my-1" style={{ height: '1px', background: 'var(--sys-border-soft)' }} />
                        <div className="flex justify-between gap-8 text-[10px]">
                          <span style={{ color: 'var(--sys-text-muted)' }}>Brecha de Conversión:</span>
                          <span className="font-medium text-amber-500">{formatCurrency(gap)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Columnas para el Valor Bruto del pipeline */}
            <Bar
              dataKey="grossValue"
              fill="var(--sys-primary)"
              opacity={0.35}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              name="Valor Bruto"
            />

            {/* Área y línea continua para el Valor Ponderado (Forecast) */}
            <Area
              type="monotone"
              dataKey="weightedValue"
              stroke="var(--sys-tertiary)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#forecastGrad)"
              name="Valor Ponderado"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
