import { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { toast } from 'sonner';

interface TenantOverrideModalProps {
  tenantId: number;
  module: string;
  metric: string;
  currentLimitValue: number;
  onSave: (customValue: number) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}

type OverrideOption = 'plan' | 'unlimited' | 'blocked' | 'custom';

const METRIC_LABELS: Record<string, string> = {
  users_max: 'Usuarios máximos',
  negotiations_max: 'Negociaciones activas',
  pipelines_max: 'Pipelines',
  accounts_max: 'Cuentas',
  contacts_max: 'Contactos',
  projects_max: 'Proyectos',
  tasks_max: 'Tareas',
  time_entries_max: 'Reg. tiempo',
  api_calls_month: 'API Calls/mes',
};

export function TenantOverrideModal({
  tenantId,
  module,
  metric,
  currentLimitValue,
  onSave,
  onClear,
  onClose,
}: TenantOverrideModalProps) {
  const [option, setOption] = useState<OverrideOption>('plan');
  const [customValue, setCustomValue] = useState(currentLimitValue > 0 ? currentLimitValue : 10);
  const [saving, setSaving] = useState(false);

  const metricLabel = METRIC_LABELS[metric] || metric;

  const handleSave = async () => {
    setSaving(true);
    try {
      switch (option) {
        case 'plan':
          await onClear();
          toast.success('Override eliminado — usa el valor del plan');
          break;
        case 'unlimited':
          await onSave(0);
          toast.success('Límite establecido a ilimitado');
          break;
        case 'blocked':
          await onSave(-1);
          toast.success('Métrica bloqueada para este tenant');
          break;
        case 'custom':
          if (customValue < 0) {
            toast.error('El valor debe ser >= 0');
            setSaving(false);
            return;
          }
          await onSave(customValue);
          toast.success(`Override establecido a ${customValue.toLocaleString()}`);
          break;
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error guardando override');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Override de Límite">
      <div className="flex flex-col gap-5" style={{ minWidth: '360px' }}>
        <div className="flex items-start gap-3 p-3 rounded-lg text-xs" style={{ background: 'var(--sys-surface)' }}>
          <Info size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--sys-primary)' }} />
          <div style={{ color: 'var(--sys-text-muted)' }}>
            <p><strong style={{ color: 'var(--sys-text)' }}>{metricLabel}</strong> en <strong style={{ color: 'var(--sys-text)' }}>{module}</strong></p>
            <p className="mt-0.5">Valor actual del plan: {currentLimitValue === 0 ? 'Ilimitado' : currentLimitValue.toLocaleString()}</p>
            <p className="mt-0.5">Tenant #{tenantId}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Opción de override</label>

          {(['plan', 'unlimited', 'blocked', 'custom'] as OverrideOption[]).map(opt => (
            <button
              key={opt}
              onClick={() => setOption(opt)}
              className={`flex items-center gap-3 p-3 rounded-lg text-xs transition-all text-left ${
                option === opt
                  ? 'ring-2 ring-[var(--sys-primary)]'
                  : 'hover:bg-[var(--sys-surface)]'
              }`}
              style={{
                background: option === opt ? 'var(--sys-primary-container)' : 'var(--sys-surface)',
                border: '1px solid var(--sys-border-soft)',
              }}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                option === opt ? 'border-[var(--sys-primary)]' : 'border-[var(--sys-border)]'
              }`}>
                {option === opt && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--sys-primary)' }} />}
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--sys-text)' }}>
                  {opt === 'plan' ? 'Usar valor del plan' : 
                   opt === 'unlimited' ? 'Ilimitado' :
                   opt === 'blocked' ? 'Bloqueado' : 'Valor personalizado'}
                </p>
                <p style={{ color: 'var(--sys-text-muted)' }}>
                  {opt === 'plan' ? `Elimina override, usa ${currentLimitValue === 0 ? 'ilimitado' : currentLimitValue.toLocaleString()}` :
                   opt === 'unlimited' ? 'Sin límite (0)' :
                   opt === 'blocked' ? 'Denegar acceso (-1)' : 'Establecer un valor específico'}
                </p>
              </div>
            </button>
          ))}

          {option === 'custom' && (
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Valor personalizado</label>
              <input
                type="number"
                min="0"
                className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                value={customValue}
                onChange={e => setCustomValue(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Aplicar Override'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
