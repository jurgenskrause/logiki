import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DifficultyMenu } from './DifficultyMenu';
import { GameBoard } from './GameBoard';
import { ManifestLoader, type PuzzleManifest } from '../../engine/ManifestLoader';
import { GameState } from '../../engine/GameState';
import { HorizontalClueList } from './clue/HorizontalClueList';
import { VerticalClueList } from './clue/VerticalClueList';
import { analyzeState, applyHint, type HintResult } from '../../engine/HintService';

const loader = new ManifestLoader();

export const GamePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [puzzle, setPuzzle] = useState<PuzzleManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManifestLoaded, setIsManifestLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Hint system
  const [activeHint, setActiveHint] = useState<HintResult | null>(null);
  const [hintShowing, setHintShowing] = useState(false);


  // ─── GameState ──────────────────────────────────────────────────────────────

  const gameState = useMemo(() => {
    if (!puzzle) return null;
    const gs = new GameState(puzzle.rows, puzzle.cols);
    puzzle.clues.forEach((clue: any) => {
      if (clue.type === 'ANCHOR' && clue.targetCol !== undefined && clue.params?.[0]) {
        const { row, item } = clue.params[0];
        gs.confirmCell(row, clue.targetCol, item);
      }
    });
    // @ts-ignore — clear history so anchors cannot be undone
    gs._undoStack = [];
    return gs;
  }, [puzzle]);

  // ─── Analysis ───────────────────────────────────────────────────────────────

  const runAnalysis = useCallback(() => {
    if (!gameState || !puzzle) return;
    const result = analyzeState(gameState, puzzle.clues);

    if (result.isContradiction) {
      gameState.markError();
    } else if (gameState.isError) {
      gameState.clearError();
    }

    setActiveHint(result.hint);
    // If the hint changed while showing, dismiss the banner
    setHintShowing(false);
  }, [gameState, puzzle]);

  // ─── Loaders ────────────────────────────────────────────────────────────────

  useEffect(() => {
    loader.loadFromUrl('/daily.bin')
      .then(() => {
        setIsManifestLoaded(true);
        setIsLoading(false);
      })
      .catch(() => {
        setLoadError('Failed to load game manifest.');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isManifestLoaded) return;

    // We keep track of individual puzzle loads
    const t = setTimeout(async () => {
      setIsLoading(true);
      const dateStr = '2026-03-30';
      const difficulty = selectedDifficulty === 0 ? 1 : selectedDifficulty;

      try {
        const data = await loader.getPuzzle(dateStr, difficulty);
        if (data) {
          setActiveHint(null);
          setHintShowing(false);
          setPuzzle(data);
        } else {
          setLoadError('Puzzle not found.');
        }
      } catch (err) {
        setLoadError('Error fetching puzzle.');
      } finally {
        setIsLoading(false);
      }
    }, 50);

    return () => clearTimeout(t);
  }, [selectedDifficulty, isManifestLoaded]);

  // Run initial analysis when puzzle loads
  useEffect(() => {
    if (!gameState || !puzzle) return;
    const t = setTimeout(runAnalysis, 150);
    return () => clearTimeout(t);
  }, [gameState, puzzle]);

  // Dark mode sync
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // ─── State-Change Handler ────────────────────────────────────────────────────

  const handleStateChange = useCallback(() => {
    setTick(t => t + 1);
    setTimeout(runAnalysis, 50);
  }, [runAnalysis]);

  // ─── Hint Button Logic ───────────────────────────────────────────────────────

  const handleHintClick = () => {
    if (!activeHint) return;

    if (!hintShowing) {
      // First click: show banner + highlight
      setHintShowing(true);
    } else {
      // Second click: apply the hint
      if (gameState) {
        applyHint(gameState, activeHint.action);
      }
      setHintShowing(false);
      handleStateChange();
    }
  };

  // ─── Derived hint highlight data ─────────────────────────────────────────────

  const hintHighlights = useMemo(() => {
    if (!activeHint || !hintShowing) return [];
    return [{
      cellId: activeHint.action.cellId,
      items: [{
        id: activeHint.action.itemIndex,
        color: activeHint.action.type === 'confirm' ? 'green' as const : 'red' as const,
      }],
    }];
  }, [activeHint, hintShowing]);

  // ─── Renders ─────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white p-8">
        <div className="text-center space-y-4">
          <span className="material-icons text-red-500 text-6xl">error_outline</span>
          <p className="text-xl font-bold">{loadError}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-800 rounded-xl font-bold hover:bg-slate-700 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (isLoading && !puzzle) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Loading puzzle...</p>
        </div>
      </div>
    );
  }

  const rows = puzzle?.rows ?? 5;
  const cols = puzzle?.cols ?? 5;
  const subColumns = Math.ceil(cols / 2);
  const gameKey = `${rows}-${cols}-${selectedDifficulty}`;
  const hasError = gameState?.isError ?? false;

  // Hint button variants
  const hintBtnClass = !activeHint
    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed opacity-50'
    : hintShowing
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 ring-1 ring-emerald-400'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800';

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300
      ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>

      {/* Difficulty menu */}
      {isMenuOpen && (
        <DifficultyMenu
          onSelect={level => { setSelectedDifficulty(level); setIsMenuOpen(false); }}
          onClose={() => setIsMenuOpen(false)}
        />
      )}



      {/* Header — single row: Left | Hint text (center) | Right */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">

        {/* Left buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onBack}
            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm font-bold shadow-sm">
            ← Back
          </button>
          <button onClick={() => setIsMenuOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 hover:bg-indigo-200 transition-colors text-sm font-bold shadow-sm flex items-center gap-1">
            <span className="material-icons text-sm">tune</span>
            {selectedDifficulty > 0 ? `Level ${selectedDifficulty}` : 'Daily'}
          </button>
          <button onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center">
            <span className="material-icons text-sm">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
        </div>

        {/* Center: hint text when showing, game title otherwise */}
        <div className="flex-1 min-w-0 flex items-center justify-center">
          {hintShowing && activeHint ? (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 max-w-full overflow-hidden shadow-sm">
              {activeHint.action.type === 'confirm' && (
                <span className="material-icons text-lg shrink-0 text-emerald-500">
                  check_circle
                </span>
              )}
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug truncate">
                {activeHint.text}
              </p>
            </div>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 select-none">Logiki</span>
          )}
        </div>

        {/* Right: Error dot + Hint + Undo */}
        <div className="flex items-center gap-2 shrink-0">
          {hasError && (
            <div title="Contradiction detected — undo to fix">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-red-300 dark:ring-red-700" />
            </div>
          )}
          <button
            onClick={handleHintClick}
            disabled={!activeHint}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm transition-all shadow-sm ${hintBtnClass}`}>
            <span className="material-icons text-base">
              {hintShowing ? 'check' : 'lightbulb'}
            </span>
            {hintShowing ? 'Apply' : 'Hint'}
          </button>
          <button
            onClick={() => {
              if (gameState && gameState.undoStackLength > 0) {
                gameState.undo();
                if (gameState.isError) gameState.clearError();
                setHintShowing(false);
                handleStateChange();
              }
            }}
            disabled={!gameState || gameState.undoStackLength === 0}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm transition-colors shadow-sm ${
              gameState && gameState.undoStackLength > 0
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed opacity-50'
            }`}>
            <span className="material-icons text-base">undo</span>
            Undo
          </button>
        </div>
      </header>



      {/* Main */}
      <main className="flex-1 flex overflow-hidden">

        {/* Left: Board + Vertical Clues */}
        <div className="flex-1 flex flex-col overflow-hidden">
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
                hintHighlights={hintHighlights}
              />
            )}
          </div>

          <div className="h-auto min-h-[120px] max-h-[45%] bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 flex flex-col shadow-inner">
            <div className="text-center py-2 border-b border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-[9px] block">Vertical Constraints</span>
            </div>
            <div className="flex-1 overflow-hidden">
              {puzzle && <VerticalClueList clues={puzzle.clues.filter(c => c.type !== 'ANCHOR')} />}
            </div>
          </div>
        </div>

        {/* Right: Horizontal Clues */}
        <div className="w-auto h-full bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shrink-0 flex flex-col shadow-inner">
          <div className="text-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30">
            <span className="material-icons text-xl text-slate-400 dark:text-slate-600 mb-1 block">swap_horiz</span>
            <span className="text-slate-500 font-bold uppercase tracking-widest text-[9px] block">Horizontal Data</span>
          </div>
          <div className="flex-1 overflow-hidden">
            {puzzle && <HorizontalClueList clues={puzzle.clues.filter(c => c.type !== 'ANCHOR')} />}
          </div>
        </div>

      </main>
    </div>
  );
};
