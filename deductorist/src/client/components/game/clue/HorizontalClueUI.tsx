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
  clueIconSize?: number;
  hasMouse?: boolean;
  clue: ActiveClue;
  onHover?: (clue: ActiveClue | null) => void;
  isHighlighted?: boolean;
  onDiscard?: (clueId: string) => void;
  isBinned?: boolean;
  onDoubleTap?: (clue: ActiveClue) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleProps?: any;
}

export const HorizontalClueUI: React.FC<HorizontalClueProps> = ({ clue, onHover, isHighlighted, onDiscard, isBinned, onDoubleTap, dragHandleProps, isDesktop = false, clueIconSize = 24, hasMouse = false }) => {
  const { type, params } = clue;
  const isFinePointer = useMediaQuery('(pointer: fine)');

  // Render icons for each param
  const icons = params.map(p => getFallbackEmoji(p.row, p.item));

  const drawSize = clueIconSize * 0.75;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconRender = ({ children, left, top = '50%', scale = 1, isSymbol = false }: any) => (
    <div 
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 leading-none flex items-center justify-center ${isSymbol ? 'text-slate-400 dark:text-slate-300 material-icons' : 'drop-shadow-sm'}`}
      style={{ left, top, fontSize: isSymbol ? `${drawSize * 0.75 * scale}px` : `${drawSize * scale}px` }}
    >
      {children}
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'LEFT_OF':
        return (
          <div className="relative w-full h-full">
            <IconRender left="20%">{icons[0]}</IconRender>
            <IconRender left="50%" isSymbol>east</IconRender>
            <IconRender left="80%">{icons[1]}</IconRender>
          </div>
        );
      case 'ADJACENT':
        return (
          <div className="relative w-full h-full">
             <IconRender left="20%">{icons[0]}</IconRender>
             <IconRender left="50%" isSymbol>swap_horiz</IconRender>
             <IconRender left="80%">{icons[1]}</IconRender>
          </div>
        );
      case 'SEQUENCE_THREE':
        return (
          <div className="relative w-full h-full">
            <IconRender left="15%">{icons[0]}</IconRender>
            <IconRender left="32.5%" isSymbol>swap_horiz</IconRender>
            <IconRender left="50%">{icons[1]}</IconRender>
            <IconRender left="67.5%" isSymbol>swap_horiz</IconRender>
            <IconRender left="85%">{icons[2]}</IconRender>
          </div>
        );
      case 'GAPPED_NOT_MIDDLE':
      case 'GAPPED_EXCLUSION':
        return (
          <div className="relative w-full h-full">
            <IconRender left="15%">{icons[0]}</IconRender>
            <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
               <span className="drop-shadow-sm leading-none flex items-center" style={{ fontSize: `${drawSize}px` }}>{icons[2]}</span>
               <div style={{ width: `${drawSize * 1.5}px`, height: `${drawSize * 1.5}px`, borderWidth: `${drawSize * 0.15}px` }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-red-500/90 rounded-full z-10 pointer-events-none drop-shadow-md">
                  <div style={{ height: `${drawSize * 0.15}px` }} className="absolute top-1/2 left-[-10%] w-[120%] bg-red-500/90 transform -translate-y-1/2 rotate-45"></div>
               </div>
            </div>
            <IconRender left="85%">{icons[1]}</IconRender>
          </div>
        );
      case 'DISJUNCTIVE_XOR':
        return (
          <div className="relative w-full h-full">
            <IconRender left="15%">{icons[0]}</IconRender>
            <IconRender left="50%">{icons[1]}</IconRender>
            <div className="absolute left-[67.5%] top-[50%] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20 pointer-events-none">
               <span style={{ fontSize: `${drawSize * 0.5}px` }} className="material-icons text-blue-400 bg-black/40 rounded-full p-0.5 shadow-xs border border-white/10">sync</span>
            </div>
            <IconRender left="85%">{icons[2]}</IconRender>
          </div>
        );
      default:
        // Generic dynamic fallback
        return (
          <div className="relative w-full h-full opacity-50">
            {icons.map((ic, i) => (
               <IconRender key={i} left={`${15 + (i * (70 / (icons.length - 1 || 1)))}%`}>{ic}</IconRender>
            ))}
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
      style={{ width: `calc(${clueIconSize}px * 4.0)`, height: `calc(${clueIconSize}px * 1.5)`, fontSize: `${clueIconSize}px` }}
      className={`shrink-0 bg-white/5 backdrop-blur-md rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:bg-white/10 group flex items-center justify-center select-none ${
        isHighlighted 
          ? 'animate-hard-flash z-10' 
          : 'border border-white/10'
      } ${isBinned ? 'ring-2 ring-white/10 ring-inset scale-[0.98] opacity-50' : ''}`}
      onMouseEnter={() => !isBinned && onHover?.(clue)}
      onMouseLeave={() => {
        onHover?.(null);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onDiscard?.(clue.id);
      }}
      onPointerDown={handlePointerDown}
      {...(hasMouse && dragHandleProps ? dragHandleProps : {})}
    >
      <div className="text-slate-700 dark:text-slate-200 w-full h-full pointer-events-none">
         {renderContent()}
      </div>

      <div 
        {...(!hasMouse && dragHandleProps ? dragHandleProps : {})}
        className={`absolute right-0 inset-y-0 w-8 flex flex-col items-center justify-center gap-1.5 cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-r-lg transition-colors group/handle touch-none ${hasMouse || isFinePointer ? "hidden" : "flex"}`}
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
