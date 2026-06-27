import React, { useEffect, useState, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  ArrowLeft, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight, 
  Info
} from 'lucide-react';
import { Input, Button } from '@kodan-apps/ui-core';
import { trackerApi, PortfolioProject, DetailedProjectMetrics } from '../api/client';

// Speedometer Gauge para Calidad
const SvgGauge: React.FC<{ value: number, statusColor: string }> = ({ value, statusColor }) => {
  const r = 60;
  const circumference = Math.PI * r;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const angle = -90 + (value / 100) * 180;
  
  return (
    <svg viewBox="0 0 160 100" className="w-full h-full max-h-[110px]">
      <path 
        d="M 20,90 A 60,60 0 0,1 140,90" 
        fill="none" 
        stroke="var(--sys-border)" 
        strokeWidth="10" 
        strokeLinecap="round"
        opacity="0.2"
      />
      <path 
        d="M 20,90 A 60,60 0 0,1 140,90" 
        fill="none" 
        stroke={statusColor} 
        strokeWidth="10" 
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      <circle cx="80" cy="90" r="6" fill="var(--sys-text)" />
      <line 
        x1="80" 
        y1="90" 
        x2="80" 
        y2="45" 
        stroke="var(--sys-text)" 
        strokeWidth="3.5" 
        strokeLinecap="round"
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: '80px 90px',
          transition: 'transform 1s ease-out'
        }}
      />
      <text x="20" y="99" fill="var(--sys-text-muted)" fontSize="9" fontWeight="bold" textAnchor="middle">0%</text>
      <text x="140" y="99" fill="var(--sys-text-muted)" fontSize="9" fontWeight="bold" textAnchor="middle">100%</text>
    </svg>
  );
};

// Ring Chart para Progreso / Burn Rate
const SvgRing: React.FC<{ value: number, statusColor: string }> = ({ value, statusColor }) => {
  const r = 45;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
      <svg viewBox="0 0 110 110" className="w-full h-full transform -rotate-90">
        <circle 
          cx="55" 
          cy="55" 
          r={r} 
          fill="none" 
          stroke="var(--sys-border)" 
          strokeWidth="7" 
          opacity="0.15"
        />
        <circle 
          cx="55" 
          cy="55" 
          r={r} 
          fill="none" 
          stroke={statusColor} 
          strokeWidth="7" 
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-lg font-black text-[var(--sys-text)]">{Math.round(value)}%</span>
      </div>
    </div>
  );
};

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
}

