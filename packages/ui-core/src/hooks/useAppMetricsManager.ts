import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface AppItem {
  app_id: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
}

export interface AppMetricItem {
  app_id: string;
  metric: string;
  label: string;
  description: string | null;
  metric_type: 'limit_entity' | 'counter_usage';
  default_value: number;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface MetricFormState {
  app_id: string;
  metric: string;
  label: string;
  description: string;
  metric_type: string;
  default_value: number;
  sort_order: number;
}

interface AppFormState {
  app_id: string;
  name: string;
  description: string;
}

export interface UseAppMetricsManagerProps {
  apps: AppItem[];
  metrics: AppMetricItem[];
  loading?: boolean;
  onRefresh: () => Promise<void>;
  onCreateMetric: (app: string, data: { metric: string; label: string; description?: string; metric_type?: string; default_value?: number; sort_order?: number }) => Promise<void>;
  onUpdateMetric: (app: string, metric: string, data: { label?: string; description?: string; metric_type?: string; default_value?: number; is_active?: boolean; sort_order?: number }) => Promise<void>;
  onDeleteMetric: (app: string, metric: string) => Promise<void>;
  onCreateApp: (data: { app_id: string; name: string; description?: string }) => Promise<void>;
  onUpdateApp: (appId: string, data: { name?: string; description?: string; is_active?: boolean }) => Promise<void>;
  onDeleteApp: (appId: string) => Promise<void>;
}

export const KNOWN_METRICS: Record<string, Array<{ metric: string; label: string }>> = {
  crm: [
    { metric: 'users_max', label: 'Usuarios m\u00e1ximos' },
    { metric: 'negotiations_max', label: 'Negociaciones activas' },
    { metric: 'pipelines_max', label: 'Pipelines' },
    { metric: 'accounts_max', label: 'Cuentas' },
    { metric: 'contacts_max', label: 'Contactos' },
    { metric: 'api_calls_month', label: 'Llamadas API/mes' },
  ],
  tracker: [
    { metric: 'users_max', label: 'Usuarios m\u00e1ximos' },
    { metric: 'projects_max', label: 'Proyectos activos' },
    { metric: 'tasks_max', label: 'Tareas activas' },
    { metric: 'time_entries_max', label: 'Registros tiempo/mes' },
    { metric: 'api_calls_month', label: 'Llamadas API/mes' },
  ],
};

export const TYPE_LABELS: Record<string, string> = {
  limit_entity: 'L\u00edmite de entidad',
  counter_usage: 'Contador de uso',
};

export function useAppMetricsManager(props: UseAppMetricsManagerProps) {
  const { apps, metrics, onRefresh, onCreateMetric, onUpdateMetric, onDeleteMetric, onCreateApp, onUpdateApp, onDeleteApp } = props;

  const [tabIndex, setTabIndex] = useState(0);
  const [editMetric, setEditMetric] = useState<AppMetricItem | null>(null);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [showAppForm, setShowAppForm] = useState(false);
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [openMenuTab, setOpenMenuTab] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ app: string; metric: string; label: string } | null>(null);
  const [deleteAppTarget, setDeleteAppTarget] = useState<AppItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [metricForm, setMetricForm] = useState<MetricFormState>({
    app_id: apps[0]?.app_id || '',
    metric: '',
    label: '',
    description: '',
    metric_type: 'limit_entity',
    default_value: 0,
    sort_order: 0,
  });

  const [appForm, setAppForm] = useState<AppFormState>({
    app_id: '',
    name: '',
    description: '',
  });

