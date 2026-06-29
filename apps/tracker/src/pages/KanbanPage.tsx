import { useState, useEffect, useCallback } from 'react';
import { KanbanBoard, Button, Select, Input, EntityCard } from '@kodan-apps/ui-core';
import type { ColumnDef } from '@kodan-apps/ui-core';
import { trackerApi, Project, ProjectTask, TaskType } from '../api/client';
import { Plus, Search, Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';
import { TaskForm } from '../components/TaskForm';

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
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
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
      if (task.kanban_status === 'archived') {
        toast.error('Las tareas archivadas no se pueden mover.');
        return;
      }

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
        loadBoard();
      } catch {
        setTasks(prevTasks);
        toast.error('Error al cambiar el estado de archivado.');
      }
    },
    [tasks, loadBoard]
  );

  const handleSave = async (data: Partial<ProjectTask> & { project_id: number }) => {
    try {
      if (editingTask) {
        await trackerApi.updateTask(editingTask.id, data);
        toast.success('Tarea actualizada.');
      } else {
        await trackerApi.createTask(data);
        toast.success('Tarea creada.');
      }
      setFormOpen(false);
      setEditingTask(null);
      loadBoard();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar la tarea.');
    }
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
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            style={{
              background: showArchived ? 'var(--sys-primary-container)' : 'transparent',
              color: showArchived ? 'var(--sys-primary)' : 'var(--sys-text-muted)',
              borderColor: 'var(--sys-border-soft)',
            }}
            title={showArchived ? 'Ocultar archivadas' : 'Mostrar archivadas'}
            className="h-11 px-4 flex items-center justify-center border rounded-md hover:bg-surface-raised cursor-pointer transition-all shrink-0 font-semibold text-xs animate-fade-in"
          >
            {showArchived ? <ArchiveRestore size={15} className="mr-1.5" /> : <Archive size={15} className="mr-1.5" />}
            {showArchived ? 'Archivadas' : 'Activas'}
          </button>
        </div>
        <Button
          variant="primary"
          onClick={() => { setEditingTask(null); setFormOpen(true); }}
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
            className="h-full"
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

              const isArchived = task.kanban_status === 'archived';

              return (
                <EntityCard
                  title={task.title}
                  accountName={task.project_name}
                  closeDate={task.due_date || undefined}
                  ownerName={task.assigned_name || undefined}
                  badge={badge}
                  isDropped={isDropped}
                  estimatedHours={task.estimated_hours != null ? Number(task.estimated_hours) : undefined}
                  onClick={undefined}
                  onEdit={isArchived ? undefined : () => { setEditingTask(task); setFormOpen(true); }}
                  onDelete={isArchived ? undefined : async () => {
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

      <TaskForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSave}
        projects={projects}
        taskTypes={taskTypes}
        collaborators={collaborators}
        initial={editingTask}
        initialProjectId={selectedProjectId}
        onToggleArchive={handleToggleArchive}
      />
    </div>
  );
}
