import React, { useRef, useState, useEffect } from 'react';
import { VerticalClueUI } from './VerticalClueUI';
import type { ActiveClue } from '../../../engine/Solver';

interface VerticalClueListProps {
  clues: ActiveClue[];
  onClueHover?: (clue: ActiveClue | null) => void;
}

const CLUE_MAX_WIDTH = 64 + 8; // w-16 + gap-2 in pixels
const CLUE_HEIGHT = 112 + 8; // h-28 + gap-2

export const VerticalClueList: React.FC<VerticalClueListProps> = ({ clues, onClueHover }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
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

  const verticalClues = clues.filter(c => 
    ['VERTICAL', 'VERTICAL_NOT', 'VERTICAL_TRIO', 'VERTICAL_NOT_TRIO', 'DISJUNCTIVE_XOR', 'VERTICAL_DISJUNCTIVE_EXCLUSION'].includes(c.type)
  );

  const maxCluesPerRow = Math.floor(containerWidth / CLUE_MAX_WIDTH) || 1;
  const numRows = Math.ceil(verticalClues.length / maxCluesPerRow) || 1;
  const actualRows = Math.min(numRows, 3);

  return (
    <div 
      ref={containerRef}
      className="flex-1 w-full h-full p-4 overflow-hidden relative flex items-center justify-center"
      style={{
        height: `${actualRows * CLUE_HEIGHT + 32}px`,
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
           <VerticalClueUI key={i} clue={clue} onHover={onClueHover} />
        ))}
      </div>
    </div>
  );
};
