import React, { useRef, useEffect } from 'react';
import { getFallbackEmoji } from '../../../utils/themeRegistry';
import type { ActiveClue } from '../../../engine/Solver';

interface VerticalClueProps {
  clue: ActiveClue;
  onHover?: (clue: ActiveClue | null) => void;
  isHighlighted?: boolean;
  onDiscard?: (clueId: string) => void;
  isBinned?: boolean;
  onDoubleTap?: (clue: ActiveClue) => void;
}

export const VerticalClueUI: React.FC<VerticalClueProps> = ({ clue, onHover, isHighlighted, onDiscard, isBinned, onDoubleTap }) => {
  const { type, params } = clue;

  // Render icons for each param
  const icons = params.map(p => getFallbackEmoji(p.row, p.item));

  const renderContent = () => {
    switch (type) {
      case 'VERTICAL':
      case 'VERTICAL_PAIR':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full gap-0.5 md:gap-1">
            <span className="text-base md:text-xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-300 transform scale-50 md:scale-75 leading-none">link</span>
            <span className="text-base md:text-xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'VERTICAL_NOT':
      case 'VERTICAL_NOT_PAIR':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full gap-0.5 md:gap-1">
            <span className="text-base md:text-xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-red-500 transform scale-50 md:scale-75 leading-none">link_off</span>
            <span className="text-base md:text-xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'VERTICAL_TRIO':
        return (
          <div className="flex flex-col items-center justify-around w-full h-full py-1 md:py-2">
            <span className="text-sm md:text-lg drop-shadow-sm">{icons[0]}</span>
            <span className="text-sm md:text-lg drop-shadow-sm">{icons[1]}</span>
            <span className="text-sm md:text-lg drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      case 'VERTICAL_NOT_TRIO':
        return (
          <div className="flex flex-col items-center justify-around w-full h-full py-0.5 md:py-1">
            <span className="text-base md:text-xl drop-shadow-sm">{icons[0]}</span>
            <div className="relative flex items-center justify-center">
               <span className="text-sm md:text-lg drop-shadow-sm">{icons[2]}</span>
               <span className="material-icons absolute text-red-500 text-base md:text-xl font-bold opacity-80">close</span>
            </div>
            <span className="text-base md:text-xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'DISJUNCTIVE_XOR':
      case 'VERTICAL_DISJUNCTIVE_EXCLUSION':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full py-0.5 md:py-1">
            {/* Top item above XOR group */}
            <span className="text-base md:text-xl drop-shadow-sm mb-1 md:mb-2">{icons[0]}</span>
            
            {/* Bottom XOR group */}
            <div className="relative flex flex-col items-center h-8 md:h-12 justify-center scale-90 md:scale-100">
              <span className="text-sm md:text-lg drop-shadow-sm z-10">{icons[1]}</span>
              
              {/* Overlapping circular arrows */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                 <span className="material-icons text-indigo-500 text-sm md:text-xl animate-spin-slow bg-white/50 dark:bg-slate-800/50 rounded-full">sync</span>
              </div>
              
              <span className="text-sm md:text-lg drop-shadow-sm z-10">{icons[2]}</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center gap-0.5 md:gap-1 justify-center w-full h-full opacity-50">
            {icons.map((ic, i) => <span key={i} className="text-xs md:text-sm">{ic}</span>)}
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
      className={`w-12 h-20 md:w-16 md:h-28 bg-slate-800 dark:bg-slate-950 rounded-lg shadow-md hover:border-indigo-500 group transition-all duration-200 flex items-center justify-center shrink-0 select-none touch-none ${
        isHighlighted
          ? 'animate-hard-flash z-10'
          : 'border-2 border-slate-700 dark:border-slate-800'
      } ${isBinned ? 'ring-2 ring-white/10 ring-inset scale-[0.98]' : ''}`}
      onMouseEnter={() => !isBinned && onHover && onHover(clue)}
      onMouseLeave={() => {
        onHover && onHover(null);
        handlePointerUp();
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
