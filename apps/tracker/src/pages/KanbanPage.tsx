import { useState, useEffect, useCallback } from 'react';
import { KanbanBoard, Modal, Button, Select, Input, SlidePanel, Toggle } from '@kodan-apps/ui-core';
import type { ColumnDef } from '@kodan-apps/ui-core';
import { trackerApi, Project, ProjectTask, TaskType } from '../api/client';
import { Plus, Archive, ArchiveRestore, Search, FolderKanban, Clock, Pencil, Trash2 } from 'lucide-react';

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

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function KanbanPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<ProjectTask | null>(null);
  const [showArchived, setShowArchived] = useState(false);

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

  const handleDrop = async (itemId: string | number, toStage: string) => {
    await trackerApi.moveTask(Number(itemId), { to_stage: toStage });
    loadBoard();
  };

  const handleToggleArchive = async (task: ProjectTask) => {
    const nextStatus = task.kanban_status === 'archived' ? 'todo' : 'archived';
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, kanban_status: nextStatus as any } : t)));
    await trackerApi.moveTask(task.id, { to_stage: nextStatus });
    loadBoard();
  };

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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-900/10 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="w-full sm:w-80">
            <Input
              icon={<Search size={16} className="text-slate-400" />}
              placeholder="Buscar tareas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-64">
            <Select
              options={projectOptions}
              value={selectedProjectId !== null ? String(selectedProjectId) : ''}
              onChange={(v) => setSelectedProjectId(v !== '' ? Number(v) : null)}
              placeholder="Todos los proyectos"
            />
          </div>
          <div className="w-full sm:w-64">
            <Select
              options={[
                { value: 'all', label: 'Todos los colaboradores' },
                ...collaborators.map((c) => ({ value: String(c.user_id), label: c.user_name })),
              ]}
              value={selectedCollaboratorId}
              onChange={(v) => setSelectedCollaboratorId(v)}
            />
          </div>
          <div className="flex items-center h-11 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
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
              <div className="h-24 flex items-center justify-center text-xs border border-dashed rounded-xl border-slate-200 dark:border-slate-800" style={{ color: 'var(--sys-text-muted)' }}>
                Sin tareas
              </div>
            }
            renderCard={(task) => {
              const config = priorityConfig[task.priority] || priorityConfig.medium;
              return (
                <div
                  className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col gap-3.5 ${config.cardBorder}`}
                  onClick={() => setDetailTask(task)}
                >
                  {/* Badges y Acciones */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider ${config.badgeClass}`}>
                        {config.label}
                      </span>
                      {task.task_type_name && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 uppercase">
                          {task.task_type_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailTask(task);
                        }}
                        className="p-1 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Editar tarea"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
                            await trackerApi.deleteTask(task.id);
                            loadBoard();
                          }
                        }}
                        className="p-1 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Eliminar tarea"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Título de la tarea */}
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                    {task.title}
                  </h4>

                  {/* Proyecto */}
                  {task.project_name && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <FolderKanban size={13} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      <span className="truncate">{task.project_name}</span>
                    </div>
                  )}

                  {/* Separador */}
                  {(task.assigned_name || task.estimated_hours) && (
                    <div className="border-t border-slate-100 dark:border-slate-800/80 my-0.5" />
                  )}

                  {/* Asignado y Horas */}
                  <div className="flex items-center justify-between gap-2 mt-auto">
                    {task.assigned_name ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/30 flex-shrink-0">
                          {getInitials(task.assigned_name)}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {task.assigned_name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold border border-slate-200 dark:border-slate-700 flex-shrink-0">
                          -
                        </div>
                        <span className="text-xs text-slate-400 italic truncate">
                          Sin asignar
                        </span>
                      </div>
                    )}

                    {task.estimated_hours != null && (
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold text-slate-600 dark:text-slate-300 flex-shrink-0">
                        <Clock size={12} className="text-slate-400" />
                        <span>{Number(task.estimated_hours).toFixed(2)} hs</span>
                      </div>
                    )}
                  </div>
                </div>
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
            className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/25"
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
