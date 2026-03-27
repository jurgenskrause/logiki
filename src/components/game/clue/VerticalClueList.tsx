import React, { useRef, useState, useEffect } from 'react';
import { VerticalClueUI } from './VerticalClueUI';
import type { ActiveClue } from '../../../engine/Solver';

interface VerticalClueListProps {
  clues: ActiveClue[];
}

const CLUE_MAX_WIDTH = 64 + 8; // w-16 + gap-2 in pixels
const CLUE_HEIGHT = 96 + 8; // h-24 + gap-2

export const VerticalClueList: React.FC<VerticalClueListProps> = ({ clues }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Size Monitor
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

  // Filter for Vertical types
  const verticalClues = clues.filter(c => 
    ['VERTICAL', 'VERTICAL_NOT', 'VERTICAL_TRIO', 'VERTICAL_NOT_TRIO', 'DISJUNCTIVE_XOR', 'NEGATIVE_ANCHOR', 'ANCHOR'].includes(c.type)
  );

  // Row Calculation
  const maxCluesPerRow = Math.floor(containerWidth / CLUE_MAX_WIDTH) || 1;
  const numRows = Math.ceil(verticalClues.length / maxCluesPerRow) || 1;
  
  const actualRows = Math.min(numRows, 3); // Max 3 rows for vertical Area

  return (
    <div 
      ref={containerRef}
      className="flex-1 w-full h-full p-4 overflow-hidden relative flex items-center justify-center"
      style={{
        // Dynamically adjust root height if we have multiple rows
        height: `${actualRows * CLUE_HEIGHT + 32}px`, // +32 for padding
        transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
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
        {verticalClues.map((clue, i) => (
           <VerticalClueUI key={i} clue={clue} />
        ))}
      </div>
    </div>
  );
};
