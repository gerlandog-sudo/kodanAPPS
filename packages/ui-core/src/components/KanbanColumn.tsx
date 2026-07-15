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
    todo: 'bg-[var(--sys-primary)]/10 text-[var(--sys-primary)] border border-[var(--sys-primary)]/20',
    in_progress: 'bg-[var(--sys-tertiary)]/10 text-[var(--sys-tertiary)] border border-[var(--sys-tertiary)]/20',
    review: 'bg-[var(--sys-tertiary)]/10 text-[var(--sys-tertiary)] border border-[var(--sys-tertiary)]/20',
    done: 'bg-[var(--sys-success)]/10 text-[var(--sys-success)] border border-[var(--sys-success)]/20',
    archived: 'bg-[var(--sys-text-muted)]/10 text-[var(--sys-text-muted)] border border-[var(--sys-border)]',
  };
  return colors[stage] || 'bg-[var(--sys-text-muted)]/10 text-[var(--sys-text-muted)] border border-[var(--sys-border)]';
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
        isOver ? 'bg-surface-hover/30 rounded-xl' : ''
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
          <span className="font-bold text-xs tracking-wider uppercase text-text truncate">
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
