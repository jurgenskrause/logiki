import React, { useState, useEffect, useRef } from 'react';
import type { ActiveClue } from '../../engine/Solver';
import { BoardCell } from './BoardCell';
import { ZoomOverlay } from './ZoomOverlay';

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
}

import { getFallbackEmoji } from '../../utils/themeRegistry';

const initializeCells = (rows: number, cols: number, clues: ActiveClue[] = []): Cell[] => {
  const cells: Cell[] = [];
  const numOptions = rows; 
  
  // 1. Create clean grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const options = Array.from({ length: numOptions }).map((_, i) => ({
        id: i,
        isActive: true, 
        value: getFallbackEmoji(r, i) 
      }));

      cells.push({
        id: `${r}-${c}`,
        row: r,
        col: c,
        options,
        isResolved: false,
        resolvedValue: undefined,
        isImmutable: false
      });
    }
  }

  // 2. Apply ANCHOR clues
  clues.forEach(clue => {
    if (clue.type === 'ANCHOR' && clue.targetCol !== undefined) {
      const { row, item } = clue.params[0];
      const targetCol = clue.targetCol;
      const cellId = `${row}-${targetCol}`;
      
      const cell = cells.find(c => c.id === cellId);
      if (cell) {
        cell.isResolved = true;
        cell.resolvedValue = getFallbackEmoji(row, item);
        cell.isImmutable = true;
        // Optionally deactivate other options in this cell
        cell.options.forEach((o: Option) => o.isActive = (o.id === item));
      }

      // 3. (Optional but good) Prune this item from other columns in this row
      cells.forEach((c: Cell) => {
        if (c.row === row && c.col !== targetCol) {
          const opt = c.options.find((o: Option) => o.id === item);
          if (opt) opt.isActive = false;
        }
      });
    }
  });

  return cells;
};

export const GameBoard: React.FC<GameBoardProps> = ({ rows, cols, subColumns, clues = [] }) => {
  const [cells, setCells] = useState<Cell[]>(() => initializeCells(rows, cols, clues));
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
    if (action === 'zoom_trigger') {
      if (needsZoom) setZoomTarget(cellId);
      return;
    }

    setCells((prev: Cell[]) => prev.map((c: Cell) => {
      if (c.id === cellId) {
        if (c.isImmutable) return c; // Protect anchored cells

        if (action === 'eliminate') {
          return {
            ...c, 
            options: c.options.map((o: Option) => o.id === possibilityId ? { ...o, isActive: false } : o)
          };
        } else if (action === 'solve') {
           const val = c.options.find((o: Option) => o.id === possibilityId)?.value;
           return { ...c, isResolved: true, resolvedValue: val };
        }
      }
      return c;
    }));
  };

  const currentZoomCell = cells.find(c => c.id === zoomTarget);

  // Perfect Aspect Ratio Calculation
  const boardAspectRatio = (cols * subColumns) / (rows * 2);
  
  let boardWidth = 0;
  let boardHeight = 0;

  if (containerSize.width > 0 && containerSize.height > 0) {
    const containerAspect = containerSize.width / containerSize.height;
    if (containerAspect > boardAspectRatio) {
      // Container is wider than board: fit height, calc width
      boardHeight = containerSize.height;
      boardWidth = boardHeight * boardAspectRatio;
    } else {
      // Container is taller than board: fit width, calc height
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
