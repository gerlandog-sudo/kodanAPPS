import { useEffect, useState, useCallback } from 'react';
import { superAdminApi } from '../api/client';
import type { BackupLogEntry } from '../api/client';
import { Table } from '@kodan-apps/ui-core';
import { toast } from 'sonner';
import {
  History,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

export function BackupLogs() {
  const [logs, setLogs] = useState<BackupLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await superAdminApi.getBackupLogs();
      setLogs(result.logs);
    } catch (err: any) {
      toast.error(err.message || 'Error cargando historial de backups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={20} style={{ color: 'var(--sys-primary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--sys-text)' }}>
            Historial de Ejecuciones
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="p-2 rounded-lg transition-colors hover:bg-surface-container-high active:scale-95"
            style={{ color: 'var(--sys-text-muted)' }}
            title="Recargar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <Table<BackupLogEntry>
        data={logs}
        columns={[
          {
            key: 'created_at',
            header: 'Fecha',
            sortable: true,
            width: '180px',
            render: log => (
              <span className="text-sm font-medium">{formatDate(log.created_at)}</span>
            ),
          },
          {
            key: 'action',
            header: 'Tipo',
            width: '120px',
            render: log => {
              const isAuto = log.action === 'BACKUP_AUTO';
              const isManual = log.action === 'BACKUP_MANUAL';
              const color = isAuto
                ? 'var(--sys-success)'
                : isManual
                  ? 'var(--sys-primary)'
                  : 'var(--sys-error)';
              const bg = isAuto
                ? 'color-mix(in srgb, var(--sys-success) 15%, transparent)'
                : isManual
                  ? 'color-mix(in srgb, var(--sys-primary) 15%, transparent)'
                  : 'color-mix(in srgb, var(--sys-error) 15%, transparent)';
              const label = isAuto
                ? 'Automático'
                : isManual
                  ? 'Manual'
                  : 'Eliminado';
              return (
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold"
                  style={{ background: bg, color }}
                >
                  {label}
                </span>
              );
            },
          },
          {
            key: 'filename',
            header: 'Archivo',
            render: log => (
              <span
                className="text-xs font-mono truncate block max-w-[500px]"
                style={{ color: 'var(--sys-text-muted)' }}
              >
                {log.details?.filename || '—'}
              </span>
            ),
          },
          {
            key: 'size',
            header: 'Tamaño',
            width: '100px',
            render: log => {
              const size = log.details?.size;
              if (size == null || size <= 0) {
                return <span className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>—</span>;
              }
              const formatted =
                size < 1024
                  ? `${size} B`
                  : size < 1048576
                    ? `${(size / 1024).toFixed(1)} KB`
                    : `${(size / 1048576).toFixed(2)} MB`;
              return <span className="text-sm font-medium">{formatted}</span>;
            },
          },
          {
            key: 'success',
            header: 'Estado',
            width: '100px',
            render: log => {
              const success = log.details?.success;
              if (success === true) {
                return (
                  <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--sys-success)' }}>
                    <CheckCircle2 size={14} />
                    Éxito
                  </span>
                );
              }
              if (success === false) {
                return (
                  <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--sys-error)' }}>
                    <XCircle size={14} />
                    Fallo
                  </span>
                );
              }
              return <span className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>—</span>;
            },
          },
          {
            key: 'output',
            header: 'Detalle',
            render: log => {
              const output = log.details?.output;
              if (!output) {
                return <span className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>—</span>;
              }
              return (
                <span
                  className="text-xs truncate block max-w-[300px]"
                  style={{ color: 'var(--sys-text-muted)' }}
                  title={output}
                >
                  {output.slice(0, 120)}
                  {output.length > 120 ? '...' : ''}
                </span>
              );
            },
          },
        ]}
        keyExtractor={log => log.id}
        loading={loading}
        pageSize={10}
        emptyState={{
          icon: <Clock size={40} />,
          title: 'Sin ejecuciones',
          description:
            'Cuando el cron ejecute el backup automático (3 AM) o ejecutes uno manual desde la sección Backups, aparecerá aquí.',
        }}
        maxHeight="calc(100vh - 210px)"
      />
    </div>
  );
}
