import { ChevronLeft, ChevronRight, Clock, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import type { Task } from '../../hooks/useTasksData';
import {
  getIconComponent, getLocalDateString, formatTimeRange,
  DAY_LABELS, STATUS_LABEL_MAP,
} from '../../hooks/useTasksData';

interface WeekCalendarViewProps {
  weeklyDays: Date[];
  weeklyHeaderLabel: string;
  getTasksForDay: (date: Date) => Task[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onDayClick: (date: Date) => void;
  onTaskClick: (task: Task) => void;
  onToggleArchive: (task: Task) => void;
  onDeleteClick: (id: number) => void;
}

export function WeekCalendarView({
  weeklyDays,
  weeklyHeaderLabel,
  getTasksForDay,
  onPrevWeek,
  onNextWeek,
  onToday,
  onDayClick,
  onTaskClick,
  onToggleArchive,
  onDeleteClick,
}: WeekCalendarViewProps) {
  const todayStr = getLocalDateString(new Date());

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-surface-raised border border-border-soft rounded-lg p-4">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-text">{weeklyHeaderLabel}</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrevWeek}
            className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md p-1.5 cursor-pointer text-text-muted transition-colors active:scale-95 flex items-center justify-center"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onToday}
            className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md px-3 py-1.5 cursor-pointer text-xs font-semibold text-text-muted transition-colors active:scale-95"
          >
            Hoy
          </button>
          <button
            onClick={onNextWeek}
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
            <div key={dateStr} className="flex flex-col min-h-[150px] bg-surface-raised">
              {/* Column Header */}
              <div
                onClick={() => onDayClick(date)}
                className={`p-3 text-center border-b border-border-soft flex flex-col gap-0.5 cursor-pointer select-none transition-colors hover:bg-surface-hover/20 ${
                  isToday ? 'bg-primary-container/10 border-b-2 border-b-primary' : ''
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {DAY_LABELS[idx]}
                </span>
                <span
                  className={`text-base font-extrabold inline-flex mx-auto items-center justify-center w-7 h-7 rounded-full ${
                    isToday ? 'bg-primary text-on-primary' : 'text-text'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto max-h-[500px]">
                {dayTasks.length === 0 ? (
                  <span className="text-[10px] text-text-muted/40 italic text-center mt-4">Sin tareas</span>
                ) : (
                  dayTasks.map((task) => {
                    const stageColor = task.task_type_color || 'var(--sys-primary)';
                    const Icon = getIconComponent(task.task_type_icon);

                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className="p-2.5 rounded-lg border flex flex-col gap-1 transition-all hover:scale-[1.02] cursor-pointer"
                        style={{
                          background: `color-mix(in srgb, ${stageColor} 6%, var(--sys-surface-raised))`,
                          borderColor: stageColor,
                          borderLeftWidth: '4px',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.125rem',
                              fontSize: '8px', fontWeight: 800, padding: '0.125rem 0.25rem',
                              borderRadius: '0.125rem', color: stageColor,
                              background: `color-mix(in srgb, ${stageColor} 10%, transparent)`,
                              textTransform: 'uppercase',
                            }}
                          >
                            <Icon size={8} />
                            {task.task_type_name || 'General'}
                          </span>
                          <span className="text-[8px] font-semibold text-text-muted flex items-center gap-0.5">
                            <Clock size={8} />
                            {formatTimeRange(task.start_date, task.end_date)}
                          </span>
                        </div>

                        <span className="text-[11px] font-bold text-text truncate max-w-full">{task.title}</span>

                        {task.opportunity_name && (
                          <span className="text-[9px] text-text-muted truncate">Negoc: {task.opportunity_name}</span>
                        )}

                        <div className="flex items-center justify-between border-t border-border-soft/30 pt-1.5 mt-1">
                          <span className="text-[8px] font-bold text-text-muted uppercase">
                            {STATUS_LABEL_MAP[task.status] || task.status}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleArchive(task);
                              }}
                              className="bg-transparent border-none p-0.5 rounded cursor-pointer text-text-muted hover:text-text"
                              title={task.status === 'archived' ? 'Restaurar' : 'Archivar'}
                            >
                              {task.status === 'archived' ? <ArchiveRestore size={10} /> : <Archive size={10} />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteClick(task.id);
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
}
