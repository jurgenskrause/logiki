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
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { SortableClueWrapper } from './SortableClueWrapper';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const matchQueryList = window.matchMedia(query);
    setMatches(matchQueryList.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    matchQueryList.addEventListener('change', handler);
    return () => matchQueryList.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

interface HorizontalClueListProps {
  clues: ActiveClue[];
  onClueHover?: (clue: ActiveClue | null) => void;
  highlightedClue?: ActiveClue | null;
  onClueToggleBin?: (clueId: string) => void;
  binnedIds?: Set<string>;
  onClueDoubleTap?: (clue: ActiveClue) => void;
}

const CLUE_MAX_HEIGHT = 56 + 12; // h-14 + gap-3
const CLUE_WIDTH = 128 + 12; // w-32 + gap-3

interface SortableClue {
  id: string;
  clue: ActiveClue;
}

export const HorizontalClueList: React.FC<HorizontalClueListProps> = ({ clues, onClueHover, highlightedClue, onClueToggleBin, binnedIds, onClueDoubleTap }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  
  const [orderedClues, setOrderedClues] = useState<SortableClue[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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

  const cluesHash = JSON.stringify(clues);

  useEffect(() => {
    const horizontalClues = clues.filter(c => 
      ['LEFT_OF', 'ADJACENT', 'SEQUENCE_THREE', 'GAPPED_NOT_MIDDLE', 'GAPPED_EXCLUSION'].includes(c.type)
    );
    
    setOrderedClues(prev => {
      const newCluesMap = new Map(horizontalClues.map(c => [c.id, c]));
      const nextOrdered: SortableClue[] = [];
      
      // 1. Keep existing items in their current order if they still exist
      for (const item of prev) {
        if (newCluesMap.has(item.id)) {
          nextOrdered.push({ id: item.id, clue: newCluesMap.get(item.id)! });
          newCluesMap.delete(item.id);
        }
      }
      
      // 2. Add any completely new items to the end
      for (const [id, clue] of newCluesMap.entries()) {
        nextOrdered.push({ id, clue });
      }
      
      return nextOrdered;
    });
  }, [cluesHash]);

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const dragged = orderedClues.find(c => c.id === event.active.id)?.clue;
    if (dragged) onClueHover?.(dragged);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedClues((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragCancel = () => {
    setIsDragging(false);
  };

  const maxCluesPerColumn = Math.floor(containerHeight / CLUE_MAX_HEIGHT) || 1;
  const numColumns = Math.ceil(orderedClues.length / maxCluesPerColumn) || 1;
  const actualCols = Math.min(numColumns, 4);

  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <div 
      ref={containerRef}
      className="flex-1 w-full h-full p-2 md:p-4 overflow-hidden relative"
      style={isDesktop ? {
        width: `${actualCols * CLUE_WIDTH + 32}px`,
        maxWidth: `${actualCols * CLUE_WIDTH + 32}px`
      } : {}}
    >
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext 
          items={orderedClues.map(c => c.id)}
          strategy={rectSortingStrategy}
        >
          <div 
            className={`w-full h-full overflow-hidden ${isDesktop ? 'grid gap-3' : 'grid grid-cols-4 gap-1 content-start'}`}
            style={isDesktop ? {
              gridTemplateRows: `repeat(${maxCluesPerColumn}, minmax(0, 1fr))`,
              gridTemplateColumns: `repeat(${actualCols}, minmax(0, 1fr))`,
              gridAutoFlow: 'column'
            } : {}}
          >
            {orderedClues.map((item) => (
              <SortableClueWrapper key={item.id} id={item.id}>
                <HorizontalClueUI 
                   clue={item.clue} 
                   onHover={isDragging ? undefined : onClueHover} 
                   isHighlighted={highlightedClue === item.clue} 
                   onDiscard={onClueToggleBin}
                   isBinned={binnedIds?.has(item.clue.id)}
                   onDoubleTap={onClueDoubleTap}
                />
              </SortableClueWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
