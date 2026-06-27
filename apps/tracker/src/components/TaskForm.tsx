import { useState, useEffect } from 'react';
import { Button, Input, Modal, Select, DatePicker } from '@kodan-apps/ui-core';
import { Archive, ArchiveRestore } from 'lucide-react';
import type { Project, ProjectTask, TaskType } from '../api/client';

interface TaskFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<ProjectTask> & { project_id: number }) => void
  projects: Project[]
  taskTypes: TaskType[]
  collaborators: Array<{ user_id: number; user_name: string }>
  initial?: ProjectTask | null
  initialProjectId?: number | null
  onToggleArchive?: (task: ProjectTask) => void
}

const priorityOptions = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

const statusOptions = [
  { value: 'todo', label: 'Para Hacer' },
  { value: 'in_progress', label: 'Haciendo' },
  { value: 'review', label: 'Revisión' },
  { value: 'done', label: 'Hecho' },
  { value: 'archived', label: 'Archivado' },
];

export function TaskForm({
  open,
  onClose,
  onSave,
  projects,
  taskTypes,
  collaborators,
  initial,
  initialProjectId,
  onToggleArchive,
}: TaskFormProps) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskTypeId, setTaskTypeId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('todo');

  useEffect(() => {
    if (open) {
      if (initial) {
        setProjectId(initial.project_id?.toString() ?? '');
        setTitle(initial.title ?? '');
        setDescription(initial.description ?? '');
        setTaskTypeId(initial.task_type_id?.toString() ?? '');
        setPriority(initial.priority ?? 'medium');
        setAssignedTo(initial.assigned_to?.toString() ?? '');
        setEstimatedHours(initial.estimated_hours?.toString() ?? '');
        setDueDate(initial.due_date ?? '');
        setStatus(initial.kanban_status ?? 'todo');
      } else {
        setProjectId(initialProjectId ? String(initialProjectId) : '');
        setTitle('');
        setDescription('');
        setTaskTypeId('');
        setPriority('medium');
        setAssignedTo('');
        setEstimatedHours('');
        setDueDate('');
        setStatus('todo');
      }
    }
  }, [open, initial, initialProjectId]);

  const handleSave = () => {
    if (!title.trim() || !projectId) return;
    onSave({
      project_id: Number(projectId),
      title: title.trim(),
      description: description.trim() || null,
      task_type_id: taskTypeId ? Number(taskTypeId) : null,
      priority: priority as any,
      assigned_to: assignedTo ? Number(assignedTo) : null,
      estimated_hours: estimatedHours ? Number(estimatedHours) : null,
      due_date: dueDate || null,
      ...(initial ? { kanban_status: status as any } : {}),
    });
    onClose();
  };

  const projectOptions = projects.map((p) => ({
    value: String(p.id),
    label: p.name,
  }));

  const typeOptions = [
    { value: '', label: 'Sin tipo (General)' },
    ...taskTypes.map((t) => ({
      value: String(t.id),
      label: t.name,
    })),
  ];

  const collaboratorOptions = [
    { value: '', label: 'Sin asignar' },
    ...collaborators.map((c) => ({
      value: String(c.user_id),
      label: c.user_name,
    })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar Tarea' : 'Nueva Tarea'}
      className="modal-wide"
    >
      <div className="space-y-6 py-2">
        {/* Section 1: Detalle de la Tarea */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-border-soft pb-1.5 mb-3">
            Detalle de la Tarea
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Diseñar prototipo de la pantalla de perfil"
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
                placeholder="Describe el alcance de la tarea, requerimientos o notas importantes..."
              />
            </div>
          </div>
        </div>

        {/* Section 2: Asignación e Identificación */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-border-soft pb-1.5 mb-3">
            Planificación y Asignación
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Proyecto</label>
              <Select
                options={projectOptions}
                value={projectId}
                onChange={setProjectId}
                disabled={initialProjectId !== null && !initial}
                placeholder="Seleccionar proyecto..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Asignar a</label>
              <Select
                options={collaboratorOptions}
                value={assignedTo}
                onChange={setAssignedTo}
                placeholder="Asignar colaborador..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tipo de Tarea</label>
              <Select
                options={typeOptions}
                value={taskTypeId}
                onChange={setTaskTypeId}
                placeholder="Seleccionar tipo..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prioridad</label>
              <Select
                options={priorityOptions}
                value={priority}
                onChange={setPriority}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Tiempos y Estado */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-border-soft pb-1.5 mb-3">
            Tiempos {initial && 'y Estado'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Horas Estimadas</label>
              <Input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="0.0"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fecha de Vencimiento</label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="AAAA-MM-DD"
              />
            </div>

            {initial && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado de la Tarea</label>
                <Select
                  options={statusOptions}
                  value={status}
                  onChange={setStatus}
                />
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-between items-center pt-4 border-t border-border-soft/60">
          <div>
            {initial && onToggleArchive && (
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  onToggleArchive(initial);
                  onClose();
                }}
                className="text-xs py-1.5 px-3"
              >
                {initial.kanban_status === 'archived' ? (
                  <>
                    <ArchiveRestore size={14} className="mr-1" /> Restaurar Tarea
                  </>
                ) : (
                  <>
                    <Archive size={14} className="mr-1" /> Archivar Tarea
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!title.trim() || !projectId}
              className="px-6 py-2.5 font-bold shadow-sm"
            >
              {initial ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
