import { useState, useEffect, useCallback } from 'react';
import { KanbanBoard, Modal, Button, Select, Input, SlidePanel, Toggle, EntityCard } from '@kodan-apps/ui-core';
import type { ColumnDef } from '@kodan-apps/ui-core';
import { trackerApi, Project, ProjectTask, TaskType } from '../api/client';
import { Plus, Archive, ArchiveRestore, Search } from 'lucide-react';
import { toast } from 'sonner';

const BASE_COLUMNS: ColumnDef[] = [
  { id: 'todo', label: 'PARA HACER' },
  { id: 'in_progress', label: 'HACIENDO' },
  { id: 'review', label: 'REVISIÓN' },
  { id: 'done', label: 'HECHO' },
];

const priorityConfig: Record<string, { label: string; badgeClass: string; cardBorder: string }> = {
  low: {
    label: 'BAJA',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30',
    cardBorder: 'border-slate-200 dark:border-slate-800'
  },
  medium: {
    label: 'MEDIA',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30',
    cardBorder: 'border-amber-300 dark:border-amber-800/60'
  },
  high: {
    label: 'ALTA',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30',
    cardBorder: 'border-rose-300 dark:border-rose-800/60'
  },
  critical: {
    label: 'CRÍTICA',
    badgeClass: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30',
    cardBorder: 'border-red-500 dark:border-red-700'
  }
};


