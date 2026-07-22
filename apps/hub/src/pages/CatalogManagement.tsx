import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Input, ConfirmDialog } from '@kodan-apps/ui-core';
import type { TableColumn, TableAction } from '@kodan-apps/ui-core';
import { Plus, Search, RefreshCw, Trash2, Pencil, CheckCircle, XCircle } from 'lucide-react';
import { hubAdminApi, CatalogEntry } from '../api/client';
import { CatalogFormModal } from '../components/CatalogFormModal';

export function CatalogManagement() {
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CatalogEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const limit = 15;

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await hubAdminApi.getCatalog(params);
      setEntries(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Error fetching catalog:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const handleSave = async (data: Record<string, unknown>) => {
    if (editingEntry) {
      await hubAdminApi.updateCatalogEntry(editingEntry.id, data);
    } else {
      await hubAdminApi.createCatalogEntry(data);
    }
    setFormOpen(false);
    setEditingEntry(null);
    fetchCatalog();
  };

  const handleDelete = async (id: number) => {
    await hubAdminApi.deleteCatalogEntry(id);
    setConfirmDelete(null);
    fetchCatalog();
  };

  const columns: TableColumn<CatalogEntry>[] = [
    { key: 'name', header: 'Nombre', sortable: true, render: (item: CatalogEntry) => item.name },
    { key: 'provider', header: 'Proveedor', sortable: true, render: (item: CatalogEntry) => item.provider },
    { key: 'identifier', header: 'Modelo', sortable: true, render: (item: CatalogEntry) => item.identifier },
    {
      key: 'protocol',
      header: 'Protocolo',
      render: (item: CatalogEntry) => (
        <code className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--sys-surface-variant)', color: 'var(--sys-primary)' }}>
          {item.protocol}
        </code>
      ),
    },
    { key: 'endpoint', header: 'Endpoint', render: (item: CatalogEntry) => (
      <span className="text-xs truncate max-w-[200px] inline-block align-middle" title={item.endpoint}>{item.endpoint}</span>
    )},
    {
      key: 'is_active',
      header: 'Estado',
      render: (item: CatalogEntry) => item.is_active ? (
        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
          <CheckCircle size={14} /> Activo
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
          <XCircle size={14} /> Inactivo
        </span>
      ),
    },
    { key: 'created_at', header: 'Creado', render: (item: CatalogEntry) => item.created_at ? new Date(item.created_at).toLocaleDateString() : '—' },
  ];

  const actions: TableAction<CatalogEntry>[] = [
    {
      label: 'Editar',
      icon: <Pencil size={14} />,
      onClick: (row: CatalogEntry) => { setEditingEntry(row); setFormOpen(true); },
    },
    {
      label: 'Eliminar',
      icon: <Trash2 size={14} />,
      onClick: (row: CatalogEntry) => setConfirmDelete(row.id),
      variant: 'danger',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      <Card className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sys-on-bg-muted)' }} />
            <Input
              placeholder="Buscar modelos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={fetchCatalog} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button onClick={() => { setEditingEntry(null); setFormOpen(true); }}>
            <Plus size={16} />
            Nuevo Modelo
          </Button>
        </div>

        <Table
          columns={columns}
          data={entries}
          keyExtractor={(e) => e.id}
          loading={loading}
          actions={actions}
          maxHeight="100%"
          currentPage={page}
          pageSize={limit}
          totalRecords={total}
          onPageChange={setPage}
          emptyState={{
            icon: <Search size={32} />,
            title: 'Sin resultados',
            description: 'No hay modelos en el catálogo',
          }}
        />
      </Card>

      {formOpen && (
        <CatalogFormModal
          entry={editingEntry}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingEntry(null); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Modelo"
        message="¿Estás seguro de eliminar este modelo del catálogo? Las asignaciones activas podrían verse afectadas."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => handleDelete(confirmDelete!)}
        onCancel={() => setConfirmDelete(null)}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
