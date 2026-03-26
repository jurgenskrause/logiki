import React, { useState } from 'react';
import { BoardCell } from './BoardCell';
import { ZoomOverlay } from './ZoomOverlay';

interface GameBoardProps {
  rows: number;
  cols: number;
  subColumns: number; // e.g., 2, 3, or 4
}

import { getFallbackEmoji } from '../../utils/themeRegistry';

const generateMockCells = (rows: number, cols: number, subCols: number) => {
  const cells = [];
  const numOptions = subCols * 2;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Each row pulls icons from the same category for consistency as requested.
      const options = Array.from({ length: numOptions }).map((_, i) => ({
        id: i,
        isActive: Math.random() > 0.3, 
        value: getFallbackEmoji(r, i) 
      }));

      const isResolved = Math.random() > 0.8; 
      
      cells.push({
        id: `${r}-${c}`,
        row: r,
        col: c,
        options,
        isResolved,
        resolvedValue: isResolved ? options[Math.floor(Math.random() * numOptions)].value : undefined
      });
    }
  }
  return cells;
};

export const GameBoard: React.FC<GameBoardProps> = ({ rows, cols, subColumns }) => {
  const [cells, setCells] = useState(() => generateMockCells(rows, cols, subColumns));
  
  const [zoomTarget, setZoomTarget] = useState<string | null>(null);
  
  // Track if interaction via Zoom is required based on size.
  const [needsZoom, setNeedsZoom] = useState(false);

  // We capture the smallest optionHeight measured in the grid.
  // Using 44px as standard touch min-target, we are triggering zoom safely if height < 32px
  const handleCellSize = ({ height }: { height: number; cellId: string }) => {
    const optionHeight = height / 2;
    if (optionHeight < 32 && !needsZoom) {
      setNeedsZoom(true);
    } else if (optionHeight >= 32 && needsZoom) {
      setNeedsZoom(false);
    }
  };

  const handleInteract = (cellId: string, possibilityId: number, action: 'eliminate' | 'solve' | 'zoom_trigger') => {
    if (action === 'zoom_trigger') {
      if (needsZoom) setZoomTarget(cellId);
      return;
    }

    setCells(prev => prev.map(c => {
      if (c.id === cellId) {
        if (action === 'eliminate') {
          return {
            ...c, 
            options: c.options.map(o => o.id === possibilityId ? { ...o, isActive: false } : o)
          };
        } else if (action === 'solve') {
           const val = c.options.find(o => o.id === possibilityId)?.value;
           return { ...c, isResolved: true, resolvedValue: val };
        }
      }
      return c;
    }));
  };

  const currentZoomCell = cells.find(c => c.id === zoomTarget);

  return (
    <div className="w-full h-full flex items-center justify-center p-0 relative animate-in fade-in duration-500 overflow-hidden">
      {/* 
          The Main Game Board component:
          - Fills the container 100% as requested.
          - Uses a sophisticated background for premium feel.
          - Scaling is handled by the grid itself filling the parent.
      */}
      <div 
        className="w-full h-full bg-slate-100 dark:bg-slate-900 shadow-2xl overflow-hidden transition-all duration-300 relative border-4 border-slate-300 dark:border-slate-800"
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: '2px',
          background: 'var(--board-bg, #e2e8f0)',
          boxShadow: 'inset 0 4px 6px -1px rgba(0, 0, 0, 0.1), inset 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        {/* Modern grid-line effect using a subtle pseudo-pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay dark:opacity-10" 
             style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
        />
        
        {cells.map(cell => (
          <BoardCell
            key={cell.id}
            {...cell}
            subColumns={subColumns}
            onInteract={handleInteract}
            cellSizeRef={handleCellSize}
          />
        ))}
      </div>

      {zoomTarget && currentZoomCell && (
        <ZoomOverlay 
          cell={currentZoomCell} 
          subColumns={subColumns}
          onClose={() => setZoomTarget(null)}
          onInteract={(cid, pid, action) => {
            handleInteract(cid, pid, action);
            if (action === 'solve') setZoomTarget(null);
          }}
        />
      )}
    </div>
  );
};
