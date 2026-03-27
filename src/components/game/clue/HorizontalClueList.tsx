import React, { useRef, useState, useEffect } from 'react';
import { HorizontalClueUI } from './HorizontalClueUI';
import type { ActiveClue } from '../../../engine/Solver';

interface HorizontalClueListProps {
  clues: ActiveClue[];
}

const CLUE_MAX_HEIGHT = 48 + 8; // h-12 + gap-2 in pixels
const CLUE_WIDTH = 96 + 8; // w-24 + gap-2 

export const HorizontalClueList: React.FC<HorizontalClueListProps> = ({ clues }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  
  // Aspect Ratio and Flow Logic
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

  // Filter for horizontal types (currently just skipping Vertical to match request)
  // Actually, horizontal types are ADJACENT, LEFT_OF, SEQUENCE_THREE, etc.
  const horizontalClues = clues.filter(c => 
    ['LEFT_OF', 'ADJACENT', 'SEQUENCE_THREE', 'GAPPED_NOT_MIDDLE', 'GAPPED_EXCLUSION'].includes(c.type)
  );

  // Column Calculation
  const maxCluesPerColumn = Math.floor(containerHeight / CLUE_MAX_HEIGHT) || 1;
  const numColumns = Math.ceil(horizontalClues.length / maxCluesPerColumn) || 1;
  
  // Clamped at 2 columns for now, or just follow logic
  const actualCols = Math.min(numColumns, 4); // Let's allow up to 4 if needed

  return (
    <div 
      ref={containerRef}
      className="flex-1 w-full h-full p-4 overflow-hidden relative"
      style={{
        // Dynamically adjust root width if we have multiple columns
        width: `${actualCols * CLUE_WIDTH + 32}px`, // +32 for padding
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div 
        className="grid gap-2 h-full"
        style={{
          gridTemplateRows: `repeat(${maxCluesPerColumn}, minmax(0, 1fr))`,
          gridAutoFlow: 'column',
          gridAutoColumns: `minmax(${CLUE_WIDTH - 8}px, 1fr)`
        }}
      >
        {horizontalClues.map((clue, i) => (
           <HorizontalClueUI key={i} clue={clue} />
        ))}
      </div>
    </div>
  );
};
