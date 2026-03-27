import React from 'react';
import { getFallbackEmoji } from '../../../utils/themeRegistry';
import type { ActiveClue } from '../../../engine/Solver';

interface VerticalClueProps {
  clue: ActiveClue;
}

export const VerticalClueUI: React.FC<VerticalClueProps> = ({ clue }) => {
  const { type, params } = clue;

  // Render icons for each param
  const icons = params.map(p => getFallbackEmoji(p.row, p.item));

  const renderContent = () => {
    switch (type) {
      case 'VERTICAL':
      case 'VERTICAL_PAIR':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full gap-2 transition-transform duration-300">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-300 transform scale-75">link</span>
            <span className="text-xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'VERTICAL_NOT':
      case 'VERTICAL_NOT_PAIR':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full gap-2">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <div className="relative">
               <span className="material-icons text-red-500/60 transform scale-75">link_off</span>
            </div>
            <span className="text-xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'VERTICAL_TRIO':
        return (
          <div className="flex flex-col items-center justify-between w-full h-full py-2">
            <span className="text-lg drop-shadow-sm">{icons[0]}</span>
            <span className="text-lg drop-shadow-sm">{icons[1]}</span>
            <span className="text-lg drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      case 'DISJUNCTIVE_XOR':
      case 'VERTICAL_DISJUNCTIVE_EXCLUSION':
        return (
          <div className="flex flex-col items-center justify-between w-full h-full py-1">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-300 transform rotate-90 scale-75 -my-2">compare_arrows</span>
            <div className="flex flex-col items-center gap-1">
               <span className="text-lg drop-shadow-sm">{icons[1]}</span>
               <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest leading-none">OR</span>
               <span className="text-lg drop-shadow-sm">{icons[2]}</span>
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
      className="w-16 h-24 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-400 group transition-all duration-200 flex items-center justify-center"
      title={type}
    >
      {renderContent()}
    </div>
  );
};
