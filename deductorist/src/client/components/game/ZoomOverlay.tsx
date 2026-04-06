import React from 'react';
import type { Possibility } from './BoardCell';

interface ZoomOverlayProps {
  cell: {
    id: string;
    options: Possibility[];
  };
  subColumns: number;
  onClose: () => void;
  onInteract: (cellId: string, possibilityId: number, action: 'eliminate' | 'solve') => void;
}

export const ZoomOverlay: React.FC<ZoomOverlayProps> = ({ cell, subColumns, onClose, onInteract }) => {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-2xl shadow-2xl max-w-lg w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold dark:text-white uppercase tracking-wider">Inspect Cell</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <span className="material-icons text-slate-500 dark:text-slate-300">close</span>
          </button>
        </div>

        {/* Magnified SubGrid */}
        <div 
          className="grid gap-[2px] bg-slate-200 dark:bg-slate-900 p-[2px] rounded-lg mx-auto w-full aspect-square max-h-[50vh] transition-all"
          style={{ 
            gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
            gridTemplateColumns: `repeat(${subColumns}, minmax(0, 1fr))`,
            aspectRatio: `${subColumns} / 2`
          }}
        >
          {cell.options.map(opt => (
            <button
               key={opt.id}
               onClick={() => onInteract(cell.id, opt.id, 'eliminate')}
               onContextMenu={(e) => {
                 e.preventDefault();
                 onInteract(cell.id, opt.id, 'solve');
               }}
               onDoubleClick={() => onInteract(cell.id, opt.id, 'solve')}
               className={`w-full h-full flex items-center justify-center bg-white dark:bg-slate-800 transition-all active:scale-95
                          ${opt.isActive ? 'opacity-100 grayscale-0 shadow-sm' : 'opacity-20 grayscale'}`}
               title="Tap to Eliminate | Right-Click / Double-Click to Solve"
            >
              <span className="text-4xl sm:text-6xl flex items-center justify-center">
                {opt.value}
              </span>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 uppercase tracking-widest">
          Tap to Eliminate • Double-tap/Right-click to Solve
        </p>
      </div>
    </div>
  );
};
