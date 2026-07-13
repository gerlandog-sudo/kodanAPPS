import { Button, Input, Modal, Select, MultiSelect, DatePicker } from '@kodan-apps/ui-core';
import type { FormState, Task } from '../../hooks/useTasksData';
import { STATUS_OPTIONS } from '../../hooks/useTasksData';

interface SelectOption {
  value: string;
  label: string;
}

interface TaskFormModalProps {
  open: boolean;
  selectedTask: Task | null;
  form: FormState;
  saving: boolean;
  taskTypeOptions: SelectOption[];
  opportunityOptions: SelectOption[];
  userOptions: SelectOption[];
  onFormChange: (form: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function TaskFormModal({
  open,
  selectedTask,
  form,
  saving,
  taskTypeOptions,
  opportunityOptions,
  userOptions,
  onFormChange,
  onSubmit,
  onClose,
}: TaskFormModalProps) {
  const update = (partial: Partial<FormState>) => onFormChange({ ...form, ...partial });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={selectedTask ? 'Editar Tarea Comercial' : 'Nueva Tarea Comercial'}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">TÍTULO DE LA TAREA *</label>
          <Input
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Ej: Llamar por propuesta técnica"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">TIPO DE TAREA *</label>
            <Select
              options={taskTypeOptions}
              value={form.task_type_id}
              onChange={(val) => update({ task_type_id: String(val) })}
              placeholder="Seleccionar tipo..."
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">ESTADO *</label>
            <Select
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(val) => update({ status: String(val) })}
              placeholder="Seleccionar estado..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">FECHA Y HORA DE INICIO</label>
            <DatePicker
              showTime
              value={form.start_date || ''}
              onChange={(val) => update({ start_date: val })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">FECHA Y HORA DE FIN</label>
            <DatePicker
              showTime
              value={form.end_date || ''}
              onChange={(val) => update({ end_date: val })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">NEGOCIACIÓN RELACIONADA</label>
            <Select
              options={opportunityOptions}
              value={form.opportunity_id}
              onChange={(val) => update({ opportunity_id: String(val) })}
              placeholder="Seleccionar negociación..."
              searchable
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">DUEÑO / RESPONSABLE</label>
            <Select
              options={userOptions}
              value={form.assigned_to}
              onChange={(val) => update({ assigned_to: String(val) })}
              placeholder="Heredar de negociación o elegir..."
              searchable
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">OTROS PARTICIPANTES</label>
          <MultiSelect
            options={userOptions.filter((o) => o.value !== form.assigned_to)}
            values={form.participants}
            onChange={(vals) => update({ participants: vals })}
            placeholder="Seleccionar participantes adicionales..."
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">DESCRIPCIÓN / NOTAS COMERCIALES</label>
          <textarea
            className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            rows={3}
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Detalles adicionales, recordatorio de temas a conversar..."
          />
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : selectedTask ? 'Guardar Cambios' : 'Crear Tarea'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
