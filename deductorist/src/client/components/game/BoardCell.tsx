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
  needsZoom?: boolean;
  onHover?: (row: number, col: number) => void;
  onLeave?: () => void;
  isRowHovered?: boolean;
  isColHovered?: boolean;
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
  needsZoom = false,
  onHover,
  onLeave,
  isRowHovered,
  isColHovered,
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
      for (const entry of entries) {
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
      onMouseEnter={() => onHover?.(row, col)}
      onMouseLeave={() => onLeave?.()}
      className={`relative w-full border transition-all duration-300
                  flex items-center justify-center overflow-hidden cursor-pointer
                  ${col % 2 === 0 ? 'bg-white/5' : 'bg-black/5'}
                  ${highlightItems.length > 0 
                    ? 'animate-hard-flash z-10' 
                    : 'border-white/10'}`}
      style={aspectStyle}
       
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onClick={() => onInteract(cellId, -1, 'zoom_trigger' as any)}
    >
      {/* Row/Col Hover Highlight Overlay */}
      {(isRowHovered || isColHovered) && (
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300
          ${isRowHovered && isColHovered ? 'bg-white/20' : 'bg-white/5'}
          ${isRowHovered && isColHovered ? 'ring-1 ring-inset ring-white/40 z-10' : ''}
        `} />
      )}

      {isResolved ? (
        // Resolved State: Single large icon, centered, 1:1 aspect ratio inside the cell
        <div 
          className="h-full aspect-square flex items-center justify-center text-blue-500 dark:text-blue-400 font-bold p-1"
          style={{ containerType: 'size' }}
        >
          <span className="drop-shadow-lg" style={{ fontSize: '75cqmin' }}>
            {resolvedValue}
          </span>
        </div>
      ) : (
        // Unresolved State: The Option Matrix, exactly 2 rows, N columns
        <div 
          className="w-full h-full grid gap-[1px] bg-transparent p-[1px] relative"
          style={{ 
            gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
            gridTemplateColumns: `repeat(${subColumns}, minmax(0, 1fr))` 
          }}
        >
          {needsZoom && (
             <div className="absolute inset-0 z-20 cursor-zoom-in" />
          )}
          {options.map((opt) => {
            const hlColor = highlightMap.get(opt.id);
            const ringClass = hlColor === 'red'
              ? 'ring-2 ring-red-500 ring-inset animate-pulse rounded-full'
              : hlColor === 'green'
                ? 'ring-2 ring-emerald-500 ring-inset animate-pulse rounded-full'
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
                className={`w-full h-full aspect-square flex items-center justify-center 
                            ${opt.isActive ? 'opacity-100 grayscale-0' : 'opacity-20 grayscale'}`}
                style={{ containerType: 'size' }}
              >
                <div className={`w-[90%] h-[90%] flex items-center justify-center ${ringClass}`}>
                  <span 
                    className="flex items-center justify-center leading-none drop-shadow-lg"
                    style={{ fontSize: '65cqmin' }}
                  >
                    {opt.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
