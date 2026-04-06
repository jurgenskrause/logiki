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
  clue: ActiveClue;
  onHover?: (clue: ActiveClue | null) => void;
  isHighlighted?: boolean;
  onDiscard?: (clueId: string) => void;
  isBinned?: boolean;
  onDoubleTap?: (clue: ActiveClue) => void;
  dragHandleProps?: any;
}

export const HorizontalClueUI: React.FC<HorizontalClueProps> = ({ clue, onHover, isHighlighted, onDiscard, isBinned, onDoubleTap, dragHandleProps }) => {
  const { type, params } = clue;

  // Render icons for each param
  const icons = params.map(p => getFallbackEmoji(p.row, p.item));

  const renderContent = () => {
    switch (type) {
      case 'LEFT_OF':
        return (
          <div className="flex items-center justify-center w-full h-full gap-3 md:gap-5 pr-6 md:pr-0">
            <span className="text-xl md:text-3xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300 text-base md:text-2xl">east</span>
            <span className="text-xl md:text-3xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'ADJACENT':
        return (
          <div className="flex items-center justify-center w-full h-full gap-2 md:gap-4 pr-6 md:pr-0">
             <span className="text-xl md:text-3xl drop-shadow-sm">{icons[0]}</span>
             <span className="material-icons text-slate-400 dark:text-slate-300">swap_horiz</span>
             <span className="text-xl md:text-3xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'SEQUENCE_THREE':
        return (
          <div className="flex items-center justify-center w-full h-full gap-1.5 md:gap-2 pr-6 md:pr-0">
            <span className="text-xl md:text-3xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300 transform scale-[0.6] md:scale-75 -mx-3 md:-mx-2">swap_horiz</span>
            <span className="text-xl md:text-3xl drop-shadow-sm">{icons[1]}</span>
            <span className="material-icons text-slate-400 dark:text-slate-300 transform scale-[0.6] md:scale-75 -mx-3 md:-mx-2">swap_horiz</span>
            <span className="text-xl md:text-3xl drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      case 'GAPPED_NOT_MIDDLE':
      case 'GAPPED_EXCLUSION':
        return (
          <div className="flex items-center justify-center w-full h-full gap-2 md:gap-3 pr-6 md:pr-0">
            <span className="text-xl md:text-3xl drop-shadow-sm">{icons[0]}</span>
            <div className="relative mx-1 MD:mx-2 flex items-center justify-center">
               <span className="text-xl md:text-3xl">{icons[2]}</span>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 md:w-[42px] md:h-[42px] border-[2px] md:border-[4px] border-red-500/90 rounded-full z-10 pointer-events-none drop-shadow-md">
                  <div className="absolute top-1/2 left-[-10%] w-[120%] h-[2px] md:h-[4px] bg-red-500/90 transform -translate-y-1/2 rotate-45"></div>
               </div>
            </div>
            <span className="text-xl md:text-3xl drop-shadow-sm">{icons[1]}</span>
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

  const lastTapRef = useRef<number>(0);
  const isDesktop = useMediaQuery('(min-width: 768px)');

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
      className={`w-40 sm:w-40 h-14 sm:h-[66px] md:max-w-none md:w-48 md:h-[84px] shrink-0 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:border-blue-400 group flex items-center justify-center select-none ${
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
        className="absolute right-0 inset-y-0 w-8 md:hidden flex flex-col items-center justify-center gap-1.5 cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-r-lg transition-colors group/handle touch-none"
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
