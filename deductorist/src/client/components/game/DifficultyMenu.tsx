import React, { useState } from 'react';

interface DifficultyMenuProps {
  onSelect: (level: number, mode: 'daily' | 'random') => void;
  onClose?: () => void;
  enableRandom?: boolean;
  completedLevels?: number[];
}

const LEVEL_BGS = [
  'from-emerald-400 to-teal-500 dark:from-emerald-900 dark:to-teal-950',
  'from-blue-400 to-cyan-500 dark:from-blue-900 dark:to-cyan-950',
  'from-indigo-400 to-purple-500 dark:from-indigo-900 dark:to-purple-950',
  'from-purple-500 to-fuchsia-500 dark:from-purple-900 dark:to-fuchsia-950',
  'from-orange-400 to-red-500 dark:from-orange-900 dark:to-red-950',
];

const GridIcon: React.FC<{ size: number }> = ({ size }) => {
  return (
    <div 
      className="grid gap-[1px] sm:gap-[2px] bg-white/20 p-[1px] sm:p-[2px] rounded-sm sm:rounded-md w-8 h-8 sm:w-16 sm:h-16 mx-auto mb-1 sm:mb-3 shadow-inner"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: size * size }).map((_, i) => (
        <div key={i} className="bg-white/80 rounded-[1px] shadow-sm w-full h-full aspect-square" />
      ))}
    </div>
  );
};

export const DifficultyMenu: React.FC<DifficultyMenuProps> = ({ onSelect, onClose, enableRandom = true, completedLevels = [] }) => {
  const [mode, setMode] = useState<'daily'|'random'>(() => {
    // Attempt to read current mode from URL if possible to ensure consistency
    const urlParams = new URLSearchParams(window.location.search);
    return (enableRandom && urlParams.get('random') === 'true') ? 'random' : 'daily';
  });

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md transition-all duration-500"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 dark:bg-slate-900/95 p-4 sm:p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700/50 max-w-4xl w-full flex flex-col items-center relative overflow-y-auto max-h-[98vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Mobile Close Button */}
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center"
            title="Close menu"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        )}

        <h2 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-2 tracking-tighter text-center">
          PUZZLE SELECT
        </h2>

        {/* Toggle Switch */}
        {enableRandom && (
          <button 
            onClick={() => setMode(prev => prev === 'daily' ? 'random' : 'daily')}
            className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-full max-w-[240px] cursor-pointer mb-2 sm:mb-4"
          >
            <div 
              className={`flex-1 py-1 px-3 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'daily' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 opacity-60'}`}
            >
              Daily
            </div>
            <div 
              className={`flex-1 py-1 px-3 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'random' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 opacity-60'}`}
            >
              Random
            </div>
          </button>
        )}

        <p className="text-slate-500 dark:text-slate-400 font-medium tracking-widest uppercase text-[10px] sm:text-xs text-center mb-4 sm:mb-6 h-4 hidden sm:block">
          {mode === 'daily' ? "Play today's curated grid" : 'Generate an endless random grid'}
        </p>
        
        {/* Mobile optimized: flex wrap to center, perfectly sized grid chunks */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 w-full">
          {[1, 2, 3, 4, 5].map((level, index) => {
            const gridSize = level + 3; // L1=4x4, L2=5x5, L3=6x6, L4=7x7, L5=8x8
            const isCompleted = mode === 'daily' && completedLevels.includes(level);
            
            return (
              <button
                key={level}
                onClick={() => onSelect(level, mode)}
                className={`w-[calc(50%-0.3rem)] sm:w-auto sm:min-w-[130px] max-w-[150px] aspect-auto sm:aspect-[4/5] py-3 px-2 sm:p-6 rounded-2xl bg-gradient-to-br ${LEVEL_BGS[index]} 
                  text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 
                  transition-all duration-300 flex flex-col items-center justify-center group relative overflow-hidden
                  ${isCompleted ? 'ring-2 sm:ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-900 border-none' : 'border border-white/20'}`}
              >
                {/* Glossy overlay effect class */}
                <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out opacity-0 group-hover:opacity-100" />
                
                {isCompleted && (
                   <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex items-center justify-center bg-emerald-500 rounded-full shadow-md text-white border-2 border-white p-0.5 z-20">
                     <span className="material-icons text-[10px] sm:text-xs font-black">check</span>
                   </div>
                )}
                
                <GridIcon size={gridSize} />
                
                <span className="text-[10px] sm:text-sm font-bold tracking-widest uppercase opacity-90 drop-shadow-sm text-white dark:text-slate-200 mt-1 sm:mt-2 z-10 relative">
                  Level {level}
                </span>
                <span className="text-base sm:text-2xl font-black tracking-tighter drop-shadow-md text-white dark:text-slate-100 z-10 relative leading-none mt-1">
                  {gridSize}x{gridSize}
                </span>
                {isCompleted && (
                   <span className="mt-1.5 text-[8px] sm:text-[10px] uppercase font-black tracking-wider text-emerald-100 bg-emerald-900/40 px-1.5 py-0.5 rounded-sm sm:rounded-md shadow-inner z-10 relative">
                     Completed
                   </span>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
