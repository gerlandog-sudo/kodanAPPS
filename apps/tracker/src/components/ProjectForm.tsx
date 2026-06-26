import { useState, useEffect } from 'react';
import { Button, Input, Modal, Select } from '@kodan-apps/ui-core';
import type { SelectOption } from '@kodan-apps/ui-core';

interface ProjectFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; description?: string; status: string; budget_hours?: number; color_hex?: string }) => void
  initial?: { name: string; description?: string; status: string; budget_hours?: number; color_hex?: string }
}

const statusOptions: SelectOption[] = [
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'completed', label: 'Completado' },
];

export function ProjectForm({ open, onClose, onSave, initial }: ProjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [budgetHours, setBudgetHours] = useState('');

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setDescription(initial.description ?? '');
      setStatus(initial.status);
      setBudgetHours(initial.budget_hours?.toString() ?? '');
    } else {
      setName(''); setDescription(''); setStatus('active'); setBudgetHours('');
    }
  }, [initial, open]);

  const handleSave = () => {
    onSave({
      name,
      description: description || undefined,
      status,
      budget_hours: budgetHours ? parseFloat(budgetHours) : undefined,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 space-y-4 min-w-[400px]">
        <h2 className="text-lg font-semibold">{initial ? 'Editar' : 'Nuevo'} Proyecto</h2>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Nombre</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Descripción</label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
            style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-bg)', color: 'var(--sys-text)' }}
            rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Estado</label>
          <Select options={statusOptions} value={status} onChange={setStatus} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Horas presupuestadas</label>
          <Input type="number" value={budgetHours} onChange={(e) => setBudgetHours(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}
