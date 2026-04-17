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
      className={`${isDragging ? 'shadow-2xl ring-2 ring-indigo-500 rounded-xl scale-[1.05] z-50' : ''}`}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {React.cloneElement(children as React.ReactElement<any>, {
        dragHandleProps: { ...attributes, ...listeners }
      })}
    </div>
  );
};
