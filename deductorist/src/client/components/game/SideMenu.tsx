import React from 'react';

interface SideMenuProps {
  onClose: () => void;
  onOpenDifficulty: () => void;
  onOpenHelp: () => void;
  warningsEnabled: boolean;
  onToggleWarnings: (enabled: boolean) => void;
  zoomEnabled: boolean;
  onToggleZoom: (enabled: boolean) => void;
  isSoundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({ 
  onClose, 
  onOpenDifficulty, 
  onOpenHelp,
  warningsEnabled, 
  onToggleWarnings,
  zoomEnabled,
  onToggleZoom,
  isSoundEnabled,
  onToggleSound
}) => {
  return (
    <>
      <div 
        className="fixed inset-0 z-[60] bg-slate-900/80 animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 z-[70] w-72 bg-white dark:bg-slate-900 shadow-2xl border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-300 flex flex-col">
        
        {/* Absolute Close Button */}
        <div className="absolute top-2 right-2 z-10">
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto pt-14 pb-4 px-3 space-y-1.5">
          
          <button 
            onClick={() => {
              onClose();
              onOpenDifficulty();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="w-10 h-10 shrink-0 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500">
              <span className="material-icons">tune</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">Change Difficulty</div>
              <div className="text-xs font-medium text-slate-500 truncate">Select grid size</div>
            </div>
          </button>

          <button 
            onClick={() => {
              onClose();
              onOpenHelp();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="w-10 h-10 shrink-0 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-500">
              <span className="material-icons">help_outline</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">How to Play</div>
              <div className="text-xs font-medium text-slate-500 truncate">Game rules and controls</div>
            </div>
          </button>

          <div className="w-full flex flex-col p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 mt-3 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <span className="material-icons">history</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800 dark:text-slate-200 truncate">Puzzle Archive</div>
                <div className="text-xs font-medium text-slate-500 truncate">Play previous days</div>
              </div>
            </div>
            <input 
              type="date"
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
              defaultValue={new URLSearchParams(window.location.search).get('date') || new Date().toISOString().split('T')[0]}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                if (e.target.value) {
                  window.location.search = `?date=${e.target.value}`;
                }
              }}
            />
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-colors ${zoomEnabled ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <span className="material-icons">zoom_in</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">Cell Zoom</div>
                  <div className="text-[10px] sm:text-xs font-medium text-slate-500 leading-tight mt-0.5 truncate">Magnify tiles</div>
                </div>
              </div>
              <label className="flex items-center cursor-pointer shrink-0 ml-2">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={zoomEnabled} 
                    onChange={e => onToggleZoom(e.target.checked)} 
                  />
                  <div className={`block w-10 h-5 rounded-full transition-colors duration-300 ${zoomEnabled ? 'bg-blue-500 shadow-md shadow-blue-500/20' : 'bg-slate-300 dark:bg-slate-700 shadow-inner'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform duration-300 shadow-sm ${zoomEnabled ? 'transform translate-x-5' : ''}`}></div>
                </div>
              </label>
            </div>

            <div className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-colors ${warningsEnabled ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <span className="material-icons">warning</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">Warnings</div>
                  <div className="text-[10px] sm:text-xs font-medium text-slate-500 leading-tight mt-0.5 truncate">Flash invalid moves</div>
                </div>
              </div>
              <label className="flex items-center cursor-pointer shrink-0 ml-2">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={warningsEnabled} 
                    onChange={e => onToggleWarnings(e.target.checked)} 
                  />
                  <div className={`block w-10 h-5 rounded-full transition-colors duration-300 ${warningsEnabled ? 'bg-amber-500 shadow-md shadow-amber-500/20' : 'bg-slate-300 dark:bg-slate-700 shadow-inner'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform duration-300 shadow-sm ${warningsEnabled ? 'transform translate-x-5' : ''}`}></div>
                </div>
              </label>
            </div>
            
            <div className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-colors ${isSoundEnabled ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <span className="material-icons">{isSoundEnabled ? 'volume_up' : 'volume_off'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">Sound Effects</div>
                  <div className="text-[10px] sm:text-xs font-medium text-slate-500 leading-tight mt-0.5 truncate">Play interactions</div>
                </div>
              </div>
              <label className="flex items-center cursor-pointer shrink-0 ml-2">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={isSoundEnabled} 
                    onChange={e => onToggleSound(e.target.checked)} 
                  />
                  <div className={`block w-10 h-5 rounded-full transition-colors duration-300 ${isSoundEnabled ? 'bg-indigo-500 shadow-md shadow-indigo-500/20' : 'bg-slate-300 dark:bg-slate-700 shadow-inner'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform duration-300 shadow-sm ${isSoundEnabled ? 'transform translate-x-5' : ''}`}></div>
                </div>
              </label>
            </div>
          </div>

        </div>

      </div>
    </>
  );
};
