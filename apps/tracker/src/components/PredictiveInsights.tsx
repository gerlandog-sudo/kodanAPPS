import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, Sparkles, Loader2, ArrowRight, Calculator, X, Play } from 'lucide-react';
import { toast } from 'sonner';
import { trackerApi, type PredictiveAlertsResponse } from '../api/client';

export function PredictiveInsights() {
  const [alerts, setAlerts] = useState<PredictiveAlertsResponse['alerts']>([]);
  const [loading, setLoading] = useState(true);
  const [insightTexts, setInsightTexts] = useState<Record<string, string>>({});
  const [loadingInsights, setLoadingInsights] = useState<Record<string, boolean>>({});
  const [simAlert, setSimAlert] = useState<{ projectName: string; index: number; metrics: any } | null>(null);
  const [simResult, setSimResult] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const res = await trackerApi.getPredictiveAlerts();
        const apiAlerts = res.alerts || [];
        setAlerts(apiAlerts);
        const loadingMap: Record<string, boolean> = {};
        apiAlerts.forEach((a: any) => { loadingMap[a.projectId] = true; });
        setLoadingInsights(loadingMap);
        setLoading(false);
        // Generate insights with delay
        setTimeout(() => generateInsights(apiAlerts), 800);
      } catch (e) {
        console.error(e);
        toast.error('Error al cargar alertas predictivas.');
        setLoading(false);
      }
    };
    init();
  }, []);

  const generateInsights = async (apiAlerts: any[]) => {
    for (const alert of apiAlerts) {
      const cacheKey = `insight_${alert.projectId}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setInsightTexts((p) => ({ ...p, [alert.projectId]: cached }));
        setLoadingInsights((p) => ({ ...p, [alert.projectId]: false }));
        continue;
      }
      try {
        const prompt = `Eres un Data Scientist Senior experto en SaaS de Productividad.
Basado en las métricas de este proyecto, genera un 'Insight' corto y accionable en lenguaje natural.
No uses formato Markdown. Sé directo e imperativo.
IMPORTANTE: El mensaje debe ser TOTALMENTE AGNOSTICO AL USUARIO. PROHIBIDO mencionar nombres de personas.
Responde en español.

Metricas del Proyecto '${alert.projectName}':
- Presupuesto Total: ${alert.metrics.budget_hours}hs
- Horas Consumidas: ${alert.metrics.consumed_hours}hs (${alert.metrics.budget_exhausted_percent}%)
- Burn Rate Semanal: ${alert.metrics.avg_weekly_hours}hs/semana
- Semanas para agotar presupuesto: ${alert.metrics.weeks_to_depletion}
- Mix de Seniority: ${alert.metrics.seniority_mix.senior_percent}% de horas Senior.

Estructura deseada: 'Atencion: [Deteccion del problema]. Sugerencia: [Accion correctiva].'`;

        const res = await trackerApi.generateAiText(prompt);
        const text = res.text || 'Error generando insight';
        sessionStorage.setItem(cacheKey, text);
        setInsightTexts((p) => ({ ...p, [alert.projectId]: text }));
      } catch (e) {
        console.error(e);
        toast.error('Error al generar insights con IA.');
      } finally {
        setLoadingInsights((p) => ({ ...p, [alert.projectId]: false }));
      }
    }
  };

  const handleSimulate = async () => {
    if (!simAlert) return;
    setSimulating(true);
    setSimResult(null);
    try {
      const prompt = `Eres un Experto en Operaciones SaaS.
Realiza una simulacion sobre el impacto de anadir un nuevo perfil al proyecto '${simAlert.projectName}'.
Datos actuales:
- Presupuesto: ${simAlert.metrics.budget_hours}hs
- Consumido: ${simAlert.metrics.consumed_hours}hs (${simAlert.metrics.budget_exhausted_percent}%)
- Burn Rate Semanal: ${simAlert.metrics.avg_weekly_hours}hs/semana

Genera un veredicto corto (max 40 palabras) en espanol sobre el impacto en tiempo y rentabilidad.`;
      const res = await trackerApi.generateAiText(prompt);
      setSimResult(res.text || 'Error');
    } catch (e) {
      console.error(e);
      toast.error('Error al simular escenario.');
    } finally { setSimulating(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-lg border border-gray-100 h-48">
        <Loader2 className="w-6 h-6 text-primary animate-spin mr-3" />
        <p className="text-gray-500 font-medium">Calculando predicciones e insights de IA...</p>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-gray-900">Alertas Predictivas de IA</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert, idx) => (
          <div key={alert.projectId} className={`p-5 rounded-lg border-l-4 shadow-sm relative overflow-hidden bg-white ${alert.priority === 'High' ? 'border-red-500' : alert.priority === 'Medium' ? 'border-amber-500' : 'border-primary'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-gray-900 capitalize flex items-center gap-1.5">{alert.projectName.toLowerCase()} <ArrowRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100" /></h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider border inline-block mt-1 ${alert.priority === 'High' ? 'bg-red-50 text-red-600 border-red-200' : alert.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                  {alert.priority === 'High' ? 'Crítica' : alert.priority === 'Medium' ? 'Media' : 'Baja'}
                </span>
              </div>
              {alert.priority === 'High' ? <AlertTriangle size={20} className="text-red-500" /> : <TrendingDown size={20} className="text-amber-500" />}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-2.5 rounded-md bg-gray-50">
                <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Consumo</p>
                <p className="text-sm font-bold text-gray-900">{alert.metrics.budget_exhausted_percent}%</p>
              </div>
              <div className="p-2.5 rounded-md bg-gray-50">
                <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Fin de Budget</p>
                <p className="text-sm font-bold text-gray-900">{typeof alert.metrics.weeks_to_depletion === 'number' ? `${alert.metrics.weeks_to_depletion} sem.` : alert.metrics.weeks_to_depletion}</p>
              </div>
              <div className="p-2.5 rounded-md bg-gray-50 col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] uppercase font-bold text-gray-500">Participación Senior</p>
                  <p className="text-xs font-bold text-gray-900">{alert.metrics.seniority_mix.senior_percent}%</p>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${alert.metrics.seniority_mix.senior_percent > 40 ? 'bg-red-400' : 'bg-primary/40'}`} style={{ width: `${alert.metrics.seniority_mix.senior_percent}%` }} />
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-md border ${loadingInsights[alert.projectId] ? 'animate-pulse bg-gray-50 border-gray-200' : 'bg-primary/5 border-primary/20'}`}>
              {loadingInsights[alert.projectId] ? (
                <div className="flex items-center gap-2"><Loader2 size={14} className="text-gray-400 animate-spin" /><p className="text-xs text-gray-400 italic">Redactando recomendación...</p></div>
              ) : (
                <div className="space-y-3">
                  <p className={`text-xs leading-relaxed font-medium ${alert.priority === 'High' ? 'text-red-700' : 'text-gray-700'}`}>
                    {insightTexts[alert.projectId]?.startsWith('Atención:') ? <><span className="font-extrabold uppercase">Atención:</span>{insightTexts[alert.projectId].substring(9)}</> : insightTexts[alert.projectId]}
                  </p>
                  <button onClick={() => setSimAlert({ projectName: alert.projectName, index: idx, metrics: alert.metrics })} className="flex items-center gap-1.5 text-xs text-white bg-primary hover:bg-primary/90 px-5 py-2.5 rounded-md shadow-sm">
                    <Calculator size={16} /> Simular Cambio
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Simulation Modal */}
      {simAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-md text-primary"><Calculator size={20} /></div><h3 className="font-bold text-gray-900">Simulación de Cambio</h3></div>
              <button onClick={() => setSimAlert(null)} className="p-2 hover:bg-gray-100 rounded-md text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Proyecto</p>
                <p className="font-bold text-gray-900 capitalize">{simAlert.projectName.toLowerCase()}</p>
              </div>
              {simResult && (
                <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sparkles size={14} /> Resultado</p>
                  <p className="text-sm font-medium text-emerald-900 leading-relaxed italic">"{simResult}"</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3">
              <button onClick={() => setSimAlert(null)} className="flex-1 px-6 py-3 font-bold text-gray-600 hover:text-gray-900 uppercase text-xs tracking-widest">Cancelar</button>
              <button onClick={handleSimulate} disabled={simulating} className="flex-1 px-6 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-md font-bold flex items-center justify-center gap-2 shadow-lg uppercase text-xs tracking-widest">
                {simulating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {simulating ? 'Procesando...' : 'Iniciar Simulación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
