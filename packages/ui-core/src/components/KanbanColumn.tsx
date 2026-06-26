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
      className={`bg-transparent px-3 pb-2 flex flex-col min-w-[260px] w-[260px] flex-shrink-0 transition-colors duration-200 ${
        isOver ? 'drag-over-column' : ''
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between pb-2 border-b select-none gap-2 pt-3 -mx-3 px-3"
        style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: dotColor || 'var(--sys-primary)' }}
          />
          <span className="font-semibold text-[11px] tracking-[0.08em] uppercase truncate px-2 py-0.5 rounded-sm border"
            style={{
              color: 'var(--sys-text)',
              borderColor: 'var(--sys-border-soft)',
              background: 'var(--sys-surface)',
            }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {headerExtra}
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-sm border"
            style={{
              color: 'var(--sys-text-muted)',
              borderColor: 'var(--sys-border-soft)',
              background: 'var(--sys-surface)',
            }}
          >
            {count}
          </span>
        </div>
      </div>

      <div
        className="flex-1 min-h-0 flex flex-col gap-3 px-1 pt-3 pb-1"
      >
        {children}
      </div>
    </div>
  );
};
