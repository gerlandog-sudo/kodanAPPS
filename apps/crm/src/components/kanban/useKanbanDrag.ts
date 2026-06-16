import { useState, useCallback, useEffect } from 'react';
import {
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  DropAnimation,
} from '@dnd-kit/core';

export function useKanbanDrag(onDrop?: (itemId: string | number, toStage: string) => void) {
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [draggedOverStage, setDraggedOverStage] = useState<string | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<string | number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  useEffect(() => {
    if (activeId !== null) {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [activeId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setDraggedOverStage(over ? String(over.id) : null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setDraggedOverStage(null);

      if (over && onDrop) {
        onDrop(active.id, String(over.id));
      }
    },
    [onDrop]
  );

  const triggerDropAnimation = useCallback((id: string | number) => {
    setJustDroppedId(id);
    setTimeout(() => setJustDroppedId(null), 550);
  }, []);

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      className: { active: 'opacity-0' },
    }),
    duration: 250,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return {
    activeId,
    draggedOverStage,
    justDroppedId,
    sensors,
    dropAnimation,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    triggerDropAnimation,
  };
}
