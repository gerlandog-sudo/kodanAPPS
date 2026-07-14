import { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';
import type { BackupEntry } from '../api/client';
import { Button, Table } from '@kodan-apps/ui-core';
import { toast } from 'sonner';
import {
  HardDrive,
  RefreshCw,
  Play,
  Shield,
  Lock,
  Unlock,
  Loader2,
} from 'lucide-react';

export function BackupManagement() {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadBackups(); }, []);

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
