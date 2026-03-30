import React from 'react';

interface SideMenuProps {
  onClose: () => void;
  onOpenDifficulty: () => void;
  warningsEnabled: boolean;
  onToggleWarnings: (enabled: boolean) => void;
  zoomEnabled: boolean;
  onToggleZoom: (enabled: boolean) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({ 
  onClose, 
  onOpenDifficulty, 
  warningsEnabled, 
  onToggleWarnings,
  zoomEnabled,
  onToggleZoom,
  isDarkMode,
  onToggleDarkMode
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
            Logiki
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
            onClick={onToggleDarkMode}
            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <span className="material-icons">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</div>
              <div className="text-xs font-medium text-slate-500">Toggle theme</div>
            </div>
          </button>

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
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Logiki v0.1 Engine Phase 4
          </p>
        </div>

      </div>
    </>
  );
};
