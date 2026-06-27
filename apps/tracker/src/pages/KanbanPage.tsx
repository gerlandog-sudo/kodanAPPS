import { useState, useEffect, useCallback } from 'react';
import { KanbanBoard, Modal, Button, Select, Input, SlidePanel } from '@kodan-apps/ui-core';
import type { ColumnDef } from '@kodan-apps/ui-core';
import { trackerApi, Project, ProjectTask, TaskType } from '../api/client';
import { Plus, Archive, ArchiveRestore, LayoutList } from 'lucide-react';

const BASE_COLUMNS: ColumnDef[] = [
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
  const [showArchived, setShowArchived] = useState(false);

  const isTodosMode = selectedProjectId === null;

  const loadProjects = useCallback(async () => {
    const data = await trackerApi.listProjects();
    setProjects(data);
  }, []);

  const loadBoard = useCallback(async () => {
    if (selectedProjectId === null) {
      // Modo TODOS: cargar tareas de todos los proyectos
      const board = await trackerApi.getAllBoards(showArchived);
      setTasks(Object.values(board.itemsByStage).flat());
    } else {
      const board = await trackerApi.getBoard(selectedProjectId, showArchived);
      setTasks(Object.values(board.itemsByStage).flat());
    }
  }, [selectedProjectId, showArchived]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => {
    loadBoard();
    trackerApi.listTaskTypes().then(setTaskTypes).catch(() => {});
  }, [loadBoard]);

  // Construir columnas: base + archivada condicional
  const columns = useCallback((): ColumnDef[] => {
    const cols = [...BASE_COLUMNS];
    if (showArchived) {
      cols.push({ id: 'archived', label: 'Archivada', dotColor: '#6B7280' });
    }
    return cols;
  }, [showArchived]);

  // Agrupar tareas por status, incluyendo archived siempre
  const itemsByStage: Record<string, ProjectTask[]> = {
    todo: [], in_progress: [], review: [], done: [], archived: [],
  };
  tasks.forEach((t) => {
    const key = t.kanban_status as string;
    if (itemsByStage[key]) itemsByStage[key].push(t);
  });

  const handleDrop = async (itemId: string | number, toStage: string) => {
    await trackerApi.moveTask(Number(itemId), { to_stage: toStage });
    loadBoard();
  };

  const handleToggleArchive = async (task: ProjectTask) => {
    const nextStatus = task.kanban_status === 'archived' ? 'todo' : 'archived';
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, kanban_status: nextStatus as any } : t)));
    await trackerApi.moveTask(task.id, { to_stage: nextStatus });
    loadBoard();
  };

  const handleCreate = async (data: Partial<ProjectTask>) => {
    if (selectedProjectId === null) return;
    await trackerApi.createTask({ ...data, project_id: selectedProjectId! });
    setCreateOpen(false);
    loadBoard();
  };

  const projectOptions = [
    { value: '', label: 'TODOS' },
    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
  ];

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-64">
            <Select
              options={projectOptions}
              value={selectedProjectId !== null ? String(selectedProjectId) : ''}
              onChange={(v) => setSelectedProjectId(v !== '' ? Number(v) : null)}
              placeholder="Seleccionar proyecto..."
            />
          </div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-200"
            style={{
              background: showArchived ? 'var(--sys-primary-container)' : 'transparent',
              color: showArchived ? 'var(--sys-on-primary)' : 'var(--sys-text-muted)',
              borderColor: showArchived ? 'var(--sys-primary)' : 'var(--sys-border-soft)',
            }}
            title={showArchived ? 'Ocultar archivadas' : 'Mostrar archivadas'}
          >
            {showArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            <span>{showArchived ? 'Archivadas' : 'Activas'}</span>
          </button>
        </div>
        {!isTodosMode && (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} className="mr-1" /> Nueva tarea
          </Button>
        )}
      </div>

      {isTodosMode && projects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--sys-text-muted)' }}>
          No hay proyectos. Creá uno desde Gestión de Proyectos.
        </div>
      ) : (
        <KanbanBoard
          columns={columns()}
          itemsByStage={itemsByStage}
          onDrop={handleDrop}
          emptyPlaceholder={<div className="h-24 flex items-center justify-center text-xs" style={{ color: 'var(--sys-text-muted)' }}>Sin tareas</div>}
          renderCard={(task) => (
            <div
              className="p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow group"
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
              {isTodosMode && task.project_name && (
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--sys-text-muted)' }}>
                  <LayoutList size={10} />
                  {task.project_name}
                </p>
              )}
              <div className="mt-2 pt-2 border-t flex justify-end opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ borderColor: 'var(--sys-border-soft)' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleArchive(task); }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  style={{ color: 'var(--sys-text-muted)' }}
                  title={task.kanban_status === 'archived' ? 'Restaurar' : 'Archivar'}
                >
                  {task.kanban_status === 'archived' ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                  {task.kanban_status === 'archived' ? 'Restaurar' : 'Archivar'}
                </button>
              </div>
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
            {detailTask.project_name && (
              <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>
                <span className="font-medium">Proyecto:</span> {detailTask.project_name}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="font-medium">Tipo:</span> {detailTask.task_type_name || '-'}</div>
              <div><span className="font-medium">Prioridad:</span> {detailTask.priority}</div>
              <div><span className="font-medium">Asignado a:</span> {detailTask.assigned_name || '-'}</div>
              {detailTask.estimated_hours ? <div><span className="font-medium">Horas estimadas:</span> {detailTask.estimated_hours}h</div> : null}
              {detailTask.due_date ? <div><span className="font-medium">Vence:</span> {detailTask.due_date}</div> : null}
              <div><span className="font-medium">Estado:</span> {
                { todo: 'Por hacer', in_progress: 'En progreso', review: 'Revisión', done: 'Terminado', archived: 'Archivada' }[detailTask.kanban_status] || detailTask.kanban_status
              }</div>
            </div>
            <div className="pt-2">
              <Button
                variant="secondary"
                onClick={() => { handleToggleArchive(detailTask); setDetailTask(null); }}
              >
                {detailTask.kanban_status === 'archived' ? <><ArchiveRestore size={14} className="mr-1" /> Restaurar</> : <><Archive size={14} className="mr-1" /> Archivar</>}
              </Button>
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
