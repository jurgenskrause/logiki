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
      className={`w-full h-full flex items-center justify-center transition-all active:scale-95 touch-none select-none text-white
                ${opt.isActive ? 'bg-white/10 hover:bg-white/20 opacity-100 grayscale-0 shadow-sm' : 'bg-black/20 opacity-20 grayscale'}`}
      title="Click/Tap to Eliminate | Right-Click/Hold to Solve"
    >
      <span className="text-4xl sm:text-6xl flex items-center justify-center pointer-events-none drop-shadow-md">
        {opt.value}
      </span>
    </button>
  );
};

export const ZoomOverlay: React.FC<ZoomOverlayProps> = ({ cell, subColumns, onClose, onInteract }) => {
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 border border-white/10 p-4 sm:p-8 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] max-w-lg w-full animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-end mb-4 sm:mb-6">
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors shadow-sm">
            <span className="material-icons text-white drop-shadow-md">close</span>
          </button>
        </div>

        {/* Magnified SubGrid */}
        <div 
          className="grid gap-[2px] bg-black/40 p-[2px] rounded-lg mx-auto w-full aspect-square max-h-[50vh] transition-all shadow-inner border border-white/5"
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

        <p className="text-center text-xs text-white/50 mt-6 uppercase tracking-widest leading-relaxed">
          <span className="hidden [@media(pointer:fine)]:inline">Click to eliminate • Hold / Right-click to solve</span>
          <span className="[@media(pointer:fine)]:hidden">Tap to eliminate • Hold to solve</span>
        </p>
      </div>
    </div>
  );
};
