import React, { useRef, useState, useEffect } from 'react';
import { VerticalClueUI } from './VerticalClueUI';
import type { ActiveClue } from '../../../engine/Solver';
import {
  useDndMonitor
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
  scrollToClueId?: string | null;
  onMoveClue?: () => void;
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

export const VerticalClueList: React.FC<VerticalClueListProps> = ({ clues, onClueHover, highlightedClue, onClueToggleBin, binnedIds, onClueDoubleTap, scrollToClueId, onMoveClue }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const itemWidth = isDesktop ? 96 : 72; // w-24 vs w-[72px]
  const itemHeight = isDesktop ? 168 : 120; // h-[168px] vs h-[120px]
  const gap = isDesktop ? 2 : 4; // gap-0.5 vs gap-1
  const CLUE_MAX_WIDTH = itemWidth + gap;
  const CLUE_HEIGHT = itemHeight + gap;
  
  const [orderedClues, setOrderedClues] = useState<SortableClue[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
        for (const entry of entries) {
            setContainerWidth(entry.contentRect.width);
        }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [isDesktop]);

  const cluesHash = JSON.stringify(clues);

  useEffect(() => {
    const verticalClues = clues.filter(c => 
      ['VERTICAL', 'VERTICAL_NOT', 'VERTICAL_TRIO', 'VERTICAL_NOT_TRIO', 'DISJUNCTIVE_XOR', 'VERTICAL_DISJUNCTIVE_EXCLUSION'].includes(c.type)
    ).sort((a, b) => a.type.localeCompare(b.type));
    
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

  useDndMonitor({
    onDragStart: (event: DragStartEvent) => {
      if (orderedClues.some(c => c.id === event.active.id)) {
        setIsDragging(true);
        const dragged = orderedClues.find(c => c.id === event.active.id)?.clue;
        if (dragged) onClueHover?.(dragged);
      }
    },
    onDragEnd: (event: DragEndEvent) => {
      const { active, over } = event;
      if (orderedClues.some(c => c.id === active.id)) {
        setIsDragging(false);
        if (over && active.id !== over.id) {
          const oldIndex = orderedClues.findIndex((item) => item.id === active.id);
          if (oldIndex !== -1) {
             const newIndex = orderedClues.findIndex((item) => item.id === over.id);
             if (newIndex !== -1) {
                onMoveClue?.();
                setOrderedClues((items) => arrayMove(items, oldIndex, newIndex));
             }
          }
        }
      }
    },
    onDragCancel: () => {
      setIsDragging(false);
    }
  });

  const maxCluesPerRow = Math.floor(containerWidth / CLUE_MAX_WIDTH) || 1;
  const numRows = Math.ceil(orderedClues.length / maxCluesPerRow) || 1;
  const actualRows = Math.min(numRows, 3);

  useEffect(() => {
    if (scrollToClueId && scrollRef.current) {
      const idx = orderedClues.findIndex(c => c.id === scrollToClueId);
      if (idx !== -1) {
        const itemWidth = 80 + 8; // Clue width + gap
        scrollRef.current.scrollTo({ left: idx * itemWidth, behavior: 'smooth' });
      }
    }
  }, [scrollToClueId, orderedClues]);

  return (
    <div 
      ref={containerRef}
      title="VerticalClueList: outer containerRef"
      className={`flex-1 w-full min-h-[0px] flex ${isDesktop ? 'px-1 py-1 items-center justify-center' : 'p-0 flex-col'} overflow-hidden relative`}
      style={isDesktop ? { height: `${actualRows * CLUE_HEIGHT + 4}px` } : {}}
    >
        <SortableContext 
          items={orderedClues.map(c => c.id)}
          strategy={rectSortingStrategy}
        >
          {isDesktop ? (
            <div 
              className="grid gap-0.5 w-full justify-center"
              style={{
                gridTemplateColumns: `repeat(${maxCluesPerRow}, minmax(0, 1fr))`,
                gridAutoFlow: 'row',
                gridAutoRows: `minmax(${CLUE_HEIGHT - 2}px, 1fr)`,
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
          ) : (
            <>
              {orderedClues.length === 0 && (
                 <div className="w-full h-full flex flex-col items-center justify-center opacity-30 pointer-events-none">
                    <span className="material-icons text-5xl mb-2">grid_view</span>
                    <span className="font-bold text-sm tracking-widest uppercase">No Vertical Clues</span>
                 </div>
              )}
              <div 
                ref={scrollRef} 
                title="VerticalClueList: mobile scrollRef container"
                className={`flex flex-col min-h-[0px] w-full ${isDesktop ? 'flex-1' : 'flex-1 py-2'} overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:hidden relative z-10 px-4`} 
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div 
                   title="VerticalClueList: wrapping columns inner container"
                   className="flex w-max flex-1 flex-col flex-wrap gap-2 content-start items-center justify-start mx-auto min-h-[0px]"
                >
                   {orderedClues.map(item => (
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
              </div>
            </>
          )}
        </SortableContext>
    </div>
  );
};
