import { useState, useEffect, useCallback } from 'react';
import { Button, Table, Modal } from '@kodan-apps/ui-core';
import type { TableColumn, TableAction } from '@kodan-apps/ui-core';
import { trackerApi, TimeEntry } from '../api/client';
import { CheckCircle, XCircle, CheckCheck } from 'lucide-react';

export function ApprovalsPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [rejectEntry, setRejectEntry] = useState<TimeEntry | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trackerApi.pendingApprovals();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: number) => {
    await trackerApi.approveTimeEntry(id);
    load();
  };

  const handleReject = async () => {
    if (!rejectEntry || !rejectReason.trim()) return;
    await trackerApi.rejectTimeEntry(rejectEntry.id, rejectReason);
    setRejectEntry(null);
    setRejectReason('');
    load();
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    await trackerApi.bulkApproveTimeEntries(Array.from(selectedIds));
    setSelectedIds(new Set());
    load();
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const columns: TableColumn<TimeEntry>[] = [
    {
      key: 'select', header: '', render: (e) => (
        <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleSelect(e.id)}
          className="rounded" style={{ accentColor: 'var(--sys-primary)' }}
        />
      ),
    },
    { key: 'date', header: 'Fecha', render: (e) => new Date(e.date).toLocaleDateString() },
    { key: 'user_name', header: 'Usuario', render: (e) => e.user_name },
    { key: 'project_name', header: 'Proyecto', render: (e) => e.project_name },
    { key: 'duration_minutes', header: 'Horas', render: (e) => `${Math.floor(e.duration_minutes / 60)}h ${e.duration_minutes % 60}m` },
    { key: 'calculated_cost', header: 'Costo', render: (e) => `$${e.calculated_cost.toFixed(2)}` },
  ];

  const actions: TableAction<TimeEntry>[] = [
    {
      icon: <CheckCircle size={14} />, label: 'Aprobar',
      onClick: (e) => handleApprove(e.id),
    },
    {
      icon: <XCircle size={14} />, label: 'Rechazar',
      variant: 'danger',
      onClick: (e) => { setRejectEntry(e); setRejectReason(''); },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-end">
        {selectedIds.size > 0 && (
          <Button variant="primary" onClick={handleBulkApprove}>
            <CheckCheck size={16} className="mr-1" /> Aprobar seleccionados ({selectedIds.size})
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        data={entries}
        loading={loading}
        keyExtractor={(e) => e.id}
        emptyState={{
          icon: <CheckCircle size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />,
          title: 'No hay registros pendientes',
          description: 'Todos los registros de tiempo están aprobados o no hay envíos pendientes.',
        }}
        actions={actions}
      />

      <Modal open={!!rejectEntry} onClose={() => setRejectEntry(null)}>
        <div className="p-6 space-y-4 min-w-[400px]">
          <h2 className="text-lg font-semibold">Rechazar registro de horas</h2>
          <p className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>
            {rejectEntry?.user_name} — {rejectEntry ? `${Math.floor(rejectEntry.duration_minutes / 60)}h ${rejectEntry.duration_minutes % 60}m` : ''} — {rejectEntry?.project_name}
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Motivo de rechazo *</label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
              style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-bg)', color: 'var(--sys-text)' }}
              rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Indicá el motivo del rechazo..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRejectEntry(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleReject} disabled={!rejectReason.trim()}>Rechazar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
