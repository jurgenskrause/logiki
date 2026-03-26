import React, { useState, useEffect } from 'react';
import { DifficultyMenu } from './DifficultyMenu';
import { GameBoard } from './GameBoard';

export const GamePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Default to 0 for daily puzzle implicitly, or just default to 5. Let's start with 0 for Daily.
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(0); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Sync dark mode state with root element for Tailwind dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // For the demonstration, we'll use a 5x5 grid with 3 sub-columns (6 options)
  const rows = 5;
  const cols = 5;
  const subColumns = 3;

  return (
    // 1. The Global Container
    <div className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Difficulty Menu Modal Overlay */}
      {isMenuOpen && (
        <DifficultyMenu 
          onSelect={(level) => {
            setSelectedDifficulty(level);
            setIsMenuOpen(false);
          }} 
          onClose={() => setIsMenuOpen(false)}
        />
      )}
      
      {/* 2. Section 3.1: The Persistent Header */}
      <header className="flex justify-between items-center h-fit p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
             className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm font-bold shadow-sm"
          >
            ← Back to Tools
          </button>

          <button 
            onClick={() => setIsMenuOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors text-sm font-bold shadow-sm flex items-center gap-1"
          >
            <span className="material-icons text-sm">tune</span>
            {selectedDifficulty > 0 ? `Level ${selectedDifficulty}` : 'Daily Puzzle'}
          </button>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center"
            title="Toggle Night Mode"
          >
            <span className="material-icons text-sm">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Warnings</span>
            <button className="w-8 h-4 bg-slate-300 dark:bg-slate-700 rounded-full relative shadow-inner">
              <div className="w-3 h-3 bg-white rounded-full absolute left-0.5 top-0.5 shadow"></div>
            </button>
          </div>
        </div>
        
        <button className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center gap-2 font-bold text-sm transition-colors shadow-sm">
          <span className="material-icons text-base">undo</span>
          Undo
        </button>
      </header>

      {/* 3. Section 3.2: The Main Game Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Column (3.2.1.1): Game Board and Vertical Clues */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Top Row (3.2.1.1.1): The Game Board Area */}
          <div className="flex-1 flex items-center justify-center p-0 min-h-0 relative">
            <GameBoard rows={rows} cols={cols} subColumns={subColumns} />
          </div>

          {/* Bottom Row (3.2.1.1.2): Vertical Clues */}
          {/* h-auto + min-height ensures it grows if needed but doesn't crush the board entirely */}
          <div className="h-1/4 min-h-[140px] max-h-[40%] bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shrink-0 flex items-center justify-center shadow-inner overflow-hidden">
            <div className="text-center">
              <span className="material-icons text-2xl text-slate-300 dark:text-slate-700 mb-1 block">view_column</span>
              <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Vertical Clues</span>
            </div>
          </div>
        </div>

        {/* Right Column (3.2.1.2): Horizontal Clues */}
        {/* Changed from w-1/4 to w-auto to scale around inner content. Using max-w-[40%] to prevent it from eating the board on weird clue sets. */}
        <div className="w-auto min-w-[120px] max-w-[40%] h-full bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 shrink-0 flex flex-col items-center justify-center shadow-inner overflow-hidden">
          <div className="text-center px-4">
            <span className="material-icons text-2xl text-slate-300 dark:text-slate-700 mb-1 block">table_rows</span>
            <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Horizontal Clues</span>
            <div className="mt-4 p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
               <span className="text-[10px] text-slate-400">Dynamic Width</span>
            </div>
          </div>
        </div>
        
      </main>
    </div>
  );
};
