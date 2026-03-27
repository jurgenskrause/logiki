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
        return (
          <div className="flex flex-col items-center justify-between w-full h-full py-1">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-300 transform scale-50 -my-1">expand_more</span>
            <span className="text-xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'VERTICAL_NOT':
        return (
          <div className="flex flex-col items-center justify-between w-full h-full py-1 relative">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <div className="relative">
               <span className="material-icons text-red-500/40 text-sm absolute inset-0 flex items-center justify-center">close</span>
               <span className="material-icons text-slate-300 transform scale-50 -my-1">expand_more</span>
            </div>
            <span className="text-xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'VERTICAL_TRIO':
        return (
          <div className="flex flex-col items-center justify-between w-full h-full py-0.5">
            <span className="text-lg drop-shadow-sm">{icons[0]}</span>
            <span className="text-lg drop-shadow-sm">{icons[1]}</span>
            <span className="text-lg drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      case 'DISJUNCTIVE_XOR':
        return (
          <div className="flex flex-col items-center justify-around w-full h-full py-1">
             <div className="flex gap-1 items-center">
                <span className="text-xs drop-shadow-sm">{icons[0]}</span>
                <span className="text-[8px] text-slate-400 font-bold">XOR</span>
                <span className="text-xs drop-shadow-sm">{icons[1]}</span>
             </div>
             <span className="material-icons text-slate-300 transform scale-50 -my-1">link</span>
             <span className="text-lg drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center gap-0.5 justify-center w-full h-full opacity-50">
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
