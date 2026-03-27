import React from 'react';
import { getFallbackEmoji } from '../../../utils/themeRegistry';
import type { ActiveClue } from '../../../engine/Solver';

interface HorizontalClueProps {
  clue: ActiveClue;
}

export const HorizontalClueUI: React.FC<HorizontalClueProps> = ({ clue }) => {
  const { type, params } = clue;

  // Render icons for each param
  const icons = params.map(p => getFallbackEmoji(p.row, p.item));

  const renderContent = () => {
    switch (type) {
      case 'LEFT_OF':
        return (
          <div className="flex items-center justify-between w-full h-full px-2">
            <span className="text-2xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-300 transform scale-75">chevron_right</span>
            <span className="text-2xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'ADJACENT':
        return (
          <div className="flex items-center justify-between w-full h-full px-2">
            <span className="text-2xl drop-shadow-sm">{icons[0]}</span>
            <span className="material-icons text-slate-300 transform scale-75">swap_horiz</span>
            <span className="text-2xl drop-shadow-sm">{icons[1]}</span>
          </div>
        );
      case 'SEQUENCE_THREE':
        return (
          <div className="flex items-center justify-between w-full h-full px-1">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <span className="text-xl drop-shadow-sm">{icons[1]}</span>
            <span className="text-xl drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      case 'GAPPED_NOT_MIDDLE':
      case 'GAPPED_EXCLUSION':
        return (
          <div className="flex items-center justify-between w-full h-full px-1">
            <span className="text-xl drop-shadow-sm">{icons[0]}</span>
            <div className="relative">
               <span className="text-xl blur-[1px] opacity-30">{icons[1]}</span>
               <span className="material-icons absolute inset-0 text-red-500/50 flex items-center justify-center text-sm">block</span>
            </div>
            <span className="text-xl drop-shadow-sm">{icons[2]}</span>
          </div>
        );
      default:
        // Fallback for types we haven't stylized yet
        return (
          <div className="flex items-center gap-1 justify-center w-full h-full opacity-50">
            {icons.map((ic, i) => <span key={i} className="text-lg">{ic}</span>)}
          </div>
        );
    }
  };

  return (
    <div 
      className="w-24 h-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-400 group transition-all duration-200 flex items-center justify-center"
      title={type}
    >
      {renderContent()}
    </div>
  );
};
