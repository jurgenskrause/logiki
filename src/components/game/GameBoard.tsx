import React, { useState, useEffect, useRef } from 'react';
import type { ActiveClue } from '../../engine/Solver';
import { BoardCell } from './BoardCell';
import { ZoomOverlay } from './ZoomOverlay';
import { GameState } from '../../engine/GameState';
import { getFallbackEmoji } from '../../utils/themeRegistry';

interface Option {
  id: number;
  isActive: boolean;
  value: string;
}

interface Cell {
  id: string;
  row: number;
  col: number;
  options: Option[];
  isResolved: boolean;
  resolvedValue?: string;
  isImmutable: boolean;
}

interface GameBoardProps {
  rows: number;
  cols: number;
  subColumns: number;
  clues?: ActiveClue[];
  gameState: GameState;
  onStateChange: () => void;
  hintHighlights?: { cellId: string; items: { id: number; color: 'red' | 'green' }[] }[];
  isLocked?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({ rows, cols, subColumns, clues = [], gameState, onStateChange, hintHighlights = [], isLocked = false }) => {
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      const mask = gameState.grid[index];
      const confirmed = gameState.isConfirmed(r, c);
      const cellId = `${r}-${c}`;
      
      const isImmutable = clues.some(clue => 
        clue.type === 'ANCHOR' && clue.targetCol === c && clue.params[0]?.row === r
      );

      let resolvedValue = undefined;
      if (confirmed) {
         const itemIndex = Math.log2(mask);
         if (Number.isInteger(itemIndex)) {
           resolvedValue = getFallbackEmoji(r, itemIndex);
         }
      }

      const options: Option[] = [];
      for (let i = 0; i < rows; i++) {
        options.push({
          id: i,
          isActive: (mask & (1 << i)) !== 0,
          value: getFallbackEmoji(r, i)
        });
      }

      cells.push({
        id: cellId,
        row: r,
        col: c,
        options,
        isResolved: confirmed,
        resolvedValue,
        isImmutable
      });
    }
  }

  const [zoomTarget, setZoomTarget] = useState<string | null>(null);
  const [needsZoom, setNeedsZoom] = useState(false);
  
  // Aspect Ratio Tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleCellSize = ({ height }: { height: number; cellId: string }) => {
    const optionHeight = height / 2;
    if (optionHeight < 32 && !needsZoom) {
      setNeedsZoom(true);
    } else if (optionHeight >= 32 && needsZoom) {
      setNeedsZoom(false);
    }
  };

  const handleInteract = (cellId: string, possibilityId: number, action: 'eliminate' | 'solve' | 'zoom_trigger') => {
    if (isLocked) return;

    // 1. MUST parse coordinates first as they are needed for BOTH zoom and actual interaction
    const [rStr, cStr] = cellId.split('-');
    const r = parseInt(rStr, 10);
    const c = parseInt(cStr, 10);

    // 2. Check immutability immediately
    const isImmutable = clues.some(clue => 
      clue.type === 'ANCHOR' && clue.targetCol === c && clue.params[0]?.row === r
    );
    if (isImmutable) return;

    // 3. Check for REVERT action (any click on a confirmed cell)
    const isActuallyResolved = gameState.isConfirmed(r, c);
    if (isActuallyResolved) {
      gameState.revertCell(r, c);
      onStateChange();
      return;
    }

    // 4. Handle Zoom logic for unconfirmed cells
    if (action === 'zoom_trigger') {
      if (needsZoom) setZoomTarget(cellId);
      return;
    }

    // 5. Normal interaction
    if (action === 'eliminate') {
      gameState.toggleBit(r, c, possibilityId);
    } else if (action === 'solve') {
      gameState.confirmCell(r, c, possibilityId);
    }
    
    onStateChange();
  };

  const currentZoomCell = cells.find(c => c.id === zoomTarget);

  // Perfect Aspect Ratio Calculation
  const boardAspectRatio = (cols * subColumns) / (rows * 2);
  
  let boardWidth = 0;
  let boardHeight = 0;

  if (containerSize.width > 0 && containerSize.height > 0) {
    const containerAspect = containerSize.width / containerSize.height;
    if (containerAspect > boardAspectRatio) {
      boardHeight = containerSize.height;
      boardWidth = boardHeight * boardAspectRatio;
    } else {
      boardWidth = containerSize.width;
      boardHeight = boardWidth / boardAspectRatio;
    }
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center p-4 relative animate-in fade-in duration-500 overflow-hidden"
    >
      <div 
        className="bg-slate-100 dark:bg-slate-900 shadow-2xl overflow-hidden transition-all duration-300 relative border-4 border-slate-300 dark:border-slate-800 rounded-lg flex-shrink-0"
        style={{
          width: boardWidth || '100%',
          height: boardHeight || 'auto',
          aspectRatio: `${boardAspectRatio}`,
          display: 'grid',
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: '2px',
          background: 'var(--board-bg, #e2e8f0)',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1), inset 0 2px 4px 0 rgb(255 255 255 / 0.05)'
        }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay dark:opacity-10" 
             style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '10px 10px' }} 
        />
        
        {cells.map(cell => {
          const hl = hintHighlights.find(h => h.cellId === cell.id);
          return (
            <BoardCell
              key={cell.id}
              {...cell}
              subColumns={subColumns}
              onInteract={handleInteract}
              cellSizeRef={handleCellSize}
              highlightItems={hl?.items ?? []}
            />
          );
        })}
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
