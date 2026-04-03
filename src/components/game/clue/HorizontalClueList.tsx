import React, { useRef, useState, useEffect } from 'react';
import { HorizontalClueUI } from './HorizontalClueUI';
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
  scrollToClueId?: string | null;
  onMoveClue?: () => void;
}

const CLUE_MAX_HEIGHT = 84 + 2; // h-[84px] + gap-0.5
const CLUE_WIDTH = 192 + 2; // w-48 + gap-0.5

interface SortableClue {
  id: string;
  clue: ActiveClue;
}

export const HorizontalClueList: React.FC<HorizontalClueListProps> = ({ clues, onClueHover, highlightedClue, onClueToggleBin, binnedIds, onClueDoubleTap, scrollToClueId, onMoveClue }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  
  const [orderedClues, setOrderedClues] = useState<SortableClue[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const isDesktop = useMediaQuery('(min-width: 768px)');

  const cluesHash = JSON.stringify(clues);

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
    ).sort((a, b) => a.type.localeCompare(b.type));
    
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

  const maxCluesPerColumn = Math.floor(containerHeight / CLUE_MAX_HEIGHT) || 1;
  const numColumns = Math.ceil(orderedClues.length / maxCluesPerColumn) || 1;
  const actualCols = Math.min(numColumns, 4);
  
  // Aim for 3x3: if screen < 420px use 2 columns, otherwise 3 columns.
  const maxRowsPerPage = Math.min(4, Math.ceil(orderedClues.length / 2)) || 1;

  useEffect(() => {
    if (scrollToClueId && scrollRef.current) {
      const idx = orderedClues.findIndex(c => c.id === scrollToClueId);
      if (idx !== -1) {
        const itemWidth = 160 + 8; // Clue width + gap
        scrollRef.current.scrollTo({ left: idx * itemWidth, behavior: 'smooth' });
      }
    }
  }, [scrollToClueId, orderedClues]);

  return (
    <div 
      ref={containerRef}
      className={`flex-1 w-full ${isDesktop ? 'h-full p-1' : 'h-full p-0'} overflow-hidden relative flex items-center justify-center`}
      style={isDesktop ? {
        width: `${actualCols * CLUE_WIDTH + 4}px`,
        maxWidth: `${actualCols * CLUE_WIDTH + 4}px`
      } : {}}
    >
        <SortableContext 
          items={orderedClues.map(c => c.id)}
          strategy={rectSortingStrategy}
        >
          {isDesktop ? (
              <div 
                className="w-full h-full grid gap-0.5 overflow-hidden"
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
                    className={`flex w-full ${isDesktop ? 'h-full' : 'pb-10 pt-2'} overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden relative z-10 px-4`} 
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                 >
                   <div 
                      className="grid gap-2 min-w-max h-full"
                      style={{
                         gridTemplateRows: `repeat(${maxRowsPerPage}, minmax(0, 1fr))`,
                         gridAutoFlow: 'column',
                         gridAutoColumns: 'max-content'
                      }}
                   >
                      {orderedClues.map(item => (
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
              </>
          )}
        </SortableContext>
    </div>
  );
};
