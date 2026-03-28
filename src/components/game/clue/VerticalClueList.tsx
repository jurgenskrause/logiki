import React, { useRef, useState, useEffect } from 'react';
import { VerticalClueUI } from './VerticalClueUI';
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

interface VerticalClueListProps {
  clues: ActiveClue[];
  onClueHover?: (clue: ActiveClue | null) => void;
  highlightedClue?: ActiveClue | null;
}

const CLUE_MAX_WIDTH = 64 + 8; // w-16 + gap-2 in pixels
const CLUE_HEIGHT = 112 + 8; // h-28 + gap-2

interface SortableClue {
  id: string;
  clue: ActiveClue;
}

export const VerticalClueList: React.FC<VerticalClueListProps> = ({ clues, onClueHover, highlightedClue }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
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
            setContainerWidth(entry.contentRect.width);
        }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const cluesHash = JSON.stringify(clues);

  useEffect(() => {
    const verticalClues = clues.filter(c => 
      ['VERTICAL', 'VERTICAL_NOT', 'VERTICAL_TRIO', 'VERTICAL_NOT_TRIO', 'DISJUNCTIVE_XOR', 'VERTICAL_DISJUNCTIVE_EXCLUSION'].includes(c.type)
    );
    setOrderedClues(verticalClues.map((clue, index) => ({
      id: `v-clue-${index}`,
      clue
    })));
  }, [cluesHash]);

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

  const maxCluesPerRow = Math.floor(containerWidth / CLUE_MAX_WIDTH) || 1;
  const numRows = Math.ceil(orderedClues.length / maxCluesPerRow) || 1;
  const actualRows = Math.min(numRows, 3);

  return (
    <div 
      ref={containerRef}
      className="flex-1 w-full h-full p-4 overflow-hidden relative flex items-center justify-center"
      style={{
        height: `${actualRows * CLUE_HEIGHT + 32}px`,
        transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
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
            className="grid gap-2 w-full justify-center"
            style={{
              gridTemplateColumns: `repeat(${maxCluesPerRow}, minmax(0, 1fr))`,
              gridAutoFlow: 'row',
              gridAutoRows: `minmax(${CLUE_HEIGHT - 8}px, 1fr)`,
              maxWidth: `${maxCluesPerRow * CLUE_MAX_WIDTH}px`
            }}
          >
            {orderedClues.map((item) => (
              <SortableClueWrapper key={item.id} id={item.id}>
                <VerticalClueUI 
                   clue={item.clue} 
                   onHover={onClueHover} 
                   isHighlighted={highlightedClue === item.clue} 
                />
              </SortableClueWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
