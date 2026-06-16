import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, useDraggable } from '@dnd-kit/core';
import { useKanbanDrag } from './useKanbanDrag';
import { KanbanColumn } from './KanbanColumn';

export interface ColumnDef {
  id: string;
  label: string;
  dotColor?: string;
}

export interface KanbanBoardProps<T> {
  columns: ColumnDef[];
  itemsByStage: Record<string, T[]>;
  onDrop: (itemId: string | number, toStage: string) => void;
  renderCard: (item: T) => React.ReactNode;
  renderOverlayCard?: (item: T) => React.ReactNode;
  renderColumnExtra?: (stage: string, items: T[]) => React.ReactNode;
  emptyPlaceholder?: React.ReactNode;
  className?: string;
}

function KanbanCardWrapper({
  id,
  children,
}: {
  id: string | number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export function KanbanBoard<T>({
  columns,
  itemsByStage,
  onDrop,
  renderCard,
  renderOverlayCard,
  renderColumnExtra,
  emptyPlaceholder,
  className = '',
}: KanbanBoardProps<T>) {
  const {
    activeId,
    draggedOverStage,
    sensors,
    dropAnimation,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useKanbanDrag(onDrop);

  const allItems = useMemo(
    () => Object.values(itemsByStage).flat(),
    [itemsByStage]
  );

  const draggedItem = useMemo(() => {
    if (activeId === null) return undefined;
    return allItems.find((item: any) => {
      const itemId =
        item.id ?? item.account_id ?? item.opportunity_id ?? item.ID;
      return String(itemId) === String(activeId);
    });
  }, [activeId, allItems]);

  const defaultEmpty = (
    <div className="h-24 rounded-lg border border-dashed flex items-center justify-center text-xs uppercase tracking-widest select-none"
      style={{
        borderColor: 'var(--sys-border-soft)',
        color: 'var(--sys-text-muted)',
        background: 'var(--sys-surface)',
      }}
    >
      Arrastra aquí
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`flex overflow-x-auto overflow-y-hidden flex-1 min-h-0 rounded-lg border items-stretch ${className}`}
        style={{
          borderColor: 'var(--sys-border-soft)',
          background: 'var(--sys-surface)',
        }}
      >
        {columns.map((col) => {
          const stageItems = itemsByStage[col.id] ?? [];

          return (
            <KanbanColumn
              key={col.id}
              stage={col.id}
              label={col.label}
              count={stageItems.length}
              isOver={draggedOverStage === col.id}
              dotColor={col.dotColor}
              headerExtra={renderColumnExtra?.(col.id, stageItems)}
            >
              {stageItems.length === 0
                ? (emptyPlaceholder ?? defaultEmpty)
                : stageItems.map((item: any) => {
                    const itemId =
                      item.id ?? item.account_id ?? item.opportunity_id ?? item.ID;

                    return (
                      <KanbanCardWrapper key={String(itemId)} id={itemId}>
                        {renderCard(item)}
                      </KanbanCardWrapper>
                    );
                  })}
            </KanbanColumn>
          );
        })}
      </div>

      {createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
          {draggedItem ? (
            <div className="rotate-1 scale-[1.02] opacity-95 pointer-events-none select-none origin-center">
              {renderOverlayCard
                ? renderOverlayCard(draggedItem)
                : renderCard(draggedItem)}
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}

export default KanbanBoard;
