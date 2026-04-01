import React, { useRef, useEffect } from 'react';
import { getFallbackEmoji } from '../../../utils/themeRegistry';
import type { ActiveClue } from '../../../engine/Solver';

interface HorizontalClueProps {
  clue: ActiveClue;
  onHover?: (clue: ActiveClue | null) => void;
  isHighlighted?: boolean;
  onDiscard?: (clueId: string) => void;
  isBinned?: boolean;
  onDoubleTap?: (clue: ActiveClue) => void;
}

export const HorizontalClueUI: React.FC<HorizontalClueProps> = ({ clue, onHover, isHighlighted, onDiscard, isBinned, onDoubleTap }) => {
  const { type, params } = clue;

  // Render icons for each param
  const icons = params.map(p => getFallbackEmoji(p.row, p.item));

  const renderContent = () => {
    switch (type) {
      case 'LEFT_OF':
        return (
          <div className="flex items-center justify-center w-full h-full gap-2 md:gap-5">
            <span className="text-lg md:text-xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-400 text-sm md:text-base">east</span>
            <span className="text-lg md:text-xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'ADJACENT':
        return (
          <div className="flex items-center justify-between w-full h-full px-1 md:px-2">
            <span className="text-base md:text-lg drop-shadow-sm opacity-50 grayscale scale-[0.8] md:scale-90">{icons[1]}</span>
            <div className="flex flex-col items-center">
               <span className="text-lg md:text-xl drop-shadow-sm z-10">{icons[0]}</span>
               <span className="material-icons text-slate-300 text-[10px] md:text-xs transform -my-1">swap_horiz</span>
            </div>
            <span className="text-base md:text-lg drop-shadow-sm opacity-50 grayscale scale-[0.8] md:scale-90">{icons[1]}</span>
          </div>
        );
      case 'SEQUENCE_THREE':
        return (
          <div className="flex items-center justify-between w-full h-full px-0 md:px-2">
            <span className="text-lg md:text-xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-300 transform scale-[0.35] md:scale-50 -mx-2 md:-mx-1">swap_horiz</span>
            <span className="text-lg md:text-xl drop-shadow-sm">{icons[1]}</span>
            <span className="material-icons text-slate-300 transform scale-[0.35] md:scale-50 -mx-2 md:-mx-1">swap_horiz</span>
            <span className="text-lg md:text-xl drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      case 'GAPPED_NOT_MIDDLE':
      case 'GAPPED_EXCLUSION':
        return (
          <div className="flex items-center justify-between w-full h-full px-1 md:px-2">
            <span className="text-lg md:text-xl drop-shadow-sm">{icons[0]}</span>
            <div className="relative mx-1 md:mx-1 flex items-center justify-center">
               <span className="text-lg md:text-xl blur-[1px] opacity-30 grayscale">{icons[1]}</span>
               <span className="material-icons absolute text-red-500 text-lg md:text-xl font-bold opacity-80">close</span>
            </div>
            <span className="text-lg md:text-xl drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 justify-center w-full h-full opacity-50">
            {icons.map((ic, i) => <span key={i} className="text-base md:text-lg">{ic}</span>)}
          </div>
        );
    }
  };

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchRef = useRef(false);
  const lastTapRef = useRef<number>(0);
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Ignore right mouse button to prevent starting timer when context menu handles it
    if (e.button === 2) return;

    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      lastTapRef.current = 0;
      onDoubleTap?.(clue);
      return;
    }
    lastTapRef.current = now;

    if (e.pointerType !== 'mouse') {
      isTouchRef.current = true;
    } else {
      isTouchRef.current = false;
    }
    // Ignore right mouse button to prevent starting timer when context menu handles it
    if (e.button === 2) return;
    
    hasDraggedRef.current = false;
    initialPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (initialPosRef.current) {
      const dx = e.clientX - initialPosRef.current.x;
      const dy = e.clientY - initialPosRef.current.y;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        hasDraggedRef.current = true;
      }
    }
  };

  const handlePointerUp = () => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      initialPosRef.current = null;
      return;
    }

    if (initialPosRef.current) {
      timerRef.current = setTimeout(() => {
        onDiscard?.(clue.id);
      }, 300);
    }
    initialPosRef.current = null;
  };

  return (
    <div 
      className={`w-full h-11 md:w-32 md:h-14 bg-slate-800 dark:bg-slate-950 rounded-lg shadow-md hover:border-blue-400 group transition-all duration-200 flex items-center justify-center shrink-0 select-none touch-none ${
        isHighlighted 
          ? 'animate-hard-flash z-10' 
          : 'border border-slate-700 dark:border-slate-800'
      } ${isBinned ? 'ring-2 ring-white/10 ring-inset scale-[0.98]' : ''}`}
      onMouseEnter={() => !isBinned && onHover?.(clue)}
      onMouseLeave={() => {
        onHover?.(null);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (isTouchRef.current) return;
        onDiscard?.(clue.id);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="text-white w-full h-full pointer-events-none">
         {renderContent()}
      </div>
    </div>
  );
};
