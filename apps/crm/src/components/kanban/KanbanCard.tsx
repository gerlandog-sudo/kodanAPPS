import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export interface KanbanCardProps {
  id: string | number;
  children: React.ReactNode;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

export default KanbanCard;
