import { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';
import { PlanBuilder } from '@kodan-apps/ui-core';
import type { PlanMetric } from '@kodan-apps/ui-core';
import { toast } from 'sonner';

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  created_at: string;
  updated_at: string;
  limits: Array<{ module: string; metric: string; value: number }>;
}

export function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [metrics, setMetrics] = useState<PlanMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [plansData, metricsData] = await Promise.all([
        superAdminApi.listPlans() as Promise<Plan[]>,
        superAdminApi.listAppMetrics() as Promise<PlanMetric[]>,
      ]);
      setPlans(plansData);
      setMetrics(metricsData);
    } catch (err: any) {
      toast.error(err.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PlanBuilder
      plans={plans}
      metrics={metrics}
      loading={loading}
      onCreate={async (data) => {
        await superAdminApi.createPlan(data);
        await loadAll();
      }}
      onUpdate={async (id, data) => {
        await superAdminApi.updatePlan(id, data);
        await loadAll();
      }}
      onDelete={async (id) => {
        await superAdminApi.deletePlan(id);
        await loadAll();
      }}
      onRefresh={loadAll}
    />
  );
}
