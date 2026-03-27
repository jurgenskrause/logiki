import React, { useState, useEffect } from 'react';
import { DifficultyMenu } from './DifficultyMenu';
import { GameBoard } from './GameBoard';
import { ManifestLoader, type PuzzleManifest } from '../../engine/ManifestLoader';

const loader = new ManifestLoader();

export const GamePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(0); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [puzzle, setPuzzle] = useState<PuzzleManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial Load of Manifest
  useEffect(() => {
    const initLoader = async () => {
      try {
        await loader.loadFromUrl('/daily.bin');
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load game manifest.');
        setIsLoading(false);
      }
    };
    initLoader();
  }, []);

  // 2. Fetch Specific Puzzle when difficulty changes
  useEffect(() => {
    const fetchPuzzle = async () => {
      if (isLoading) return;
      
      setIsLoading(true);
      try {
        // For demonstration, we use a fixed date that matches our packer script's first entry
        // In production, this would be new Date().toISOString().split('T')[0]
        const dateStr = '2026-03-30'; 
        const difficulty = selectedDifficulty === 0 ? 3 : selectedDifficulty; // Daily = Level 3 (6x6)
        
        const data = await loader.getPuzzle(dateStr, difficulty);
        if (data) {
          setPuzzle(data);
        } else {
          setError('Puzzle not found for this date/difficulty.');
        }
      } catch (err) {
        setError('Error fetching puzzle data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPuzzle();
  }, [selectedDifficulty, isLoading === false]); // Trigger when loader ready or difficulty changes

  // Sync dark mode state
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // If loading or error, show a placeholder
  if (isLoading && !puzzle) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Loading Daily Pulse...</p>
        </div>
      </div>
    );
  }

  const rows = puzzle?.rows ?? 5;
  const cols = puzzle?.cols ?? 5;
  const subColumns = Math.ceil(cols / 2);
  const gameKey = `${rows}-${cols}-${selectedDifficulty}`;

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
          <button className="w-8 h-4 bg-slate-300 dark:bg-slate-700 rounded-full relative shadow-inner transition-colors">
            <div className="w-3 h-3 bg-white rounded-full absolute left-0.5 top-0.5 shadow transition-all duration-200"></div>
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
          <div className="flex-1 flex items-center justify-center p-0 min-h-0 relative shrink-0 overflow-hidden" style={{ containerType: 'size' }}>
            {puzzle && (
              <GameBoard 
                key={gameKey} 
                rows={puzzle.rows} 
                cols={puzzle.cols} 
                subColumns={subColumns} 
              />
            )}
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

        {/* Right Column (3.2.1.2): Horizontal Clues Area */}
        <div className="w-[300px] h-full bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 shrink-0 flex flex-col shadow-inner overflow-hidden">
          <div className="text-center mb-4">
            <span className="material-icons text-2xl text-slate-300 dark:text-slate-700 mb-1 block">table_rows</span>
            <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Horizontal & Vertical Clues</span>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {puzzle?.clues.map((clue, idx) => (
              <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 font-mono text-[10px] leading-relaxed">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-indigo-500 font-bold">{clue.type}</span>
                  <span className="text-slate-400 font-normal">#{idx + 1}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  {clue.params.map((p, i) => (
                    <span key={i}>
                      (R{p.row}, I{p.item}){i < clue.params.length - 1 ? ' ↔ ' : ''}
                    </span>
                  ))}
                  {clue.targetCol !== undefined && (
                    <span className="ml-1 text-emerald-500 font-bold">@Col {clue.targetCol}</span>
                  ) }
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </main>
    </div>
  );
};
