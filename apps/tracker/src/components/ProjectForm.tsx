import { useState, useEffect } from 'react';
import { Button, Input, Modal, Select, DatePicker, ColorPicker } from '@kodan-apps/ui-core';
import type { SelectOption } from '@kodan-apps/ui-core';
import { trackerApi } from '../api/client';

interface ProjectFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    name: string
    description?: string
    status: string
    color_hex?: string
    account_id: number
    budget_hours?: number
    budget_money?: number
    start_date?: string | null
    end_date?: string | null
  }) => void
  initial?: {
    id?: number
    name: string
    description?: string
    status: string
    color_hex?: string
    account_id: number
    budget_hours?: number
    budget_money?: number
    start_date?: string | null
    end_date?: string | null
  }
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
  const [budgetMoney, setBudgetMoney] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [colorHex, setColorHex] = useState('#00694e');
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<Array<{ account_id: number; name: string }>>([]);

  useEffect(() => {
    if (open) {
      trackerApi.listAccounts()
        .then(setAccounts)
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setDescription(initial.description ?? '');
      setStatus(initial.status);
      setBudgetHours(initial.budget_hours?.toString() ?? '');
      setBudgetMoney(initial.budget_money?.toString() ?? '');
      setStartDate(initial.start_date ?? '');
      setEndDate(initial.end_date ?? '');
      setColorHex(initial.color_hex ?? '#00694e');
      setAccountId(initial.account_id?.toString() ?? '');
    } else {
      setName('');
      setDescription('');
      setStatus('active');
      setBudgetHours('');
      setBudgetMoney('');
      setStartDate('');
      setEndDate('');
      setColorHex('#00694e');
      setAccountId('');
    }
  }, [initial, open]);

  const handleSave = () => {
    if (!name.trim() || !accountId) return;
    onSave({
      name: name.trim(),
      description: description || undefined,
      status,
      color_hex: colorHex,
      account_id: parseInt(accountId),
      budget_hours: budgetHours ? parseFloat(budgetHours) : undefined,
      budget_money: budgetMoney ? parseFloat(budgetMoney) : undefined,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    onClose();
  };

  const accountOptions = accounts.map((acc) => ({
    value: acc.account_id.toString(),
    label: acc.name,
  }));

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 space-y-4 min-w-[500px]">
        <h2 className="text-lg font-semibold">{initial ? 'Editar' : 'Nuevo'} Proyecto</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Descripción</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm resize-none"
              style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-bg)', color: 'var(--sys-text)' }}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Cliente (Cuenta)</label>
            <Select options={accountOptions} value={accountId} onChange={setAccountId} placeholder="Seleccionar cliente" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Estado</label>
            <Select options={statusOptions} value={status} onChange={setStatus} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Presupuesto (Dinero)</label>
            <Input type="number" value={budgetMoney} onChange={(e) => setBudgetMoney(e.target.value)} placeholder="0.00" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Horas Presupuestadas (Hs)</label>
            <Input type="number" value={budgetHours} onChange={(e) => setBudgetHours(e.target.value)} placeholder="0.0" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Fecha de Inicio</label>
            <DatePicker value={startDate} onChange={setStartDate} placeholder="AAAA-MM-DD" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Fecha de Fin</label>
            <DatePicker value={endDate} onChange={setEndDate} placeholder="AAAA-MM-DD" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Color del Proyecto</label>
            <div>
              <ColorPicker value={colorHex} onChange={setColorHex} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={!name.trim() || !accountId}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}
