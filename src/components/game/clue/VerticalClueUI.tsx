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
  dragHandleProps?: any;
}

export const VerticalClueUI: React.FC<VerticalClueProps> = ({ clue, onHover, isHighlighted, onDiscard, isBinned, onDoubleTap, dragHandleProps }) => {
  const { type, params } = clue;

  // Render icons for each param
  const icons = params.map(p => getFallbackEmoji(p.row, p.item));

  const renderContent = () => {
    const iconClass = "text-xl md:text-3xl drop-shadow-sm leading-none flex items-center justify-center";
    
    switch (type) {
      case 'VERTICAL':
      case 'VERTICAL_PAIR':
        return (
          <div className="flex flex-col items-center justify-around w-full h-full pt-1 pb-4 md:py-2">
            <span className={iconClass}>{icons[0]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300 text-lg md:text-2xl leading-none">link</span>
            <span className={iconClass}>{icons[1]}</span>
          </div>
        );
      case 'VERTICAL_NOT':
      case 'VERTICAL_NOT_PAIR':
        return (
          <div className="flex flex-col items-center justify-around w-full h-full pt-1 pb-4 md:py-2">
            <span className={iconClass}>{icons[0]}</span>
            <span className="material-icons text-red-500 text-lg md:text-2xl leading-none">link_off</span>
            <span className={iconClass}>{icons[1]}</span>
          </div>
        );
      case 'VERTICAL_TRIO':
        return (
          <div className="flex flex-col items-center justify-around w-full h-full pt-1 pb-4 md:py-2">
            <span className={iconClass}>{icons[0]}</span>
            <span className={iconClass}>{icons[1]}</span>
            <span className={iconClass}>{icons[2]}</span>
          </div>
        );
      case 'VERTICAL_NOT_TRIO':
        return (
          <div className="flex flex-col items-center justify-around w-full h-full pt-1 pb-4 md:py-2">
            <span className={iconClass}>{icons[0]}</span>
            <div className="relative flex items-center justify-center">
               <span className={iconClass}>{icons[2]}</span>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 md:w-[42px] md:h-[42px] border-[2px] md:border-[4px] border-red-500/90 rounded-full z-10 pointer-events-none drop-shadow-md">
                  <div className="absolute top-1/2 left-[-10%] w-[120%] h-[2px] md:h-[4px] bg-red-500/90 transform -translate-y-1/2 rotate-45"></div>
               </div>
            </div>
            <span className={iconClass}>{icons[1]}</span>
          </div>
        );
      case 'DISJUNCTIVE_XOR':
      case 'VERTICAL_DISJUNCTIVE_EXCLUSION':
        return (
          <div className="flex flex-col items-center justify-around w-full h-full pt-1 pb-4 md:py-2">
            <span className={iconClass}>{icons[0]}</span>
            
            <div className="relative flex flex-col items-center justify-center gap-1 md:gap-4">
               <span className={iconClass}>{icons[1]}</span>
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <span className="material-icons text-blue-500 text-[8px] md:text-[14px] bg-white/90 dark:bg-slate-900/90 rounded-full p-0.5 shadow-xs border border-slate-200 dark:border-slate-700">sync</span>
               </div>
               <span className={iconClass}>{icons[2]}</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center gap-1 justify-center w-full h-full opacity-50">
            {icons.map((ic, i) => <span key={i} className="text-xl md:text-2xl">{ic}</span>)}
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
      className={`w-20 md:w-24 h-[120px] md:h-[168px] bg-white dark:bg-slate-800 rounded-lg shadow-md hover:border-indigo-500 group flex items-center justify-center shrink-0 select-none ${
        isHighlighted
          ? 'animate-hard-flash z-10'
          : 'border-2 border-slate-200 dark:border-slate-700'
      } ${isBinned ? 'ring-2 ring-white/10 ring-inset scale-[0.98]' : ''}`}
      onMouseEnter={() => !isBinned && onHover && onHover(clue)}
      onMouseLeave={() => {
        onHover && onHover(null);
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

      {/* Drag Handle (Full Width Bottom Row) */}
      <div 
        {...dragHandleProps}
        className="absolute bottom-0 inset-x-0 h-6 flex items-center justify-center gap-2 cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-b-lg transition-colors group/handle touch-none"
      >
        <div className="flex flex-col gap-1">
          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};
