import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableClueWrapperProps {
  id: string;
  children: React.ReactNode;
}

export const SortableClueWrapper: React.FC<SortableClueWrapperProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing touch-none ${isDragging ? 'shadow-2xl ring-2 ring-indigo-500 rounded-lg scale-[1.02]' : ''}`}
    >
      {children}
    </div>
  );
};
