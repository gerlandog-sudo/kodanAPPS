import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Input, ConfirmDialog } from '@kodan-apps/ui-core';
import type { TableColumn, TableAction } from '@kodan-apps/ui-core';
import { Plus, Search, RefreshCw, RotateCcw, Eye, EyeOff, Archive, Copy, Inbox } from 'lucide-react';
import { hubAdminApi, HubApp } from '../api/client';
import { AppFormModal } from '../components/AppFormModal';

export function AppsManagement() {
  const [apps, setApps] = useState<HubApp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<HubApp | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<HubApp | null>(null);
  const [tokenVisible, setTokenVisible] = useState<Record<number, boolean>>({});

  const limit = 15;

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await hubAdminApi.getApps(params);
      setApps(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Error fetching apps:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleSave = async (data: { name: string; custom_token?: string; app_identifier?: string }) => {
    if (editingApp) {
      await hubAdminApi.updateApp(editingApp.id, data);
    } else {
      await hubAdminApi.createApp(data);
    }
    setFormOpen(false);
    setEditingApp(null);
    fetchApps();
  };

  const handleRotateToken = async (id: number) => {
    await hubAdminApi.rotateToken(id);
    fetchApps();
  };

  const handleToggleStatus = async (app: HubApp) => {
    await hubAdminApi.toggleStatus(app.id);
    setConfirmToggle(null);
    fetchApps();
  };

  const handleArchive = async (id: number) => {
    await hubAdminApi.archiveApp(id);
    setConfirmDelete(null);
    fetchApps();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleTokenVisibility = (id: number) => {
    setTokenVisible(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskToken = (token: string) => {
    if (token.length <= 8) return token;
    return token.substring(0, 4) + '••••••••' + token.substring(token.length - 4);
  };

  const columns: TableColumn<HubApp>[] = [
    { key: 'name', header: 'Nombre', sortable: true, render: (item: HubApp) => item.name },
    { key: 'app_identifier', header: 'Identificador', sortable: true, render: (item: HubApp) => item.app_identifier ?? '—' },
    {
      key: 'token',
      header: 'Token',
      render: (item: HubApp) => (
        <div className="flex items-center gap-2 max-w-[260px]">
          <code className="text-xs truncate font-mono" style={{ color: 'var(--sys-primary)' }}>
            {tokenVisible[item.id] ? item.token : maskToken(item.token)}
          </code>
          <button
            onClick={() => toggleTokenVisibility(item.id)}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title={tokenVisible[item.id] ? 'Ocultar' : 'Mostrar'}
          >
            {tokenVisible[item.id] ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            onClick={() => copyToClipboard(item.token)}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title="Copiar"
          >
            <Copy size={14} />
          </button>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (item: HubApp) => {
        const v = item.status;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            v === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
            v === 'inactive' ? 'bg-amber-500/10 text-amber-400' :
            v === 'paused' ? 'bg-blue-500/10 text-blue-400' :
            'bg-slate-500/10 text-slate-400'
          }`}>
            <span className={`size-1.5 rounded-full ${
              v === 'active' ? 'bg-emerald-400' :
              v === 'inactive' ? 'bg-amber-400' :
              v === 'paused' ? 'bg-blue-400' :
              'bg-slate-400'
            }`} />
            {v === 'active' ? 'Activa' :
             v === 'inactive' ? 'Inactiva' :
             v === 'paused' ? 'Pausada' : 'Archivada'}
          </span>
        );
      },
    },
    { key: 'app_tokens', header: 'Tokens', sortable: true, render: (item: HubApp) => item.app_tokens?.toLocaleString() ?? '0' },
    { key: 'app_requests', header: 'Requests', sortable: true, render: (item: HubApp) => item.app_requests?.toLocaleString() ?? '0' },
    { key: 'created_at', header: 'Creada', render: (item: HubApp) => item.created_at ? new Date(item.created_at).toLocaleDateString() : '—' },
  ];

  const actions: TableAction<HubApp>[] = [
    {
      label: 'Rotar Token',
      icon: <RotateCcw size={14} />,
      onClick: (item: HubApp) => handleRotateToken(item.id),
    },
    {
      label: 'Cambiar Estado',
      icon: <Eye size={14} />,
      onClick: (item: HubApp) => setConfirmToggle(item),
    },
    {
      label: 'Archivar',
      icon: <Archive size={14} />,
      onClick: (item: HubApp) => setConfirmDelete(item.id),
      variant: 'danger',
    },
  ];

  const statusLabel = confirmToggle
    ? (confirmToggle.status === 'active' ? 'pausar' : 'activar')
    : '';

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      <Card className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sys-on-bg-muted)' }} />
            <Input
              placeholder="Buscar apps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={fetchApps} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button onClick={() => { setEditingApp(null); setFormOpen(true); }}>
            <Plus size={16} />
            Nueva App
          </Button>
        </div>

        <Table<HubApp>
          columns={columns}
          data={apps}
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
            title: 'No hay aplicaciones',
            description: 'No hay aplicaciones registradas. Creá una nueva para comenzar.',
          }}
        />
      </Card>

      {formOpen && (
        <AppFormModal
          app={editingApp}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingApp(null); }}
        />
      )}

      {confirmToggle && (
        <ConfirmDialog
          open
          title="Cambiar Estado"
          message={`¿Estás seguro de que querés ${statusLabel} la app "${confirmToggle.name}"?`}
          confirmLabel={statusLabel === 'pausar' ? 'Pausar' : 'Activar'}
          onConfirm={() => handleToggleStatus(confirmToggle)}
          onCancel={() => setConfirmToggle(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Archivar App"
          message="¿Estás seguro de archivar esta app? Los tokens asociados dejarán de funcionar."
          confirmLabel="Archivar"
          variant="danger"
          onConfirm={() => handleArchive(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