  const selectedApp = apps[tabIndex] || apps[0];
  const appMetrics = metrics
    .filter(m => m.app_id === selectedApp?.app_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const metricKeyOptions = (appId: string) => {
    const known = KNOWN_METRICS[appId] || [];
    return [
      ...known.map(m => ({ value: m.metric, label: m.label + ' (' + m.metric + ')' })),
      { value: '__custom__', label: '\u2014 Otro (personalizado) \u2014' },
    ];
  };

  const appOptions = apps.map(a => ({ value: a.app_id, label: a.name }));
  const metricTypeOptions = [
    { value: 'limit_entity', label: 'L\u00edmite de entidad' },
    { value: 'counter_usage', label: 'Contador de uso' },
  ];

  const openCreateMetric = useCallback(() => {
    setEditMetric(null);
    setMetricForm({
      app_id: selectedApp?.app_id || apps[0]?.app_id || '',
      metric: '',
      label: '',
      description: '',
      metric_type: 'limit_entity',
      default_value: 0,
      sort_order: metrics.length,
    });
    setShowMetricForm(true);
  }, [selectedApp, apps, metrics]);

  const openEditMetric = useCallback((m: AppMetricItem) => {
    setEditMetric(m);
    setMetricForm({
      app_id: m.app_id,
      metric: m.metric,
      label: m.label,
      description: m.description || '',
      metric_type: m.metric_type,
      default_value: m.default_value,
      sort_order: m.sort_order,
    });
    setShowMetricForm(true);
  }, []);

  const openCreateApp = useCallback(() => {
    setEditingApp(null);
    setAppForm({ app_id: '', name: '', description: '' });
    setShowAppForm(true);
  }, []);

  const openEditApp = useCallback((app: AppItem) => {
    setEditingApp(app);
    setAppForm({ app_id: app.app_id, name: app.name, description: app.description || '' });
    setShowAppForm(true);
  }, []);

  const handleSubmitMetric = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metricForm.metric.trim() || !metricForm.label.trim()) {
      toast.error('Metric y Label son requeridos');
      return;
    }
    setSubmitting(true);
    try {
      if (editMetric) {
        await onUpdateMetric(editMetric.app_id, editMetric.metric, {
          label: metricForm.label,
          description: metricForm.description,
          metric_type: metricForm.metric_type,
          default_value: metricForm.default_value,
          sort_order: metricForm.sort_order,
        });
      } else {
        await onCreateMetric(metricForm.app_id, {
          metric: metricForm.metric.trim(),
          label: metricForm.label.trim(),
          description: metricForm.description,
          metric_type: metricForm.metric_type,
          default_value: metricForm.default_value,
          sort_order: metricForm.sort_order,
        });
      }
      setShowMetricForm(false);
      setEditMetric(null);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error guardando m\u00e9trica');
    } finally {
      setSubmitting(false);
    }
  }, [metricForm, editMetric, onUpdateMetric, onCreateMetric, onRefresh]);

  const handleSubmitApp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingApp) {
      if (!appForm.name.trim()) {
        toast.error('Nombre es requerido');
        return;
      }
      setSubmitting(true);
      try {
        await onUpdateApp(editingApp.app_id, { name: appForm.name, description: appForm.description });
        setShowAppForm(false);
        setEditingApp(null);
        await onRefresh();
      } catch (err: any) {
        toast.error(err.message || 'Error actualizando app');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!appForm.app_id.trim() || !appForm.name.trim()) {
        toast.error('App ID y Nombre son requeridos');
        return;
      }
      if (!/^[a-z][a-z0-9_]*$/.test(appForm.app_id.trim())) {
        toast.error('App ID: solo min\u00fasculas, n\u00fameros y gui\u00f3n bajo (ej: nueva_app)');
        return;
      }
      setSubmitting(true);
      try {
        await onCreateApp({ app_id: appForm.app_id.trim(), name: appForm.name.trim(), description: appForm.description });
        setShowAppForm(false);
        setTabIndex(apps.length);
        await onRefresh();
      } catch (err: any) {
        toast.error(err.message || 'Error creando app');
      } finally {
        setSubmitting(false);
      }
    }
  }, [editingApp, appForm, onUpdateApp, onRefresh, onCreateApp, apps.length]);

  const handleDeleteMetric = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await onDeleteMetric(deleteTarget.app, deleteTarget.metric);
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando m\u00e9trica');
    }
  }, [deleteTarget, onDeleteMetric, onRefresh]);

  const handleDeleteApp = useCallback(async () => {
    if (!deleteAppTarget) return;
    try {
      await onDeleteApp(deleteAppTarget.app_id);
      setDeleteAppTarget(null);
      if (tabIndex >= apps.length - 1) setTabIndex(Math.max(0, apps.length - 2));
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando app');
    }
  }, [deleteAppTarget, onDeleteApp, tabIndex, apps.length, onRefresh]);

  return {
    // values
    tabIndex, setTabIndex,
    selectedApp, appMetrics,
    editMetric, setEditMetric,
    showMetricForm, setShowMetricForm,
    showAppForm, setShowAppForm,
    editingApp, setEditingApp,
    openMenuTab, setOpenMenuTab,
    deleteTarget, setDeleteTarget,
    deleteAppTarget, setDeleteAppTarget,
    submitting,
    metricForm, setMetricForm,
    appForm, setAppForm,
    appOptions,
    metricKeyOptions,
    metricTypeOptions,
    openCreateMetric,
    openEditMetric,
    openCreateApp,
    openEditApp,
    handleSubmitMetric,
    handleSubmitApp,
    handleDeleteMetric,
    handleDeleteApp,
  };
}
