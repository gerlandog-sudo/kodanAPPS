import { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';
import type { BackupEntry } from '../api/client';
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
} from 'lucide-react';

export function BackupManagement() {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BackupEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadBackups();
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

    </div>
  );
}
