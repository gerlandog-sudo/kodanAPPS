import { useState } from 'react';
import { Button, Modal, Input } from '@kodan-apps/ui-core';
import { Trophy, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WonOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { tracker_project_name: string; budgeted_hours: number }) => Promise<void>;
  defaultName: string;
}

export function WonOpportunityModal({ isOpen, onClose, onSubmit, defaultName }: WonOpportunityModalProps) {
  const [projectName, setProjectName] = useState(defaultName);
  const [hours, setHours] = useState('0');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error('El nombre del proyecto es obligatorio.');
      return;
    }
    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours < 0) {
      toast.error('Las horas presupuestadas deben ser un número mayor o igual a 0.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        tracker_project_name: projectName,
        budgeted_hours: parsedHours,
      });
      toast.success('¡Negociación ganada y proyecto creado en TimeTracker!');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error al transicionar la negociación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="¡Felicitaciones! Oportunidad Ganada">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'color-mix(in srgb, var(--sys-success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--sys-success) 20%, transparent)' }}>
          <Trophy className="text-xl" style={{ color: 'var(--sys-success)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sys-text)' }}>Transición Comercial Exitosa</p>
            <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>Esto creará automáticamente un proyecto vinculado en kodanTRACKER para su seguimiento.</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
            NOMBRE DEL PROYECTO (TRACKER)
          </label>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Ej: Desarrollo Portal Web"
            required
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold" style={{ color: 'var(--sys-text-muted)' }}>
            HORAS PRESUPUESTADAS
          </label>
          <div className="relative">
            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--sys-text-muted)' }} />
            <input
              type="number"
              className="input"
              style={{ paddingLeft: '2.5rem' }}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0.00"
              step="0.25"
              min="0"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner" />
                Guardando...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <CheckCircle size={16} />
                Confirmar Cierre Ganado
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
