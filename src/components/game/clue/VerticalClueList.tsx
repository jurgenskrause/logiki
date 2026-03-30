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
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
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
  onClueToggleBin?: (clueId: string) => void;
  binnedIds?: Set<string>;
  onClueDoubleTap?: (clue: ActiveClue) => void;
}

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

interface SortableClue {
  id: string;
  clue: ActiveClue;
}

export const VerticalClueList: React.FC<VerticalClueListProps> = ({ clues, onClueHover, highlightedClue, onClueToggleBin, binnedIds, onClueDoubleTap }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const itemWidth = isDesktop ? 64 : 48; // w-16 vs w-12
  const itemHeight = isDesktop ? 112 : 80; // h-28 vs h-20
  const gap = isDesktop ? 8 : 4; // gap-2 vs gap-1
  const CLUE_MAX_WIDTH = itemWidth + gap;
  const CLUE_HEIGHT = itemHeight + gap;
  
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
    
    setOrderedClues(prev => {
      const newCluesMap = new Map(verticalClues.map(c => [c.id, c]));
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

  const maxCluesPerRow = Math.floor(containerWidth / CLUE_MAX_WIDTH) || 1;
  const numRows = Math.ceil(orderedClues.length / maxCluesPerRow) || 1;
  const actualRows = Math.min(numRows, 3);

  return (
    <div 
      ref={containerRef}
      className="flex-1 w-full h-full p-4 overflow-hidden relative flex items-center justify-center"
      style={{
        height: `${actualRows * CLUE_HEIGHT + 32}px`
      }}
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
