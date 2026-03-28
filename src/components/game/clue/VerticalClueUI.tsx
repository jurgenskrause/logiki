import React from 'react';
import { getFallbackEmoji } from '../../../utils/themeRegistry';
import type { ActiveClue } from '../../../engine/Solver';

interface VerticalClueProps {
  clue: ActiveClue;
  onHover?: (clue: ActiveClue | null) => void;
}

export const VerticalClueUI: React.FC<VerticalClueProps> = ({ clue, onHover }) => {
  const { type, params } = clue;

  // Render icons for each param
  const icons = params.map(p => getFallbackEmoji(p.row, p.item));

  const renderContent = () => {
    switch (type) {
      case 'VERTICAL':
      case 'VERTICAL_PAIR':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full gap-1">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-300 transform scale-75 leading-none">link</span>
            <span className="text-xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'VERTICAL_NOT':
      case 'VERTICAL_NOT_PAIR':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full gap-1">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-red-500 transform scale-75 leading-none">link_off</span>
            <span className="text-xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'VERTICAL_TRIO':
        return (
          <div className="flex flex-col items-center justify-around w-full h-full py-2">
            <span className="text-lg drop-shadow-sm">{icons[0]}</span>
            <span className="text-lg drop-shadow-sm">{icons[1]}</span>
            <span className="text-lg drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      case 'VERTICAL_NOT_TRIO':
        return (
          <div className="flex flex-col items-center justify-around w-full h-full py-1">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <div className="relative flex items-center justify-center">
               <span className="text-lg drop-shadow-sm">{icons[2]}</span>
               <span className="material-icons absolute text-red-500 text-xl font-bold opacity-80">close</span>
            </div>
            <span className="text-xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'DISJUNCTIVE_XOR':
      case 'VERTICAL_DISJUNCTIVE_EXCLUSION':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full py-1">
            {/* Top item above XOR group */}
            <span className="text-xl drop-shadow-sm mb-2">{icons[0]}</span>
            
            {/* Bottom XOR group */}
            <div className="relative flex flex-col items-center h-12 justify-center">
              <span className="text-lg drop-shadow-sm z-10">{icons[1]}</span>
              
              {/* Overlapping circular arrows */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                 <span className="material-icons text-indigo-500 text-xl animate-spin-slow bg-white/50 dark:bg-slate-800/50 rounded-full">sync</span>
              </div>
              
              <span className="text-lg drop-shadow-sm z-10">{icons[2]}</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center gap-1 justify-center w-full h-full opacity-50">
            {icons.map((ic, i) => <span key={i} className="text-sm">{ic}</span>)}
          </div>
        );
    }
  };

  return (
    <div 
      className="w-16 h-28 bg-slate-800 dark:bg-slate-950 rounded-lg shadow-md border-2 border-slate-700 dark:border-slate-800 hover:border-indigo-500 group transition-all duration-200 flex items-center justify-center shrink-0"
      onMouseEnter={() => onHover && onHover(clue)}
      onMouseLeave={() => onHover && onHover(null)}
    >
      <div className="text-white w-full h-full pointer-events-none">
         {renderContent()}
      </div>
    </div>
  );
};
