import React from 'react';
import { useDroppable } from '@dnd-kit/core';

export interface KanbanColumnProps {
  stage: string;
  label: string;
  count: number;
  isOver: boolean;
  dotColor?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

const getStageBadgeClass = (stage: string) => {
  const colors: Record<string, string> = {
    todo: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/55 dark:border-blue-900/30',
    in_progress: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100/55 dark:border-purple-900/30',
    review: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100/55 dark:border-amber-900/30',
    done: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/55 dark:border-emerald-900/30',
    archived: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
  };
  return colors[stage] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  label,
  count,
  isOver,
  dotColor,
  headerExtra,
  children,
}) => {
  const { setNodeRef } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`bg-transparent pb-2 flex flex-col min-w-[280px] w-[280px] flex-shrink-0 transition-colors duration-200 ${
        isOver ? 'bg-slate-50/50 dark:bg-slate-800/20 rounded-xl' : ''
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between pb-3 select-none gap-2 pt-3 px-1"
        style={{ background: 'var(--sys-bg)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {dotColor && (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: dotColor }}
            />
          )}
          <span className="font-bold text-xs tracking-wider uppercase text-slate-800 dark:text-slate-200 truncate">
            {label}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStageBadgeClass(stage)}`}>
            {count}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {headerExtra}
        </div>
      </div>

      <div
        className="flex-1 min-h-0 flex flex-col gap-3.5 pt-3 pb-1 overflow-y-auto pr-1.5 scrollbar-thin"
      >
        {children}
      </div>
    </div>
  );
};
