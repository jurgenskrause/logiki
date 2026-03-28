import React, { useRef, useState, useEffect } from 'react';
import { HorizontalClueUI } from './HorizontalClueUI';
import type { ActiveClue } from '../../../engine/Solver';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { SortableClueWrapper } from './SortableClueWrapper';

interface HorizontalClueListProps {
  clues: ActiveClue[];
  onClueHover?: (clue: ActiveClue | null) => void;
}

const CLUE_MAX_HEIGHT = 56 + 12; // h-14 + gap-3
const CLUE_WIDTH = 128 + 12; // w-32 + gap-3

interface SortableClue {
  id: string;
  clue: ActiveClue;
}

export const HorizontalClueList: React.FC<HorizontalClueListProps> = ({ clues, onClueHover }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  
  const [orderedClues, setOrderedClues] = useState<SortableClue[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
        for (const entry of entries) {
            setContainerHeight(entry.contentRect.height);
        }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const horizontalClues = clues.filter(c => 
      ['LEFT_OF', 'ADJACENT', 'SEQUENCE_THREE', 'GAPPED_NOT_MIDDLE', 'GAPPED_EXCLUSION'].includes(c.type)
    );
    setOrderedClues(horizontalClues.map((clue, index) => ({
      id: `h-clue-${index}`,
      clue
    })));
  }, [clues]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedClues((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const maxCluesPerColumn = Math.floor(containerHeight / CLUE_MAX_HEIGHT) || 1;
  const numColumns = Math.ceil(orderedClues.length / maxCluesPerColumn) || 1;
  const actualCols = Math.min(numColumns, 4);

  return (
    <div 
      ref={containerRef}
      className="flex-1 h-full p-4 overflow-hidden relative"
      style={{
        width: `${actualCols * CLUE_WIDTH + 32}px`,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={orderedClues.map(c => c.id)}
          strategy={rectSortingStrategy}
        >
          <div 
            className="grid gap-3 h-full"
            style={{
              gridTemplateRows: `repeat(${maxCluesPerColumn}, minmax(0, 1fr))`,
              gridAutoFlow: 'column',
              gridAutoColumns: `minmax(${CLUE_WIDTH - 12}px, 1fr)`
            }}
          >
            {orderedClues.map((item) => (
              <SortableClueWrapper key={item.id} id={item.id}>
                <HorizontalClueUI clue={item.clue} onHover={onClueHover} />
              </SortableClueWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
