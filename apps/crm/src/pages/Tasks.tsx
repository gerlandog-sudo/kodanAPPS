import { useMemo, useCallback } from 'react';
import { Button, EntityCard, ConfirmDialog, Table, useAuth, formatDateTime, statusColor } from '@kodan-apps/ui-core';
import type { TableColumn } from '@kodan-apps/ui-core';
import { KanbanBoard } from '@kodan-apps/ui-core';
import { useTasksData, type Task, getIconComponent, STATUS_LABEL_MAP } from '../hooks/useTasksData';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { MonthCalendarView } from '../components/tasks/MonthCalendarView';
import { WeekCalendarView } from '../components/tasks/WeekCalendarView';
import { TaskFiltersPanel } from '../components/tasks/TaskFiltersPanel';
import {
  Plus, LayoutGrid, Calendar, CalendarDays, Table as TableIcon,
  Archive, ArchiveRestore, ListTodo,
} from 'lucide-react';

export function Tasks() {
  const { user: currentUser } = useAuth('crm');
  const {
    loading, showArchived, viewMode, currentDate,
    filters, form, selectedTask, saving, showModal, deleteConfirmOpen,
    setShowArchived, setViewMode, setCurrentDate, setFilters,
    setShowModal, setForm, setDeleteConfirmOpen,
    loadData, handleOpenCreate, handleOpenEdit, handleSubmit, handleDrop,
    handleDeleteClick, handleConfirmDelete, handleToggleArchive, clearFilters,
    filteredTasks, opportunitySelectOptions, taskTypeSelectOptions, userSelectOptions,
    kanbanColumns, itemsByStage, weeklyDays, weeklyHeaderLabel, getTasksForDay, getOwnerName,
  } = useTasksData();

  // ── Kanban card render ───────────────────────────────────────────
  const renderKanbanCard = useCallback(
    (task: Task) => {
      const Icon = getIconComponent(task.task_type_icon);
      const badge = (
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            fontSize: '10px', fontWeight: 700, padding: '0.125rem 0.5rem',
            borderRadius: '0.25rem',
            color: task.task_type_color || 'var(--sys-text-muted)',
            background: `color-mix(in srgb, ${task.task_type_color || 'var(--sys-text-muted)'} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${task.task_type_color || 'var(--sys-text-muted)'} 20%, transparent)`,
            textTransform: 'uppercase',
          }}
        >
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
          isDropped={false}
          onEdit={() => handleOpenEdit(task)}
          onDelete={() => handleDeleteClick(task.id)}
        />
      );
    },
    [getOwnerName, handleOpenEdit, handleDeleteClick],
  );

  // ── Table columns ────────────────────────────────────────────────
  const tableActions = useMemo(
    () => [
      {
        icon: <Archive size={14} />,
        label: 'Archivar / Restaurar',
        onClick: (task: Task) => handleToggleArchive(task),
      },
    ],
    [handleToggleArchive],
  );

  const tableColumns = useMemo<TableColumn<Task>[]>(
    () => [
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
        },
      },
      {
        key: 'task_type_name',
        header: 'Tipo',
        render: (t) => (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              fontSize: '10px', fontWeight: 700, padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
              color: t.task_type_color || 'var(--sys-text-muted)',
              background: `color-mix(in srgb, ${t.task_type_color || 'var(--sys-text-muted)'} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${t.task_type_color || 'var(--sys-text-muted)'} 20%, transparent)`,
              textTransform: 'uppercase',
            }}
          >
            {t.task_type_name || 'General'}
          </span>
        ),
      },
      {
        key: 'assigned_to',
        header: 'Asignado',
        render: (t) => (
          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--sys-text)' }}>
            {getOwnerName(t.assigned_to) || 'Sin asignar'}
          </span>
        ),
      },
      {
        key: 'dates',
        header: 'Fechas',
        render: (t) => (
          <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {t.start_date && <div><span style={{ color: 'var(--sys-text-muted)' }}>Inicio:</span> {formatDateTime(t.start_date)}</div>}
            {t.end_date && <div><span style={{ color: 'var(--sys-text-muted)' }}>Fin:</span> {formatDateTime(t.end_date)}</div>}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        render: (t) => {
          const c = statusColor(t.status);
          return (
            <span
              style={{
                display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '999px',
                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                color: c, background: `color-mix(in srgb, ${c} 10%, transparent)`,
                border: `1px solid color-mix(in srgb, ${c} 20%, transparent)`,
              }}
            >
              {STATUS_LABEL_MAP[t.status] || t.status}
            </span>
          );
        },
      },
    ],
    [getOwnerName],
  );

  // ── Calendar navigation helpers ─────────────────────────────────
  const goPrevMonth = useCallback(() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)), []);
  const goNextMonth = useCallback(() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)), []);
  const goToday = useCallback(() => setCurrentDate(new Date()), []);
  const goPrevWeek = useCallback(() => setCurrentDate((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; }), []);
  const goNextWeek = useCallback(() => setCurrentDate((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; }), []);

  const onDayClick = useCallback(
    (date: Date) => handleOpenCreate(date, currentUser?.id ? String(currentUser.id) : ''),
    [handleOpenCreate, currentUser],
  );

  const onNewTask = useCallback(
    () => handleOpenCreate(undefined, currentUser?.id ? String(currentUser.id) : ''),
    [handleOpenCreate, currentUser],
  );

  const onFormChange = useCallback((newForm: typeof form) => setForm(newForm), [setForm]);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4 overflow-hidden">
      {/* TOOLBAR */}
      <div className="flex flex-col gap-3 shrink-0 pb-2 w-full border-b border-border-soft/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-border-soft" style={{ background: 'var(--sys-surface)' }}>
              {[
                { mode: 'kanban' as const, icon: <LayoutGrid size={15} />, title: 'Vista Kanban' },
                { mode: 'month-calendar' as const, icon: <Calendar size={15} />, title: 'Vista Calendario Mensual' },
                { mode: 'week-calendar' as const, icon: <CalendarDays size={15} />, title: 'Vista Calendario Semanal' },
                { mode: 'table' as const, icon: <TableIcon size={15} />, title: 'Vista de Tabla' },
              ].map(({ mode, icon, title }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="bg-transparent border-none px-2.5 py-1.5 rounded-md cursor-pointer flex items-center justify-center transition-all"
                  style={{
                    background: viewMode === mode ? 'var(--sys-surface-hover)' : 'transparent',
                    color: viewMode === mode ? 'var(--sys-text)' : 'var(--sys-text-muted)',
                  }}
                  title={title}
                >
                  {icon}
                </button>
              ))}
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
            <Button variant="primary" onClick={onNewTask}>
              <Plus size={15} /> Nueva Tarea
            </Button>
          </div>
        </div>

        <TaskFiltersPanel
          filters={filters}
          taskTypeOptions={taskTypeSelectOptions}
          userOptions={userSelectOptions}
          opportunityOptions={opportunitySelectOptions}
          loading={loading}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
          onRefresh={() => loadData()}
        />
      </div>

      {/* MAIN CONTENT */}
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
                <MonthCalendarView
                  currentDate={currentDate}
                  tasks={filteredTasks}
                  onPrevMonth={goPrevMonth}
                  onNextMonth={goNextMonth}
                  onToday={goToday}
                  onDayClick={onDayClick}
                  onTaskClick={handleOpenEdit}
                />
              </div>
            )}

            {viewMode === 'week-calendar' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <WeekCalendarView
                  weeklyDays={weeklyDays}
                  weeklyHeaderLabel={weeklyHeaderLabel}
                  getTasksForDay={getTasksForDay}
                  onPrevWeek={goPrevWeek}
                  onNextWeek={goNextWeek}
                  onToday={goToday}
                  onDayClick={onDayClick}
                  onTaskClick={handleOpenEdit}
                  onToggleArchive={handleToggleArchive}
                  onDeleteClick={handleDeleteClick}
                />
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

      {/* TASK MODAL */}
      <TaskFormModal
        open={showModal}
        selectedTask={selectedTask}
        form={form}
        saving={saving}
        taskTypeOptions={taskTypeSelectOptions}
        opportunityOptions={opportunitySelectOptions}
        userOptions={userSelectOptions}
        onFormChange={onFormChange}
        onSubmit={handleSubmit}
        onClose={() => setShowModal(false)}
      />

      {/* DELETE CONFIRM */}
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
