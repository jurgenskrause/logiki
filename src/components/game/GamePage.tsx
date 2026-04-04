import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { DifficultyMenu } from './DifficultyMenu';
import { SideMenu } from './SideMenu';
import { HelpModal } from './HelpModal';
import { GameBoard } from './GameBoard';
import { ManifestLoader, type PuzzleManifest } from '../../engine/ManifestLoader';
import { GameState } from '../../engine/GameState';
import { HorizontalClueList } from './clue/HorizontalClueList';
import { VerticalClueList } from './clue/VerticalClueList';
import { analyzeState, applyHint, type HintResult } from '../../engine/HintService';
import { describeRule } from '../../engine/ClueDescriber';
import type { ActiveClue } from '../../engine/Solver';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable
} from '@dnd-kit/core';
import { HorizontalClueUI } from './clue/HorizontalClueUI';
import { VerticalClueUI } from './clue/VerticalClueUI';
import { buildTopologyLibrary } from '../../engine/PermutationGenerator';
import { TieringService } from '../../engine/TieringService';
import { StructuralSieve } from '../../engine/StructuralSieve';
import eliminateSfx from '../../assets/sounds/eliminate.wav';
import solveSfx from '../../assets/sounds/solve.wav';
import mistakeSfx from '../../assets/sounds/mistake.wav';
import moveClueSfx from '../../assets/sounds/moveclue.wav';
import winSfx from '../../assets/sounds/win.wav';

function seedRNG(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(48271, h) | 0;
    return (h >>> 0) / 4294967296; 
  };
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const matchQueryList = window.matchMedia(query);
    setMatches(matchQueryList.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    matchQueryList.addEventListener('change', handler);
    return () => matchQueryList.removeEventListener('change', handler);
  }, [query]);
  return matches;
}



const DroppableMobileBin = ({ showBin, binnedCount, onToggle }: { showBin: boolean; binnedCount: number; onToggle: () => void }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'bin-drop-mobile' });
  return (
    <button
      ref={setNodeRef}
      onClick={onToggle}
      className={`relative p-2 h-full rounded-lg flex items-center justify-center transition-all shadow-sm ${
        isOver 
          ? 'bg-amber-400 text-white ring-4 ring-amber-300 scale-110 shadow-xl'
          : showBin 
            ? 'bg-amber-500 text-white shadow-inner ring-2 ring-amber-300' 
            : binnedCount > 0
              ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-300'
              : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
      }`}
      title={showBin ? "Show Active Clues" : "Show Binned Clues"}
    >
      <span className="material-icons text-base text-inherit">{showBin ? 'visibility' : 'delete_outline'}</span>
      {binnedCount > 0 && !showBin && (
         <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
           <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[10px] items-center justify-center text-white font-bold leading-none">
             {binnedCount}
           </span>
         </span>
      )}
    </button>
  );
};

const loader = new ManifestLoader();

