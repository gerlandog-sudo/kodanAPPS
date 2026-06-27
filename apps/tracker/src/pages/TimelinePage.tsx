import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, Briefcase, Users, X, Sparkles, AlertTriangle, Clock, Scale, UserPlus, DollarSign } from 'lucide-react';
import { trackerApi, type TimelineDetails } from '../api/client';

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmt(d: Date) { return d.toISOString().split('T')[0]; }
function fmtShort(d: Date) { return d.toLocaleDateString('es', { day: 'numeric', month: 'short' }); }
function eachDay(s: string, e: string) { const d: Date[] = []; let c = new Date(s); const ed = new Date(e); while (c <= ed) { d.push(new Date(c)); c = addDays(c, 1); } return d; }

export function TimelinePage() {
  const [viewMode, setViewMode] = useState<'projects' | 'resources'>('projects');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: fmt(addDays(new Date(), -15)), to: fmt(addDays(new Date(), 15)) });
  const [selectedBucket, setSelectedBucket] = useState<{ id: number; name: string; date: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [details, setDetails] = useState<TimelineDetails>({ tasks: [], entries: [] });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = viewMode === 'projects' ? 'getTimelineProjects' : 'getTimelineResources';
      const res = await (trackerApi as any)[endpoint]({ from: filters.from, to: filters.to });
      setData(res);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [viewMode, filters]);

  const fetchDetails = async (id: number, name: string, date: string) => {
    setDetailsLoading(true);
    setDrawerOpen(true);
    setSelectedBucket({ id, name, date });
    setSuggestions(null);
    try {
      const type = viewMode === 'projects' ? 'project' : 'user';
      const res = await trackerApi.getTimelineDetails(type, id, date);
      setDetails(res);
    } catch (e) { console.error(e); } finally { setDetailsLoading(false); }
  };

  const analyzeWithAI = async () => {
    if (!selectedBucket) return;
    setAiLoading(true);
    try {
      const res = await trackerApi.reassignSuggestions({ project_id: selectedBucket.id });
      setSuggestions(res);
      setModalOpen(true);
    } catch (e) { console.error(e); } finally { setAiLoading(false); }
  };

  const executeReassign = async (taskId: number, userId: number) => {
    setExecuting(true);
    try {
      await trackerApi.reassignExecute(taskId, userId);
      setModalOpen(false);
      if (selectedBucket) fetchDetails(selectedBucket.id, selectedBucket.name, selectedBucket.date);
      fetchData();
    } catch (e) { console.error(e); } finally { setExecuting(false); }
  };

  const getStrategicConclusion = (text: string) => {
    if (!text) return '';
    const m = text.match(/(?:\[STRATEGIC_CONCLUSION(?:_START)?\]|<RESULTADO>)([\s\S]*?)(?:\[STRATEGIC_CONCLUSION_END\]|<\/RESULTADO>)/i);
    if (m) return m[1].trim();
    const parts = text.split(/### \d\.|Recomendación|Conclusión|Estratégica/i);
    const last = parts.pop()?.trim() || '';
    return last.replace(/[#*]/g, '').trim();
  };

  const [width, setWidth] = useState(1000);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((e) => { if (e[0]) setWidth(e[0].contentRect.width); });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const dateInterval = useMemo(() => eachDay(filters.from, filters.to), [filters.from, filters.to]);
  const chartW = Math.max(width - 40, 800);
  const rowH = 48;
  const h = Math.max(data.length * rowH + 120, 400);
  const xMax = chartW - 200;
  const dayW = xMax / Math.max(dateInterval.length, 1);
  const t0 = new Date(filters.from).getTime();
  const t1 = new Date(filters.to).getTime();

  const xPos = (date: string) => {
    const t = new Date(date).getTime();
    return ((t - t0) / (t1 - t0)) * xMax;
  };

  const priorityColor = (p: string) => {
    switch ((p || '').toLowerCase()) { case 'alta': case 'high': case 'critical': return 'bg-red-100 text-red-700 border-red-200'; case 'media': case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200'; default: return 'bg-blue-100 text-blue-700 border-blue-200'; }
  };

  return (
    <div className="relative">
      <div className={`space-y-4 transition-all duration-300 ${drawerOpen ? 'mr-[400px]' : ''}`}>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex gap-4 flex-1 min-w-[200px]">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Desde</label>
                <input type="date" value={filters.from} onChange={(e) => setFilters(p => ({ ...p, from: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Hasta</label>
                <input type="date" value={filters.to} onChange={(e) => setFilters(p => ({ ...p, to: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center">
              <button onClick={() => setViewMode('projects')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'projects' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Briefcase size={16} /> Proyectos</button>
              <button onClick={() => setViewMode('resources')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'resources' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Users size={16} /> Colaboradores</button>
            </div>
          </div>
        </div>

        <div ref={containerRef} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="h-64 flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          ) : data.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 font-medium">Sin datos</div>
          ) : (
            <svg width={chartW} height={h}>
              {/* Grid vertical */}
              {dateInterval.map((d, i) => (
                <line key={i} x1={xPos(fmt(d)) + dayW / 2} y1={20} x2={xPos(fmt(d)) + dayW / 2} y2={h - 60} stroke="#f1f5f9" strokeWidth={1} />
              ))}
              {/* Date headers */}
              {dateInterval.filter((_, i) => i % Math.max(1, Math.floor(dateInterval.length / 20)) === 0).map((d, i) => (
                <text key={i} x={xPos(fmt(d)) + dayW / 2} y={14} textAnchor="middle" fill="#94a3b8" fontSize={10} fontWeight={500}>{fmtShort(d)}</text>
              ))}
              {/* Rows */}
              {data.map((row, ri) => {
                const y = 30 + ri * rowH;
                const buckets = (viewMode === 'projects' ? row.data : row.logged_hours) || [];
                const isOverBudget = viewMode === 'projects' && (row.budget_hours > 0 && row.actual_hours > row.budget_hours);
                const isOverloaded = viewMode === 'resources' && (row.weekly_capacity > 0 && row.total_load > row.weekly_capacity);
                return (
                  <g key={row.id}>
                    {/* Label */}
                    <text x={0} y={y + rowH / 2 + 4} fill={isOverBudget || isOverloaded ? '#dc2626' : '#111827'} fontSize={11} fontWeight={800} textAnchor="start" dominantBaseline="middle">
                      {(isOverBudget || isOverloaded) ? '⚠ ' : ''}{row.name}
                    </text>
                    {/* Bar background */}
                    <rect x={0} y={y + 4} width={xMax} height={rowH - 8} fill="#f8fafc" rx={6} />
                    {/* Daily bars */}
                    {buckets.map((b: any, bi: number) => {
                      const bx = xPos(b.date);
                      const bh = parseFloat(b.total_hours) || 0;
                      const cap = viewMode === 'projects' ? 12 : (row.weekly_capacity / 5 || 8);
                      const intensity = Math.min(bh / cap, 1);
                      const overloaded = bh > cap;
                      const color = overloaded
                        ? `rgba(239, 68, 68, ${0.3 + intensity * 0.5})`
                        : `rgba(59, 130, 246, ${0.2 + intensity * 0.6})`;
                      return (
                        <rect
                          key={bi}
                          x={bx + 2} y={y + 6}
                          width={Math.max(dayW - 4, 2)} height={rowH - 12}
                          fill={color}
                          rx={4}
                          className="cursor-pointer transition-opacity hover:opacity-80"
                          onClick={() => fetchDetails(row.id, row.name, b.date)}
                        />
                      );
                    })}
                  </g>
                );
              })}
              {/* Bottom axis */}
              <line x1={0} y1={30 + data.length * rowH} x2={xMax} y2={30 + data.length * rowH} stroke="#e2e8f0" strokeWidth={1} />
            </svg>
          )}
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-[100] transform border-l border-gray-100 overflow-y-auto">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-start justify-between">
              <div className="flex-1 mr-4">
                <h2 className="text-lg font-black text-gray-900">{selectedBucket?.name}</h2>
                <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5 mt-2"><Calendar size={14} className="text-primary" /> {selectedBucket?.date}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-gray-200 rounded-xl"><X size={20} className="text-gray-500" /></button>
            </div>

            <div className="p-6 space-y-6">
              {detailsLoading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
              ) : (
                <>
                  {viewMode === 'projects' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl border bg-gray-50 border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Horas</p>
                        <p className="text-sm font-black text-gray-900"><Clock size={14} className="inline text-primary mr-1" /> {data.find((d: any) => d.id === selectedBucket?.id)?.actual_hours ?? '-'}h</p>
                      </div>
                      <div className="p-4 rounded-2xl border bg-gray-50 border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Presupuesto</p>
                        <p className="text-sm font-black text-gray-900"><DollarSign size={14} className="inline text-emerald-500 mr-1" /> {data.find((d: any) => d.id === selectedBucket?.id)?.budget_hours ?? '-'}h</p>
                      </div>
                    </div>
                  )}
                  {viewMode === 'resources' && (
                    <div className="p-4 rounded-2xl border bg-gray-50 border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Carga de Trabajo</p>
                      <p className="text-sm font-black text-gray-900"><Scale size={14} className="inline text-primary mr-1" /> {data.find((d: any) => d.id === selectedBucket?.id)?.total_load ?? 0}h asignadas vs {data.find((d: any) => d.id === selectedBucket?.id)?.weekly_capacity ?? 8}h capacidad</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={12} /> Horas Registradas</h3>
                    <div className="space-y-2">
                      {details.entries.length === 0 ? <p className="text-sm italic text-gray-400">Sin registros.</p> : details.entries.map((e: any) => (
                        <div key={e.id} className="bg-white border border-gray-100 p-3 rounded-2xl">
                          <div className="flex justify-between items-start mb-1"><span className="bg-primary/10 text-primary text-[11px] font-black px-2 py-0.5 rounded-lg">{e.hours}h</span><span className="text-[10px] font-bold text-gray-400">{e.collaborator_name}</span></div>
                          <p className="text-xs font-bold text-gray-800">{e.task_name}</p>
                          {e.description && <p className="text-[11px] text-gray-500 mt-1 italic">"{e.description}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">⚡ Tareas Kanban</h3>
                    <div className="space-y-2">
                      {details.tasks.length === 0 ? <p className="text-sm italic text-gray-400">Sin tareas pendientes.</p> : details.tasks.map((t: any) => (
                        <div key={t.id} className="bg-white border border-gray-100 p-3 rounded-2xl">
                          <div className="flex justify-between items-start mb-1"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${priorityColor(t.priority)}`}>{t.priority}</span><span className="text-[10px] font-bold text-gray-400">{t.collaborator_name || t.project_name}</span></div>
                          <p className="text-xs font-bold text-gray-800">{t.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] font-bold text-gray-500"><Clock size={10} className="inline mr-1" />{t.estimated_hours}h est.</span>
                            {viewMode === 'resources' && (
                              <button onClick={() => { setSelectedBucket(p => p ? { ...p, id: t.id } : null); analyzeWithAI(); }} className="flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-xl"><UserPlus size={12} /> Reasignar</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {viewMode === 'projects' && (
                    <button onClick={analyzeWithAI} disabled={aiLoading} className="w-full flex items-center justify-center gap-2 bg-primary text-white text-xs font-bold px-4 py-3 rounded-xl shadow-sm hover:brightness-110 transition-all disabled:opacity-50">
                      <Sparkles size={14} className={aiLoading ? 'animate-pulse' : ''} /> {aiLoading ? 'Analizando...' : 'Analizar con IA'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[90]" onClick={() => setDrawerOpen(false)} />
        </>
      )}

      {/* AI Modal */}
      {modalOpen && suggestions && (
        <>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setModalOpen(false)} />
            <div className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary"><Sparkles size={20} /></div>
                  <div><h3 className="text-base font-black text-gray-900">Análisis Estratégico de IA</h3><p className="text-[10px] font-bold text-gray-400 uppercase">Procesamiento Inteligente</p></div>
                </div>
                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-red-500 rounded-xl group"><X size={20} className="text-gray-400 group-hover:text-white" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {suggestions.candidates ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Desviación</p>
                        <p className="text-3xl font-black" style={{ color: '#22c55e' }}>-</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Carga Total</p>
                        <p className="text-3xl font-black text-gray-900">{suggestions.task?.estimated_hours ?? 0}h</p>
                      </div>
                    </div>
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex gap-4">
                      <div className="bg-amber-500 text-white p-2 rounded-xl"><AlertTriangle size={20} /></div>
                      <div>
                        <p className="text-xs font-black text-amber-900 uppercase mb-1">Recomendación</p>
                        <p className="text-sm text-amber-700 font-medium">{getStrategicConclusion(suggestions.ai_insight)}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-gray-400 uppercase mb-4 tracking-wider flex items-center gap-2"><Users size={14} className="text-primary" /> Candidatos Sugeridos</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {suggestions.candidates.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl">
                            <div>
                              <p className="text-sm font-black text-gray-900">{c.name}</p>
                              <p className="text-[10px] text-gray-400 font-bold">{c.current_load || 0}h carga actual</p>
                            </div>
                            <button onClick={() => executeReassign(suggestions.task.id, c.id)} disabled={executing} className="px-4 py-2 bg-primary text-white text-[10px] font-black rounded-xl hover:brightness-110 disabled:opacity-50 uppercase tracking-wider">
                              {executing ? '...' : 'Reasignar'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm">
                    <h4 className="text-xs font-black text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2"><Sparkles size={14} className="text-primary" /> Reporte de Salud</h4>
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{suggestions.ai_insight?.replace(/\[STRATEGIC_CONCLUSION(?:_START|_END)?\]/gi, '')}</div>
                  </div>
                )}
              </div>
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button onClick={() => setModalOpen(false)} className="px-8 py-3 text-[10px] font-black text-gray-500 hover:text-gray-900 uppercase tracking-wider">Cerrar</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
