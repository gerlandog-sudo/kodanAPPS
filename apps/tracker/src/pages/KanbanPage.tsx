import { useState, useEffect, useCallback } from 'react';
import { KanbanBoard, Modal, Button, Select, Input, SlidePanel } from '@kodan-apps/ui-core';
import type { ColumnDef } from '@kodan-apps/ui-core';
import { trackerApi, Project, ProjectTask, TaskType } from '../api/client';
import { Plus } from 'lucide-react';

const columns: ColumnDef[] = [
  { id: 'todo', label: 'Por hacer', dotColor: '#6b7280' },
  { id: 'in_progress', label: 'En progreso', dotColor: '#3b82f6' },
  { id: 'review', label: 'Revisión', dotColor: '#f59e0b' },
  { id: 'done', label: 'Terminado', dotColor: '#10b981' },
];

const priorityColors: Record<string, string> = {
  low: '#9ca3af', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444',
};

export function KanbanPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<ProjectTask | null>(null);

  const loadProjects = useCallback(async () => {
    const data = await trackerApi.listProjects();
    setProjects(data);
  }, []);

  const loadBoard = useCallback(async (projectId: number) => {
    const board = await trackerApi.getBoard(projectId);
    setTasks(Object.values(board.itemsByStage).flat());
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => {
    if (selectedProjectId) {
      loadBoard(selectedProjectId);
      trackerApi.listTaskTypes().then(setTaskTypes).catch(() => {});
    }
  }, [selectedProjectId, loadBoard]);

  const itemsByStage: Record<string, ProjectTask[]> = { todo: [], in_progress: [], review: [], done: [] };
  tasks.forEach((t) => {
    if (itemsByStage[t.kanban_status]) itemsByStage[t.kanban_status].push(t);
  });

  const handleDrop = async (itemId: string | number, toStage: string) => {
    await trackerApi.moveTask(Number(itemId), { to_stage: toStage });
    if (selectedProjectId) loadBoard(selectedProjectId);
  };

  const handleCreate = async (data: Partial<ProjectTask>) => {
    if (!selectedProjectId) return;
    await trackerApi.createTask({ ...data, project_id: selectedProjectId });
    setCreateOpen(false);
    loadBoard(selectedProjectId);
  };

  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }));

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <h1 className="text-xl font-semibold">Tablero Kanban</h1>
          <div className="w-64">
            <Select
              options={projectOptions}
              value={selectedProjectId ? String(selectedProjectId) : ''}
              onChange={(v) => setSelectedProjectId(v ? Number(v) : null)}
              placeholder="Seleccionar proyecto..."
            />
          </div>
        </div>
        {selectedProjectId && (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} className="mr-1" /> Nueva tarea
          </Button>
        )}
      </div>

      {!selectedProjectId ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--sys-text-muted)' }}>
          Seleccioná un proyecto para ver el tablero
        </div>
      ) : (
        <KanbanBoard
          columns={columns}
          itemsByStage={itemsByStage}
          onDrop={handleDrop}
          emptyPlaceholder={<div className="h-24 flex items-center justify-center text-xs" style={{ color: 'var(--sys-text-muted)' }}>Sin tareas</div>}
          renderCard={(task) => (
            <div
              className="p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow"
              style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-card)', color: 'var(--sys-text)' }}
              onClick={() => setDetailTask(task)}
            >
              <div className="flex items-center gap-2 mb-2">
                {task.task_type_color && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: task.task_type_color }} />
                )}
                <span className="text-xs font-medium truncate" style={{ color: task.task_type_color || 'var(--sys-text-muted)' }}>
                  {task.task_type_name || 'Sin tipo'}
                </span>
                <span className="w-2 h-2 rounded-full ml-auto flex-shrink-0" style={{ background: priorityColors[task.priority] || '#9ca3af' }} />
              </div>
              <p className="text-sm font-medium leading-snug">{task.title}</p>
              {task.assigned_name && (
                <p className="text-xs mt-2" style={{ color: 'var(--sys-text-muted)' }}>
                  {task.assigned_name}
                </p>
              )}
            </div>
          )}
          renderOverlayCard={(task) => (
            <div className="p-3 rounded-lg border shadow-lg" style={{ background: 'var(--sys-card)', borderColor: 'var(--sys-border-soft)' }}>
              <p className="text-sm font-medium">{task.title}</p>
            </div>
          )}
        />
      )}

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
        taskTypes={taskTypes}
      />

      <SlidePanel open={!!detailTask} onClose={() => setDetailTask(null)} title={detailTask?.title ?? ''}>
        {detailTask && (
          <div className="p-6 space-y-4" style={{ color: 'var(--sys-text)' }}>
            <p className="text-sm whitespace-pre-wrap">{detailTask.description || 'Sin descripción'}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="font-medium">Tipo:</span> {detailTask.task_type_name || '-'}</div>
              <div><span className="font-medium">Prioridad:</span> {detailTask.priority}</div>
              <div><span className="font-medium">Asignado a:</span> {detailTask.assigned_name || '-'}</div>
              {detailTask.estimated_hours ? <div><span className="font-medium">Horas estimadas:</span> {detailTask.estimated_hours}h</div> : null}
              {detailTask.due_date ? <div><span className="font-medium">Vence:</span> {detailTask.due_date}</div> : null}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}

function CreateTaskModal({ open, onClose, onSave, taskTypes }: {
  open: boolean; onClose: () => void; onSave: (data: Partial<ProjectTask>) => void;
  taskTypes: TaskType[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskTypeId, setTaskTypeId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [estimatedHours, setEstimatedHours] = useState('');

  const handleSave = () => {
    onSave({
      title,
      description: description || undefined,
      task_type_id: taskTypeId ? Number(taskTypeId) : undefined,
      priority: priority as any,
      estimated_hours: estimatedHours ? Number(estimatedHours) : undefined,
    });
    setTitle(''); setDescription(''); setTaskTypeId(''); setPriority('medium'); setEstimatedHours('');
  };

  const typeOptions = taskTypes.map((t) => ({ value: String(t.id), label: t.name }));
  const priorityOptions = [
    { value: 'low', label: 'Baja' }, { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' }, { value: 'critical', label: 'Crítica' },
  ];

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 space-y-4 min-w-[420px]">
        <h2 className="text-lg font-semibold">Nueva tarea</h2>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Título</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Descripción</label>
          <textarea className="w-full rounded-lg border px-3 py-2 text-sm resize-none" style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-bg)', color: 'var(--sys-text)' }} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Tipo</label>
            <Select options={typeOptions} value={taskTypeId} onChange={setTaskTypeId} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Prioridad</label>
            <Select options={priorityOptions} value={priority} onChange={setPriority} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Horas estimadas</label>
            <Input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={!title.trim()}>Crear</Button>
        </div>
      </div>
    </Modal>
  );
}
