import { useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '../../hooks/useTasksData';
import { getIconComponent, isTaskOnDate, getLocalDateString, MONTH_NAMES, DAY_LABELS } from '../../hooks/useTasksData';

interface MonthCalendarViewProps {
  currentDate: Date;
  tasks: Task[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onDayClick: (date: Date) => void;
  onTaskClick: (task: Task) => void;
}

export function MonthCalendarView({
  currentDate,
  tasks,
  onPrevMonth,
  onNextMonth,
  onToday,
  onDayClick,
  onTaskClick,
}: MonthCalendarViewProps) {
  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, isCurrentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    const nextPaddingCount = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
    for (let i = 1; i <= nextPaddingCount; i++) {
      cells.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }

    return cells;
  }, [currentDate]);

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  const handleDayClick = useCallback((date: Date) => onDayClick(date), [onDayClick]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-surface-raised border border-border-soft rounded-lg p-4">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-text">
          {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrevMonth}
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
            onClick={onNextMonth}
            className="bg-transparent border border-border-soft hover:bg-surface hover:text-text rounded-md p-1.5 cursor-pointer text-text-muted transition-colors active:scale-95 flex items-center justify-center"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 border-b border-border-soft pb-2 mb-1">
        {DAY_LABELS.map((lbl) => (
          <div key={lbl} className="text-center text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {lbl}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div
        className="grid grid-cols-7 flex-1 min-h-[450px] divide-x divide-y divide-border-soft/60 border-t border-l border-border-soft/60"
        style={{ gridAutoRows: '1fr' }}
      >
        {calendarCells.map((cell) => {
          const cellDateStr = getLocalDateString(cell.date);
          const isToday = cellDateStr === todayStr;
          const dayTasks = tasks.filter((t) => isTaskOnDate(t, cell.date));

          return (
            <div
              key={cellDateStr}
              onClick={() => handleDayClick(cell.date)}
              className={`p-2 flex flex-col gap-1 select-none transition-colors border-r border-b border-border-soft/60 cursor-pointer ${
                cell.isCurrentMonth ? 'bg-surface-raised hover:bg-surface-hover/20' : 'bg-surface/30 opacity-40'
              }`}
            >
              <div className="flex justify-between items-center">
                <span />
                <span
                  className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-primary text-on-primary' : 'text-text-muted'
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
                        onTaskClick(task);
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
}
