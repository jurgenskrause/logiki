import React, { useRef, useState, useEffect, useMemo } from 'react';
import { VerticalClueUI } from './VerticalClueUI';
import type { ActiveClue } from '../../../../shared/engine/Solver';
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
  isDesktop?: boolean;
  clueIconSize?: number;
  hasMouse?: boolean;
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

export const VerticalClueList: React.FC<VerticalClueListProps> = ({ clues, onClueHover, highlightedClue, onClueToggleBin, binnedIds, onClueDoubleTap, scrollToClueId, onMoveClue, isDesktop = false, clueIconSize = 24, hasMouse = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  
  const itemWidth = isDesktop ? 96 : 72; // w-24 vs w-[72px]
  const itemHeight = isDesktop ? 168 : 120; // h-[168px] vs h-[120px]
  const gap = isDesktop ? 2 : 4; // gap-0.5 vs gap-1
  const CLUE_MAX_WIDTH = itemWidth + gap;
  const CLUE_HEIGHT = itemHeight + gap;
  
  const [orderedClues, setOrderedClues] = useState<SortableClue[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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



  // Derive equivalent Mobile Grid parameters ensuring left-to-right row fills
  const { mobileRowsV, mobileColsV } = useMemo(() => {
     if (isDesktop) return { mobileRowsV: 1, mobileColsV: 1 };
     const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
     const gapMobile = clueIconSize * 0.2;
     const vW = 1.5 * clueIconSize + gapMobile;
     const cols = Math.max(1, Math.floor((viewportWidth - 32) / vW));
     const rows = Math.max(1, Math.ceil(orderedClues.length / cols));
     return { mobileRowsV: rows, mobileColsV: cols };
  }, [isDesktop, orderedClues.length, clueIconSize]);

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
      className={`flex-1 w-full min-h-[0px] flex ${isDesktop ? 'px-1 py-1 overflow-y-auto overflow-x-hidden custom-scrollbar' : 'p-0 flex-col overflow-hidden'} relative`}
    >
        <SortableContext 
          items={orderedClues.map(c => c.id)}
          strategy={rectSortingStrategy}
        >
          {isDesktop ? (
            <div 
              className="flex flex-row flex-wrap content-start justify-center w-full h-max mx-auto px-2 py-4"
              style={{ gap: `calc(${clueIconSize}px * 0.2)` }}
            >
              {orderedClues.map((item) => (
                <SortableClueWrapper key={item.id} id={item.id}>
                  <VerticalClueUI isDesktop={isDesktop} clueIconSize={clueIconSize} hasMouse={hasMouse} 
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
                className="flex-1 min-h-[0px] w-full py-2 overflow-y-auto overflow-x-hidden relative z-10 px-1" 
              >
                <div 
                   title="VerticalClueList: wrapping columns inner container"
                   className="grid content-start justify-center mx-auto min-h-[0px] w-full"
                   style={{ 
                      gap: `calc(${clueIconSize}px * 0.2)`,
                      gridTemplateColumns: `repeat(${mobileColsV}, minmax(0, max-content))`,
                      gridAutoFlow: 'row'
                   }}
                >
                   {orderedClues.map(item => (
                     <SortableClueWrapper key={item.id} id={item.id}>
                       <VerticalClueUI isDesktop={isDesktop} clueIconSize={clueIconSize} hasMouse={hasMouse} 
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
