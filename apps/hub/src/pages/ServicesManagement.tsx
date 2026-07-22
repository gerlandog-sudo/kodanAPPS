import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Input, ConfirmDialog } from '@kodan-apps/ui-core';
import type { TableColumn, TableAction } from '@kodan-apps/ui-core';
import { Plus, Search, RefreshCw, Trash2, TestTube, CheckCircle, XCircle, Inbox, Pencil } from 'lucide-react';
import { hubAdminApi, ServiceAssignment } from '../api/client';
import { ServiceFormModal } from '../components/ServiceFormModal';
import { ServiceDiagnosticModal } from '../components/ServiceDiagnosticModal';

export function ServicesManagement() {
  const [services, setServices] = useState<ServiceAssignment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceAssignment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [diagServiceId, setDiagServiceId] = useState<number | null>(null);

  const limit = 15;

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await hubAdminApi.getServices(params);
      setServices(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const handleSave = async (data: Record<string, unknown>) => {
    if (editingService) {
      await hubAdminApi.updateService(editingService.id, data);
    } else {
      await hubAdminApi.createService(data);
    }
    setFormOpen(false);
    setEditingService(null);
    fetchServices();
  };

  const handleDelete = async (id: number) => {
    await hubAdminApi.deleteService(id);
    setConfirmDelete(null);
    fetchServices();
  };

  const columns: TableColumn<ServiceAssignment>[] = [
    { key: 'app_name', header: 'App', sortable: true, render: (item) => item.app_name },
    { key: 'model_name', header: 'Modelo', sortable: true, render: (item) => item.model_name },
    { key: 'provider', header: 'Proveedor', sortable: true, render: (item) => item.provider },
    {
      key: 'protocol',
      header: 'Protocolo',
      render: (item) => item.protocol ? (
        <code className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--sys-surface-variant)', color: 'var(--sys-primary)' }}>
          {item.protocol}
        </code>
      ) : '—',
    },
    { key: 'priority', header: 'Prioridad', sortable: true, render: (item) => item.priority },
    {
      key: 'is_active',
      header: 'Estado',
      render: (item) => item.is_active ? (
        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
          <CheckCircle size={14} /> Activo
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
          <XCircle size={14} /> Inactivo
        </span>
      ),
    },
  ];

  const actions: TableAction<ServiceAssignment>[] = [
    {
      label: 'Testear',
      icon: <TestTube size={14} />,
      onClick: (row) => setDiagServiceId(row.id),
    },
    {
      label: 'Editar',
      icon: <Pencil size={14} />,
      onClick: (row) => { setEditingService(row); setFormOpen(true); },
    },
    {
      label: 'Eliminar',
      icon: <Trash2 size={14} />,
      onClick: (row) => setConfirmDelete(row.id),
      variant: 'danger',
    },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--sys-on-bg)' }}>Asignación IA</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sys-on-bg-muted)' }}>
            Vinculá apps con modelos del catálogo
          </p>
        </div>
        <Button onClick={() => { setEditingService(null); setFormOpen(true); }}>
          <Plus size={16} />
          Nueva Asignación
        </Button>
      </div>

      <Card className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sys-on-bg-muted)' }} />
            <Input
              placeholder="Buscar asignaciones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={fetchServices} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>

        <Table
          columns={columns}
          data={services}
          keyExtractor={(item) => item.id}
          loading={loading}
          actions={actions}
          maxHeight="100%"
          currentPage={page}
          pageSize={limit}
          totalRecords={total}
          onPageChange={setPage}
          emptyState={{
            icon: <Inbox size={48} />,
            title: 'Sin asignaciones',
            description: 'No hay asignaciones configuradas',
          }}
        />
      </Card>

      {formOpen && (
        <ServiceFormModal
          service={editingService}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingService(null); }}
        />
      )}

      {diagServiceId && (
        <ServiceDiagnosticModal
          serviceId={diagServiceId}
          onClose={() => setDiagServiceId(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Asignación"
        message="¿Estás seguro de eliminar esta asignación? La app perderá acceso a este modelo."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => handleDelete(confirmDelete!)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
