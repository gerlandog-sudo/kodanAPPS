import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { crmApi } from '../api/client';
import { Video, Monitor, Phone, MapPin, Mail, Users, Calendar, ListTodo } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────
export interface TaskType {
  id: number;
  name: string;
  color_hex: string;
  icon: string;
}

export interface Task {
  id: number;
  tenant_id: number;
  opportunity_id: number | null;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  due_date: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'archived';
  assigned_to: number | null;
  task_type_id: number | null;
  task_type_name?: string;
  task_type_color?: string;
  task_type_icon?: string;
  opportunity_name?: string;
  participants?: { user_id: number; display_name: string; email: string }[];
}

export interface FormState {
  title: string;
  opportunity_id: string;
  start_date: string;
  end_date: string;
  status: string;
  description: string;
  task_type_id: string;
  assigned_to: string;
  participants: string[];
}

export interface FiltersState {
  search: string;
  taskTypes: string[];
  dateStart: string;
  dateEnd: string;
  assignees: string[];
  opportunityId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────
export function getIconComponent(iconName?: string): LucideIcon {
  switch (iconName) {
    case 'video': return Video;
    case 'monitor': return Monitor;
    case 'phone': return Phone;
    case 'map-pin': return MapPin;
    case 'mail': return Mail;
    case 'users': return Users;
    case 'calendar': return Calendar;
    default: return ListTodo;
  }
}

export function formatForDateTimeInput(dateVal?: string | Date | null): string {
  if (!dateVal) return '';
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const STATUS_OPTIONS = [
  { value: 'todo', label: 'Para Hacer' },
  { value: 'in_progress', label: 'Haciendo' },
  { value: 'done', label: 'Hecho' },
  { value: 'archived', label: 'Archivada' },
];

export const STATUS_LABEL_MAP: Record<string, string> = {
  todo: 'Para Hacer',
  in_progress: 'Haciendo',
  done: 'Hecho',
  archived: 'Archivada',
};

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function getLocalDateString(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isTaskOnDate(task: Task, date: Date): boolean {
  if (!task.start_date || !task.end_date) return false;
  const cellDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = new Date(task.start_date);
  const end = new Date(task.end_date);
  const cellTime = cellDate.getTime();
  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return cellTime >= startTime && cellTime <= endTime;
}

export function formatTimeRange(startDateStr?: string | null, endDateStr?: string | null): string {
  if (!startDateStr || !endDateStr) return 'Todo el día';
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Todo el día';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useTasksData() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'month-calendar' | 'week-calendar' | 'table'>('kanban');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    taskTypes: [],
    dateStart: '',
    dateEnd: '',
    assignees: [],
    opportunityId: '',
  });

  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskIdToDelete, setTaskIdToDelete] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [justDroppedId, setJustDroppedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({
    title: '',
    opportunity_id: '',
    start_date: '',
    end_date: '',
    status: 'todo',
    description: '',
    task_type_id: '',
    assigned_to: '',
    participants: [],
  });

  // ── Data loading ────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [taskList, typeList, oppList, userList] = await Promise.all([
        crmApi.listTasks({ include_archived: showArchived ? 'true' : 'false' }),
        crmApi.listTaskTypes(),
        crmApi.listOpportunities(),
        crmApi.listTenantUsers(),
      ]);
      setTasks(taskList as Task[]);
      setTaskTypes(typeList);
      setOpportunities(oppList);
      setUsers(userList);
    } catch {
      toast.error('Error al cargar la agenda comercial.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Select options ──────────────────────────────────────────────
  const opportunitySelectOptions = useMemo(() => {
    return opportunities.map((o: any) => ({
      value: String(o.id),
      label: o.name || o.title || `Oportunidad #${o.id}`,
    }));
  }, [opportunities]);

  const taskTypeSelectOptions = useMemo(() => {
    return taskTypes.map((t) => ({ value: String(t.id), label: t.name }));
  }, [taskTypes]);

  const userSelectOptions = useMemo(() => {
    return users.map((u: any) => ({
      value: String(u.id),
      label: u.display_name || u.name || u.email,
    }));
  }, [users]);

  const getOwnerName = useCallback(
    (userId: number | null) => {
      if (!userId) return '';
      const found = users.find((u: any) => u.id === userId);
      return found ? found.display_name || found.name || found.email : '';
    },
    [users],
  );

  // ── Client-side filtering ──────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!(t.title || '').toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
      }
      if (filters.taskTypes.length > 0) {
        if (!t.task_type_id || !filters.taskTypes.includes(String(t.task_type_id))) return false;
      }
      if (filters.opportunityId) {
        if (String(t.opportunity_id) !== filters.opportunityId) return false;
      }
      if (filters.assignees.length > 0) {
        const isOwner = t.assigned_to && filters.assignees.includes(String(t.assigned_to));
        const isParticipant = t.participants && t.participants.some((p) => filters.assignees.includes(String(p.user_id)));
        if (!isOwner && !isParticipant) return false;
      }
      if (filters.dateStart) {
        const startLimit = new Date(filters.dateStart).getTime();
        const taskEnd = t.end_date ? new Date(t.end_date).getTime() : (t.start_date ? new Date(t.start_date).getTime() : 0);
        if (taskEnd && taskEnd < startLimit) return false;
      }
      if (filters.dateEnd) {
        const endLimit = new Date(filters.dateEnd + 'T23:59:59').getTime();
        const taskStart = t.start_date ? new Date(t.start_date).getTime() : 0;
        if (taskStart && taskStart > endLimit) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  // ── Form operations ──────────────────────────────────────────────
  const handleOpenCreate = useCallback(
    (initialDate?: Date, defaultUserId?: string) => {
      setSelectedTask(null);
      let startVal = '';
      let endVal = '';
      if (initialDate) {
        const dStart = new Date(initialDate);
        dStart.setHours(9, 0, 0, 0);
        const dEnd = new Date(initialDate);
        dEnd.setHours(10, 0, 0, 0);
        startVal = formatForDateTimeInput(dStart);
        endVal = formatForDateTimeInput(dEnd);
      }
      setForm({
        title: '',
        opportunity_id: '',
        start_date: startVal,
        end_date: endVal,
        status: 'todo',
        description: '',
        task_type_id: taskTypes[0]?.id ? String(taskTypes[0].id) : '',
        assigned_to: defaultUserId || '',
        participants: [],
      });
      setShowModal(true);
    },
    [taskTypes],
  );

  const handleOpenEdit = useCallback(async (t: Task) => {
    try {
      setLoading(true);
      const details: any = await crmApi.getTask(t.id);
      setSelectedTask(details);
      setForm({
        title: details.title || '',
        opportunity_id: details.opportunity_id ? String(details.opportunity_id) : '',
        start_date: formatForDateTimeInput(details.start_date),
        end_date: formatForDateTimeInput(details.end_date),
        status: details.status || 'todo',
        description: details.description || '',
        task_type_id: details.task_type_id ? String(details.task_type_id) : '',
        assigned_to: details.assigned_to ? String(details.assigned_to) : '',
        participants: (details.participants || []).map((p: any) => String(p.user_id)),
      });
      setShowModal(true);
    } catch {
      toast.error('Error al cargar la tarea comercial.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.title.trim()) {
        toast.error('El título de la tarea es obligatorio.');
        return;
      }
      setSaving(true);
      try {
        const payload = {
          title: form.title.trim(),
          opportunity_id: form.opportunity_id ? parseInt(form.opportunity_id, 10) : null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          status: form.status,
          description: form.description.trim() || null,
          task_type_id: form.task_type_id ? parseInt(form.task_type_id, 10) : null,
          assigned_to: form.assigned_to ? parseInt(form.assigned_to, 10) : null,
          participants: form.participants.map((id) => parseInt(id, 10)),
        };

        if (selectedTask) {
          await crmApi.updateTask(selectedTask.id, payload as any);
          toast.success('Tarea comercial actualizada.');
        } else {
          await crmApi.createTask(payload as any);
          toast.success('Tarea comercial creada.');
        }
        setShowModal(false);
        loadData();
      } catch (err: any) {
        toast.error(err?.message || 'Error al guardar la tarea.');
      } finally {
        setSaving(false);
      }
    },
    [form, selectedTask, loadData],
  );

  const handleDrop = useCallback(
    async (itemId: string | number, toStage: string) => {
      const taskId = Number(itemId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: toStage as Task['status'] } : t)));
      setJustDroppedId(taskId);
      setTimeout(() => setJustDroppedId(null), 550);
      try {
        await crmApi.updateTask(taskId, { status: toStage } as any);
        toast.success('Estado de la tarea actualizado.');
        loadData(true);
      } catch {
        loadData();
        toast.error('Error al actualizar el estado de la tarea.');
      }
    },
    [loadData],
  );

  const handleDeleteClick = useCallback((id: number) => {
    setTaskIdToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (taskIdToDelete === null) return;
    try {
      await crmApi.deleteTask(taskIdToDelete);
      toast.success('Tarea comercial eliminada.');
      loadData();
    } catch {
      toast.error('Error al eliminar la tarea.');
    } finally {
      setDeleteConfirmOpen(false);
      setTaskIdToDelete(null);
    }
  }, [taskIdToDelete, loadData]);

  const handleToggleArchive = useCallback(
    async (task: Task) => {
      const nextStatus = task.status === 'archived' ? 'todo' : 'archived';
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus as Task['status'] } : t)));
      try {
        await crmApi.updateTask(task.id, { status: nextStatus });
        toast.success(nextStatus === 'archived' ? 'Tarea comercial archivada.' : 'Tarea comercial restaurada.');
        loadData(true);
      } catch {
        loadData();
        toast.error('Error al cambiar el estado de archivado.');
      }
    },
    [loadData],
  );

  const clearFilters = useCallback(() => {
    setFilters({ search: '', taskTypes: [], dateStart: '', dateEnd: '', assignees: [], opportunityId: '' });
  }, []);

  // ── Kanban computed ──────────────────────────────────────────────
  const kanbanColumns = useMemo(() => {
    const cols = [
      { id: 'todo', label: 'Para Hacer', dotColor: 'var(--sys-primary)' },
      { id: 'in_progress', label: 'Haciendo', dotColor: 'var(--sys-warning)' },
      { id: 'done', label: 'Hecho', dotColor: 'var(--sys-success)' },
    ];
    if (showArchived) cols.push({ id: 'archived', label: 'Archivada', dotColor: 'var(--sys-text-muted)' });
    return cols;
  }, [showArchived]);

  const itemsByStage = useMemo(() => {
    const groups: Record<string, Task[]> = { todo: [], in_progress: [], done: [], archived: [] };
    filteredTasks.forEach((t) => {
      if (groups[t.status]) groups[t.status].push(t);
    });
    return groups;
  }, [filteredTasks]);

  // ── Weekly calendar computed ────────────────────────────────────
  const weeklyDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const weeklyHeaderLabel = useMemo(() => {
    const first = weeklyDays[0];
    const last = weeklyDays[6];
    return `${first.getDate()} de ${MONTH_NAMES[first.getMonth()]} - ${last.getDate()} de ${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`;
  }, [weeklyDays]);

  const getTasksForDay = useCallback(
    (date: Date) => {
      return filteredTasks
        .filter((t) => isTaskOnDate(t, date))
        .sort((a, b) => {
          const timeA = a.start_date ? new Date(a.start_date).getTime() : 0;
          const timeB = b.start_date ? new Date(b.start_date).getTime() : 0;
          return timeA - timeB;
        });
    },
    [filteredTasks],
  );

  return {
    // Data
    tasks,
    taskTypes,
    opportunities,
    users,
    loading,
    showArchived,
    viewMode,
    currentDate,
    filters,
    form,
    selectedTask,
    saving,
    justDroppedId,
    showModal,
    deleteConfirmOpen,
    taskIdToDelete,

    // Setters
    setTasks,
    setShowArchived,
    setViewMode,
    setCurrentDate,
    setFilters,
    setForm,
    setShowModal,
    setDeleteConfirmOpen,
    setSaving,

    // Actions
    loadData,
    handleOpenCreate,
    handleOpenEdit,
    handleSubmit,
    handleDrop,
    handleDeleteClick,
    handleConfirmDelete,
    handleToggleArchive,
    clearFilters,

    // Computed
    filteredTasks,
    opportunitySelectOptions,
    taskTypeSelectOptions,
    userSelectOptions,
    kanbanColumns,
    itemsByStage,
    weeklyDays,
    weeklyHeaderLabel,
    getTasksForDay,
    getOwnerName,
  };
}
