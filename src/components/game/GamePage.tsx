import React, { useState, useEffect, useRef } from 'react';
import { DifficultyMenu } from './DifficultyMenu';
import { GameBoard } from './GameBoard';
import { ManifestLoader, type PuzzleManifest } from '../../engine/ManifestLoader';
import { GameState } from '../../engine/GameState';
import { HorizontalClueList } from './clue/HorizontalClueList';
import { VerticalClueList } from './clue/VerticalClueList';
import { analyzeState, type HintResult } from '../../engine/HintService';

const loader = new ManifestLoader();

export const GamePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(0); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [puzzle, setPuzzle] = useState<PuzzleManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Hint system state
  const [activeHint, setActiveHint] = useState<HintResult | null>(null);
  const [flashCells, setFlashCells] = useState<string[]>([]);
  const [showHintBanner, setShowHintBanner] = useState(false);
  const hintBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gameState = React.useMemo(() => {
    if (!puzzle) return null;
    const gs = new GameState(puzzle.rows, puzzle.cols);
    puzzle.clues.forEach((clue: any) => {
      if (clue.type === 'ANCHOR' && clue.targetCol !== undefined) {
        if (clue.params && clue.params[0]) {
          const { row, item } = clue.params[0];
          gs.confirmCell(row, clue.targetCol, item);
        }
      }
    });
    // @ts-ignore - clear history to prevent undoing anchors
    gs._undoStack = [];
    return gs;
  }, [puzzle]);

  // Run hint analysis after every move (tick changes)
  const runAnalysis = React.useCallback(() => {
    if (!gameState || !puzzle) return;
    const result = analyzeState(gameState, puzzle.clues);

    if (result.isContradiction) {
      gameState.markError();
    } else if (gameState.isError) {
      gameState.clearError();
    }

    setActiveHint(result.hint);
  }, [gameState, puzzle]);

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
        const dateStr = '2026-03-30'; 
        const difficulty = selectedDifficulty === 0 ? 3 : selectedDifficulty;
        
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
  }, [selectedDifficulty, isLoading === false]);

  // 3. Run initial analysis when puzzle/gameState is ready
  useEffect(() => {
    if (gameState && puzzle) {
      // Small defer so state settles
      const t = setTimeout(() => runAnalysis(), 100);
      return () => clearTimeout(t);
    }
  }, [gameState, puzzle]);

  // Sync dark mode state
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleHintClick = () => {
    if (!activeHint) return;
    // Flash affected cells
    setFlashCells([...activeHint.affectedCells]);
    setShowHintBanner(true);

    // Auto-hide banner after 4s
    if (hintBannerTimerRef.current) clearTimeout(hintBannerTimerRef.current);
    hintBannerTimerRef.current = setTimeout(() => {
      setShowHintBanner(false);
      setFlashCells([]);
    }, 4000);
  };

  const handleStateChange = () => {
    setTick(t => t + 1);
    // Re-analyse after a brief frame so GameState has settled
    setTimeout(() => runAnalysis(), 50);
  };

  // If loading or error, show a placeholder
  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white p-8">
        <div className="text-center space-y-4">
          <span className="material-icons text-red-500 text-6xl">error_outline</span>
          <p className="text-xl font-bold">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-800 rounded-xl font-bold hover:bg-slate-700 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

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
  const hasError = gameState?.isError ?? false;

  return (
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
      
      {/* Hint Banner — top-center overlay */}
      {showHintBanner && activeHint && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="px-5 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 shadow-xl max-w-sm text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="material-icons text-amber-500 text-base">lightbulb</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Hint</span>
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">{activeHint.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-center h-fit p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm font-bold shadow-sm"
          >
            ← Back
          </button>

          <button 
            onClick={() => setIsMenuOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors text-sm font-bold shadow-sm flex items-center gap-1"
          >
            <span className="material-icons text-sm">tune</span>
            {selectedDifficulty > 0 ? `Level ${selectedDifficulty}` : 'Daily'}
          </button>

          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center"
            title="Toggle Night Mode"
          >
            <span className="material-icons text-sm">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
        </div>

        {/* Center: Hint Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleHintClick}
            disabled={!activeHint}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm transition-all shadow-sm ${
              activeHint
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800 hover:shadow-md'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <span className="material-icons text-base">lightbulb</span>
            Hint
          </button>
        </div>

        {/* Right: Undo + Error dot */}
        <div className="flex items-center gap-2">
          {hasError && (
            <div className="relative flex items-center" title="A contradiction was detected in the current board state.">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-red-300 dark:ring-red-700" />
            </div>
          )}
          <button 
            onClick={() => {
              if (gameState && gameState.undoStackLength > 0) {
                gameState.undo();
                if (gameState.isError) gameState.clearError();
                handleStateChange();
              }
            }}
            disabled={!gameState || gameState.undoStackLength === 0}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm transition-colors shadow-sm ${
              gameState && gameState.undoStackLength > 0
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <span className="material-icons text-base">undo</span>
            Undo
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Game Board + Vertical Clues */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Game Board */}
          <div className="flex-1 flex items-center justify-center p-0 min-h-0 relative shrink-0 overflow-hidden" style={{ containerType: 'size' }}>
            {puzzle && gameState && (
              <GameBoard 
                key={gameKey} 
                rows={puzzle.rows} 
                cols={puzzle.cols} 
                subColumns={subColumns} 
                clues={puzzle.clues}
                gameState={gameState}
                onStateChange={handleStateChange}
                flashCells={flashCells}
              />
            )}
          </div>

          {/* Vertical Clues */}
          <div className="h-auto min-h-[120px] max-h-[45%] bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 flex flex-col shadow-inner transition-all duration-300">
             <div className="text-center py-2 border-b border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">
                <span className="text-slate-500 font-bold uppercase tracking-widest text-[9px] block">Vertical Constraints</span>
             </div>
             <div className="flex-1 overflow-hidden">
                {puzzle && (
                  <VerticalClueList clues={puzzle.clues.filter(c => c.type !== 'ANCHOR')} />
                )}
             </div>
          </div>
        </div>

        {/* Right Column: Horizontal Clues */}
        <div className="w-auto h-full bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shrink-0 flex flex-col shadow-inner transition-all duration-300">
          <div className="text-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">
            <span className="material-icons text-xl text-slate-400 dark:text-slate-600 mb-1 block">swap_horiz</span>
            <span className="text-slate-500 font-bold uppercase tracking-widest text-[9px] block">Horizontal Data</span>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {puzzle && (
              <HorizontalClueList clues={puzzle.clues.filter(c => c.type !== 'ANCHOR')} />
            )}
          </div>
        </div>
        
      </main>
    </div>
  );
};
