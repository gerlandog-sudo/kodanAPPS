import { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';
import type { BackupEntry, BackupLogEntry } from '../api/client';
import { Button, Table, ConfirmDialog } from '@kodan-apps/ui-core';
import { toast } from 'sonner';
import {
  HardDrive,
  RefreshCw,
  Play,
  Shield,
  Lock,
  Unlock,
  Trash2,
  Loader2,
  Clock,
  History,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export function BackupManagement() {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BackupEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [logs, setLogs] = useState<BackupLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    loadBackups();
    loadBackupLogs();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await superAdminApi.listBackups();
      setBackups(data);
    } catch (err: any) {
      toast.error(err.message || 'Error cargando backups');
    } finally { setLoading(false); }
  };

  const loadBackupLogs = async () => {
    try {
      setLogsLoading(true);
      const result = await superAdminApi.getBackupLogs();
      setLogs(result.logs);
    } catch {
      // Silencioso — los logs son solo informativos
    } finally { setLogsLoading(false); }
  };

  const handleRunBackup = async () => {
    setRunning(true);
    setError('');
    try {
      const result = await superAdminApi.runBackup();
      toast.success(result.message || 'Backup ejecutado correctamente');
      await loadBackups();
    } catch (err: any) {
      setError(err.message || 'Error ejecutando backup');
      toast.error(err.message || 'Error ejecutando backup');
    } finally { setRunning(false); }
  };

  const handleDeleteBackup = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await superAdminApi.deleteBackup(deleteTarget.filename);
      toast.success(result.message || 'Backup eliminado correctamente');
      setDeleteTarget(null);
      await loadBackups();
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando backup');
    } finally { setDeleting(false); }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-AR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HardDrive size={20} style={{ color: 'var(--sys-primary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--sys-text)' }}>Backups</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={loadBackups} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button variant="primary" onClick={handleRunBackup} disabled={running}>
            {running ? <><Loader2 size={16} className="animate-spin" /> Ejecutando...</> : <><Play size={16} /> Ejecutar Backup</>}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: 'var(--sys-error-container)', color: 'var(--color-on-error-container)' }}>
          <Shield size={14} /> {error}
        </div>
      )}

      <Table<BackupEntry>
        data={backups}
        columns={[
          {
            key: 'date',
            header: 'Fecha',
            sortable: true,
            render: entry => <span className="text-sm">{formatDate(entry.date)}</span>,
          },
          {
            key: 'filename',
            header: 'Archivo',
            render: entry => (
              <span className="text-xs font-mono" style={{ color: 'var(--sys-text-muted)' }}>
                {entry.filename}
              </span>
            ),
          },
          {
            key: 'size_human',
            header: 'Tamaño',
            sortable: true,
            render: entry => <span className="text-sm font-medium">{entry.size_human}</span>,
          },
          {
            key: 'encrypted',
            header: 'Cifrado',
            render: entry => (
              <span className="flex items-center gap-1.5 text-xs">
                {entry.encrypted ? (
                  <><Lock size={12} style={{ color: 'var(--sys-success)' }} /> Cifrado</>
                ) : (
                  <><Unlock size={12} style={{ color: 'var(--sys-text-muted)' }} /> Sin cifrar</>
                )}
              </span>
            ),
          },
          {
            key: 'actions' as any,
            header: '',
            render: entry => (
              <button
                type="button"
                onClick={() => setDeleteTarget(entry)}
                className="p-1.5 rounded-md transition-colors hover:bg-error/10 active:scale-95"
                style={{ color: 'var(--sys-text-muted)' }}
                title="Eliminar backup"
              >
                <Trash2 size={14} />
              </button>
            ),
          },
        ]}
        keyExtractor={entry => entry.filename}
        loading={loading}
        emptyState={{
          icon: <HardDrive size={40} />,
          title: 'No hay backups',
          description: 'Los backups se generan automáticamente o puedes ejecutar uno manual.',
        }}
        maxHeight="calc(100vh - 210px)"
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        onCancel={() => !deleting && setDeleteTarget(null)}
        title="Eliminar backup"
        message={
          <>
            ¿Estás seguro de que deseas eliminar el backup{' '}
            <strong className="break-all">{deleteTarget?.filename}</strong>?
            <br />
            <span className="text-xs opacity-70">Esta acción no se puede deshacer.</span>
          </>
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDeleteBackup}
        loading={deleting}
      />

      <div className="mt-4 flex items-center gap-4 text-xs" style={{ color: 'var(--sys-text-muted)' }}>
        <span className="flex items-center gap-1">
          <HardDrive size={12} /> Local: /opt/kodanapps/backups
        </span>
        <span className="flex items-center gap-1">
          <Shield size={12} /> Rotación: 7 días
        </span>
        {backups.length > 0 && (
          <span className="flex items-center gap-1">
            Último: {formatDate(backups[0].date)}
          </span>
        )}
      </div>

      {/* Historial de ejecuciones */}
      <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--sys-outline-variant)' }}>
        <div className="flex items-center gap-2 mb-3">
          <History size={16} style={{ color: 'var(--sys-primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--sys-text)' }}>
            Historial de ejecuciones
          </span>
          {logsLoading && <Loader2 size={14} className="animate-spin" />}
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
                <span className="text-xs font-medium">{formatDate(log.created_at)}</span>
              ),
            },
            {
              key: 'action',
              header: 'Tipo',
              width: '110px',
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
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
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
                <span className="text-xs font-mono truncate block max-w-[400px]" style={{ color: 'var(--sys-text-muted)' }}>
                  {log.details?.filename || '—'}
                </span>
              ),
            },
            {
              key: 'size',
              header: 'Tamaño',
              width: '80px',
              render: log => {
                const size = log.details?.size;
                if (size == null || size <= 0) return <span className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>—</span>;
                return (
                  <span className="text-xs font-medium">
                    {size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`}
                  </span>
                );
              },
            },
            {
              key: 'success',
              header: 'Estado',
              width: '90px',
              render: log => {
                const success = log.details?.success;
                if (success === true) {
                  return (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--sys-success)' }}>
                      <CheckCircle2 size={12} />
                      Éxito
                    </span>
                  );
                }
                if (success === false) {
                  return (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--sys-error)' }}>
                      <XCircle size={12} />
                      Fallo
                    </span>
                  );
                }
                return <span className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>—</span>;
              },
            },
          ]}
          keyExtractor={log => log.id}
          loading={logsLoading}
          pageSize={5}
          emptyState={{
            icon: <Clock size={36} />,
            title: 'Sin ejecuciones',
            description: 'Cuando el cron ejecute el backup automático (3 AM) o ejecutes uno manual, aparecerá aquí.',
          }}
          maxHeight="320px"
        />
      </div>
    </div>
  );
}
