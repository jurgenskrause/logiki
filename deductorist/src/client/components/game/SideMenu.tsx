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
  onRestart: () => void;
  onGiveUp: () => void;
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
  onToggleSound,
  onRestart,
  onGiveUp
}) => {
  return (
    <>
      <div 
        className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 z-[70] w-72 bg-white dark:bg-slate-900 shadow-2xl border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-300 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tighter uppercase text-slate-800 dark:text-slate-200">
            Deductorist
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          
          <button 
            onClick={() => {
              onClose();
              onOpenDifficulty();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500">
              <span className="material-icons">tune</span>
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Change Difficulty</div>
              <div className="text-xs font-medium text-slate-500">Select grid size</div>
            </div>
          </button>

          <button 
            onClick={() => {
              onClose();
              onOpenHelp();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-500">
              <span className="material-icons">help_outline</span>
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">How to Play</div>
              <div className="text-xs font-medium text-slate-500">Game rules and controls</div>
            </div>
          </button>

          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to restart? This will reset the board, but keep the timer running.")) {
                onClose();
                onRestart();
              }
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-500 flex-shrink-0">
              <span className="material-icons">restart_alt</span>
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Restart Puzzle</div>
              <div className="text-xs font-medium text-slate-500">Clear board, keep timer</div>
            </div>
          </button>

          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to give up? You won't be able to submit a score for this puzzle today.")) {
                onClose();
                onGiveUp();
              }
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-500 flex-shrink-0">
              <span className="material-icons">flag</span>
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Give Up</div>
              <div className="text-xs font-medium text-slate-500">Reveal solution & end game</div>
            </div>
          </button>

          <div className="w-full flex flex-col p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 mt-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <span className="material-icons">history</span>
              </div>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">Puzzle Archive</div>
                <div className="text-xs font-medium text-slate-500">Play previous days</div>
              </div>
            </div>
            <input 
              type="date"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
              defaultValue={new URLSearchParams(window.location.search).get('date') || new Date().toISOString().split('T')[0]}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                if (e.target.value) {
                  window.location.href = `/?date=${e.target.value}`;
                }
              }}
            />
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${zoomEnabled ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <span className="material-icons">zoom_in</span>
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Cell Zoom</div>
                  <div className="text-[10px] sm:text-xs font-medium text-slate-500 leading-tight mt-0.5">Magnify tiles when tapping</div>
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

            <div className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${warningsEnabled ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <span className="material-icons">warning</span>
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Warnings</div>
                  <div className="text-[10px] sm:text-xs font-medium text-slate-500 leading-tight mt-0.5">Flash invalid moves instantly</div>
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
            <div className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isSoundEnabled ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <span className="material-icons">{isSoundEnabled ? 'volume_up' : 'volume_off'}</span>
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Sound Effects</div>
                  <div className="text-[10px] sm:text-xs font-medium text-slate-500 leading-tight mt-0.5">Play sounds on interaction</div>
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
