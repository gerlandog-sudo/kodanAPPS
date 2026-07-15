import { useState, useEffect } from 'react';
import { Modal, statusColor } from '@kodan-apps/ui-core';
import { trackerApi } from '../api/client';
import { Clock, AlertCircle } from 'lucide-react';

interface AuditLog {
  id: number;
  tenant_id: number;
  time_entry_id: number;
  user_id: number;
  action: string;
  status: string;
  description: string;
  details: string | null;
  created_at: string;
  user_name: string | null;
}

interface TimeEntryHistoryModalProps {
  open: boolean;
  onClose: () => void;
  entryId: number | null;
}

export function TimeEntryHistoryModal({ open, onClose, entryId }: TimeEntryHistoryModalProps) {
  const [history, setHistory] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && entryId) {
      setLoading(true);
      setError('');
      trackerApi.getTimeEntryHistory(entryId)
        .then((res) => {
          setHistory(res as any);
        })
        .catch((err) => {
          console.error(err);
          setError('No se pudo cargar el historial de auditoría.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setHistory([]);
    }
  }, [open, entryId]);

  const formatHistoryDate = (dateStr: string) => {
    // dateStr is like "2026-06-08 14:48:02"
    const date = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const month = months[date.getMonth()];
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${day} ${month}, ${hh}:${mm}:${ss}`;
  };

  return (
    <Modal open={open} onClose={onClose} title="Registro de Auditoría" className="max-w-md">
      <div className="space-y-6">
        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="size-6 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-text-muted">Cargando historial...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-3.5 rounded-lg border border-error/20 bg-error/5 text-error text-xs">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-text-muted/40">
            <Clock size={28} className="opacity-40" />
            <p className="mt-2 text-xs font-semibold">Sin registros de auditoría</p>
            <p className="text-[10px] opacity-70">Los cambios futuros en este registro aparecerán aquí.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Línea conectora de la línea de tiempo */}
            <div className="absolute left-[15px] top-3.5 bottom-3.5 w-[2px] bg-border-soft" />

            <div className="space-y-6">
              {history.map((log) => {
                return (
                  <div key={log.id} className="relative pl-10">
                    {/* Círculo de la línea de tiempo */}
                    <div className="absolute left-[9px] top-1.5 size-3.5 rounded-full border-2 bg-surface-raised" style={{ borderColor: statusColor(log.status) }} />

                    <div className="space-y-1">
                      {/* Estado superior y Fecha */}
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-bold tracking-wider uppercase" style={{ color: statusColor(log.status) }}>
                          {log.status}
                        </span>
                        <span className="text-[10px] text-text-muted font-medium">
                          {formatHistoryDate(log.created_at)}
                        </span>
                      </div>

                      {/* Título de la acción */}
                      <p className="text-xs font-semibold text-text">
                        {log.description}
                      </p>

                      {/* Colaborador */}
                      <p className="text-[10px] text-text-muted">
                        Colaborador: {log.user_name || 'Sistema'}
                      </p>

                      {/* Detalles opcionales (ej: motivo de rechazo) */}
                      {log.action === 'rejected' && log.details && (
                        <div className="mt-1.5 p-2 rounded bg-error-container/20 border border-error-container/40 text-[10px] text-error italic">
                          Motivo: {log.details}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