export function KanbanPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
    const saved = localStorage.getItem('tracker_selected_project_id');
    if (saved) {
      localStorage.removeItem('tracker_selected_project_id');
      return Number(saved);
    }
    return null;
  });
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<ProjectTask | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [justDroppedId, setJustDroppedId] = useState<number | null>(null);

  const loadProjects = useCallback(async () => {
    const data = await trackerApi.listProjects();
    setProjects(data);
  }, []);

  const loadBoard = useCallback(async () => {
    if (selectedProjectId === null) {
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
    trackerApi.listProfiles().then(setCollaborators).catch(() => {});
  }, [loadBoard]);

  const columns = useCallback((): ColumnDef[] => {
    const cols = [...BASE_COLUMNS];
    if (showArchived) {
      cols.push({ id: 'archived', label: 'ARCHIVO' });
    }
    return cols;
  }, [showArchived]);

  // Filtrado local de tareas por buscador y colaborador
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = !searchQuery.trim() || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.project_name && task.project_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCollaborator = selectedCollaboratorId === 'all' || 
      String(task.assigned_to) === String(selectedCollaboratorId);

    return matchesSearch && matchesCollaborator;
  });

  // Agrupar tareas por status
  const itemsByStage: Record<string, ProjectTask[]> = {
    todo: [], in_progress: [], review: [], done: [], archived: [],
  };
  filteredTasks.forEach((t) => {
    const key = t.kanban_status as string;
    if (itemsByStage[key]) itemsByStage[key].push(t);
  });

  const updateTaskStage = useCallback(
    async (taskId: number, toStage: string) => {
      const prevTasks = [...tasks];

      // Actualización optimista local
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, kanban_status: toStage as any } : t))
      );
      setJustDroppedId(taskId);
      setTimeout(() => setJustDroppedId(null), 550);

      try {
        await trackerApi.moveTask(taskId, { to_stage: toStage });
        toast.success('Estado de la tarea actualizado.');
      } catch (err: any) {
        setTasks(prevTasks);
        toast.error(err?.message || 'Error al mover la tarea.');
      }
    },
    [tasks]
  );

  const handleDrop = useCallback(
    (itemId: string | number, toStage: string) => {
      const taskId = Number(itemId);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Don't update if same stage
      if (task.kanban_status === toStage) return;

      updateTaskStage(taskId, toStage);
    },
    [tasks, updateTaskStage]
  );

  const handleToggleArchive = useCallback(
    async (task: ProjectTask) => {
      const nextStatus = task.kanban_status === 'archived' ? 'todo' : 'archived';
      const prevTasks = [...tasks];

      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, kanban_status: nextStatus as any } : t)));

      try {
        await trackerApi.moveTask(task.id, { to_stage: nextStatus });
        toast.success(nextStatus === 'archived' ? 'Tarea archivada.' : 'Tarea restaurada.');
      } catch {
        setTasks(prevTasks);
        toast.error('Error al cambiar el estado de archivado.');
      }
    },
    [tasks]
  );

  const handleCreate = async (data: Partial<ProjectTask> & { project_id: number }) => {
    await trackerApi.createTask(data);
    setCreateOpen(false);
    loadBoard();
  };

  const projectOptions = [
    { value: '', label: 'Todos los proyectos' },
    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Barra de Filtros y Acciones */}
      <div className="flex items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-900/10 p-3.5 rounded-lg border border-slate-200/50 dark:border-slate-800/40 w-full">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-56 shrink-0">
            <Input
              icon={<Search size={16} className="text-slate-400" />}
              placeholder="Buscar tareas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-48 shrink-0">
            <Select
              options={projectOptions}
              value={selectedProjectId !== null ? String(selectedProjectId) : ''}
              onChange={(v) => setSelectedProjectId(v !== '' ? Number(v) : null)}
              placeholder="Todos los proyectos"
            />
          </div>
          <div className="w-48 shrink-0">
            <Select
              options={[
                { value: 'all', label: 'Todos los colaboradores' },
                ...collaborators.map((c) => ({ value: String(c.user_id), label: c.user_name })),
              ]}
              value={selectedCollaboratorId}
              onChange={(v) => setSelectedCollaboratorId(v)}
            />
          </div>
          <div className="flex items-center h-11 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shrink-0">
            <Toggle
              checked={showArchived}
              onChange={(e: any) => setShowArchived(e.target.checked)}
              label="VER COLUMNA ARCHIVO"
            />
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => setCreateOpen(true)}
          className="h-11 px-5 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0"
        >
          <Plus size={16} /> Nueva Tarea
        </Button>
      </div>

      {/* Tablero Kanban */}
      {filteredTasks.length === 0 && tasks.length === 0 && selectedProjectId === null && projects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-20 text-sm" style={{ color: 'var(--sys-text-muted)' }}>
          No hay proyectos. Creá uno desde Gestión de Proyectos.
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <KanbanBoard
            columns={columns()}
            itemsByStage={itemsByStage}
            onDrop={handleDrop}
            emptyPlaceholder={
              <div className="h-24 flex items-center justify-center text-xs border border-dashed rounded-lg border-slate-200 dark:border-slate-800" style={{ color: 'var(--sys-text-muted)' }}>
                Sin tareas
              </div>
            }
            renderCard={(task) => {
              const config = priorityConfig[task.priority] || priorityConfig.medium;
              const isDropped = justDroppedId === task.id;
              const badge = (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wider ${config.badgeClass}`}>
                    {config.label}
                  </span>
                  {task.task_type_name && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wider bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 uppercase">
                      {task.task_type_name}
                    </span>
                  )}
                </div>
              );

              return (
                <EntityCard
                  title={task.title}
                  accountName={task.project_name}
                  closeDate={task.due_date || undefined}
                  ownerName={task.assigned_name || undefined}
                  badge={badge}
                  isDropped={isDropped}
                  estimatedHours={task.estimated_hours != null ? Number(task.estimated_hours) : undefined}
                  onClick={() => setDetailTask(task)}
                  onEdit={() => setDetailTask(task)}
                  onDelete={async () => {
                    if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
                      await trackerApi.deleteTask(task.id);
                      loadBoard();
                    }
                  }}
                />
              );
            }}
          />
        </div>
      )}

      {/* Modal Crear Tarea */}
      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
        taskTypes={taskTypes}
        projects={projects}
        initialProjectId={selectedProjectId}
      />

      {/* Panel de Detalle */}
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
            <div className="pt-2 flex gap-2">
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

function CreateTaskModal({ open, onClose, onSave, taskTypes, projects, initialProjectId }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ProjectTask> & { project_id: number }) => void;
  taskTypes: TaskType[];
  projects: Project[];
  initialProjectId: number | null;
}) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskTypeId, setTaskTypeId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [estimatedHours, setEstimatedHours] = useState('');

  useEffect(() => {
    if (open) {
      setProjectId(initialProjectId ? String(initialProjectId) : '');
      setTitle('');
      setDescription('');
      setTaskTypeId('');
      setPriority('medium');
      setEstimatedHours('');
    }
  }, [open, initialProjectId]);

  const handleSave = () => {
    if (!projectId) return;
    onSave({
      project_id: Number(projectId),
      title,
      description: description || undefined,
      task_type_id: taskTypeId ? Number(taskTypeId) : undefined,
      priority: priority as any,
      estimated_hours: estimatedHours ? Number(estimatedHours) : undefined,
    });
  };

  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }));
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
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Proyecto</label>
          <Select
            options={projectOptions}
            value={projectId}
            onChange={setProjectId}
            disabled={initialProjectId !== null}
            placeholder="Seleccionar proyecto..."
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Título</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Descripción</label>
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/25"
            style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface-raised)', color: 'var(--sys-text)' }}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tipo</label>
            <Select options={typeOptions} value={taskTypeId} onChange={setTaskTypeId} placeholder="Seleccionar tipo..." />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Prioridad</label>
            <Select options={priorityOptions} value={priority} onChange={setPriority} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Horas estimadas</label>
            <Input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={!title.trim() || !projectId}>Crear</Button>
        </div>
      </div>
    </Modal>
  );
}