export const GamePage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [explainedClue, setExplainedClue] = useState<ActiveClue | null>(null);

  const [puzzle, setPuzzle] = useState<PuzzleManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManifestLoaded, setIsManifestLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Timer
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Sound system
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const eliminateAudioRef = useRef<HTMLAudioElement | null>(null);
  const solveAudioRef = useRef<HTMLAudioElement | null>(null);
  const mistakeAudioRef = useRef<HTMLAudioElement | null>(null);
  const moveClueAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSoundRef = useRef<'solve' | 'eliminate' | null>(null);

  useEffect(() => {
    eliminateAudioRef.current = new Audio(eliminateSfx);
    solveAudioRef.current = new Audio(solveSfx);
    mistakeAudioRef.current = new Audio(mistakeSfx);
    moveClueAudioRef.current = new Audio(moveClueSfx);
    winAudioRef.current = new Audio(winSfx);
  }, []);

  const playInteractionSound = useCallback((action?: string) => {
    dismissHint();
    if (!isSoundEnabled) return;

    if (action === 'win') {
      if (winAudioRef.current) {
        winAudioRef.current.currentTime = 0;
        winAudioRef.current.play().catch(() => {});
      }
      return;
    }

    if (action === 'mistake') {
      if (mistakeAudioRef.current) {
        mistakeAudioRef.current.currentTime = 0;
        mistakeAudioRef.current.play().catch(() => {});
      }
      return;
    }

    if (action === 'moveclue') {
      if (moveClueAudioRef.current) {
        moveClueAudioRef.current.currentTime = 0;
        moveClueAudioRef.current.play().catch(() => {});
      }
      return;
    }

    if (action === 'solve') {
      if (solveAudioRef.current) {
        solveAudioRef.current.currentTime = 0;
        solveAudioRef.current.play().catch(() => {});
      }
    } else {
      if (eliminateAudioRef.current) {
        eliminateAudioRef.current.currentTime = 0;
        eliminateAudioRef.current.play().catch(() => {});
      }
    }
  }, [isSoundEnabled]);

  const [isGameWon, setIsGameWon] = useState(false);

  useEffect(() => {
    if (puzzle) {
      setIsGameStarted(false);
      setElapsedSeconds(0);
      setBinnedClueIds(new Set());
      setShowBin(false);
      setHintCount(0);
      setIsGameWon(false);
    }
  }, [puzzle]);

  // Victory Celebration: Fireworks
  useEffect(() => {
    if (isGameWon) {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 110 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.1 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.1 } });
      }, 250);
      
      return () => clearInterval(interval);
    }
  }, [isGameWon]);

  // Hint & Cascade system
  const [activeHint, setActiveHint] = useState<HintResult | null>(null);
  const [hintShowing, setHintShowing] = useState(false);
  const [hoveredClueText, setHoveredClueText] = useState<string | null>(null);
  const [isCascading, setIsCascading] = useState(false);
  const cascadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Warning System & Hint Counter
  const [warningsEnabled, setWarningsEnabled] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(true);
  const [hintCount, setHintCount] = useState(0);
  const [flashRed, setFlashRed] = useState(false);

  const triggerRedFlash = useCallback(() => {
    setFlashRed(true);
    setTimeout(() => setFlashRed(false), 500);
  }, []);

  // Clue Bin state
  const [binnedClueIds, setBinnedClueIds] = useState<Set<string>>(new Set());
  const [showBin, setShowBin] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Mobile Drawer Tab Navigation
  const [activeMobileTab, setActiveMobileTab] = useState<'horizontal' | 'vertical'>('horizontal');
  const [scrollToClueId, setScrollToClueId] = useState<string | null>(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  
  // DND Kit states
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { // For mouse re-order
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, { // For touch: require long press to re-order, allowing quick swipes to scroll
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      }
    })
  );

  const draggedClue = useMemo(() => {
    if (!activeDragId || !puzzle) return null;
    return puzzle.clues.find(c => c.id === activeDragId) || null;
  }, [activeDragId, puzzle]);
  
  const isDraggedHorizontal = draggedClue && ['LEFT_OF', 'ADJACENT', 'SEQUENCE_THREE', 'GAPPED_NOT_MIDDLE', 'GAPPED_EXCLUSION'].includes(draggedClue.type);

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
    // Save the post-anchor state as the initial history entry
    gs.pushHistory();
    gs.saveGoodState();
    return gs;
  }, [puzzle]);

  const handleToggleBin = useCallback((clueId: string) => {
    dismissHint();
    playInteractionSound('moveclue');
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
      gameState.saveGoodState();
      setActiveHint(result.hint);
    }

    // If the hint changed while showing, dismiss the banner
    setHintShowing(false);
  }, [gameState, puzzle]);

  // ─── Loaders ────────────────────────────────────────────────────────────────

  useEffect(() => {
    loader.loadFromUrl(`${import.meta.env.BASE_URL}daily.bin`)
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

    // Immediately hide the board when starting a load or change
    setIsGameStarted(false);
    setIsLoading(true);

    // Give React 150ms to paint the 'Generating...' state to the DOM
    const t = setTimeout(async () => {
      const difficulty = selectedDifficulty === 0 ? 1 : selectedDifficulty;

      const urlParams = new URLSearchParams(window.location.search);
      const isRandom = urlParams.get('random') === 'true';
      const seedParam = urlParams.get('seed') || Math.random().toString(36).substring(2, 9);

      try {
        if (isRandom) {
          const gridSize = difficulty + 3;
          const rng = seedRNG(seedParam);
          const sieve = new StructuralSieve();
          
          const topoReport = buildTopologyLibrary(gridSize, gridSize, false);
          const tiering = new TieringService(topoReport.library);
          tiering.shuffle(rng);
          
          const telemetry = await sieve.generateAsync(
            tiering, 
            gridSize, 
            gridSize, 
            async () => {}, // Sync UI progress hook omitted for performance
            rng
          );

          // Build a matching hash payload so GameState Win conditions can pass
          const solGrid = (telemetry.solution as any).getRawSolution(gridSize, gridSize);
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', solGrid);
          const integrityHash = new Uint8Array(hashBuffer);

          const puzzleData: PuzzleManifest = {
            rows: gridSize,
            cols: gridSize,
            difficulty: difficulty,
            clues: telemetry.clues.map(c => sieve.toActiveClue(c, telemetry.solution as any)),
            integrityHash
          };

          setActiveHint(null);
          setHintShowing(false);
          setPuzzle(puzzleData);
        } else {
          const dateStr = '2026-03-30';
          const data = await loader.getPuzzle(dateStr, difficulty);
          if (data) {
            setActiveHint(null);
            setHintShowing(false);
            setPuzzle(data);
          } else {
            setLoadError('Puzzle not found.');
          }
        }
      } catch (err) {
        setLoadError('Error fetching puzzle.');
      } finally {
        setIsLoading(false);
      }
    }, 150);

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
  
  const checkWin = useCallback(async () => {
    if (!gameState || !puzzle || isGameWon) return;

    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        if (!gameState.isConfirmed(r, c)) return;
      }
    }

    const sol = new Uint8Array(puzzle.rows * puzzle.cols);
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        const mask = gameState.getRawGridValue(r, c);
        sol[r * puzzle.cols + c] = Math.log2(mask);
      }
    }

    const isWin = await loader.verifyWin(sol, puzzle.integrityHash);
    if (isWin) {
      setIsGameWon(true);
      playInteractionSound('win');
    }
  }, [gameState, puzzle, isGameWon, playInteractionSound]);

  const runCascade = useCallback(() => {
    if (!gameState) return;
    
    // Find the next obvious step
    const nextTraces = gameState.findAndApplyNextDeduction();
    
    if (nextTraces) {
      // Play solve sound if this step confirmed a cell
      const hasConfirm = nextTraces.some(t => t.type === 'CONFIRM');
      if (hasConfirm) {
        playInteractionSound('solve');
      }

      setTick(t => t + 1); // Force board re-render
      // Schedule next step with a delay for visual satisfaction
      cascadeTimerRef.current = setTimeout(runCascade, 250);
    } else {
      setIsCascading(false);
      // Cascade complete — save this equilibrium state to history
      gameState.pushHistory();
      checkWin(); // Final check for win
      // Then run a deep analysis for the next hint
      setTimeout(runAnalysis, 50);
    }
  }, [gameState, runAnalysis, playInteractionSound, checkWin]);

  // Timer Ticker
  useEffect(() => {
    if (!isGameStarted || isGameWon) return; 
    const interval = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGameStarted, isGameWon]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStateChange = useCallback(() => {
    if (cascadeTimerRef.current) clearTimeout(cascadeTimerRef.current);
    
    // Warning System: Prevent moves that make the puzzle unsolvable
    if (warningsEnabled && gameState && puzzle) {
      const activeClues = puzzle.clues.filter(c => !binnedClueIds.has(c.id));
      const result = analyzeState(gameState, activeClues);
      if (!result.isSolvable) {
        gameState.revertToCurrentCheckpoint();
        triggerRedFlash();
        playInteractionSound('mistake');
        pendingSoundRef.current = null;
        setHintCount(c => c + 1);
        setTick(t => t + 1);
        return; // Prevent cascade and further action
      }
    }

    // Process pending sound if any (handles manual interactions)
    if (pendingSoundRef.current) {
      playInteractionSound(pendingSoundRef.current);
      pendingSoundRef.current = null;
    }
    
    setTick(t => t + 1);
    setIsCascading(true);
    // Start the chain reaction
    cascadeTimerRef.current = setTimeout(runCascade, 250);
  }, [runCascade, warningsEnabled, gameState, puzzle, binnedClueIds, triggerRedFlash, playInteractionSound]);

  // ─── Hint Button Logic ───────────────────────────────────────────────────────

  const handleHintClick = () => {
    if (!activeHint) return;
    if (isCascading) return; // Prevent hint clicks during animation

    if (!hintShowing) {
      // First click: show banner + highlight
      if (activeHint.clue?.type === 'error') {
        playInteractionSound('mistake');
        triggerRedFlash();
      }
      setHintShowing(true);
      setHintCount(c => c + 1);

      // Auto-focus logic for mobile drawer
      if (activeHint.clue && activeHint.clue.type !== 'error') {
        const isBinned = binnedClueIds.has(activeHint.clue.id);
        if (showBin !== isBinned) setShowBin(isBinned);

        const isHorizontal = ['LEFT_OF', 'ADJACENT', 'SEQUENCE_THREE', 'GAPPED_NOT_MIDDLE', 'GAPPED_EXCLUSION'].includes(activeHint.clue.type);
        const wantedTab = isHorizontal ? 'horizontal' : 'vertical';
        if (activeMobileTab !== wantedTab) setActiveMobileTab(wantedTab);

        setScrollToClueId(activeHint.clue.id);
      }
    } else {
      // Second click: apply the hint
      if (gameState) {
        if (activeHint.action.type === ('RESTORE' as any)) {
          gameState.restoreToLastValid();
        } else {
          pendingSoundRef.current = activeHint.action.type === 'confirm' ? 'solve' : 'eliminate';
          applyHint(gameState, activeHint.action);
        }
        // Important: this trigger handles state change AND analysis AFTER the cascade
        handleStateChange();
      }
      setHintShowing(false);
      setScrollToClueId(null);
    }
  };

  const dismissHint = useCallback(() => {
    if (hintShowing) {
      setHintShowing(false);
      setScrollToClueId(null);
    }
  }, [hintShowing]);


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
  const boardAspectRatio = (cols * subColumns) / (rows * 2);
  const gameKey = `${rows}-${cols}-${selectedDifficulty}`;


  // Hint button variants
  const hintBtnClass = !activeHint
    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed opacity-50'
    : hintShowing
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 ring-1 ring-emerald-400'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveDragId(e.active.id.toString())}
      onDragEnd={(e) => {
        const { active, over } = e;
        if (over && over.id.toString().startsWith('bin-drop')) {
           handleToggleBin(active.id.toString());
        }
        setActiveDragId(null);
      }}
      onDragCancel={() => setActiveDragId(null)}
    >
    <div className={`flex flex-col h-[100dvh] w-screen overflow-hidden transition-colors duration-300
      ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>

      {/* Difficulty menu */}
      {isMenuOpen && (
        <DifficultyMenu
          onSelect={(level, mode) => { 
            const url = new URL(window.location.href);
            if (mode === 'random') {
              url.searchParams.set('random', 'true');
            } else {
              url.searchParams.delete('random');
              url.searchParams.delete('seed');
            }
            window.history.pushState({}, '', url.toString());

            setSelectedDifficulty(level); 
            setIsMenuOpen(false); 
          }}
          onClose={() => setIsMenuOpen(false)}
        />
      )}

      {/* Slide-out Side Menu */}
      {isSideMenuOpen && (
        <SideMenu
          onClose={() => setIsSideMenuOpen(false)}
          onOpenDifficulty={() => setIsMenuOpen(true)}
          onOpenHelp={() => {
            setIsSideMenuOpen(false);
            setIsHelpOpen(true);
          }}
          warningsEnabled={warningsEnabled}
          onToggleWarnings={setWarningsEnabled}
          zoomEnabled={zoomEnabled}
          onToggleZoom={setZoomEnabled}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
          isSoundEnabled={isSoundEnabled}
          onToggleSound={setIsSoundEnabled}
        />
      )}

      {/* Help Modal */}
      {isHelpOpen && (
        <HelpModal onClose={() => setIsHelpOpen(false)} />
      )}

      {/* Clue Explanation Modal */}
      {explainedClue && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" 
          onPointerDown={() => setExplainedClue(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200" 
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <span className="material-icons text-blue-500">info</span>
                Clue Explanation
              </h3>
              <button 
                onClick={() => setExplainedClue(null)} 
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors flex items-center justify-center"
              >
                <span className="material-icons text-base">close</span>
              </button>
            </div>
            <p className="text-slate-700 dark:text-slate-200 mb-8 text-xl sm:text-2xl font-bold leading-relaxed text-center py-6 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-inner">
              {describeRule(explainedClue).split('<nl>').map((line, i) => (
                <span key={i} className="block">{line.trim()}</span>
              ))}
            </p>
            <div className="flex justify-end">
              <button onClick={() => setExplainedClue(null)} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-800 dark:text-slate-200 font-bold transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MOBILE HEADER (Immersive) ====== */}
      <header className="md:hidden relative flex items-center px-2 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-40 shrink-0 overflow-hidden text-left">
        
        {/* LEFT MENU BUTTON */}
        <div className="flex items-center z-10 shrink-0 mr-2">
          <button onClick={() => setIsSideMenuOpen(true)} className="p-3 rounded-xl flex items-center justify-center hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors text-slate-700 dark:text-slate-300">
            <span className="material-icons">menu</span>
          </button>
        </div>

        {/* IMMERSIVE LEFT-ALIGNED TEXT AREA (Mobile) */}
        <div className="flex-1 min-w-0 h-full flex items-center justify-start z-30 pointer-events-none select-none" style={{ containerType: 'inline-size' }}>
          {hintShowing && activeHint ? (
            <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 pr-2 bg-slate-50/95 dark:bg-slate-900/95 rounded shadow-[5px_0_10px_rgba(248,250,252,0.95)] dark:shadow-[5px_0_10px_rgba(15,23,42,0.95)] animate-in fade-in duration-200 pointer-events-auto" style={{ fontSize: 'clamp(10px, 4.5cqw, 14px)' }}>
              {activeHint.text.split('<nl>').map((line, i) => (
                <span key={i} className="block">{line.trim()}</span>
              ))}
            </p>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Logiki</span>
          )}
        </div>

        {/* INTERACTIVE CONTROLS (Z-Indexed Overlay) */}
        <div className="absolute right-2 top-0 bottom-0 flex items-center gap-1.5 z-50">
            {hintShowing && activeHint ? (
               <button
                 onClick={handleHintClick}
                 className="px-5 h-10 rounded-xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/30 animate-in zoom-in duration-200"
               >
                 Apply
               </button>
            ) : (
               <>
                 <button
                   onClick={handleHintClick}
                   disabled={!activeHint}
                   className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${hintBtnClass}`}
                 >
                   <span className="material-icons text-base">lightbulb</span>
                 </button>
                 <button
                   onClick={() => {
                     if (gameState && gameState.canUndo) {
                       gameState.undo();
                       setHintShowing(false);
                       setTick(t => t + 1);
                       setTimeout(runAnalysis, 50);
                     }
                   }}
                   disabled={!gameState || !gameState.canUndo}
                   className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                     gameState && gameState.canUndo
                       ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200'
                       : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 opacity-50 cursor-not-allowed'
                   }`}
                   title="Undo"
                 >
                   <span className="material-icons text-base">undo</span>
                 </button>
                 <button
                   onClick={() => {
                     if (gameState && gameState.canRedo) {
                       gameState.redo();
                       setHintShowing(false);
                       setTick(t => t + 1);
                       setTimeout(runAnalysis, 50);
                     }
                   }}
                   disabled={!gameState || !gameState.canRedo}
                   className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                     gameState && gameState.canRedo
                       ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200'
                       : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 opacity-50 cursor-not-allowed'
                   }`}
                   title="Redo"
                 >
                   <span className="material-icons text-base">redo</span>
                 </button>
                 <div className="ml-1 w-10 flex items-center justify-center font-mono text-[10px] font-black text-slate-400 dark:text-slate-600 shrink-0">
                   {isGameStarted ? formatTime(elapsedSeconds) : '00:00'}
                 </div>
               </>
            )}
          </div>
      </header>
      {/* ====== DESKTOP HEADER ====== */}
      <header className="hidden md:flex relative items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-40 shrink-0 overflow-hidden">
        
        {/* LEFT BUTTON OVERLAY */}
        <div className="flex items-center gap-2 z-10 shrink-0 mr-4">
          <button onClick={() => setIsSideMenuOpen(true)}
            className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center">
            <span className="material-icons text-sm">menu</span>
          </button>
          <button onClick={() => setIsMenuOpen(true)}
            className="px-3 py-2 rounded-xl bg-indigo-100/80 text-indigo-700 dark:bg-indigo-900/80 dark:text-indigo-300 hover:bg-indigo-200 transition-colors text-sm font-bold shadow-sm flex items-center gap-1">
            <span className="material-icons text-sm">tune</span>
            {selectedDifficulty > 0 ? `Level ${selectedDifficulty}` : 'Daily'}
          </button>
          <button onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center"
            title="Toggle Theme">
            <span className="material-icons text-sm">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <button onClick={() => setIsHelpOpen(true)}
            className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center"
            title="How to Play">
            <span className="material-icons text-sm">help_outline</span>
          </button>
        </div>

        {/* IMMERSIVE LEFT-ALIGNED TEXT AREA */}
        <div className="flex-1 min-w-0 h-full flex items-center justify-start z-30 pointer-events-none select-none" style={{ containerType: 'inline-size' }}>
          {hoveredClueText ? (
            <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 pr-4 bg-slate-50/95 dark:bg-slate-900/95 rounded-r shadow-[10px_0_10px_rgba(248,250,252,0.95)] dark:shadow-[10px_0_10px_rgba(15,23,42,0.95)] animate-in fade-in duration-150 pointer-events-auto" style={{ fontSize: 'clamp(12px, 3cqw, 24px)' }}>
              {hoveredClueText.split('<nl>').map((line, i) => (
                <span key={i} className="block">{line.trim()}</span>
              ))}
            </p>
          ) : hintShowing && activeHint ? (
            <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 pr-4 bg-slate-50/95 dark:bg-slate-900/95 rounded-r shadow-[10px_0_10px_rgba(248,250,252,0.95)] dark:shadow-[10px_0_10px_rgba(15,23,42,0.95)] animate-in fade-in slide-in-from-top-1 duration-200 pointer-events-auto" style={{ fontSize: 'clamp(12px, 3cqw, 24px)' }}>
              {activeHint.text.split('<nl>').map((line, i) => (
                <span key={i} className="block">{line.trim()}</span>
              ))}
            </p>
          ) : (
            <span className="text-xs font-bold uppercase tracking-[0.4em] opacity-20 dark:opacity-30">Logiki</span>
          )}
        </div>

        {/* RIGHT BUTTON OVERLAY */}
        <div className="absolute right-4 top-0 bottom-0 flex items-center gap-2 z-50">
          <div className="flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/80 rounded-xl px-2 h-10 text-sm font-bold text-slate-500 shadow-sm" title="Hints & Warnings Used">
            ★ {hintCount}
          </div>
          
          <div className="flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/80 rounded-xl px-3 h-10 font-mono text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm">
            {isGameStarted ? formatTime(elapsedSeconds) : '00:00'}
          </div>

          <button
            onClick={handleHintClick}
            disabled={!activeHint}
            className={`px-4 h-10 rounded-xl flex items-center gap-2 font-bold text-sm transition-all shadow-sm ${hintBtnClass}`}>
            <span className="material-icons text-base">
              {hintShowing ? 'check' : 'lightbulb'}
            </span>
            {hintShowing ? 'Apply' : 'Hint'}
          </button>
          
          <button
            onClick={() => setShowBin(!showBin)}
            className={`relative hidden md:flex p-2.5 rounded-xl items-center justify-center transition-colors shadow-sm ${
              showBin 
                ? 'bg-amber-500 text-white shadow-inner ring-2 ring-amber-300' 
                : binnedClueIds.size > 0
                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-300'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
            }`}
            title={showBin ? "Show Active Clues" : "Show Binned Clues"}
          >
            <span className="material-icons text-base text-inherit">{showBin ? 'visibility' : 'delete_outline'}</span>
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
              if (gameState && gameState.canUndo) {
                gameState.undo();
                setHintShowing(false);
                setTick(t => t + 1);
                setTimeout(runAnalysis, 50);
              }
            }}
            disabled={!gameState || !gameState.canUndo}
            className={`px-4 h-10 rounded-xl flex items-center gap-2 font-bold text-sm transition-all shadow-sm ${
              gameState && gameState.canUndo
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title="Undo"
          >
            <span className="material-icons text-base">undo</span>
            Undo
          </button>
          <button
            onClick={() => {
              if (gameState && gameState.canRedo) {
                gameState.redo();
                setHintShowing(false);
                setTick(t => t + 1);
                setTimeout(runAnalysis, 50);
              }
            }}
            disabled={!gameState || !gameState.canRedo}
            className={`px-4 h-10 rounded-xl flex items-center gap-2 font-bold text-sm transition-all shadow-sm ${
              gameState && gameState.canRedo
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title="Redo"
          >
            <span className="material-icons text-base">redo</span>
            Redo
          </button>
        </div>
      </header>



      {/* Main Game Area Wrapper */}
      <div className="flex-1 relative overflow-hidden">
        {/* 
            The Game Grid:
            1. NO ANIMATION ON START (Must NOT use transition-all or scale here to avoid 'pop-in' or sluggishness)
            2. Fully hidden (opacity-0) until user clicks 'Start' to ensure a smooth, empty initial load.
        */}
        <main className={`w-full h-full flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_auto] md:grid-rows-[minmax(0,1fr)_auto] overflow-hidden ${
          !isGameStarted ? 'blur-[12px] opacity-0 pointer-events-none' : 'blur-0 opacity-100'
        }`}>

        {/* Row 1 (Mobile) / Col 1 Row 1 (Desktop): Board */}
        <div 
          className="w-full flex-none shrink-0 md:flex-1 md:col-start-1 md:row-start-1 md:min-h-0 md:min-w-0 items-start md:items-center justify-center flex p-0 md:p-4 mb-2 md:mb-0 relative overflow-hidden md:w-auto" 
        >
          {puzzle && gameState && (
            <div className="relative flex items-center justify-center max-w-full max-h-full" style={{ aspectRatio: isDesktop ? 'auto' : String(boardAspectRatio), height: isDesktop ? '100%' : 'auto', width: '100%', containerType: 'size' }}>
              <GameBoard
                key={gameKey}
                rows={puzzle.rows}
                cols={puzzle.cols}
                subColumns={subColumns}
                clues={puzzle.clues}
                gameState={gameState}
                onInteraction={(action) => {
                  if (action === 'zoom_trigger') return;
                  pendingSoundRef.current = action === 'solve' ? 'solve' : 'eliminate';
                }}
                onStateChange={() => {
                  dismissHint();
                  handleStateChange();
                }}
                hintHighlights={hintHighlights}
                isLocked={isCascading}
                flashRed={flashRed}
                zoomEnabled={zoomEnabled}
              />
            </div>
          )}
        </div>

        {/* Row 2 (Mobile Only): Swappable Drawer Tabs */}
        <div className="shrink-0 md:col-start-1 md:row-start-2 md:hidden flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-sm z-20 gap-2">
          
          <DroppableMobileBin 
            showBin={showBin} 
            binnedCount={binnedClueIds.size} 
            onToggle={() => { dismissHint(); setShowBin(!showBin); }} 
          />

          <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1 w-full gap-1 shadow-inner">
            <button 
              onClick={() => {
                dismissHint();
                setActiveMobileTab('horizontal');
              }}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                activeMobileTab === 'horizontal' 
                  ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              Horizontal
            </button>
            <button 
              onClick={() => {
                dismissHint();
                setActiveMobileTab('vertical');
              }}
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
        <div 
          title="GamePage: Horizontal Drawer Wrapper"
          className={`min-h-[0px] md:flex-1 md:col-start-2 md:row-start-1 md:row-span-2 md:min-h-0 md:h-full bg-slate-100 dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 shadow-inner w-full md:w-auto flex-col ${
          activeMobileTab === 'horizontal' ? `flex flex-1 z-10 relative visible pointer-events-auto md:h-auto` : 'hidden md:visible md:flex md:pointer-events-auto md:relative md:z-10 md:h-auto'
        }`}>
          <div 
            title="GamePage: Horizontal Drawer Inner Frame"
            className="flex-1 min-h-[0px] flex flex-col overflow-hidden relative md:overflow-x-auto md:overflow-y-hidden"
          >
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
                onClueDoubleTap={setExplainedClue}
                scrollToClueId={scrollToClueId}
                onMoveClue={() => playInteractionSound('moveclue')}
              />
            )}
          </div>
        </div>

        {/* Row 3 (Mobile) / Col 1 Row 2 (Desktop): Vertical Clues */}
        <div 
          title="GamePage: Vertical Drawer Wrapper"
          className={`min-h-[0px] md:flex-1 md:col-start-1 md:row-start-2 md:min-h-0 md:h-full bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-inner w-full flex-col ${
          activeMobileTab === 'vertical' ? `flex flex-1 z-10 relative visible pointer-events-auto md:h-auto` : 'hidden md:visible md:flex md:pointer-events-auto md:relative md:z-10 md:h-auto'
        }`}>
          <div 
            title="GamePage: Vertical Drawer Inner Frame"
            className="flex-1 min-h-[0px] flex flex-col overflow-hidden relative md:overflow-y-auto md:overflow-x-hidden md:custom-scrollbar"
          >
            {showBin && (
              <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-tighter text-amber-600 dark:text-amber-400 pointer-events-none hidden md:block">
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
                onClueDoubleTap={setExplainedClue}
                scrollToClueId={scrollToClueId}
                onMoveClue={() => playInteractionSound('moveclue')}
              />
            )}
          </div>
        </div>

      </main>

        {/* Win Celebration */}
        {isGameWon && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500 p-4">
             <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-4 border-emerald-500 animate-in zoom-in-95 duration-300 max-w-sm w-full">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-lg shadow-emerald-500/20">
                  <span className="material-icons text-5xl">emoji_events</span>
                </div>
                <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent uppercase tracking-tighter">
                  Logic Mastered
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold mb-8">
                  Puzzle completed in {formatTime(elapsedSeconds)}
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/30 transition-all active:scale-95 uppercase tracking-widest text-xs"
                >
                  Next Puzzle
                </button>
             </div>
          </div>
        )}

        {/* Unified Start Puzzle Overlay - Stays Sharp above the blurred main grid */}
        {!isGameStarted && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] pointer-events-none" />
             <div className="relative animate-form-enter">
              <button 
                onClick={() => setIsGameStarted(true)}
                disabled={isLoading}
                className={`px-10 py-5 rounded-3xl font-black text-3xl uppercase tracking-widest border border-white/20 flex flex-col items-center group overflow-hidden transition-all duration-500 bg-gradient-to-br
                  ${isLoading 
                    ? 'from-blue-600/60 to-indigo-700/60 text-white/60 cursor-not-allowed shadow-none backdrop-blur-sm' 
                    : 'from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-[0_20px_50px_rgba(79,70,229,0.4)] hover:shadow-indigo-500/60 transform hover:scale-105 active:scale-95'
                  }`}
              >
                {!isLoading && <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />}
                <span className="relative z-10">{isLoading ? 'Generating...' : 'Start Puzzle'}</span>
                
                {!isLoading && (
                   <>
                     <span className="relative z-10 text-sm font-bold text-white mt-3 uppercase tracking-[0.2em]">
                       Level {selectedDifficulty} // {puzzle?.rows}x{puzzle?.cols}
                     </span>
                     <div className="mt-4 flex gap-1 items-center opacity-60 group-hover:opacity-100 transition-opacity">
                       {[...Array(3)].map((_, i) => (
                         <div key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                       ))}
                     </div>
                   </>
                )}
                
                {isLoading && (
                  <div className="mt-6 mb-2 flex gap-2 items-center opacity-80">
                    <span className="material-icons animate-spin text-white/50 text-2xl">sync</span>
                  </div>
                )}
              </button>
             </div>
          </div>
        )}
      </div>

      {/* DRAG OVERLAY */}
      <DragOverlay zIndex={9999} dropAnimation={null}>
        {draggedClue ? (
          <div className="pointer-events-none drop-shadow-2xl">
            {isDraggedHorizontal ? (
               <HorizontalClueUI clue={draggedClue} isHighlighted={false} />
            ) : (
               <VerticalClueUI clue={draggedClue} isHighlighted={false} />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  );
};

