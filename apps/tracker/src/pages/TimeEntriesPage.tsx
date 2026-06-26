import { useState, useEffect, useCallback } from 'react';
import { Button, Table, DatePicker, Select, ConfirmDialog } from '@kodan-apps/ui-core';
import type { TableColumn, TableAction } from '@kodan-apps/ui-core';
import { trackerApi, TimeEntry, Project } from '../api/client';
import { TimerWidget } from '../components/TimerWidget';
import { TimeEntryForm } from '../components/TimeEntryForm';
import { Clock, Filter } from 'lucide-react';

export function TimeEntriesPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formDuration, setFormDuration] = useState<number | undefined>();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), per_page: '50' };
      if (filterProject) params.project_id = filterProject;
      if (filterStatus) params.approval_status = filterStatus;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      const res = await trackerApi.listTimeEntries(params);
      setEntries(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, filterProject, filterStatus, filterDateFrom, filterDateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { trackerApi.listProjects().then(setProjects).catch(() => {}); }, []);

  const handleTimerSave = (duration: number) => {
    setFormDuration(duration);
    setFormOpen(true);
  };

  const handleFormSave = async (data: any) => {
    await trackerApi.createTimeEntry(data);
    setFormOpen(false);
    setFormDuration(undefined);
    load();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await trackerApi.deleteTimeEntry(deleteId);
      setDeleteId(null);
      load();
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#6b7280', submitted: '#3b82f6', approved: '#10b981', rejected: '#ef4444',
    };
    const labels: Record<string, string> = {
      draft: 'Borrador', submitted: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado',
    };
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: `${colors[status]}20`, color: colors[status] }}
      >
        {labels[status]}
      </span>
    );
  };

  const columns: TableColumn<TimeEntry>[] = [
    { key: 'date', header: 'Fecha', render: (e) => new Date(e.date).toLocaleDateString() },
    { key: 'project_name', header: 'Proyecto', render: (e) => e.project_name },
    { key: 'user_name', header: 'Usuario', render: (e) => e.user_name },
    { key: 'duration_minutes', header: 'Horas', render: (e) => `${Math.floor(e.duration_minutes / 60)}h ${e.duration_minutes % 60}m` },
    { key: 'approval_status', header: 'Estado', render: (e) => statusBadge(e.approval_status) },
    { key: 'calculated_cost', header: 'Costo', render: (e) => `$${e.calculated_cost.toFixed(2)}` },
  ];

  const actions: TableAction<TimeEntry>[] = [
    {
      icon: null!, label: 'Enviar',
      onClick: (e) => { trackerApi.submitTimeEntry(e.id).then(load); },
      variant: 'default',
      badge: (e) => e.approval_status === 'draft' ? true : undefined,
    },
    {
      icon: null!, label: 'Eliminar',
      onClick: (e) => setDeleteId(e.id),
      variant: 'danger',
      badge: (e) => e.approval_status === 'draft' ? true : undefined,
    },
  ];

  const projectOptions = [
    { value: '', label: 'Todos los proyectos' },
    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
  ];
  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'draft', label: 'Borrador' },
    { value: 'submitted', label: 'En revisión' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'rejected', label: 'Rechazado' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Clock size={22} /> Horas
        </h1>
        <Button variant="primary" onClick={() => { setFormDuration(undefined); setFormOpen(true); }}>
          Registrar tiempo
        </Button>
      </div>

      <TimerWidget onSave={handleTimerSave} />

      <div className="flex items-center gap-3 overflow-x-auto shrink-0 pb-1 scrollbar-none">
        <Filter size={16} style={{ color: 'var(--sys-text-muted)', flexShrink: 0 }} />
        <div className="w-48 shrink-0">
          <Select options={projectOptions} value={filterProject} onChange={setFilterProject} />
        </div>
        <div className="w-40 shrink-0">
          <Select options={statusOptions} value={filterStatus} onChange={setFilterStatus} />
        </div>
        <div className="shrink-0">
          <DatePicker value={filterDateFrom} onChange={setFilterDateFrom} placeholder="Desde" />
        </div>
        <div className="shrink-0">
          <DatePicker value={filterDateTo} onChange={setFilterDateTo} placeholder="Hasta" />
        </div>
      </div>

      <Table
        columns={columns}
        data={entries}
        loading={loading}
        keyExtractor={(e) => e.id}
        emptyState={{
          icon: <Clock size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />,
          title: 'No hay registros de tiempo',
          description: 'Registrá tu primer entrada de tiempo con el cronómetro o el botón "Registrar tiempo".',
        }}
        actions={actions}
      />

      <div className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>
        Total: {total} registros — Página {page}
      </div>

      {total > page * 50 && (
        <Button variant="ghost" onClick={() => setPage(page + 1)}>Cargar más</Button>
      )}

      <TimeEntryForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setFormDuration(undefined); }}
        onSave={handleFormSave}
        projects={projects}
        tasks={[]}
        initialDuration={formDuration}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar registro"
        message="¿Estás seguro?"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
