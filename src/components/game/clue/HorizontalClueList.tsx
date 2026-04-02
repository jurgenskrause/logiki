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

const CLUE_MAX_HEIGHT = 84 + 12; // h-[84px] + gap-3
const CLUE_WIDTH = 192 + 12; // w-48 + gap-3

interface SortableClue {
  id: string;
  clue: ActiveClue;
}

export const HorizontalClueList: React.FC<HorizontalClueListProps> = ({ clues, onClueHover, highlightedClue, onClueToggleBin, binnedIds, onClueDoubleTap }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  
  const [orderedClues, setOrderedClues] = useState<SortableClue[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const isDesktop = useMediaQuery('(min-width: 768px)');

  const cluesHash = JSON.stringify(clues);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    if (!isDesktop) return; // Only measure if desktop
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
        for (const entry of entries) {
            setContainerHeight(entry.contentRect.height);
        }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [isDesktop]);

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
  
  // Aim for 3x3: if screen < 420px use 2 columns, otherwise 3 columns.
  const maxColsPerPage = 3;
  const maxRowsPerPage = 3;
  const itemsPerPage = maxColsPerPage * maxRowsPerPage;

  const handlePrevPage = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -scrollRef.current.clientWidth, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: scrollRef.current.clientWidth, behavior: 'smooth' });
  };

  return (
    <div 
      ref={containerRef}
      className={`flex-1 w-full ${isDesktop ? 'h-full p-2 md:p-4' : 'p-0'} overflow-hidden relative flex items-center justify-center`}
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
          {isDesktop ? (
              <div 
                className="w-full h-full grid gap-3 overflow-hidden"
                style={{
                  gridTemplateRows: `repeat(${maxCluesPerColumn}, minmax(0, 1fr))`,
                  gridTemplateColumns: `repeat(${actualCols}, minmax(0, 1fr))`,
                  gridAutoFlow: 'column'
                }}
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
          ) : (
              <>
                 {orderedClues.length === 0 && (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-30 pointer-events-none">
                       <span className="material-icons text-5xl mb-2">grid_view</span>
                       <span className="font-bold text-sm tracking-widest uppercase">No Horizontal Clues</span>
                    </div>
                 )}
                 <div 
                    ref={scrollRef} 
                    className={`flex w-full ${isDesktop ? 'h-full' : 'pb-12 pt-2'} overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden relative z-10`} 
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                 >
                   {Array.from({ length: Math.ceil(orderedClues.length / itemsPerPage) || 1 }).map((_, pageIdx) => {
                      const pageItems = orderedClues.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
                      return (
                        <div key={pageIdx} className="w-full h-full shrink-0 flex-none snap-center flex justify-center items-center py-2 overflow-hidden px-2">
                           <div 
                             className="grid gap-1.5 w-full max-w-lg"
                             style={{
                                gridTemplateColumns: `repeat(${maxColsPerPage}, 1fr)`,
                                gridAutoFlow: 'row',
                                gridAutoRows: `max-content`
                             }}
                           >
                               {pageItems.map(item => (
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
