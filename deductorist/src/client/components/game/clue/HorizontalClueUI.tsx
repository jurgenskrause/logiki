import React, { useRef, useState, useEffect } from 'react';
import { getFallbackEmoji } from '../../../../shared/utils/themeRegistry';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const matchQueryList = window.matchMedia(query);
    setMatches(matchQueryList.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    matchQueryList.addEventListener('change', handler);
    return () => matchQueryList.removeEventListener('change', handler);
  }, [query]);
  return matches;
}
import type { ActiveClue } from '../../../../shared/engine/Solver';

interface HorizontalClueProps {
  isDesktop?: boolean;
  clue: ActiveClue;
  onHover?: (clue: ActiveClue | null) => void;
  isHighlighted?: boolean;
  onDiscard?: (clueId: string) => void;
  isBinned?: boolean;
  onDoubleTap?: (clue: ActiveClue) => void;
  dragHandleProps?: any;
}

export const HorizontalClueUI: React.FC<HorizontalClueProps> = ({ clue, onHover, isHighlighted, onDiscard, isBinned, onDoubleTap, dragHandleProps, isDesktop = false }) => {
  const { type, params } = clue;

  // Render icons for each param
  const icons = params.map(p => getFallbackEmoji(p.row, p.item));

  const renderContent = () => {
    switch (type) {
      case 'LEFT_OF':
        return (
          <div className="flex items-center justify-center w-full h-full ${isDesktop ? 'gap-5 pr-0' : 'gap-3 pr-6'}">
            <span className="${isDesktop ? 'text-3xl' : 'text-xl'} drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300 ${isDesktop ? 'text-2xl' : 'text-base'}">east</span>
            <span className="${isDesktop ? 'text-3xl' : 'text-xl'} drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'ADJACENT':
        return (
          <div className="flex items-center justify-center w-full h-full ${isDesktop ? 'gap-4 pr-0' : 'gap-2 pr-6'}">
             <span className="${isDesktop ? 'text-3xl' : 'text-xl'} drop-shadow-sm">{icons[0]}</span>
             <span className="material-icons text-slate-400 dark:text-slate-300">swap_horiz</span>
             <span className="${isDesktop ? 'text-3xl' : 'text-xl'} drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'SEQUENCE_THREE':
        return (
          <div className="flex items-center justify-center w-full h-full ${isDesktop ? 'gap-2 pr-0' : 'gap-1.5 pr-6'}">
            <span className="${isDesktop ? 'text-3xl' : 'text-xl'} drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300 transform ${isDesktop ? 'scale-75 -mx-2' : 'scale-[0.6] -mx-3'}">swap_horiz</span>
            <span className="${isDesktop ? 'text-3xl' : 'text-xl'} drop-shadow-sm">{icons[1]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300 transform ${isDesktop ? 'scale-75 -mx-2' : 'scale-[0.6] -mx-3'}">swap_horiz</span>
            <span className="${isDesktop ? 'text-3xl' : 'text-xl'} drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      case 'GAPPED_NOT_MIDDLE':
      case 'GAPPED_EXCLUSION':
        return (
          <div className="flex items-center justify-center w-full h-full ${isDesktop ? 'gap-3 pr-0' : 'gap-2 pr-6'}">
            <span className="${isDesktop ? 'text-3xl' : 'text-xl'} drop-shadow-sm">{icons[0]}</span>
            <div className="relative mx-1 MD:mx-2 flex items-center justify-center">
               <span className="${isDesktop ? 'text-3xl' : 'text-xl'}">{icons[2]}</span>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isDesktop ? 'w-[42px] h-[42px] border-[4px]' : 'w-7 h-7 border-[2px]'} border-red-500/90 rounded-full z-10 pointer-events-none drop-shadow-md">
                  <div className="absolute top-1/2 left-[-10%] w-[120%] ${isDesktop ? 'h-[4px]' : 'h-[2px]'} bg-red-500/90 transform -translate-y-1/2 rotate-45"></div>
               </div>
            </div>
            <span className="${isDesktop ? 'text-3xl' : 'text-xl'} drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 justify-center w-full h-full opacity-50">
            {icons.map((ic, i) => <span key={i} className="${isDesktop ? 'text-3xl' : 'text-2xl'}">{ic}</span>)}
          </div>
        );
    }
  };

  const lastTapRef = useRef<number>(0);
  

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      onDoubleTap?.(clue);
      return;
    }
    lastTapRef.current = now;
  };

  return (
    <div 
      className={`${isDesktop ? 'w-48 h-[84px] max-w-none' : 'w-40 h-14 sm:h-[66px]'} shrink-0 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:border-blue-400 group flex items-center justify-center select-none ${
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
        onDiscard?.(clue.id);
      }}
      onPointerDown={handlePointerDown}
      {...(isDesktop && dragHandleProps ? dragHandleProps : {})}
    >
      <div className="text-slate-700 dark:text-slate-200 w-full h-full pointer-events-none">
         {renderContent()}
      </div>

      {/* Drag Handle (Full Height Right Column) */}
      <div 
        {...(!isDesktop && dragHandleProps ? dragHandleProps : {})}
        className={`absolute right-0 inset-y-0 w-8 flex flex-col items-center justify-center gap-1.5 cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-r-lg transition-colors group/handle touch-none ${isDesktop ? "hidden" : "flex"}`}
      >
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};
