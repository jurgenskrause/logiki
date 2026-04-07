import React from 'react';
import type { Possibility } from './BoardCell';

interface ZoomOverlayProps {
  cell: {
    id: string;
    options: Possibility[];
  };
  subColumns: number;
  onClose: () => void;
  onInteract: (cellId: string, possibilityId: number, action: 'eliminate' | 'solve') => void;
}

const CellOptionButton = ({
  opt,
  cellId,
  onInteract
}: {
  opt: Possibility;
  cellId: string;
  onInteract: (cellId: string, possibilityId: number, action: 'eliminate' | 'solve') => void;
}) => {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHeldRef = React.useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <button
      onPointerDown={(e) => {
        if (e.button !== 0) return; // Only process left-click or main touch
        isHeldRef.current = false;
        clearTimer();
        timerRef.current = setTimeout(() => {
          isHeldRef.current = true;
          onInteract(cellId, opt.id, 'solve');
        }, 400); // 400ms hold duration
      }}
      onPointerUp={(e) => {
        if (e.button !== 0) return;
        clearTimer();
        if (!isHeldRef.current) {
          onInteract(cellId, opt.id, 'eliminate');
        }
      }}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onContextMenu={(e) => {
        e.preventDefault();
        clearTimer();
        isHeldRef.current = true; // prevent any subsequent pointerUp from eliminating
        onInteract(cellId, opt.id, 'solve');
      }}
      className={`w-full h-full flex items-center justify-center bg-white dark:bg-slate-800 transition-all active:scale-95 touch-none select-none
                ${opt.isActive ? 'opacity-100 grayscale-0 shadow-sm' : 'opacity-20 grayscale'}`}
      title="Click/Tap to Eliminate | Right-Click/Hold to Solve"
    >
      <span className="text-4xl sm:text-6xl flex items-center justify-center pointer-events-none">
        {opt.value}
      </span>
    </button>
  );
};

export const ZoomOverlay: React.FC<ZoomOverlayProps> = ({ cell, subColumns, onClose, onInteract }) => {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-2xl shadow-2xl max-w-lg w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-end mb-4 sm:mb-6">
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <span className="material-icons text-slate-500 dark:text-slate-300">close</span>
          </button>
        </div>

        {/* Magnified SubGrid */}
        <div 
          className="grid gap-[2px] bg-slate-200 dark:bg-slate-900 p-[2px] rounded-lg mx-auto w-full aspect-square max-h-[50vh] transition-all"
          style={{ 
            gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
            gridTemplateColumns: `repeat(${subColumns}, minmax(0, 1fr))`,
            aspectRatio: `${subColumns} / 2`
          }}
        >
          {cell.options.map(opt => (
            <CellOptionButton key={opt.id} opt={opt} cellId={cell.id} onInteract={onInteract} />
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 uppercase tracking-widest leading-relaxed">
          <span className="hidden [@media(pointer:fine)]:inline">Click to eliminate • Hold / Right-click to solve</span>
          <span className="[@media(pointer:fine)]:hidden">Tap to eliminate • Hold to solve</span>
        </p>
      </div>
    </div>
  );
};
