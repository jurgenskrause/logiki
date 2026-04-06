import fs from 'fs';

const horizontalContent = `import React, { useRef, useState, useEffect } from 'react';
import { HorizontalClueUI } from './HorizontalClueUI';
import type { ActiveClue } from '../../../../shared/engine/Solver';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableClueWrapper } from './SortableClueWrapper';

interface HorizontalClueListProps {
  clues: ActiveClue[];
  isDesktop?: boolean;
  clueIconSize?: number;
  hasMouse?: boolean;
  highlightedClue?: string | null;
  binnedIds?: Set<string>;
  onClueHover?: (clue: ActiveClue | null) => void;
  onClueToggleBin?: (clueId: string) => void;
  scrollToClueId?: (clueId: string) => void;
  onMoveClue?: (clueId: string, event: any) => void;
}

export const HorizontalClueList: React.FC<HorizontalClueListProps> = ({ clues, onClueHover, highlightedClue, onClueToggleBin, binnedIds = new Set(), scrollToClueId, onMoveClue, isDesktop = false, clueIconSize = 24, hasMouse = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const orderedClues = clues.filter(c => !binnedIds.has(c.id)).concat(clues.filter(c => binnedIds.has(c.id)));

  return (
    <div 
      className="flex-1 min-h-[0px] h-full flex flex-col pointer-events-auto"
    >
      <div 
        ref={containerRef}
        className={\`flex-1 w-full flex relative \${isDesktop ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden pb-4'}\`}
      >
        <SortableContext 
          items={orderedClues.map(c => c.id)}
          strategy={rectSortingStrategy}
        >
          {isDesktop ? (
            <div className="flex flex-col flex-wrap content-start justify-start w-full h-full" style={{ gap: \`calc(\${clueIconSize}px * 0.2)\` }}>
              {orderedClues.map((item) => (
                <SortableClueWrapper key={item.id} id={item.id}>
                  <HorizontalClueUI
                    clue={item}
                    isDesktop={isDesktop}
                    clueIconSize={clueIconSize}
                    hasMouse={hasMouse}
                    isHighlighted={highlightedClue === item.id}
                    isBinned={binnedIds.has(item.id)}
                    onHover={onClueHover}
                    onDiscard={onClueToggleBin}
                    onDoubleTap={() => scrollToClueId?.(item.id)}
                    dragHandleProps={{ onPointerDown: (e: any) => onMoveClue?.(item.id, e) }}
                  />
                </SortableClueWrapper>
              ))}
            </div>
          ) : (
            <div className="flex flex-row flex-wrap content-start justify-center w-full h-max mx-auto px-2" style={{ gap: \`calc(\${clueIconSize}px * 0.2)\` }}>
              {orderedClues.map((item) => (
                <SortableClueWrapper key={item.id} id={item.id}>
                  <HorizontalClueUI
                    clue={item}
                    isDesktop={isDesktop}
                    clueIconSize={clueIconSize}
                    hasMouse={hasMouse}
                    isHighlighted={highlightedClue === item.id}
                    isBinned={binnedIds.has(item.id)}
                    onHover={onClueHover}
                    onDiscard={onClueToggleBin}
                    onDoubleTap={() => scrollToClueId?.(item.id)}
                    dragHandleProps={{ onPointerDown: (e: any) => onMoveClue?.(item.id, e) }}
                  />
                </SortableClueWrapper>
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/client/components/game/clue/HorizontalClueList.tsx', horizontalContent);

const verticalContent = `import React, { useRef, useState, useEffect } from 'react';
import { VerticalClueUI } from './VerticalClueUI';
import type { ActiveClue } from '../../../../shared/engine/Solver';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableClueWrapper } from './SortableClueWrapper';

interface VerticalClueListProps {
  clues: ActiveClue[];
  isDesktop?: boolean;
  clueIconSize?: number;
  hasMouse?: boolean;
  highlightedClue?: string | null;
  binnedIds?: Set<string>;
  onClueHover?: (clue: ActiveClue | null) => void;
  onClueToggleBin?: (clueId: string) => void;
  scrollToClueId?: (clueId: string) => void;
  onMoveClue?: (clueId: string, event: any) => void;
}

export const VerticalClueList: React.FC<VerticalClueListProps> = ({ clues, onClueHover, highlightedClue, onClueToggleBin, binnedIds = new Set(), scrollToClueId, onMoveClue, isDesktop = false, clueIconSize = 24, hasMouse = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const orderedClues = clues.filter(c => !binnedIds.has(c.id)).concat(clues.filter(c => binnedIds.has(c.id)));

  return (
    <div 
      ref={containerRef}
      title="VerticalClueList: outer containerRef"
      className={\`flex-1 w-full min-h-[0px] flex \${isDesktop ? 'px-1 py-1 overflow-y-auto overflow-x-hidden custom-scrollbar' : 'overflow-y-auto overflow-x-hidden pb-4'} relative\`}
    >
        <SortableContext 
          items={orderedClues.map(c => c.id)}
          strategy={rectSortingStrategy}
        >
          <div 
             className={\`flex flex-row flex-wrap content-start w-full h-max mx-auto \${isDesktop ? 'justify-start px-2 py-2' : 'justify-center px-2'}\`} 
             style={{ gap: \`calc(\${clueIconSize}px * 0.2)\` }}
          >
               {orderedClues.map((item) => (
                 <SortableClueWrapper key={item.id} id={item.id}>
                   <VerticalClueUI 
                     clue={item} 
                     isDesktop={isDesktop}
                     clueIconSize={clueIconSize}
                     hasMouse={hasMouse}
                     isHighlighted={highlightedClue === item.id}
                     isBinned={binnedIds.has(item.id)}
                     onHover={onClueHover}
                     onDiscard={onClueToggleBin}
                     onDoubleTap={() => scrollToClueId?.(item.id)}
                     dragHandleProps={{ onPointerDown: (e: any) => onMoveClue?.(item.id, e) }}
                   />
                 </SortableClueWrapper>
               ))}
          </div>
        </SortableContext>
    </div>
  );
};
`;

fs.writeFileSync('src/client/components/game/clue/VerticalClueList.tsx', verticalContent);
