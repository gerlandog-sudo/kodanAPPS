import { useState, useEffect } from 'react';
import { Button, Input, Modal, Select, DatePicker } from '@kodan-apps/ui-core';
import type { Project, ProjectTask, TimeEntry } from '../api/client';

interface TimeEntryFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: { project_id: number; task_id?: number; date: string; duration_minutes: number; description?: string }) => void
  projects: Project[]
  tasks: ProjectTask[]
  initialDuration?: number
  initialEntry?: TimeEntry | null
}

export function TimeEntryForm({ open, onClose, onSave, projects, tasks, initialDuration, initialEntry }: TimeEntryFormProps) {
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      if (initialEntry) {
        setProjectId(String(initialEntry.project_id));
        setTaskId(initialEntry.task_id ? String(initialEntry.task_id) : '');
        setDate(initialEntry.date.split('T')[0]);
        setHours(Math.floor(initialEntry.duration_minutes / 60).toString());
        setMinutes((initialEntry.duration_minutes % 60).toString());
        setDescription(initialEntry.description || '');
      } else if (initialDuration) {
        setProjectId('');
        setTaskId('');
        setDate(new Date().toISOString().split('T')[0]);
        setHours(Math.floor(initialDuration / 60).toString());
        setMinutes((initialDuration % 60).toString());
        setDescription('');
      } else {
        setProjectId('');
        setTaskId('');
        setDate(new Date().toISOString().split('T')[0]);
        setHours('');
        setMinutes('');
        setDescription('');
      }
    }
  }, [open, initialEntry, initialDuration]);

  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }));
  const taskOptions = tasks
    .filter((t) => !projectId || String(t.project_id) === projectId)
    .map((t) => ({ value: String(t.id), label: t.title }));

  const handleSave = () => {
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMinutes <= 0) return;
    onSave({
      project_id: parseInt(projectId),
      task_id: taskId ? parseInt(taskId) : undefined,
      date,
      duration_minutes: totalMinutes,
      description: description || undefined,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initialEntry ? "Editar registro de tiempo" : "Registrar tiempo"} className="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Proyecto</label>
              <Select options={projectOptions} value={projectId} onChange={setProjectId} />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Tarea (opcional)</label>
              <Select options={taskOptions} value={taskId} onChange={setTaskId} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Fecha</label>
              <DatePicker value={date} onChange={setDate} />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Horas</label>
                <Input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Minutos</label>
                <Input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Descripción</label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm resize-none"
                style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-bg)', color: 'var(--sys-text)', height: '110px' }}
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Escribe una breve descripción del trabajo realizado..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border-soft/60">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={!projectId}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}
