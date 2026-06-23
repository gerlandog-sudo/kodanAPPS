import { useEffect, useState } from 'react';
import { Button, Modal, Select } from '@kodan-apps/ui-core';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LostOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (closeReason: string) => Promise<void>;
  opportunityName: string;
  lostReasons?: string[];
}

export function LostOpportunityModal({
  isOpen,
  onClose,
  onSubmit,
  opportunityName,
  lostReasons = []
}: LostOpportunityModalProps) {
  const [closeReason, setCloseReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCloseReason(lostReasons.length > 0 ? lostReasons[0] : 'Otro / No especificado');
    }
  }, [isOpen, lostReasons]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeReason) {
      toast.error('El motivo de pérdida es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(closeReason);
      toast.success('Negociación marcada como perdida.');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar la negociación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Cierre de Negociación: Perdida">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'color-mix(in srgb, var(--sys-error) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--sys-error) 20%, transparent)' }}>
          <AlertTriangle className="text-xl" style={{ color: 'var(--sys-error)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>Registrar Pérdida Comercial</p>
            <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>
              Estás por marcar la negociación "{opportunityName}" como perdida. Por favor, selecciona el motivo principal del cierre.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
            MOTIVO DE PÉRDIDA *
          </label>
          <Select
            options={
              lostReasons.length > 0
                ? lostReasons.map(r => ({ value: r, label: r }))
                : [{ value: 'Otro / No especificado', label: 'Otro / No especificado' }]
            }
            value={closeReason}
            onChange={(val) => setCloseReason(String(val))}
            placeholder="Selecciona el motivo de pérdida..."
            disabled={loading}
          />
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading} className="btn-primary" style={{ backgroundColor: 'var(--sys-error)', color: 'var(--sys-on-error)' }}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <CheckCircle size={16} />
                Confirmar Cierre Perdido
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
