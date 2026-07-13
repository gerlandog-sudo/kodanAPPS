import { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';
import { PlanBuilder } from '@kodan-apps/ui-core';
import type { PlanMetric } from '@kodan-apps/ui-core';
import type { SubscriptionPlan } from '@kodan-apps/shared';
import { toast } from 'sonner';

export function PlanManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [metrics, setMetrics] = useState<PlanMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [plansData, metricsData] = await Promise.all([
        superAdminApi.listPlans(),
        superAdminApi.listAppMetrics(),
      ]);
      setPlans(plansData);
      setMetrics(metricsData as PlanMetric[]);
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
