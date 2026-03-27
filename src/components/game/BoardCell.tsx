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
  subColumns: number;
  /** Items to highlight in this cell: id = option.id, color drives ring/bg */
  highlightItems?: { id: number; color: 'red' | 'green' }[];
}

export const BoardCell: React.FC<BoardCellProps> = ({ 
  row, 
  col, 
  options, 
  isResolved, 
  resolvedValue,
  cellSizeRef,
  onInteract,
  subColumns,
  highlightItems = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellId = `${row}-${col}`;

  // Build a quick lookup: id -> color
  const highlightMap = React.useMemo(() => {
    const map = new Map<number, 'red' | 'green'>();
    highlightItems.forEach(h => map.set(h.id, h.color));
    return map;
  }, [highlightItems]);

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
  // Compute aspect ratio CSS dynamically based on subColumns (e.g. 3 cols / 2 rows = 3/2)
  const aspectStyle = { aspectRatio: `${subColumns} / 2` };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full border bg-white dark:bg-slate-800 
                  flex items-center justify-center overflow-hidden transition-colors cursor-pointer
                  hover:bg-slate-50 dark:hover:bg-slate-750
                  ${highlightItems.length > 0 
                    ? 'border-amber-300 dark:border-amber-600' 
                    : 'border-slate-300 dark:border-slate-700'}`}
      style={aspectStyle}
      onClick={() => onInteract(cellId, -1, 'zoom_trigger' as any)}
    >
      {isResolved ? (
        // Resolved State: Single large icon, centered, 1:1 aspect ratio inside the cell
        <div 
          className="h-full aspect-square flex items-center justify-center text-blue-500 dark:text-blue-400 font-bold p-1"
          style={{ containerType: 'size' }}
        >
          <span style={{ fontSize: '75cqmin' }}>
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
          {options.map((opt) => {
            const hlColor = highlightMap.get(opt.id);
            const ringClass = hlColor === 'red'
              ? 'ring-2 ring-red-500 ring-inset animate-pulse'
              : hlColor === 'green'
                ? 'ring-2 ring-emerald-500 ring-inset animate-pulse'
                : '';
            return (
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
                            ${opt.isActive ? 'opacity-100 grayscale-0' : 'opacity-20 grayscale'}
                            ${ringClass}`}
                style={{ containerType: 'size' }}
              >
                <span 
                  className="flex items-center justify-center leading-none"
                  style={{ fontSize: '75cqmin' }}
                >
                  {opt.value}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
