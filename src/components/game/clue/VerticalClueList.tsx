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
  scrollToClueId?: string | null;
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

export const VerticalClueList: React.FC<VerticalClueListProps> = ({ clues, onClueHover, highlightedClue, onClueToggleBin, binnedIds, onClueDoubleTap, scrollToClueId }) => {
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
  
  const maxRowsPerPage = 2;
  const itemsPerPage = maxCluesPerRow * maxRowsPerPage;

  useEffect(() => {
    if (scrollToClueId && scrollRef.current && itemsPerPage > 0) {
      const idx = orderedClues.findIndex(c => c.id === scrollToClueId);
      if (idx !== -1) {
        const pageIdx = Math.floor(idx / itemsPerPage);
        scrollRef.current.scrollTo({ left: pageIdx * scrollRef.current.clientWidth, behavior: 'smooth' });
      }
    }
  }, [scrollToClueId, orderedClues, itemsPerPage]);

  const handlePrevPage = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -scrollRef.current.clientWidth, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: scrollRef.current.clientWidth, behavior: 'smooth' });
  };

  return (
    <div 
      ref={containerRef}
      className={`flex-1 w-full ${isDesktop ? 'h-full px-1 py-1' : 'h-full p-0'} overflow-hidden relative flex items-center justify-center`}
      style={isDesktop ? { height: `${actualRows * CLUE_HEIGHT + 4}px` } : {}}
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
                 className={`flex w-full ${isDesktop ? 'h-full' : 'pb-10 pt-2'} overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden relative z-10`} 
                 style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {Array.from({ length: Math.ceil(orderedClues.length / itemsPerPage) || 1 }).map((_, pageIdx) => {
                   const pageItems = orderedClues.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
                   return (
                     <div key={pageIdx} className="w-full shrink-0 flex-none snap-center flex justify-center items-center py-2 overflow-hidden">
                        <div 
                          className="grid gap-1 justify-center"
                          style={{
                             gridTemplateColumns: `repeat(${maxCluesPerRow}, minmax(0, 1fr))`,
                             gridAutoFlow: 'row',
                             gridAutoRows: `max-content`
                          }}
                        >
                            {pageItems.map(item => (
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
                   );
                })}
              </div>
              {Math.ceil(orderedClues.length / itemsPerPage) > 1 && (
                  <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-12 pointer-events-none z-20">
                      <button 
                         onClick={handlePrevPage}
                         className="pointer-events-auto w-10 h-10 rounded-full bg-slate-800/90 dark:bg-slate-700/90 text-white flex items-center justify-center hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-lg active:scale-95 border border-white/10"
                      >
                          <span className="material-icons text-lg">arrow_back_ios_new</span>
                      </button>
                      <button 
                         onClick={handleNextPage}
                         className="pointer-events-auto w-10 h-10 rounded-full bg-slate-800/90 dark:bg-slate-700/90 text-white flex items-center justify-center hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-lg active:scale-95 border border-white/10"
                      >
                          <span className="material-icons text-lg">arrow_forward_ios</span>
                      </button>
                  </div>
              )}
            </>
          )}
        </SortableContext>
      </DndContext>
    </div>
  );
};
