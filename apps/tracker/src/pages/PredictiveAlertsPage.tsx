import { PredictiveInsights } from '../components/PredictiveInsights';
import { Sparkles } from 'lucide-react';

export function PredictiveAlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <div className="px-4 py-2 rounded-lg flex items-center gap-2 border border-primary/30 bg-primary/5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Motor IA Activo</span>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <PredictiveInsights />
      </div>
    </div>
  );
}
