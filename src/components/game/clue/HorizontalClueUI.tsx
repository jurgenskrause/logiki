import React, { useRef, useEffect } from 'react';
import { getFallbackEmoji } from '../../../utils/themeRegistry';
import type { ActiveClue } from '../../../engine/Solver';

interface HorizontalClueProps {
  clue: ActiveClue;
  onHover?: (clue: ActiveClue | null) => void;
  isHighlighted?: boolean;
  onDiscard?: (clueId: string) => void;
  isBinned?: boolean;
}

export const HorizontalClueUI: React.FC<HorizontalClueProps> = ({ clue, onHover, isHighlighted, onDiscard, isBinned }) => {
  const { type, params } = clue;

  // Render icons for each param
  const icons = params.map(p => getFallbackEmoji(p.row, p.item));

  const renderContent = () => {
    switch (type) {
      case 'LEFT_OF':
        return (
          <div className="flex items-center justify-center w-full h-full gap-5">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-400 text-base">east</span>
            <span className="text-xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'ADJACENT':
        return (
          <div className="flex items-center justify-between w-full h-full px-2">
            <span className="text-lg drop-shadow-sm opacity-50 grayscale scale-90">{icons[1]}</span>
            <div className="flex flex-col items-center">
               <span className="text-xl drop-shadow-sm z-10">{icons[0]}</span>
               <span className="material-icons text-slate-300 text-xs transform -my-1">swap_horiz</span>
            </div>
            <span className="text-lg drop-shadow-sm opacity-50 grayscale scale-90">{icons[1]}</span>
          </div>
        );
      case 'SEQUENCE_THREE':
        return (
          <div className="flex items-center justify-between w-full h-full px-2">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-300 transform scale-50 -mx-1">swap_horiz</span>
            <span className="text-xl drop-shadow-sm">{icons[1]}</span>
            <span className="material-icons text-slate-300 transform scale-50 -mx-1">swap_horiz</span>
            <span className="text-xl drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      case 'GAPPED_NOT_MIDDLE':
      case 'GAPPED_EXCLUSION':
        return (
          <div className="flex items-center justify-between w-full h-full px-2">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <div className="relative mx-1">
               <span className="text-xl blur-[1px] opacity-30 grayscale">{icons[1]}</span>
               <span className="material-icons absolute inset-0 text-red-500/80 flex items-center justify-center text-xl font-bold">close</span>
            </div>
            <span className="text-xl drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 justify-center w-full h-full opacity-50">
            {icons.map((ic, i) => <span key={i} className="text-lg">{ic}</span>)}
          </div>
        );
    }
  };

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    
    timerRef.current = setTimeout(() => {
      onDiscard?.(clue.id);
    }, 600); // 600ms for long press
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div 
      className={`w-32 h-14 bg-slate-800 dark:bg-slate-950 rounded-lg shadow-md hover:border-blue-400 group transition-all duration-200 flex items-center justify-center shrink-0 select-none touch-none ${
        isHighlighted 
          ? 'animate-hard-flash z-10' 
          : 'border border-slate-700 dark:border-slate-800'
      } ${isBinned ? 'ring-2 ring-white/10 ring-inset scale-[0.98]' : ''}`}
      onMouseEnter={() => !isBinned && onHover?.(clue)}
      onMouseLeave={() => {
        onHover?.(null);
        handlePointerUp();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onDiscard?.(clue.id);
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="text-white w-full h-full pointer-events-none">
         {renderContent()}
      </div>
    </div>
  );
};