export function MetricsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<DetailedProjectMetrics | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);

  // Filtros de fecha
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Cargar proyectos (Matriz)
  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trackerApi.getMetrics(undefined, from || undefined, to || undefined);
      setProjects(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Error loading metrics matrix", e);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  // Cargar detalle del proyecto
  const fetchProjectDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await trackerApi.getMetrics(id, from || undefined, to || undefined);
      setDetailData(res);
    } catch (e) {
      console.error("Error loading metrics details", e);
    } finally {
      setDetailLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchMatrix();
    if (selectedProjectId !== null) {
      fetchProjectDetail(selectedProjectId);
    }
  }, [fetchMatrix, fetchProjectDetail, selectedProjectId]);

  const handleSelectProject = (id: number) => {
    setSelectedProjectId(id);
    fetchProjectDetail(id);
  };

  const handleBack = () => {
    setSelectedProjectId(null);
    setDetailData(null);
  };

  const getStatusColorValue = (status: string): string => {
    switch (status) {
      case 'approved': return 'var(--sys-success)';
      case 'submitted': return 'var(--sys-tertiary)';
      case 'rejected': return 'var(--sys-error)';
      default: return 'var(--sys-text-muted)';
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'approved': return 'text-[var(--sys-success)] bg-[var(--sys-success)]/10 border-[var(--sys-success)]/20';
      case 'submitted': return 'text-[var(--sys-tertiary)] bg-[var(--sys-tertiary)]/10 border-[var(--sys-tertiary)]/20';
      case 'rejected': return 'text-[var(--sys-error)] bg-[var(--sys-error)]/10 border-[var(--sys-error)]/20';
      default: return 'text-[var(--sys-text-muted)] bg-[var(--sys-text-muted)]/10 border-[var(--sys-border)]';
    }
  };

  if (loading && !selectedProjectId) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4"></div>
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <style>{`
        .kpis-glass-card {
          background-color: var(--sys-surface-raised);
          border: 1px solid var(--sys-border-soft);
          border-radius: 24px;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
        }
        .traffic-light-glow {
          box-shadow: 0 0 10px currentColor;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Rango de Fechas - Filtros */}
      {!selectedProjectId && (
        <div className="kpis-glass-card p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-[var(--sys-text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--sys-primary)]" /> Desde
            </label>
            <Input 
              type="date"
              value={from} 
              onChange={(e) => setFrom(e.target.value)} 
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-[var(--sys-text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--sys-primary)]" /> Hasta
            </label>
            <Input 
              type="date"
              value={to} 
              onChange={(e) => setTo(e.target.value)} 
            />
          </div>

          <Button 
            variant="secondary"
            onClick={() => { setFrom(''); setTo(''); }}
            className="h-10"
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      {/* ESTADO 1: MATRIZ DE PORTAFOLIO */}
      {!selectedProjectId ? (
        <div className="space-y-4 animate-fade-in">
          
          {projects.length === 0 ? (
            <div className="kpis-glass-card p-12 text-center text-[var(--sys-text-muted)]">
              No hay proyectos activos registrados o que coincidan con el rango de fechas.
            </div>
          ) : (
            <div className="kpis-glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-[var(--sys-text)]">
                  <thead>
                    <tr className="border-b border-[var(--sys-border-soft)] text-[10px] font-bold uppercase tracking-wider text-[var(--sys-text-muted)]">
                      <th className="py-4 px-6">Proyecto / Cliente</th>
                      <th className="py-4 px-4 text-center">Alcance</th>
                      <th className="py-4 px-4 text-center">Cronograma (SPI)</th>
                      <th className="py-4 px-4 text-center">Presupuesto</th>
                      <th className="py-4 px-4 text-center">Riesgos</th>
                      <th className="py-4 px-4 text-center">Calidad</th>
                      <th className="py-4 px-4 text-center">Valor Ganado</th>
                      <th className="py-4 px-6 text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--sys-border-soft)]">
                    {projects.map((proj) => (
                      <tr 
                        key={proj.id} 
                        onClick={() => handleSelectProject(proj.id)}
                        className="hover:bg-[var(--sys-surface-hover)] transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-6">
                          <p className="font-bold text-[var(--sys-text)] group-hover:text-[var(--sys-primary)] transition-colors">{proj.name}</p>
                          <p className="text-[11px] text-[var(--sys-text-muted)]">{proj.client_name}</p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full traffic-light-glow bg-[var(--sys-success)] text-[var(--sys-success)]" />
                            <span className="text-[10px] font-bold">{Math.round(proj.kpis.scope)}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span 
                              className="w-3 h-3 rounded-full traffic-light-glow" 
                              style={{ 
                                backgroundColor: proj.kpis.schedule >= 95 ? 'var(--sys-success)' : (proj.kpis.schedule >= 85 ? 'var(--sys-tertiary)' : 'var(--sys-error)'),
                                color: proj.kpis.schedule >= 95 ? 'var(--sys-success)' : (proj.kpis.schedule >= 85 ? 'var(--sys-tertiary)' : 'var(--sys-error)')
                              }} 
                            />
                            <span className="text-[10px] font-bold">{(proj.kpis.schedule / 100).toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span 
                              className="w-3 h-3 rounded-full traffic-light-glow" 
                              style={{ 
                                backgroundColor: proj.kpis.budget <= 100 ? 'var(--sys-success)' : (proj.kpis.budget <= 120 ? 'var(--sys-tertiary)' : 'var(--sys-error)'),
                                color: proj.kpis.budget <= 100 ? 'var(--sys-success)' : (proj.kpis.budget <= 120 ? 'var(--sys-tertiary)' : 'var(--sys-error)')
                              }} 
                            />
                            <span className="text-[10px] font-bold">{proj.kpis.budget}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span 
                              className="w-3 h-3 rounded-full traffic-light-glow" 
                              style={{ 
                                backgroundColor: getStatusColorValue(proj.kpis.risks),
                                color: getStatusColorValue(proj.kpis.risks)
                              }} 
                            />
                            <span className="text-[10px] font-bold uppercase font-mono">{proj.kpis.risks}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span 
                              className="w-3 h-3 rounded-full traffic-light-glow" 
                              style={{ 
                                backgroundColor: proj.kpis.quality >= 90 ? 'var(--sys-success)' : (proj.kpis.quality >= 75 ? 'var(--sys-tertiary)' : 'var(--sys-error)'),
                                color: proj.kpis.quality >= 90 ? 'var(--sys-success)' : (proj.kpis.quality >= 75 ? 'var(--sys-tertiary)' : 'var(--sys-error)')
                              }} 
                            />
                            <span className="text-[10px] font-bold">{proj.kpis.quality}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span 
                              className="w-3 h-3 rounded-full traffic-light-glow" 
                              style={{ 
                                backgroundColor: proj.kpis.value >= 95 ? 'var(--sys-success)' : (proj.kpis.value >= 85 ? 'var(--sys-tertiary)' : 'var(--sys-error)'),
                                color: proj.kpis.value >= 95 ? 'var(--sys-success)' : (proj.kpis.value >= 85 ? 'var(--sys-tertiary)' : 'var(--sys-error)')
                              }} 
                            />
                            <span className="text-[10px] font-bold">{proj.kpis.value}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <ChevronRight className="w-5 h-5 text-[var(--sys-text-muted)] group-hover:text-[var(--sys-primary)] transition-colors mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ESTADO 2: BENTO GRID DETALLADO */
        <div className="space-y-6 animate-fade-in">
          {/* Header de la vista detallada */}
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="p-2.5 rounded-xl bg-[var(--sys-surface-raised)] hover:bg-[var(--sys-surface-hover)] text-[var(--sys-text-muted)] hover:text-[var(--sys-text)] transition-all border border-[var(--sys-border)] flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

          </div>

          {detailLoading || !detailData ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
                ))}
              </div>
              <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
            </div>
          ) : (
            <>
              {/* Bento Grid Principal (6 Tarjetas) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* CARD 1: Avance del Alcance */}
                <div className="kpis-glass-card p-5 flex flex-col justify-between h-[200px]">
                  <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-[var(--sys-text-muted)] uppercase tracking-wider">
                        Avance de Alcance
                      </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <SvgRing 
                      value={detailData.kpis.scope.percentage} 
                      statusColor={getStatusColorValue('approved')} 
                    />
                    <div className="flex-1 text-right">
                      <span className="text-[10px] font-bold text-[var(--sys-text-muted)] uppercase tracking-wider block">Origen</span>
                      <span className="text-sm font-bold text-[var(--sys-text)] capitalize">
                        {detailData.kpis.scope.source === 'kanban' ? 'Tareas de Tablero' : 'Presupuesto Horas'}
                      </span>
                      {detailData.kpis.scope.total > 0 && (
                        <p className="text-[11px] text-[var(--sys-text-muted)] mt-1">
                          Completado: {detailData.kpis.scope.completed} de {detailData.kpis.scope.total} {detailData.kpis.scope.source === 'kanban' ? 'tareas' : 'horas'}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Barra de progreso inferior */}
                  <div className="w-full bg-[var(--sys-border)]/20 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[var(--sys-success)] h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${detailData.kpis.scope.percentage}%` }} 
                    />
                  </div>
                </div>

                {/* CARD 2: Cronograma (SPI) */}
                <div className="kpis-glass-card p-5 flex flex-col justify-between h-[200px]">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-[var(--sys-text-muted)] uppercase tracking-wider">
                      Cronograma
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getStatusBadgeClass(detailData.kpis.schedule.status)}`}>
                      SPI: {detailData.kpis.schedule.spi.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-24 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={detailData.trends}>
                        <Line 
                          type="monotone" 
                          dataKey="cronograma" 
                          stroke="var(--sys-primary)" 
                          strokeWidth={3} 
                          dot={{ r: 4, stroke: 'var(--sys-surface-raised)', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between text-[11px] text-[var(--sys-text-muted)] font-bold">
                    <span className="flex items-center gap-1">
                      <Info size={14} className={
                        detailData.kpis.schedule.spi >= 1.0 ? 'text-[var(--sys-success)]' :
                        detailData.kpis.schedule.spi >= 0.85 ? 'text-[var(--sys-tertiary)]' :
                        'text-[var(--sys-error)]'
                      } />
                      {detailData.kpis.schedule.spi >= 1.0 ? 'A tiempo / Adelantado' :
                       detailData.kpis.schedule.spi >= 0.85 ? 'Retraso Leve' :
                       'Retraso Crítico'}
                    </span>
                    <span>Avance Planeado: {detailData.kpis.schedule.planned_progress}%</span>
                  </div>
                </div>

                {/* CARD 3: Presupuesto */}
                <div className="kpis-glass-card p-5 flex flex-col justify-between h-[200px]">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-[var(--sys-text-muted)] uppercase tracking-wider">
                      Presupuesto (Burn Rate)
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getStatusBadgeClass(detailData.kpis.budget.status)}`}>
                      {detailData.kpis.budget.burn_rate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <SvgRing 
                      value={detailData.kpis.budget.burn_rate} 
                      statusColor={getStatusColorValue(detailData.kpis.budget.status)} 
                    />
                    <div className="flex-1 text-right text-xs">
                      <div className="mb-2">
                        <span className="text-[9px] font-bold text-[var(--sys-text-muted)] uppercase tracking-wider block">Costo Real (AC)</span>
                        <span className="font-bold text-[var(--sys-text)]">{formatCurrency(detailData.kpis.budget.cost)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[var(--sys-text-muted)] uppercase tracking-wider block">Presupuesto Limite</span>
                        <span className="font-bold text-[var(--sys-text-muted)]">{formatCurrency(detailData.kpis.budget.budget)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 4: Riesgos */}
                <div className="kpis-glass-card p-5 flex flex-col justify-between h-[200px]">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-[var(--sys-text-muted)] uppercase tracking-wider">
                      Perfil de Riesgos
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getStatusBadgeClass(detailData.kpis.risks.status)}`}>
                      {detailData.kpis.risks.total} Activos
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-1">
                    <span className="text-5xl font-black text-[var(--sys-text)]">{detailData.kpis.risks.total}</span>
                    <div className="text-right text-xs font-bold space-y-1">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--sys-error)]" />
                        <span className="text-[var(--sys-text-muted)]">{detailData.kpis.risks.high} Altos</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--sys-tertiary)]" />
                        <span className="text-[var(--sys-text-muted)]">{detailData.kpis.risks.medium} Medios</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    variant="secondary"
                    onClick={() => setShowRiskModal(true)}
                    className="w-full flex items-center justify-center gap-1.5"
                  >
                    <Info className="w-4 h-4" /> Ver Advertencias de Riesgos
                  </Button>
                </div>

                {/* CARD 5: Calidad */}
                <div className="kpis-glass-card p-5 flex flex-col justify-between h-[200px]">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-[var(--sys-text-muted)] uppercase tracking-wider">
                      Calidad de Cierre (Tasa Aprobación)
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getStatusBadgeClass(detailData.kpis.quality.status)}`}>
                      {detailData.kpis.quality.percentage}%
                    </span>
                  </div>
                  <div className="flex justify-center items-center py-2 h-28">
                    <SvgGauge 
                      value={detailData.kpis.quality.percentage} 
                      statusColor={getStatusColorValue(detailData.kpis.quality.status)} 
                    />
                  </div>
                  <div className="text-center text-[10px] font-bold text-[var(--sys-text-muted)] uppercase tracking-wider">
                    Horas Aprobadas / Reportadas
                  </div>
                </div>

                {/* CARD 6: Valor */}
                <div className="kpis-glass-card p-5 flex flex-col justify-between h-[200px]">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-[var(--sys-text-muted)] uppercase tracking-wider">
                      Valor Devengado (EV / PV)
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getStatusBadgeClass(detailData.kpis.value.status)}`}>
                      {detailData.kpis.value.percentage}%
                    </span>
                  </div>
                  <div className="h-28 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[
                          { name: 'Valor Planeado (PV)', valor: detailData.kpis.value.target },
                          { name: 'Valor Ganado (EV)', valor: detailData.kpis.value.revenue }
                        ]}
                        margin={{ top: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} stroke="var(--sys-border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--sys-text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 8, fill: 'var(--sys-text-muted)' }} axisLine={false} tickLine={false} />
                        <Bar dataKey="valor" fill="var(--sys-primary)" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Fila Inferior: Tendencia & Resumen */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Semáforo Informativo (Leyenda) */}
                <div className="kpis-glass-card p-6 flex flex-col justify-between lg:col-span-1">
                  <h3 className="text-xs font-bold text-[var(--sys-text-muted)] uppercase tracking-wider mb-4">
                    Leyenda de Semáforos
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <span className="w-5 h-5 rounded-full bg-[var(--sys-success)] text-[var(--sys-success)] traffic-light-glow shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-[var(--sys-text)]">Saludable</p>
                        <p className="text-xs text-[var(--sys-text-muted)]">Métrica óptima. Se encuentra dentro del presupuesto y cronograma planeado.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="w-5 h-5 rounded-full bg-[var(--sys-tertiary)] text-[var(--sys-tertiary)] traffic-light-glow shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-[var(--sys-text)]">Atención / Advertencia</p>
                        <p className="text-xs text-[var(--sys-text-muted)]">Desviación leve. Requiere monitoreo para evitar entrar en zona crítica.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="w-5 h-5 rounded-full bg-[var(--sys-error)] text-[var(--sys-error)] traffic-light-glow shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-[var(--sys-text)]">Acción Crítica</p>
                        <p className="text-xs text-[var(--sys-text-muted)]">Desviación peligrosa del plan original. Acción correctora inmediata recomendada.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tendencia de Desempeño (Gráfico) */}
                <div className="kpis-glass-card p-6 lg:col-span-2">
                  <h3 className="text-xs font-bold text-[var(--sys-text-muted)] uppercase tracking-wider mb-4">
                    Tendencia de Desempeño
                  </h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={detailData.trends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} stroke="var(--sys-border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--sys-text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: 'var(--sys-text-muted)' }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--sys-surface)', 
                            borderColor: 'var(--sys-border)',
                            borderRadius: '12px',
                            color: 'var(--sys-text)'
                          }} 
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                        <Line type="monotone" name="Alcance" dataKey="alcance" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" name="Cronograma (SPI)" dataKey="cronograma" stroke="var(--sys-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" name="Presupuesto" dataKey="presupuesto" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL OVERLAY: Registro de Riesgos Heurísticos */}
      {showRiskModal && detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setShowRiskModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />
          <div className="relative w-full max-w-md bg-[var(--sys-surface-raised)] rounded-3xl shadow-2xl overflow-hidden z-50 border border-[var(--sys-border)] animate-fade-in">
            <div className="p-6 border-b border-[var(--sys-border-soft)] flex justify-between items-center bg-[var(--sys-surface)]">
              <div>
                <h3 className="font-black text-[var(--sys-text)] text-lg">Registro de Riesgos Heurísticos</h3>
                <p className="text-[11px] text-[var(--sys-text-muted)] font-medium">Alertas automáticas en base a tendencias del proyecto.</p>
              </div>
              <button 
                onClick={() => setShowRiskModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--sys-surface-hover)] text-[var(--sys-text-muted)] font-bold text-sm"
              >
                Cerrar
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[300px] overflow-y-auto">
              {detailData.kpis.risks.warnings.length === 0 ? (
                <div className="text-center py-6 text-[var(--sys-text-muted)] text-sm flex flex-col items-center gap-2">
                  <CheckCircle className="w-10 h-10 text-[var(--sys-success)]" />
                  <span>No hay alertas activas de riesgos. El proyecto se encuentra dentro de los umbrales de seguridad.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {detailData.kpis.risks.warnings.map((warn: string, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 bg-[var(--sys-error)]/10 border border-[var(--sys-error)]/20 rounded-xl text-xs text-[var(--sys-text)]">
                      <AlertTriangle className="w-5 h-5 text-[var(--sys-error)] shrink-0" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
