import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DifficultyMenu } from './DifficultyMenu';
import { GameBoard } from './GameBoard';
import { ManifestLoader, type PuzzleManifest } from '../../engine/ManifestLoader';
import { GameState } from '../../engine/GameState';
import { HorizontalClueList } from './clue/HorizontalClueList';
import { VerticalClueList } from './clue/VerticalClueList';
import { analyzeState, applyHint, type HintResult } from '../../engine/HintService';
import { describeRule } from '../../engine/ClueDescriber';

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

  // Hint & Cascade system
  const [activeHint, setActiveHint] = useState<HintResult | null>(null);
  const [hintShowing, setHintShowing] = useState(false);
  const [hoveredClueText, setHoveredClueText] = useState<string | null>(null);
  const [isCascading, setIsCascading] = useState(false);
  const cascadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Warning System & Hint Counter
  const [warningsEnabled, setWarningsEnabled] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [flashRed, setFlashRed] = useState(false);

  const triggerRedFlash = useCallback(() => {
    setFlashRed(true);
    setTimeout(() => setFlashRed(false), 500);
  }, []);

  // Clue Bin state
  const [binnedClueIds, setBinnedClueIds] = useState<Set<string>>(new Set());
  const [showBin, setShowBin] = useState(false);

  // Mobile Drawer Tab Navigation
  const [activeMobileTab, setActiveMobileTab] = useState<'horizontal' | 'vertical'>('horizontal');




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

  const handleToggleBin = useCallback((clueId: string) => {
    setBinnedClueIds(prev => {
      const isBinning = !prev.has(clueId);

      // Warning System: Prevent binning if any item in the clue is unsolved
      if (warningsEnabled && isBinning && gameState && puzzle) {
        const clue = puzzle.clues.find(c => c.id === clueId);
        if (clue) {
          const allResolved = clue.params.every(p => gameState.isItemConfirmed(p.row, p.item));
          if (!allResolved) {
            triggerRedFlash();
            setHintCount(c => c + 1);
            return prev; // Prevent the binning action
          }
        }
      }

      const next = new Set(prev);
      if (isBinning) next.add(clueId);
      else next.delete(clueId);
      return next;
    });
  }, [warningsEnabled, gameState, puzzle, triggerRedFlash]);

  // ─── Analysis ───────────────────────────────────────────────────────────────

  const runAnalysis = useCallback(() => {
    if (!gameState || !puzzle) return;
    const result = analyzeState(gameState, puzzle.clues);

    if (result.isContradiction) {
      gameState.markError();
      setActiveHint({
        clue: { id: 'error', type: 'error', params: [] },
        action: { 
          type: 'confirm', // Use a valid type but we handle 'RESTORE' text match or extra field
          cellId: 'restore',
          row: 0, 
          col: 0, 
          itemIndex: 0 
        } as any, // Cast to any to bypass 'RESTORE' type restriction
        text: "Restore to last correct state"
      });
      // Set the special restore type after the cast so our handler is clean
      // @ts-ignore
      setActiveHint(prev => prev ? { ...prev, action: { ...prev.action, type: 'RESTORE' } } : null);
    } else {
      if (gameState.isError) gameState.clearError();
      setActiveHint(result.hint);
    }

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

  // ─── Cascade Handler ────────────────────────────────────────────────────────
  
  const runCascade = useCallback(() => {
    if (!gameState) return;
    
    // Find the next obvious step
    const nextTraces = gameState.findAndApplyNextDeduction();
    
    if (nextTraces) {
      setTick(t => t + 1); // Force board re-render
      // Schedule next step with a delay for visual satisfaction
      cascadeTimerRef.current = setTimeout(runCascade, 250);
    } else {
      setIsCascading(false);
      // Once cascade finishes, run a deep analysis for the next hint
      setTimeout(runAnalysis, 50);
    }
  }, [gameState, runAnalysis]);

  const handleStateChange = useCallback(() => {
    if (cascadeTimerRef.current) clearTimeout(cascadeTimerRef.current);
    
    // Warning System: Prevent moves that make the puzzle unsolvable
    if (warningsEnabled && gameState && puzzle) {
      const activeClues = puzzle.clues.filter(c => !binnedClueIds.has(c.id));
      const result = analyzeState(gameState, activeClues);
      if (!result.isSolvable) {
        gameState.undo();
        triggerRedFlash();
        setHintCount(c => c + 1);
        setTick(t => t + 1); // Force board re-render to reflect undo
        return; // Prevent cascade and further action
      }
    }
    
    setTick(t => t + 1);
    setIsCascading(true);
    // Start the chain reaction
    cascadeTimerRef.current = setTimeout(runCascade, 250);
  }, [runCascade, warningsEnabled, gameState, puzzle, binnedClueIds, triggerRedFlash]);

  // ─── Hint Button Logic ───────────────────────────────────────────────────────

  const handleHintClick = () => {
    if (!activeHint) return;
    if (isCascading) return; // Prevent hint clicks during animation

    if (!hintShowing) {
      // First click: show banner + highlight
      setHintShowing(true);
      setHintCount(c => c + 1);
    } else {
      // Second click: apply the hint
      if (gameState) {
        if (activeHint.action.type === ('RESTORE' as any)) {
          gameState.restoreToLastValid();
        } else {
          applyHint(gameState, activeHint.action);
        }
        // Important: this trigger handles state change AND analysis AFTER the cascade
        handleStateChange();
      }
      setHintShowing(false);
    }
  };


  // ─── Derived hint highlight data ─────────────────────────────────────────────

  const hintHighlights = useMemo(() => {
    if (!activeHint || !hintShowing || (activeHint.action.type as any) === 'RESTORE') return [];
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
      <header className="flex items-center gap-3 px-4 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 shrink-0">

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

        {/* Center: hover text, hint text, or title */}
        <div className="flex-1 min-w-0 flex items-center justify-center">
          {hoveredClueText ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 max-w-full overflow-hidden shadow-sm animate-in fade-in zoom-in duration-200">
              <span className="material-icons text-base shrink-0 text-blue-500">info</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug truncate">
                {hoveredClueText}
              </p>
            </div>
          ) : hintShowing && activeHint ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 max-w-full overflow-hidden shadow-sm">
              {activeHint.action.type === 'confirm' && (
                <span className="material-icons text-base shrink-0 text-emerald-500">
                  check_circle
                </span>
              )}
              {activeHint.action.type === ('RESTORE' as any) && (
                <span className="material-icons text-base shrink-0 text-amber-500">
                  history
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

        {/* Right: Hint + Undo */}
        <div className="flex items-center gap-2 shrink-0">
          
          <label className="flex items-center gap-1.5 cursor-pointer text-sm font-bold text-slate-500 dark:text-slate-400 select-none mr-2">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={warningsEnabled} onChange={e => setWarningsEnabled(e.target.checked)} />
              <div className={`block w-8 h-5 rounded-full transition-colors ${warningsEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${warningsEnabled ? 'transform translate-x-3' : ''}`}></div>
            </div>
            Warning
          </label>
          
          <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2 h-9 text-sm font-bold text-slate-500 shadow-sm mr-2" title="Hints & Warnings Used">
            ★ {hintCount}
          </div>

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
            onClick={() => setShowBin(!showBin)}
            className={`relative p-2 rounded-lg flex items-center justify-center transition-colors shadow-sm ${
              showBin 
                ? 'bg-amber-500 text-white shadow-inner ring-2 ring-amber-300' 
                : binnedClueIds.size > 0
                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-300'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
            }`}
            title={showBin ? "Show Active Clues" : "Show Binned Clues"}
          >
            <span className="material-icons text-base">{showBin ? 'visibility' : 'delete_outline'}</span>
            {binnedClueIds.size > 0 && !showBin && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[10px] items-center justify-center text-white font-bold leading-none">
                  {binnedClueIds.size}
                </span>
              </span>
            )}
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
      <main className="flex-1 grid grid-cols-1 grid-rows-[minmax(0,1fr)_auto_auto] md:grid-cols-[minmax(0,1fr)_auto] md:grid-rows-[minmax(0,1fr)_auto] overflow-hidden">

        {/* Row 1 (Mobile) / Col 1 Row 1 (Desktop): Board */}
        <div className="col-start-1 row-start-1 min-h-0 min-w-0 flex items-center justify-center p-0 relative overflow-hidden" style={{ containerType: 'size' }}>
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
              isLocked={isCascading}
              flashRed={flashRed}
            />
          )}
        </div>

        {/* Row 2 (Mobile Only): Swappable Drawer Tabs */}
        <div className="col-start-1 row-start-2 md:hidden flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-sm z-20 shrink-0">
          <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1 w-full gap-1 shadow-inner">
            <button 
              onClick={() => setActiveMobileTab('horizontal')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                activeMobileTab === 'horizontal' 
                  ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              Horizontal
            </button>
            <button 
              onClick={() => setActiveMobileTab('vertical')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                activeMobileTab === 'vertical' 
                  ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
               Vertical
            </button>
          </div>
        </div>

        {/* Row 3 (Mobile) / Col 2 Row 1-span-2 (Desktop): Horizontal Clues */}
        <div className={`col-start-1 row-start-3 md:col-start-2 md:row-start-1 md:row-span-2 min-h-[min-content] md:h-full bg-slate-100 dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 shrink-0 shadow-inner z-10 w-full md:w-auto ${
          activeMobileTab === 'horizontal' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
        }`}>
          <div className="flex-1 overflow-y-auto overflow-x-hidden md:overflow-x-auto md:overflow-y-hidden relative custom-scrollbar">
            {showBin && (
                <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-tighter text-amber-600 dark:text-amber-400 pointer-events-none">
                  Binned
                </div>
              )}
            {puzzle && (
              <HorizontalClueList 
                clues={puzzle.clues.filter(c => 
                  c.type !== 'ANCHOR' && 
                  (showBin ? binnedClueIds.has(c.id) : !binnedClueIds.has(c.id))
                )} 
                onClueHover={(c) => setHoveredClueText(c ? describeRule(c) : null)}
                highlightedClue={hintShowing && activeHint ? activeHint.clue : null}
                onClueToggleBin={handleToggleBin}
                binnedIds={binnedClueIds}
              />
            )}
          </div>
        </div>

        {/* Row 3 (Mobile) / Col 1 Row 2 (Desktop): Vertical Clues */}
        <div className={`col-start-1 row-start-3 md:col-start-1 md:row-start-2 h-auto min-h-[120px] max-h-[35vh] md:max-h-[45vh] bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 shadow-inner z-10 w-full ${
          activeMobileTab === 'vertical' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
        }`}>
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar">
            {showBin && (
              <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-tighter text-amber-600 dark:text-amber-400 pointer-events-none">
                Binned Clues
              </div>
            )}
            {puzzle && (
              <VerticalClueList 
                clues={puzzle.clues.filter(c => 
                  c.type !== 'ANCHOR' && 
                  (showBin ? binnedClueIds.has(c.id) : !binnedClueIds.has(c.id))
                )} 
                onClueHover={(c) => setHoveredClueText(c ? describeRule(c) : null)}
                highlightedClue={hintShowing && activeHint ? activeHint.clue : null}
                onClueToggleBin={handleToggleBin}
                binnedIds={binnedClueIds}
              />
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

