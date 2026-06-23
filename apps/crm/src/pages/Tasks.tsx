import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button, Input, Modal, ConfirmDialog, Select, MultiSelect, Table, EntityCard, useAuth } from '@kodan-apps/ui-core';
import type { TableColumn } from '@kodan-apps/ui-core';
import { crmApi } from '../api/client';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import type { ColumnDef } from '../components/kanban/KanbanBoard';
import { 
  Plus, Trash2, Calendar, ListTodo, LayoutGrid, 
  Table as TableIcon, CalendarDays, ChevronLeft, ChevronRight, 
  Archive, ArchiveRestore, Video, Monitor, Phone, MapPin, Mail, 
  Users, Clock, Search, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

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

export function Tasks() {
  const { user: currentUser } = useAuth('crm');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View Settings
  const [viewMode, setViewMode] = useState<'kanban' | 'month-calendar' | 'week-calendar' | 'table'>('kanban');
  const [showArchived, setShowArchived] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Filter States
  const [filters, setFilters] = useState({
    search: '',
    taskTypes: [] as string[],
    dateStart: '',
    dateEnd: '',
    assignees: [] as string[],
    opportunityId: '',
  });

  // Modal & Dialog States
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskIdToDelete, setTaskIdToDelete] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    opportunity_id: '',
    start_date: '',
    end_date: '',
    status: 'todo',
    description: '',
    task_type_id: '',
    assigned_to: '',
    participants: [] as string[],
  });

  // Helper: Get Icon Component dynamically
  const getIconComponent = (iconName?: string) => {
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
  };

  // Helper: Format date string safely for HTML datetime-local input (YYYY-MM-DDTHH:MM)
  const formatForDateTimeInput = (dateVal?: string | Date | null) => {
    if (!dateVal) return '';
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return '';
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Helper: Local Date formatting (DD/MM/YYYY)
  const getLocalDateString = useCallback((date: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskList, typeList, oppList, userList] = await Promise.all([
        crmApi.listTasks({ include_archived: showArchived ? 'true' : 'false' }),
        crmApi.listTaskTypes(),
        crmApi.listOpportunities(),
        crmApi.listTenantUsers(),
      ]);
      setTasks(taskList);
      setTaskTypes(typeList);
      setOpportunities(oppList);
      setUsers(userList);
    } catch {
      toast.error('Error al cargar la agenda comercial.');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Form Select Options
  const opportunitySelectOptions = useMemo(() => {
    return opportunities.map((o) => ({
      value: String(o.id),
      label: o.name || o.title || `Oportunidad #${o.id}`,
    }));
  }, [opportunities]);

  const taskTypeSelectOptions = useMemo(() => {
    return taskTypes.map((t) => ({
      value: String(t.id),
      label: t.name,
    }));
  }, [taskTypes]);

  const userSelectOptions = useMemo(() => {
    return users.map((u) => ({
      value: String(u.id),
      label: u.display_name || u.email,
    }));
  }, [users]);

  const statusSelectOptions = [
    { value: 'todo', label: 'Para Hacer' },
    { value: 'in_progress', label: 'Haciendo' },
    { value: 'done', label: 'Hecho' },
    { value: 'archived', label: 'Archivada' },
  ];

  const getOwnerName = (userId: number | null) => {
    if (!userId) return '';
    const found = users.find(u => u.id === userId);
    return found ? found.display_name : '';
  };

  // Client-Side Task Filtering (combines text, type, dates, assignees, opportunity)
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Text Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesTitle = (t.title || '').toLowerCase().includes(query);
        const matchesDesc = (t.description || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Task Type
      if (filters.taskTypes.length > 0) {
        if (!t.task_type_id || !filters.taskTypes.includes(String(t.task_type_id))) {
          return false;
        }
      }

      // Opportunity
      if (filters.opportunityId) {
        if (String(t.opportunity_id) !== filters.opportunityId) {
          return false;
        }
      }

      // Assignee / Participants
      if (filters.assignees.length > 0) {
        const isOwner = t.assigned_to && filters.assignees.includes(String(t.assigned_to));
        const isParticipant = t.participants && t.participants.some(p => filters.assignees.includes(String(p.user_id)));
        if (!isOwner && !isParticipant) return false;
      }

      // Start Date Limit
      if (filters.dateStart) {
        const startLimit = new Date(filters.dateStart).getTime();
        const taskEnd = t.end_date ? new Date(t.end_date).getTime() : (t.start_date ? new Date(t.start_date).getTime() : 0);
        if (taskEnd && taskEnd < startLimit) return false;
      }

      // End Date Limit
      if (filters.dateEnd) {
        const endLimit = new Date(filters.dateEnd + 'T23:59:59').getTime();
        const taskStart = t.start_date ? new Date(t.start_date).getTime() : 0;
        if (taskStart && taskStart > endLimit) return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // Form Operations
  const handleOpenCreate = (initialDate?: Date) => {
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
      assigned_to: currentUser?.id ? String(currentUser.id) : '',
      participants: [],
    });
    setShowModal(true);
  };

  const handleOpenEdit = async (t: Task) => {
    try {
      setLoading(true);
      const details = await crmApi.getTask(t.id);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        participants: form.participants.map(id => parseInt(id, 10)),
      };

      if (selectedTask) {
        await crmApi.updateTask(selectedTask.id, payload);
        toast.success('Tarea comercial actualizada.');
      } else {
        await crmApi.createTask(payload);
        toast.success('Tarea comercial creada.');
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar la tarea.');
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = async (itemId: string | number, toStage: string) => {
    try {
      await crmApi.updateTask(Number(itemId), { status: toStage });
      toast.success('Estado de la tarea actualizado.');
      loadData();
    } catch {
      toast.error('Error al actualizar el estado de la tarea.');
    }
  };

  const handleDeleteClick = (id: number) => {
    setTaskIdToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
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
  };

  const handleToggleArchive = async (task: Task) => {
    try {
      const nextStatus = task.status === 'archived' ? 'todo' : 'archived';
      await crmApi.updateTask(task.id, { status: nextStatus });
      toast.success(nextStatus === 'archived' ? 'Tarea comercial archivada.' : 'Tarea comercial restaurada.');
      loadData();
    } catch {
      toast.error('Error al cambiar el estado de archivado.');
    }
  };

  // Clean filters helper
  const clearFilters = () => {
    setFilters({
      search: '',
      taskTypes: [],
      dateStart: '',
      dateEnd: '',
      assignees: [],
      opportunityId: '',
    });
  };

  // --- KANBAN VIEW RENDER CONFIG ---
  const kanbanColumns = useMemo<ColumnDef[]>(() => {
    const cols: ColumnDef[] = [
      { id: 'todo', label: 'Para Hacer', dotColor: '#3B82F6' },
      { id: 'in_progress', label: 'Haciendo', dotColor: '#F59E0B' },
      { id: 'done', label: 'Hecho', dotColor: '#10B981' },
    ];
    if (showArchived) {
      cols.push({ id: 'archived', label: 'Archivada', dotColor: '#6B7280' });
    }
    return cols;
  }, [showArchived]);

  const itemsByStage = useMemo(() => {
    const groups: Record<string, Task[]> = { todo: [], in_progress: [], done: [], archived: [] };
    filteredTasks.forEach((t) => {
      if (groups[t.status]) {
        groups[t.status].push(t);
      }
    });
    return groups;
  }, [filteredTasks]);

  const renderKanbanCard = (task: Task) => {
    const Icon = getIconComponent(task.task_type_icon);
    const badge = (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        fontSize: '10px', fontWeight: 700, padding: '0.125rem 0.5rem',
        borderRadius: '0.25rem',
        color: task.task_type_color || 'var(--sys-text-muted)',
        background: `color-mix(in srgb, ${task.task_type_color || 'var(--sys-text-muted)'} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${task.task_type_color || 'var(--sys-text-muted)'} 20%, transparent)`,
        textTransform: 'uppercase'
      }}>
        <Icon size={10} />
        {task.task_type_name || 'General'}
      </span>
    );

    return (
      <EntityCard
        title={task.title}
        badge={badge}
        stageColor={task.task_type_color}
        accountName={task.opportunity_name}
        startDate={task.start_date || undefined}
        closeDate={task.end_date || undefined}
        ownerName={getOwnerName(task.assigned_to)}
        onEdit={() => handleOpenEdit(task)}
        onDelete={() => handleDeleteClick(task.id)}
      />
    );
  };

  // --- MONTH CALENDAR VIEW ---
  const isTaskOnDate = (task: Task, date: Date) => {
    if (!task.start_date || !task.end_date) return false;
    const cellTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    
    const start = new Date(task.start_date);
    const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    
    const end = new Date(task.end_date);
    const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    
    return cellTime >= startTime && cellTime <= endTime;
  };

  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Start on Monday (adjusting native 0=Sunday to Monday as index 0)
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      cells.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month - 1, day),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }

    // Next month padding
    const nextPaddingCount = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
    for (let i = 1; i <= nextPaddingCount; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return cells;
  }, [currentDate]);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const renderMonthCalendar = () => {
    const daysOfWeekLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const todayStr = getLocalDateString(new Date());

    return (
      <div className="flex flex-col flex-1 min-h-0 bg-surface-raised border border-border-soft rounded-lg p-4">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-text">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const next = new Date(currentDate);
                next.setMonth(next.getMonth() - 1);
                setCurrentDate(next);
              }}
              className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md p-1.5 cursor-pointer text-text-muted transition-colors active:scale-95 flex items-center justify-center"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md px-3 py-1.5 cursor-pointer text-xs font-semibold text-text-muted transition-colors active:scale-95"
            >
              Hoy
            </button>
            <button
              onClick={() => {
                const next = new Date(currentDate);
                next.setMonth(next.getMonth() + 1);
                setCurrentDate(next);
              }}
              className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md p-1.5 cursor-pointer text-text-muted transition-colors active:scale-95 flex items-center justify-center"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-border-soft pb-2 mb-1">
          {daysOfWeekLabels.map((lbl) => (
            <div key={lbl} className="text-center text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {lbl}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1 min-h-[450px] divide-x divide-y divide-border-soft/60 border-t border-l border-border-soft/60" style={{ gridAutoRows: '1fr' }}>
          {calendarCells.map((cell, idx) => {
            const cellDateStr = getLocalDateString(cell.date);
            const isToday = cellDateStr === todayStr;
            const dayTasks = filteredTasks.filter((t) => isTaskOnDate(t, cell.date));

            return (
              <div
                key={idx}
                onClick={() => handleOpenCreate(cell.date)}
                className={`p-2 flex flex-col gap-1 select-none transition-colors border-r border-b border-border-soft/60 cursor-pointer ${
                  cell.isCurrentMonth ? 'bg-surface-raised hover:bg-surface-hover/20' : 'bg-surface/30 opacity-40'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span />
                  <span
                    className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-primary text-on-primary'
                        : 'text-text-muted'
                    }`}
                  >
                    {cell.day}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-1 max-h-[140px]">
                  {dayTasks.map((task) => {
                    const stageColor = task.task_type_color || 'var(--sys-primary)';
                    const Icon = getIconComponent(task.task_type_icon);
                    return (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(task);
                        }}
                        className="w-full text-left p-1 rounded text-[10px] font-medium transition-all hover:scale-[1.01] truncate flex items-center gap-1 border"
                        style={{
                          background: `color-mix(in srgb, ${stageColor} 8%, var(--sys-surface))`,
                          borderColor: `color-mix(in srgb, ${stageColor} 20%, transparent)`,
                          borderLeftWidth: '3px',
                          borderLeftColor: stageColor,
                          color: 'var(--sys-text)',
                          cursor: 'pointer',
                        }}
                        title={`${task.title} (${task.task_type_name || 'General'})`}
                      >
                        <span style={{ color: stageColor, flexShrink: 0 }}>
                          <Icon size={10} />
                        </span>
                        <span className="font-semibold truncate">{task.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- WEEKLY CALENDAR VIEW ---
  const weeklyDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // get Monday
    startOfWeek.setDate(diff);

    const days = [];
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
    return `${first.getDate()} de ${monthNames[first.getMonth()]} - ${last.getDate()} de ${monthNames[last.getMonth()]} ${last.getFullYear()}`;
  }, [weeklyDays]);

  const formatTimeRange = (startDateStr?: string | null, endDateStr?: string | null) => {
    if (!startDateStr || !endDateStr) return 'Todo el día';
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
  };

  const getTasksForDay = (date: Date) => {
    return filteredTasks
      .filter(t => isTaskOnDate(t, date))
      .sort((a, b) => {
        const timeA = a.start_date ? new Date(a.start_date).getTime() : 0;
        const timeB = b.start_date ? new Date(b.start_date).getTime() : 0;
        return timeA - timeB;
      });
  };

  const renderWeeklyCalendar = () => {
    const daysOfWeekLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const todayStr = getLocalDateString(new Date());

    return (
      <div className="flex flex-col flex-1 min-h-0 bg-surface-raised border border-border-soft rounded-lg p-4">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-text">
            {weeklyHeaderLabel}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const next = new Date(currentDate);
                next.setDate(next.getDate() - 7);
                setCurrentDate(next);
              }}
              className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md p-1.5 cursor-pointer text-text-muted transition-colors active:scale-95 flex items-center justify-center"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md px-3 py-1.5 cursor-pointer text-xs font-semibold text-text-muted transition-colors active:scale-95"
            >
              Hoy
            </button>
            <button
              onClick={() => {
                const next = new Date(currentDate);
                next.setDate(next.getDate() + 7);
                setCurrentDate(next);
              }}
              className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md p-1.5 cursor-pointer text-text-muted transition-colors active:scale-95 flex items-center justify-center"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* 7 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 flex-1 min-h-[450px] divide-x divide-border-soft border border-border-soft rounded-md overflow-hidden bg-surface">
          {weeklyDays.map((date, idx) => {
            const dateStr = getLocalDateString(date);
            const isToday = dateStr === todayStr;
            const dayTasks = getTasksForDay(date);

            return (
              <div key={idx} className="flex flex-col min-h-[150px] bg-surface-raised">
                {/* Column Header */}
                <div 
                  onClick={() => handleOpenCreate(date)}
                  className={`p-3 text-center border-b border-border-soft flex flex-col gap-0.5 cursor-pointer select-none transition-colors hover:bg-surface-hover/20 ${
                    isToday ? 'bg-primary-container/10 border-b-2 border-b-primary' : ''
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {daysOfWeekLabels[idx]}
                  </span>
                  <span className={`text-base font-extrabold inline-flex mx-auto items-center justify-center w-7 h-7 rounded-full ${
                    isToday ? 'bg-primary text-on-primary' : 'text-text'
                  }`}>
                    {date.getDate()}
                  </span>
                </div>

                {/* Column List of Tasks */}
                <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto max-h-[500px]">
                  {dayTasks.length === 0 ? (
                    <span className="text-[10px] text-text-muted/40 italic text-center mt-4">Sin tareas</span>
                  ) : (
                    dayTasks.map(task => {
                      const stageColor = task.task_type_color || 'var(--sys-primary)';
                      const Icon = getIconComponent(task.task_type_icon);

                      return (
                        <div
                          key={task.id}
                          onClick={() => handleOpenEdit(task)}
                          className="p-2.5 rounded-lg border flex flex-col gap-1 transition-all hover:scale-[1.02] cursor-pointer"
                          style={{
                            background: `color-mix(in srgb, ${stageColor} 6%, var(--sys-surface-raised))`,
                            borderColor: stageColor,
                            borderLeftWidth: '4px',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.125rem',
                              fontSize: '8px', fontWeight: 800, padding: '0.125rem 0.25rem',
                              borderRadius: '0.125rem', color: stageColor,
                              background: `color-mix(in srgb, ${stageColor} 10%, transparent)`,
                              textTransform: 'uppercase'
                            }}>
                              <Icon size={8} />
                              {task.task_type_name || 'General'}
                            </span>
                            <span className="text-[8px] font-semibold text-text-muted flex items-center gap-0.5">
                              <Clock size={8} />
                              {formatTimeRange(task.start_date, task.end_date)}
                            </span>
                          </div>

                          <span className="text-[11px] font-bold text-text truncate max-w-full">
                            {task.title}
                          </span>

                          {task.opportunity_name && (
                            <span className="text-[9px] text-text-muted truncate">
                              Negoc: {task.opportunity_name}
                            </span>
                          )}

                          <div className="flex items-center justify-between border-t border-border-soft/30 pt-1.5 mt-1">
                            <span className="text-[8px] font-bold text-text-muted uppercase">
                              {task.status === 'todo' ? 'Por hacer' : task.status === 'in_progress' ? 'Haciendo' : task.status === 'done' ? 'Hecho' : 'Archivada'}
                            </span>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleArchive(task);
                                }}
                                className="bg-transparent border-none p-0.5 rounded cursor-pointer text-text-muted hover:text-text"
                                title={task.status === 'archived' ? 'Restaurar' : 'Archivar'}
                              >
                                {task.status === 'archived' ? <ArchiveRestore size={10} /> : <Archive size={10} />}
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(task.id);
                                }}
                                className="bg-transparent border-none p-0.5 rounded cursor-pointer text-text-muted hover:text-error"
                                title="Eliminar"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- TABLE VIEW CONFIG ---
  const tableActions = useMemo(() => {
    return [
      {
        icon: <Archive size={14} />,
        label: 'Archivar / Restaurar',
        onClick: (task: Task) => handleToggleArchive(task)
      }
    ];
  }, [tasks]);

  const tableColumns: TableColumn<Task>[] = useMemo(() => [
    {
      key: 'title',
      header: 'Tarea',
      render: (t) => {
        const Icon = getIconComponent(t.task_type_icon);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: t.task_type_color || 'var(--sys-primary)' }}>
                <Icon size={16} />
              </span>
              <span style={{ fontWeight: 600, color: 'var(--sys-text)' }}>{t.title}</span>
            </div>
            {t.opportunity_name && (
              <span style={{ fontSize: '10px', color: 'var(--sys-text-muted)', marginLeft: '1.5rem' }}>
                Negociación: {t.opportunity_name}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'task_type_name',
      header: 'Tipo',
      render: (t) => (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          fontSize: '10px', fontWeight: 700, padding: '0.125rem 0.5rem',
          borderRadius: '0.25rem',
          color: t.task_type_color || 'var(--sys-text-muted)',
          background: `color-mix(in srgb, ${t.task_type_color || 'var(--sys-text-muted)'} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${t.task_type_color || 'var(--sys-text-muted)'} 20%, transparent)`,
          textTransform: 'uppercase'
        }}>
          {t.task_type_name || 'General'}
        </span>
      )
    },
    {
      key: 'assigned_to',
      header: 'Asignado',
      render: (t) => {
        const ownerName = getOwnerName(t.assigned_to);
        return (
          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--sys-text)' }}>
            {ownerName || 'Sin asignar'}
          </span>
        );
      }
    },
    {
      key: 'dates',
      header: 'Fechas',
      render: (t) => {
        const formatDate = (dStr?: string | null) => {
          if (!dStr) return '';
          return new Date(dStr).toLocaleDateString('es-AR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
          });
        };
        return (
          <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {t.start_date && (
              <div>
                <span style={{ color: 'var(--sys-text-muted)' }}>Inicio:</span> {formatDate(t.start_date)}
              </div>
            )}
            {t.end_date && (
              <div>
                <span style={{ color: 'var(--sys-text-muted)' }}>Fin:</span> {formatDate(t.end_date)}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Estado',
      render: (t) => {
        const labels: Record<string, string> = {
          todo: 'Para Hacer',
          in_progress: 'Haciendo',
          done: 'Hecho',
          archived: 'Archivada'
        };
        const colors: Record<string, string> = {
          todo: '#3B82F6',
          in_progress: '#F59E0B',
          done: '#10B981',
          archived: '#6B7280'
        };
        return (
          <span style={{
            display: 'inline-block',
            padding: '0.125rem 0.5rem',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: colors[t.status] || '#6366F1',
            background: `color-mix(in srgb, ${colors[t.status] || '#6366F1'} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${colors[t.status] || '#6366F1'} 20%, transparent)`
          }}>
            {labels[t.status] || t.status}
          </span>
        );
      }
    }
  ], [users]);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4 overflow-hidden">
      {/* TOOLBAR CONTROLS */}
      <div className="flex flex-col gap-3 shrink-0 pb-2 w-full border-b border-border-soft/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-extrabold tracking-tight text-text">Agenda y Tareas</h1>
            {/* View Selector Buttons */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-border-soft" style={{ background: 'var(--sys-surface)' }}>
              <button
                onClick={() => setViewMode('kanban')}
                className="bg-transparent border-none px-2.5 py-1.5 rounded-md cursor-pointer flex items-center justify-center transition-all"
                style={{
                  background: viewMode === 'kanban' ? 'var(--sys-surface-hover)' : 'transparent',
                  color: viewMode === 'kanban' ? 'var(--sys-text)' : 'var(--sys-text-muted)',
                }}
                title="Vista Kanban"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('month-calendar')}
                className="bg-transparent border-none px-2.5 py-1.5 rounded-md cursor-pointer flex items-center justify-center transition-all"
                style={{
                  background: viewMode === 'month-calendar' ? 'var(--sys-surface-hover)' : 'transparent',
                  color: viewMode === 'month-calendar' ? 'var(--sys-text)' : 'var(--sys-text-muted)',
                }}
                title="Vista Calendario Mensual"
              >
                <Calendar size={15} />
              </button>
              <button
                onClick={() => setViewMode('week-calendar')}
                className="bg-transparent border-none px-2.5 py-1.5 rounded-md cursor-pointer flex items-center justify-center transition-all"
                style={{
                  background: viewMode === 'week-calendar' ? 'var(--sys-surface-hover)' : 'transparent',
                  color: viewMode === 'week-calendar' ? 'var(--sys-text)' : 'var(--sys-text-muted)',
                }}
                title="Vista Calendario Semanal"
              >
                <CalendarDays size={15} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className="bg-transparent border-none px-2.5 py-1.5 rounded-md cursor-pointer flex items-center justify-center transition-all"
                style={{
                  background: viewMode === 'table' ? 'var(--sys-surface-hover)' : 'transparent',
                  color: viewMode === 'table' ? 'var(--sys-text)' : 'var(--sys-text-muted)',
                }}
                title="Vista de Tabla"
              >
                <TableIcon size={15} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="bg-transparent border border-border-soft rounded-lg px-3 py-2 cursor-pointer inline-flex items-center justify-center transition-colors"
              style={{
                background: showArchived ? 'var(--sys-primary-container)' : 'transparent',
                color: showArchived ? 'var(--sys-on-primary)' : 'var(--sys-text-muted)',
              }}
              title={showArchived ? 'Ocultar archivadas' : 'Mostrar archivadas'}
            >
              {showArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
              <span className="text-xs font-semibold ml-1.5">{showArchived ? 'Archivadas' : 'Activas'}</span>
            </button>
            
            <Button variant="primary" onClick={() => handleOpenCreate()}>
              <Plus size={15} /> Nueva Tarea
            </Button>
          </div>
        </div>

        {/* ADVANCED FILTERS PANEL */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border-soft bg-surface/30">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted opacity-70" />
            <input
              type="text"
              placeholder="Buscar por título o descripción..."
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border-soft bg-surface-raised text-text text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Type Filter */}
          <div className="w-[180px]">
            <MultiSelect
              placeholder="Filtrar por Tipo"
              options={taskTypeSelectOptions}
              values={filters.taskTypes}
              onChange={vals => setFilters(p => ({ ...p, taskTypes: vals }))}
            />
          </div>

          {/* Assigned/Participants Filter */}
          <div className="w-[180px]">
            <MultiSelect
              placeholder="Filtrar Operadores"
              options={userSelectOptions}
              values={filters.assignees}
              onChange={vals => setFilters(p => ({ ...p, assignees: vals }))}
            />
          </div>

          {/* Opportunity Filter */}
          <div className="w-[200px]">
            <Select
              placeholder="Por Negociación"
              options={opportunitySelectOptions}
              value={filters.opportunityId}
              onChange={val => setFilters(p => ({ ...p, opportunityId: String(val) }))}
              searchable={true}
            />
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <input
              type="date"
              value={filters.dateStart}
              onChange={e => setFilters(p => ({ ...p, dateStart: e.target.value }))}
              className="border border-border-soft bg-surface-raised rounded px-2 py-1 text-text focus:outline-none"
              title="Desde"
            />
            <span>a</span>
            <input
              type="date"
              value={filters.dateEnd}
              onChange={e => setFilters(p => ({ ...p, dateEnd: e.target.value }))}
              className="border border-border-soft bg-surface-raised rounded px-2 py-1 text-text focus:outline-none"
              title="Hasta"
            />
          </div>

          {/* Refresh / Clear */}
          <div className="flex gap-1.5">
            <button
              onClick={clearFilters}
              className="bg-transparent border border-border-soft hover:bg-surface rounded px-2.5 py-1.5 text-xs text-text-muted cursor-pointer transition-colors"
              title="Limpiar filtros"
            >
              Limpiar
            </button>
            <button
              onClick={loadData}
              className="bg-transparent border border-border-soft hover:bg-surface rounded p-1.5 text-text-muted cursor-pointer transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[40vh] gap-3">
            <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-text-muted">Cargando agenda comercial...</span>
          </div>
        ) : (
          <>
            {viewMode === 'kanban' && (
              <div className="flex-1 min-h-0">
                <KanbanBoard<Task>
                  columns={kanbanColumns}
                  itemsByStage={itemsByStage}
                  onDrop={handleDrop}
                  renderCard={renderKanbanCard}
                  className="h-full"
                  emptyPlaceholder={
                    <div className="h-16 rounded border border-dashed flex items-center justify-center text-[10px] uppercase tracking-wider opacity-40 select-none">
                      Arrastrar aquí
                    </div>
                  }
                />
              </div>
            )}

            {viewMode === 'month-calendar' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                {renderMonthCalendar()}
              </div>
            )}

            {viewMode === 'week-calendar' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                {renderWeeklyCalendar()}
              </div>
            )}

            {viewMode === 'table' && (
              <div className="flex-1 overflow-y-auto pb-4">
                <Table<Task>
                  data={filteredTasks}
                  columns={tableColumns}
                  keyExtractor={(t) => t.id}
                  editable={{ onClick: handleOpenEdit }}
                  deletable={{ onClick: (task) => handleDeleteClick(task.id) }}
                  actions={tableActions}
                  pageSize={15}
                  emptyState={{
                    icon: <ListTodo size={32} style={{ color: 'var(--sys-text-muted)', opacity: 0.3 }} />,
                    title: 'No se encontraron tareas comerciales',
                    description: 'Crea una tarea comercial o ajusta los filtros activos.',
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* TASK MODAL (CREATION & EDITION) */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selectedTask ? 'Editar Tarea Comercial' : 'Nueva Tarea Comercial'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">TÍTULO DE LA TAREA *</label>
            <Input 
              value={form.title} 
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} 
              placeholder="Ej: Llamar por propuesta técnica" 
              required 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">TIPO DE TAREA *</label>
              <Select
                options={taskTypeSelectOptions}
                value={form.task_type_id}
                onChange={(val) => setForm(prev => ({ ...prev, task_type_id: String(val) }))}
                placeholder="Seleccionar tipo..."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">ESTADO *</label>
              <Select
                options={statusSelectOptions}
                value={form.status}
                onChange={(val) => setForm(prev => ({ ...prev, status: String(val) }))}
                placeholder="Seleccionar estado..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">FECHA Y HORA DE INICIO</label>
              <Input 
                type="datetime-local"
                value={form.start_date} 
                onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">FECHA Y HORA DE FIN</label>
              <Input 
                type="datetime-local"
                value={form.end_date} 
                onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">NEGOCIACIÓN RELACIONADA</label>
              <Select
                options={opportunitySelectOptions}
                value={form.opportunity_id}
                onChange={(val) => setForm(prev => ({ ...prev, opportunity_id: String(val) }))}
                placeholder="Seleccionar negociación..."
                searchable={true}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">DUEÑO / RESPONSABLE</label>
              <Select
                options={userSelectOptions}
                value={form.assigned_to}
                onChange={(val) => setForm(prev => ({ ...prev, assigned_to: String(val) }))}
                placeholder="Heredar de negociación o elegir..."
                searchable={true}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">OTROS PARTICIPANTES</label>
            <MultiSelect
              options={userSelectOptions.filter(o => o.value !== form.assigned_to)}
              values={form.participants}
              onChange={(vals) => setForm(prev => ({ ...prev, participants: vals }))}
              placeholder="Seleccionar participantes adicionales..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">DESCRIPCIÓN / NOTAS COMERCIALES</label>
            <textarea 
              className="w-full bg-surface-raised border border-border-soft rounded-lg px-4 py-2.5 text-text text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" 
              rows={3}
              value={form.description} 
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} 
              placeholder="Detalles adicionales, recordatorio de temas a conversar..." 
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--sys-border-soft)' }}>
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : (selectedTask ? 'Guardar Cambios' : 'Crear Tarea')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar tarea comercial"
        message="¿Está seguro de que desea eliminar esta tarea comercial? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
