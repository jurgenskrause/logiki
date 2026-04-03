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
          <div className="flex items-center justify-center w-full h-full gap-4 md:gap-7">
            <span className="text-2xl md:text-3xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300 text-xl md:text-2xl">east</span>
            <span className="text-2xl md:text-3xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'ADJACENT':
        return (
          <div className="flex items-center justify-center w-full h-full gap-3 md:gap-5">
            <span className="text-xl md:text-2xl drop-shadow-sm opacity-50 grayscale scale-[0.8] md:scale-90">{icons[1]}</span>
            <div className="flex flex-col items-center">
               <span className="text-2xl md:text-3xl drop-shadow-sm z-10">{icons[0]}</span>
               <span className="material-icons text-slate-400 dark:text-slate-300 text-sm md:text-base transform -my-1">swap_horiz</span>
            </div>
            <span className="text-xl md:text-2xl drop-shadow-sm opacity-50 grayscale scale-[0.8] md:scale-90">{icons[1]}</span>
          </div>
        );
      case 'SEQUENCE_THREE':
        return (
          <div className="flex items-center justify-center w-full h-full gap-2 md:gap-4">
            <span className="text-2xl md:text-3xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300 transform scale-[0.6] md:scale-75 -mx-3 md:-mx-2">swap_horiz</span>
            <span className="text-2xl md:text-3xl drop-shadow-sm">{icons[1]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300 transform scale-[0.6] md:scale-75 -mx-3 md:-mx-2">swap_horiz</span>
            <span className="text-2xl md:text-3xl drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      case 'GAPPED_NOT_MIDDLE':
      case 'GAPPED_EXCLUSION':
        return (
          <div className="flex items-center justify-center w-full h-full gap-3 md:gap-5">
            <span className="text-2xl md:text-3xl drop-shadow-sm">{icons[0]}</span>
            <div className="relative mx-0.5 md:mx-2 flex items-center justify-center">
               <span className="text-2xl md:text-3xl">{icons[2]}</span>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 md:w-[42px] md:h-[42px] border-[3px] md:border-[4px] border-red-500/90 rounded-full z-10 pointer-events-none drop-shadow-md">
                  <div className="absolute top-1/2 left-[-10%] w-[120%] h-[3px] md:h-[4px] bg-red-500/90 transform -translate-y-1/2 rotate-45"></div>
               </div>
            </div>
            <span className="text-2xl md:text-3xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 justify-center w-full h-full opacity-50">
            {icons.map((ic, i) => <span key={i} className="text-2xl md:text-3xl">{ic}</span>)}
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
    
    // Check for Double Tap (within 300ms of last pointer down)
    if (now - lastTapRef.current < 300) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lastTapRef.current = 0;
      onDoubleTap?.(clue);
      return;
    }
    lastTapRef.current = now;

    isTouchRef.current = e.pointerType !== 'mouse';
    hasDraggedRef.current = false;
    initialPosRef.current = { x: e.clientX, y: e.clientY };

    // START Long Press timer - discard instantly when period elapses
    timerRef.current = setTimeout(() => {
       if (!hasDraggedRef.current) {
         onDiscard?.(clue.id);
         // Visual/Tactile feedback
         if (isTouchRef.current && 'vibrate' in navigator) {
           navigator.vibrate(10);
         }
       }
       timerRef.current = null;
    }, 600);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (initialPosRef.current) {
      const dx = e.clientX - initialPosRef.current.x;
      const dy = e.clientY - initialPosRef.current.y;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        hasDraggedRef.current = true;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    }
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    initialPosRef.current = null;
    hasDraggedRef.current = false;
  };

  return (
    <div 
      className={`w-full h-14 sm:w-40 sm:h-[66px] md:max-w-none md:w-48 md:h-[84px] shrink-0 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:border-blue-400 group flex items-center justify-center select-none touch-none ${
        isHighlighted 
          ? 'animate-hard-flash z-10' 
          : 'border border-slate-200 dark:border-slate-700'
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
      <div className="text-slate-700 dark:text-slate-200 w-full h-full pointer-events-none">
         {renderContent()}
      </div>
    </div>
  );
};
