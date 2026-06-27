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
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar Proyecto' : 'Nuevo Proyecto'}
      className="modal-wide"
    >
      <div className="space-y-6 py-2">
        {/* Section 1: Información General */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-border-soft pb-1.5 mb-3">
            Información Principal
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nombre del Proyecto</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Rediseño de Portal Corporativo"
              />
            </div>
            
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Descripción</label>
              <textarea
                className="w-full rounded-md border px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/25 transition-all"
                style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface-raised)', color: 'var(--sys-text)' }}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Escribe una breve descripción del proyecto, sus objetivos o alcance..."
              />
            </div>
          </div>
        </div>

        {/* Section 2: Asociación y Estado */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-border-soft pb-1.5 mb-3">
            Clasificación y Estado
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cliente (Cuenta)</label>
              <Select options={accountOptions} value={accountId} onChange={setAccountId} placeholder="Seleccionar cliente..." />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado del Proyecto</label>
              <Select options={statusOptions} value={status} onChange={setStatus} />
            </div>
          </div>
        </div>

        {/* Section 3: Presupuesto y Tiempos */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-border-soft pb-1.5 mb-3">
            Planificación y Presupuesto
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Presupuesto ($)</label>
              <Input type="number" value={budgetMoney} onChange={(e) => setBudgetMoney(e.target.value)} placeholder="0.00" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Horas Presupuestadas</label>
              <Input type="number" value={budgetHours} onChange={(e) => setBudgetHours(e.target.value)} placeholder="0.0" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Color Distintivo</label>
              <div className="h-11 flex items-center">
                <ColorPicker value={colorHex} onChange={setColorHex} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fecha de Inicio</label>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="AAAA-MM-DD" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fecha de Fin</label>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="AAAA-MM-DD" />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border-soft/60">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!name.trim() || !accountId}
            className="px-6 py-2.5 font-bold shadow-sm"
          >
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
