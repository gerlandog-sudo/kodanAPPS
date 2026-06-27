import { useState, useEffect } from 'react';
import { Calendar, Users, AlertTriangle, TrendingUp, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { trackerApi, type HeatmapUser } from '../api/client';

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r; }
function fmt(d: Date) { return d.toISOString().split('T')[0]; }
function fmtShort(d: Date) { return d.toLocaleDateString('es', { day: 'numeric', month: 'short' }); }
function fmtDay(d: Date) { return d.toLocaleDateString('es', { weekday: 'long' }); }
function fmtMonth(d: Date) { return d.toLocaleDateString('es', { month: 'long', year: 'numeric' }); }

export function HeatmapPage() {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [baseDate, setBaseDate] = useState(startOfWeek(new Date()));
  const [data, setData] = useState<HeatmapUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      let startDate: string, endDate: string;
      if (viewMode === 'weekly') {
        const ws = startOfWeek(baseDate);
        startDate = fmt(ws);
        endDate = fmt(addDays(ws, 6));
      } else {
        const ms = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        const me = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        startDate = fmt(startOfWeek(ms));
        endDate = fmt(addDays(startOfWeek(me), 6 + (6 - startOfWeek(me).getDay() + 6) % 7 || 6));
      }
      const res = await trackerApi.getHeatmap(startDate, endDate);
      const processed = res.map((u) => ({
        ...u,
        days: u.days.map((d) => ({ ...d, saturation: d.capacity > 0 ? (d.hours / d.capacity) * 100 : 0 })),
      }));
      setData(processed);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [baseDate, viewMode]);

  const weekDays = viewMode === 'weekly'
    ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(baseDate), i))
    : [];

  const weeks = data[0]?.days
    ? data[0].days.reduce<{ label: string; days: { date: string; hours: number; capacity: number; saturation: number }[] }[]>((acc, day, i) => {
        const idx = Math.floor(i / 7);
        if (!acc[idx]) acc[idx] = { label: '', days: [] };
        acc[idx].days.push(day);
        if (i % 7 === 6 || i === data[0].days.length - 1) {
          acc[idx].label = `${fmtShort(new Date(acc[idx].days[0].date))} - ${fmtShort(new Date(acc[idx].days[acc[idx].days.length - 1].date))}`;
        }
        return acc;
      }, [])
    : [];

  const colorClass = (s: number) => {
    if (s === 0) return 'bg-gray-50 text-gray-400 border-gray-100';
    if (s <= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (s <= 100) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200 font-bold';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center gap-4 flex-wrap">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setViewMode('weekly')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${viewMode === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <List size={16} />{' '}Semanal
          </button>
          <button onClick={() => setViewMode('monthly')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${viewMode === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <LayoutGrid size={16} />{' '}Mensual
          </button>
        </div>
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
          <button onClick={() => setBaseDate(viewMode === 'weekly' ? addDays(baseDate, -7) : new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1))} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2 font-medium text-gray-700 min-w-[200px] justify-center">
            <Calendar size={16} className="text-primary" />
            {viewMode === 'weekly' ? (
              <>{fmtShort(startOfWeek(baseDate))} - {fmtShort(addDays(startOfWeek(baseDate), 6))}</>
            ) : (
              <span className="capitalize">{fmtMonth(baseDate)}</span>
            )}
          </div>
          <button onClick={() => setBaseDate(viewMode === 'weekly' ? addDays(baseDate, 7) : new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1))} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600"><TrendingUp size={16} /></div>
          <div><p className="text-xs font-medium text-gray-500">Disponible</p><p className="text-lg font-bold text-gray-900">0% - 80%</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600"><Users size={16} /></div>
          <div><p className="text-xs font-medium text-gray-500">Óptimo</p><p className="text-lg font-bold text-gray-900">81% - 100%</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600"><AlertTriangle size={16} /></div>
          <div><p className="text-xs font-medium text-gray-500">Sobrecarga</p><p className="text-lg font-bold text-gray-900">&gt; 100%</p></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50/95 backdrop-blur z-10 border-r border-gray-100 min-w-[120px]">Miembro</th>
                {viewMode === 'weekly' ? weekDays.map((d, i) => (
                  <th key={i} className="px-4 py-4 text-center border-r border-gray-100 last:border-0 min-w-[120px]">
                    <div className="text-xs font-semibold text-gray-500 uppercase">{fmtDay(d)}</div>
                    <div className="text-sm font-bold text-gray-900">{fmtShort(d)}</div>
                  </th>
                )) : weeks.map((w, i) => (
                  <th key={i} className="px-4 py-4 text-center border-r border-gray-100 last:border-0 min-w-[140px]">
                    <div className="text-xs font-semibold text-gray-500 uppercase">Semana {i + 1}</div>
                    <div className="text-sm font-bold text-gray-900">{w.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  Cargando...
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">Sin datos</td></tr>
              ) : data.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-4 sticky left-0 bg-white z-10 border-r border-gray-100">
                    <div className="font-medium text-gray-900 truncate max-w-[150px]" title={user.name}>{user.name}</div>
                    <div className="text-xs text-gray-500">{user.weekly_capacity}h/sem</div>
                  </td>
                  {viewMode === 'weekly' ? user.days.map((day, i) => (
                    <td key={i} className="p-2 border-r border-gray-100 last:border-0">
                      <div className={`h-full w-full rounded-xl border p-3 flex flex-col items-center justify-center transition-all ${colorClass(day.saturation)}`}>
                        <span className="text-lg font-bold">{day.hours.toFixed(1)}h</span>
                        <span className="text-[10px] uppercase tracking-wider opacity-80 mt-1">{day.saturation.toFixed(0)}%</span>
                      </div>
                    </td>
                  )) : weeks.map((_, wi) => {
                    const weekDays = data[0].days.slice(wi * 7, wi * 7 + 7);
                    const weekHours = weekDays.reduce((s, d) => s + d.hours, 0);
                    const weekSat = user.weekly_capacity > 0 ? (weekHours / (user.weekly_capacity * weekDays.length / 7)) * 100 : 0;
                    return (
                      <td key={wi} className="p-2 border-r border-gray-100 last:border-0">
                        <div className={`h-full w-full rounded-xl border p-3 flex flex-col items-center justify-center transition-all ${colorClass(weekSat)}`}>
                          <span className="text-lg font-bold">{weekHours.toFixed(1)}h</span>
                          <span className="text-[10px] uppercase tracking-wider opacity-80 mt-1">{weekSat.toFixed(0)}%</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
