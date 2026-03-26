import React, { useRef, useEffect } from 'react';

export interface Possibility {
  id: number;
  isActive: boolean;
  value: string; // The icon ligature or value
}

interface BoardCellProps {
  row: number;
  col: number;
  options: Possibility[];
  isResolved: boolean;
  resolvedValue?: string;
  cellSizeRef?: (size: { width: number, height: number, cellId: string }) => void;
  onInteract: (cellId: string, possibilityId: number, action: 'eliminate' | 'solve') => void;
  // Based on the number of options (e.g. 4, 6, 8), the columns in the 2-row subgrid
  subColumns: number; 
}

export const BoardCell: React.FC<BoardCellProps> = ({ 
  row, 
  col, 
  options, 
  isResolved, 
  resolvedValue,
  cellSizeRef,
  onInteract,
  subColumns
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellId = `${row}-${col}`;

  // Notify parent of our size so it can determine if Zoom Overlay is needed
  useEffect(() => {
    if (!containerRef.current || !cellSizeRef) return;
    
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // We measure the entire BoardCell, but the parent knows a PossibilityCell 
        // is (Height / 2) because there are exactly 2 rows.
        cellSizeRef({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
          cellId
        });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [cellSizeRef, cellId]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 
                  flex items-center justify-center overflow-hidden transition-colors cursor-pointer
                  hover:bg-slate-50 dark:hover:bg-slate-750`}
      // If we want to capture clicks on the whole cell for the Zoom overlay constraint
      onClick={() => onInteract(cellId, -1, 'zoom_trigger' as any)}
    >
      {isResolved ? (
        // Resolved State: Single large icon, centered, 1:1 aspect ratio inside the cell
        <div className="h-full aspect-square flex items-center justify-center text-blue-500 dark:text-blue-400 font-bold p-1">
          <span style={{ fontSize: 'max(2vw, 24px)' }}>
            {resolvedValue}
          </span>
        </div>
      ) : (
        // Unresolved State: The Option Matrix, exactly 2 rows, N columns
        <div 
          className="w-full h-full grid gap-[1px] bg-slate-200 dark:bg-slate-700 p-[1px]"
          style={{ 
            gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
            gridTemplateColumns: `repeat(${subColumns}, minmax(0, 1fr))` 
          }}
        >
          {options.map((opt) => (
            <div 
              key={opt.id}
              onClick={(e) => {
                e.stopPropagation();
                onInteract(cellId, opt.id, 'eliminate');
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onInteract(cellId, opt.id, 'solve');
              }}
              className={`w-full h-full aspect-square flex items-center justify-center bg-white dark:bg-slate-800 transition-all
                          ${opt.isActive ? 'opacity-100 grayscale-0' : 'opacity-20 grayscale'}`}
            >
              <span className="text-xs sm:text-lg flex items-center justify-center">
                {opt.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
