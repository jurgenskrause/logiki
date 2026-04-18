import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { DifficultyMenu } from './DifficultyMenu';
import { SideMenu } from './SideMenu';
import { HelpModal } from './HelpModal';
import { GameBoard } from './GameBoard';
import { ManifestLoader, type PuzzleManifest } from '../../../shared/engine/ManifestLoader';
import { GameState } from '../../../shared/engine/GameState';
import { HorizontalClueList } from './clue/HorizontalClueList';
import { VerticalClueList } from './clue/VerticalClueList';
import { DistributionChart } from './leaderboard/DistributionChart';
import { analyzeState, applyHint, type HintResult } from '../../../shared/engine/HintService';
import { describeRule } from '../../../shared/engine/ClueDescriber';
import type { ActiveClue } from '../../../shared/engine/Solver';
import type { LeaderboardResponse } from '../../../shared/api';
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
import { buildTopologyLibrary } from '../../../shared/engine/PermutationGenerator';
import { TieringService } from '../../../shared/engine/TieringService';
import { StructuralSieve } from '../../../shared/engine/StructuralSieve';
import eliminateSfx from '../../assets/sounds/eliminate.wav';
import solveSfx from '../../assets/sounds/solve.wav';
import mistakeSfx from '../../assets/sounds/mistake.wav';
import moveClueSfx from '../../assets/sounds/moveclue.wav';
import winSfx from '../../assets/sounds/win.wav';

const DIFF_NAMES: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

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



const DEV_BUILD = true;
export const ENABLE_RANDOM_MODE = true;

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
              ? 'bg-white/10 text-white hover:bg-white/20 shadow-sm'
              : 'bg-black/20 text-white/30 shadow-inner'
      }`}
      disabled={binnedCount === 0 && !showBin}
      title={showBin ? "Show Active Clues" : "Show Binned Clues"}
    >
      <span className="material-icons text-xl md:text-2xl drop-shadow-md text-inherit">{showBin ? 'delete_sweep' : 'delete_outline'}</span>
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

const GlobalDropBin = ({ activeDragId }: { activeDragId: string | null }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'bin-drop-global' });
  return (
    <div
      ref={setNodeRef}
      className={`absolute bottom-4 right-4 md:bottom-8 md:right-8 w-20 h-20 md:w-28 md:h-28 z-[100] rounded-3xl flex items-center justify-center transition-all duration-300 pointer-events-auto ${
        activeDragId
          ? 'opacity-100 translate-y-0 scale-100 shadow-2xl'
          : 'opacity-0 translate-y-12 scale-90 pointer-events-none'
      } ${
        isOver
          ? 'bg-red-500 ring-4 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-900 ring-red-400 rotate-[8deg] shadow-[0_0_30px_rgba(239,68,68,0.5)] text-white'
          : 'bg-white dark:bg-slate-700 shadow-[0_10px_25px_rgba(0,0,0,0.15)] border-2 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300'
      }`}
    >
      <span className={`material-icons transition-transform duration-300 ${isOver ? 'scale-125' : ''} text-4xl md:text-6xl`}>
        delete_sweep
      </span>
    </div>
  );
};

const loader = new ManifestLoader();

const DevMenu = ({ puzzleId, grid }: { puzzleId?: string, grid?: Uint16Array | number[] }) => {
  if (!DEV_BUILD) return null;

  const handleReset = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date') || new Date().toISOString().split('T')[0];

    localStorage.clear(); // Clear all client side local browser caches natively

    /* @ts-expect-error global flag */
    window.__isResetting = true;
    
    // Explicitly kill any pending background auto-saves that might be lingering
    // @ts-expect-error accessing refs dynamically or assuming standard hook behavior is safe since this is a top-level render scope
    if (window.__pendingSyncTimer) clearTimeout(window.__pendingSyncTimer);

    alert('Local browser caches cleared.');
    window.location.reload();
  };

  const handleRandomSubmit = () => {
    const minMs = 500; // "Impossibly good" (will trigger ghosting Sieve > 1500 limit)
    const maxMs = 21600000; // 6 hours

    for (let i = 0; i < 50; i++) {
      // Skew distribution so most scores land in reasonable human bounds (2-15 minutes), 
      // but long tails hit the 6-hour and 500ms boundaries.
      const randomValue = Math.pow(Math.random(), 4);
      const devOverrideTimeMs = Math.floor(minMs + randomValue * (maxMs - minMs));

      fetch('/api/game/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzleId: puzzleId || 'unknown',
          boardState: grid ? Array.from(grid) : [],
          moveLog: [],
          isDevBuild: true,
          devOverrideTimeMs
        })
      }).catch(console.error);
    }
    console.log('50 varied mock payloads fired over network.');
  };

  return (
    <div className="fixed bottom-4 right-4 z-[999] flex gap-2 bg-slate-900/90 p-2 rounded-xl border border-rose-500/30 shadow-2xl">
      <button onClick={handleReset} className="px-3 py-2 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg font-black text-[10px] uppercase">
        💣 Reset
      </button>
      <button onClick={handleRandomSubmit} className="px-3 py-2 bg-blue-600/90 hover:bg-blue-500 text-white rounded-lg font-black text-[10px] uppercase">
        🎲 Random Submit
      </button>
    </div>
  );
};

export const GamePage: React.FC = () => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [explainedClue, setExplainedClue] = useState<ActiveClue | null>(null);
  const [generationTrigger, setGenerationTrigger] = useState(0);

  const [puzzle, setPuzzle] = useState<PuzzleManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManifestLoaded, setIsManifestLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Timer
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedSecondsRef = useRef(0);
  
  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  // Sound system
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const winData = useMemo(() => {
    if (puzzle?.isRandom) return { text: "Logic Mastered", icon: "psychology", isEpicInfo: false };
    if (!leaderboardData || userRank === null) return { text: "Logic Mastered", icon: "psychology", isEpicInfo: false };
    const { totalSolvers } = leaderboardData;
    if ((totalSolvers || 0) <= 1) return { text: "First to Solve!", icon: "rocket_launch", isEpicInfo: true };
    if (userRank === 1) return { text: "World Record!", icon: "emoji_events", isEpicInfo: true };
    if (userRank <= 10) return { text: `Global Top ${userRank}!`, icon: "star", isEpicInfo: true };
    const totalOthers = Math.max(0, (totalSolvers || 1) - 1);
    const perc = totalOthers > 0 ? Math.floor((((totalSolvers || 1) - userRank) / totalOthers) * 100) : 100;
    if (perc >= 99) return { text: "Top 1% Worldwide!", icon: "workspace_premium", isEpicInfo: true };
    if (perc >= 95) return { text: "Top 5% Worldwide!", icon: "military_tech", isEpicInfo: true };
    if (perc >= 90) return { text: "Top 10% Worldwide!", icon: "military_tech", isEpicInfo: true };
    return { text: "Logic Mastered", icon: "psychology", isEpicInfo: false };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderboardData, userRank]);

  const eliminateAudioRef = useRef<HTMLAudioElement | null>(null);
  const solveAudioRef = useRef<HTMLAudioElement | null>(null);
  const mistakeAudioRef = useRef<HTMLAudioElement | null>(null);
  const moveClueAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSoundRef = useRef<'solve' | 'eliminate' | null>(null);

  // Anti-Cheat Telemetry
  const moveLogRef = useRef<{ cellIndex: number; timeOffsetMs: number }[]>([]);
  const penaltyMsRef = useRef<number>(0);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSoundEnabled]);

  const [isGameWon, setIsGameWon] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [isViewingCompletedBoard, setIsViewingCompletedBoard] = useState(false);
  const [isRecoveredWin, setIsRecoveredWin] = useState(false);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [initRoutingState, setInitRoutingState] = useState<'loading' | 'routing' | 'playing'>('loading');

  // Prevent state-bleeding across difficulty swaps
  useEffect(() => {
    setIsGameWon(false);
    setIsViewingCompletedBoard(false);
    setIsRecoveredWin(false);
    setUserRank(null);
    setLeaderboardData(null);
  }, [selectedDifficulty]);

  useEffect(() => {
    if (puzzle) {
      setIsGameStarted(false);
      setElapsedSeconds(0);
      setIsLoading(false);
      setShowBin(false);
      if (gameState) setTimeout(runAnalysis, 50);
      setIsGameWon(false);
      setIsViewingCompletedBoard(false);
      moveLogRef.current = [];
      penaltyMsRef.current = 0;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle]);

  // Victory Celebration: Fireworks
  useEffect(() => {
    if (isGameWon) {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 110 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.1 } });
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
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
  const [showBin, setShowBin] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Mobile Drawer Tab Navigation
  const [activeMobileTab, setActiveMobileTab] = useState<'horizontal' | 'vertical'>('horizontal');
  const [scrollToClueId, setScrollToClueId] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const MIN_BOARD_ICON_SIZE = 12;
  const { isDesktop, clueIconSize, hasMouse, requiredDrawerHeight } = useMemo(() => {
    const hasMouse = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    const isDesk = (!puzzle ? viewport.width >= 768 : (puzzle.rows <= 5 && viewport.width >= 500) || viewport.width >= 768);
    
    let optimalIconSize = 24;
    let finalDrawerHeight = 0;
    if (puzzle) {
       const N = puzzle.rows;
       const itemsPerRow = Math.ceil(Math.sqrt(N));
       const C1 = 0.6 / (N * itemsPerRow);
       const MIN_BOARD_SIZE = MIN_BOARD_ICON_SIZE / C1;
       
       const hClues = puzzle.clues.filter(c => ['LEFT_OF', 'ADJACENT', 'SEQUENCE_THREE', 'GAPPED_NOT_MIDDLE', 'GAPPED_EXCLUSION'].includes(c.type));
       const vClues = puzzle.clues.filter(c => ['VERTICAL', 'VERTICAL_NOT', 'VERTICAL_TRIO', 'VERTICAL_NOT_TRIO', 'DISJUNCTIVE_XOR', 'VERTICAL_DISJUNCTIVE_EXCLUSION'].includes(c.type));
       
       if (isDesk) {
          const maxIcFor3Cols = Math.floor(((viewport.width - 32) / 12.9) * 2) / 2;
          let candidateIc = Math.min(50, maxIcFor3Cols);
          let validIc = 16;
          const numH = hClues.length;
          const C_h = Math.max(1, Math.min(numH, 3));
          const R_h = Math.max(1, Math.ceil(numH / C_h));
          const numV = vClues.length;

          while (candidateIc >= 12) {
             const P_w = C_h * (4.0 * candidateIc + candidateIc * 0.3);
             const P_h = R_h * (1.5 * candidateIc + candidateIc * 0.3) + 32;
             const V_w = Math.max(1, numV) * (1.5 * candidateIc + candidateIc * 0.3);
             const V_h = 4.0 * candidateIc;
             
             if (P_h <= viewport.height && P_w < viewport.width) {
                const availCol1Width = viewport.width - P_w - 32;
                if (V_w <= availCol1Width) {
                   const maxB_geo = Math.min(availCol1Width, Math.max(0, viewport.height - V_h - 40));
                   const maxB_scale = candidateIc / (1.6 * C1);
                   const B = Math.min(maxB_geo, maxB_scale);
                   
                   if (B >= MIN_BOARD_SIZE) {
                      validIc = candidateIc;
                      break;
                   }
                }
             }
             candidateIc -= 0.5;
          }
          optimalIconSize = validIc;
       } else {
          const maxAllowedWidth = viewport.width - 32;
          const maxIcFor3Cols = Math.floor((maxAllowedWidth / 12.6) * 2) / 2;
          let candidateIc = Math.min(60, maxIcFor3Cols);
          let validIc = 20; // Increased Mobile Floor limit
          let backupIc = 20;
          let backupDrawer = 0;
          let foundEquilibrium = false;
          
          const numH = hClues.length;
          const numV = vClues.length;
          
          const subCols = Math.ceil(puzzle.cols / 2);
          const boardAspectRatio = (puzzle.cols * subCols) / (puzzle.rows * 2);
          
          while (candidateIc >= 18) {
             const gap = candidateIc * 0.2; 
             const hW = 4.0 * candidateIc + gap;
             const hH = 1.5 * candidateIc + gap;
             const colsH = Math.max(1, Math.floor(maxAllowedWidth / hW));
             const rowsH = Math.max(1, Math.ceil(numH / colsH));
             const panelHH = rowsH * hH;
             
             const vW = 1.5 * candidateIc + gap;
             const vH = 4.0 * candidateIc + gap;
             const colsV = Math.max(1, Math.floor(maxAllowedWidth / vW));
             const rowsV = Math.max(1, Math.ceil(numV / colsV));
             const panelVH = rowsV * vH; 
             const pureUnhinderedPanelMaxHeight = Math.max(panelHH, panelVH) + 16;
             
             // Absolute geometric bounds calculation
             const maxB_scale = candidateIc / (1.5 * C1);
             const B = Math.min(maxAllowedWidth, maxB_scale); 
             
             // Convert ideal width to its native physical scaled height constraints
             const physicalBoardHeight = B / boardAspectRatio;
             
             // Steal massive chunks of padding metrics cleanly for drawer
             // 130px represents static total Header height deductor + Mobile Padding Offsets
             const availableDrawerHeight = viewport.height - 130 - physicalBoardHeight;
             
             // Guarantee minimally viable rendering capacity
             const minRequiredDrawer = hH + 16;
             
             // High density grids naturally demand large MIN_BOARD_SIZE that exceed mobile widths.
             const OPTIMAL_MIN_BOARD_SIZE = Math.min(MIN_BOARD_SIZE, maxAllowedWidth);
             
             if (B >= OPTIMAL_MIN_BOARD_SIZE && availableDrawerHeight >= minRequiredDrawer) {
                
                // Cache the best possible "It visually fits, even if it scrolls" configuration
                // Lock the backup down to 40 so we don't accidentally fall back to gigantically comical 60px clues.
                if (!backupDrawer && candidateIc <= 40) {
                    backupIc = candidateIc;
                    backupDrawer = availableDrawerHeight;
                }

                // Is this configuration absolutely perfect? i.e. NO scrolling required for ANY clue format!
                if (pureUnhinderedPanelMaxHeight <= availableDrawerHeight) {
                    validIc = candidateIc;
                    finalDrawerHeight = availableDrawerHeight;
                    foundEquilibrium = true;
                    break;
                }
             }
             
             candidateIc -= 0.5;
          }
          
          if (!foundEquilibrium) {
             // We exhausted all options down to 18px and COULD NOT perfectly fit them without scrolling.
             // This dense matrix natively requires scrolling. Recover the largest viable backup parameters.
             validIc = backupDrawer ? backupIc : 18;
             finalDrawerHeight = backupDrawer || Math.max(200, viewport.height - 130 - (Math.min(MIN_BOARD_SIZE, maxAllowedWidth) / boardAspectRatio));
          }
          
          optimalIconSize = validIc;
       }
    }
    return { isDesktop: isDesk, clueIconSize: optimalIconSize, hasMouse, requiredDrawerHeight: finalDrawerHeight };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.width, viewport.height, puzzle, activeMobileTab]);
  
  // DND Kit states
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeOverId, setActiveOverId] = useState<string | null>(null);
  const isGlobalBinOver = activeOverId === 'bin-drop-global';
  
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    puzzle.clues.forEach((clue: any) => {
      if (clue.type === 'ANCHOR' && clue.targetCol !== undefined && clue.params?.[0]) {
        const { row, item } = clue.params[0];
        gs.confirmCell(row, clue.targetCol, item);
      }
    });
    
    if ((puzzle as any).loadedFullState) {
       gs.importFullState((puzzle as any).loadedFullState);
    } else if (puzzle.loadedSnapshot) {
       gs.importSnapshot(puzzle.loadedSnapshot);
    } else {
       gs.pushHistory();
       gs.saveGoodState();
    }
    return gs;
  }, [puzzle]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const binnedClueIds = gameState?.binnedClues || new Set<string>();

  const pendingSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback(() => {
    if (!gameState || !puzzle || puzzle.isRandom) return;
    
    if (pendingSyncTimerRef.current) clearTimeout(pendingSyncTimerRef.current);
    pendingSyncTimerRef.current = setTimeout(() => {
       /* @ts-expect-error global flag */
       if (window.__isResetting) return;

       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const puzzleDateId = (puzzle as any).date ? `${(puzzle as any).date}-` : '';
       const payload = {
          puzzleId: puzzle.isRandom ? `random-${puzzle.rows}x${puzzle.cols}-${puzzle.difficulty}` : `${puzzleDateId}${puzzle.rows}x${puzzle.cols}-${puzzle.difficulty}`,
          boardState: gameState.exportSnapshot(),
          fullState: gameState.exportFullState(),
          timestamp: Date.now(),
          binnedClues: Array.from(gameState.binnedClues),
          elapsedSeconds: elapsedSecondsRef.current
       };
       fetch('/api/game/state/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
       }).catch(() => {});
    }, 3000);
    
    /* @ts-expect-error global tracking */
    window.__pendingSyncTimer = pendingSyncTimerRef.current;
  }, [gameState, puzzle]);

  useEffect(() => {
    const handleVisibility = () => {
       /* @ts-expect-error global flag */
       if (window.__isResetting) return;
       
       if (document.visibilityState === 'hidden' && gameState && puzzle && !puzzle.isRandom) {
           if (pendingSyncTimerRef.current) clearTimeout(pendingSyncTimerRef.current);
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           const puzzleDateId = (puzzle as any).date ? `${(puzzle as any).date}-` : '';
           const payload = {
              puzzleId: puzzle.isRandom ? `random-${puzzle.rows}x${puzzle.cols}-${puzzle.difficulty}` : `${puzzleDateId}${puzzle.rows}x${puzzle.cols}-${puzzle.difficulty}`,
              boardState: gameState.exportSnapshot(),
              fullState: gameState.exportFullState(),
              timestamp: Date.now(),
              binnedClues: Array.from(gameState.binnedClues),
              elapsedSeconds: elapsedSecondsRef.current
           };
           fetch('/api/game/state/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              keepalive: true
           }).catch(() => {});
       }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    return () => window.removeEventListener('visibilitychange', handleVisibility);
  }, [gameState, puzzle]);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any, // Cast to any to bypass 'RESTORE' type restriction
        text: "Restore to last correct state"
      });
      // Set the special restore type after the cast so our handler is clean
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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

  const handleToggleBin = useCallback((clueId: string) => {
    if (!gameState || isGameWon) return;
    gameState.toggleBinnedClue(clueId);
    gameState.pushHistory(); // Commit binaction as an atomic undoable action!
    setTick(t => t + 1); // Trigger React UI render
    setTimeout(runAnalysis, 50);
    playInteractionSound('moveclue');
    triggerSave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, playInteractionSound, runAnalysis, triggerSave]);

  // ─── Loaders ────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function bootSequence() {
      const urlParams = new URLSearchParams(window.location.search);
      let dateParam = urlParams.get('date');
      const isRandom = ENABLE_RANDOM_MODE && urlParams.get('random') === 'true';

      if (!dateParam && !isRandom) {
         try {
           const initRes = await fetch('/api/init');
           if (initRes.ok) {
             const initData = await initRes.json();
             dateParam = initData.gameDate;
           }
         } catch(e) {}
      }

      const finalDate = dateParam || 'today';
      let hasCompletedBase = false;

      if (!isRandom) {
        try {
          const compRes = await fetch(`/api/game/state/completed?date=${finalDate}`);
          if (compRes.ok) {
            const compData = await compRes.json();
            if (compData && compData.completed) {
              setCompletedLevels(compData.completed);
              hasCompletedBase = compData.completed.includes(1);
            }
          }
        } catch(e) {}
      }

      if (hasCompletedBase) {
         setInitRoutingState('routing');
      } else {
         setInitRoutingState('playing');
         setIsManifestLoaded(true);
      }
    }
    bootSequence();
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
      const isRandom = ENABLE_RANDOM_MODE && urlParams.get('random') === 'true';
      const seedParam = urlParams.get('seed') || Math.random().toString(36).substring(2, 9);

      try {
        if (isRandom) {
          const gridSizeMap: Record<number, number> = { 1: 4, 2: 6, 3: 8 };
          const gridSize = gridSizeMap[difficulty] || 4;
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const solGrid = (telemetry.solution as any).getRawSolution(gridSize, gridSize);
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', solGrid);
          const integrityHash = new Uint8Array(hashBuffer);

          const puzzleData: PuzzleManifest = {
            rows: gridSize,
            cols: gridSize,
            difficulty: difficulty,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clues: telemetry.clues.map(c => sieve.toActiveClue(c, telemetry.solution as any)),
            integrityHash,
            isRandom: true
          };

          setActiveHint(null);
          setHintShowing(false);
          setPuzzle(puzzleData);
        } else {
          const dateParam = urlParams.get('date') || 'today';
          try {
            const res = await fetch(`/api/game/puzzle?date=${dateParam}&difficulty=${difficulty}`);
            const data = await res.json();
            if (res.ok && data && !data.status) {
               const puzzleDate = data.date || dateParam;
               const p = `${puzzleDate}-${data.rows}x${data.cols}-${data.difficulty}`;
               try {
                  const stateRes = await fetch(`/api/game/state/sync?puzzleId=${p}`);
                  const stateData = await stateRes.json();
                  if (stateData.status === 'success' && stateData.boardState) {
                    if (stateData.boardState) {
                      data.loadedSnapshot = stateData.boardState;
                    }
                    if (stateData.fullState) {
                      (data as any).loadedFullState = stateData.fullState;
                    }
                    if (stateData.binnedClues) {
                      (data as any).loadedBinnedClues = stateData.binnedClues;
                    }
                      if (stateData.elapsedSeconds !== undefined) {
                          data.loadedElapsed = stateData.elapsedSeconds;
                      }
                  } else if (stateData.status === 'completed') {
                      data.isCompleted = true;
                      if (stateData.elapsedSeconds !== undefined) {
                          data.loadedElapsed = stateData.elapsedSeconds;
                      }
                      if (stateData.leaderboardData) {
                          data.preloadedLeaderboard = stateData.leaderboardData;
                      }
                  }
               // eslint-disable-next-line no-empty
               } catch (err) {}

               setActiveHint(null);
               setHintShowing(false);
               setPuzzle(data);
            } else {
              setLoadError(data?.message || 'Puzzle not found.');
            }
          } catch(err) {
            setLoadError('Error fetching puzzle from API.');
          }
        }
      } catch (err) {
        setLoadError('Error fetching puzzle.');
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(t);
  }, [selectedDifficulty, isManifestLoaded, generationTrigger]);

  // Run initial analysis when puzzle loads
  useEffect(() => {
    if (!gameState || !puzzle) return;
    
    if (puzzle.loadedElapsed !== undefined) {
        setElapsedSeconds(puzzle.loadedElapsed);
    }
    if (puzzle.isCompleted) {
        setIsGameWon(true);
        setIsGameStarted(true);
        setIsRecoveredWin(true);
        
        // @ts-expect-error dynamically appended payload from sync hook
        if (puzzle.preloadedLeaderboard) {
            // @ts-expect-error type override
            setLeaderboardData(puzzle.preloadedLeaderboard);
            setIsSubmittingScore(false);
        } else {
            setIsSubmittingScore(true);
            // @ts-expect-error date fallback
            const puzzleDate = puzzle.date || new Date().toISOString().split('T')[0];
            fetch(`/api/game/leaderboard?gridSize=${puzzle.rows}x${puzzle.cols}&date=${puzzleDate}`)
               .then(r => r.json())
               .then(res => {
                  if (res.type === 'leaderboard') setLeaderboardData(res);
               })
               .catch(console.error)
               .finally(() => setIsSubmittingScore(false));
        }
        return; // Halt here implicitly without overriding anything
    }

    const t = setTimeout(async () => {
      let fullyConfirmed = true;
      for (let r = 0; r < puzzle.rows; r++) {
        for (let c = 0; c < puzzle.cols; c++) {
          if (!gameState.isConfirmed(r, c)) {
            fullyConfirmed = false;
            break;
          }
        }
        if (!fullyConfirmed) break;
      }
      
      if (fullyConfirmed) {
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
            setIsGameStarted(true);
            setIsSubmittingScore(true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const puzzleDate = (puzzle as any).date || 'today';
            fetch(`/api/game/leaderboard?gridSize=${puzzle.rows}x${puzzle.cols}&date=${puzzleDate}`)
               .then(r => r.json())
               .then(res => {
                  if (res.type === 'leaderboard') setLeaderboardData(res);
               })
               .catch(console.error)
               .finally(() => setIsSubmittingScore(false));
            return;
         }
      }
      
      runAnalysis();
    }, 150);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, puzzle]);

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
      
      if (puzzle.isRandom) {
         setIsSubmittingScore(false);
         setUserRank(null);
         return;
      }

      const todayLocal = new Date().toISOString().split('T')[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const puzzleDate = (puzzle as any).date || todayLocal;
      const isHistorical = puzzleDate !== todayLocal && puzzleDate !== 'today';

      setIsSubmittingScore(true);

      if (isHistorical) {
          fetch(`/api/game/leaderboard?gridSize=${puzzle.rows}x${puzzle.cols}&date=${puzzleDate}`)
              .then(r => r.json())
              .then(res => {
                  if (res.type === 'leaderboard') setLeaderboardData(res);
              })
              .catch(console.error)
              .finally(() => setIsSubmittingScore(false));
      } else {
          fetch('/api/game/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puzzleId: `${puzzleDate}-${puzzle.rows}x${puzzle.cols}-${puzzle.difficulty}`,
              boardState: Array.from(gameState.grid),
              moveLog: moveLogRef.current,
              isDevBuild: DEV_BUILD,
              penaltyMs: penaltyMsRef.current
            })
          })
          .then(r => r.json())
          .then(res => {
             if (res.status === 'verified' || DEV_BUILD) {
                 if (res.rank !== undefined) {
                     setUserRank(res.rank);
                 }
                 return fetch(`/api/game/leaderboard?gridSize=${puzzle.rows}x${puzzle.cols}&date=${puzzleDate}`);
             }
             throw new Error('Not verified');
          })
          .then(r => r.json())
          .then(res => {
             if (res.type === 'leaderboard') {
                setLeaderboardData(res);
             }
          })
          .catch(console.error)
          .finally(() => setIsSubmittingScore(false));
      }
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
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
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

  const handleStartGame = async () => {
    setIsGameStarted(true);
    moveLogRef.current = [];
    fetch('/api/game/start', { method: 'POST' }).catch(console.error);
  };

  const handleStateChange = useCallback(() => {
    if (isGameWon) return;
    
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
    triggerSave();
    // Start the chain reaction
    cascadeTimerRef.current = setTimeout(runCascade, 250);
  }, [runCascade, warningsEnabled, gameState, puzzle, binnedClueIds, triggerRedFlash, playInteractionSound, triggerSave, isGameWon]);

  // ─── Hint Button Logic ───────────────────────────────────────────────────────

  const handleHintClick = () => {
    if (!activeHint || isGameWon) return;
    if (isCascading) return; // Prevent hint clicks during animation

    if (!hintShowing) {
      // First click: show banner + highlight
      if (activeHint.clue?.type === 'error') {
        playInteractionSound('mistake');
        triggerRedFlash();
      }
      setHintShowing(true);
      setHintCount(c => c + 1);
      setElapsedSeconds(s => s + 10);
      penaltyMsRef.current += 10000;

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const handleResetBin = useCallback(() => {
    dismissHint();
    if (gameState && !isGameWon) {
      gameState.resetBinnedClues();
      gameState.pushHistory();
      setTick(t => t + 1);
      setTimeout(runAnalysis, 50);
      triggerSave();
    }
    setShowBin(false);
    playInteractionSound('moveclue');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissHint, gameState, playInteractionSound, runAnalysis, triggerSave]);


  // ─── Derived hint highlight data ─────────────────────────────────────────────

  const hintHighlights = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  if (initRoutingState === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
          <p className="text-indigo-400 font-bold uppercase tracking-widest text-sm animate-pulse">Syncing App Data...</p>
        </div>
      </div>
    );
  }

  if (initRoutingState === 'routing') {
     return (
       <div className="flex flex-col items-center justify-center h-screen w-screen overflow-hidden bg-slate-950 p-4">
           <DifficultyMenu 
              completedLevels={completedLevels}
              enableRandom={ENABLE_RANDOM_MODE}
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
                 setInitRoutingState('playing');
                 setIsManifestLoaded(true);
              }}
              onClose={() => {
                 setInitRoutingState('playing');
                 setIsManifestLoaded(true);
              }}
           />
       </div>
     );
  }

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
    ? 'bg-black/20 text-white/30 cursor-not-allowed shadow-inner'
    : hintShowing
      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 ring-1 ring-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
      : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveDragId(e.active.id.toString())}
      onDragMove={(e) => setActiveOverId(e.over?.id.toString() || null)}
      onDragEnd={(e) => {
        const { active, over } = e;
        if (over && over.id.toString().startsWith('bin-drop')) {
           handleToggleBin(active.id.toString());
        }
        setActiveDragId(null);
        setActiveOverId(null);
      }}
      onDragCancel={() => {
        setActiveDragId(null);
        setActiveOverId(null);
      }}
    >
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden transition-colors duration-300 bg-slate-950 text-slate-100 relative shadow-inner">
      {/* Background Underlay mapped exactly to the splash screen */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 opacity-90 pointer-events-none z-0" />
      
      {/* Layout wrapper pushes above the z-0 gradient background */}
      <div className="flex flex-col w-full h-[100dvh] relative z-10 w-full min-w-0 min-h-0">
      {/* Difficulty menu */}
      {isMenuOpen && (
        <DifficultyMenu
          completedLevels={completedLevels}
          enableRandom={ENABLE_RANDOM_MODE}
          onSelect={(level, mode) => { 
            const url = new URL(window.location.href);
            if (mode === 'random') {
              url.searchParams.set('random', 'true');
            } else {
              url.searchParams.delete('random');
              url.searchParams.delete('seed');
            }
            window.history.pushState({}, '', url.toString());

            setHintCount(0);
            setSelectedDifficulty(level); 
            setGenerationTrigger(g => g + 1);
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
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 transform-gpu animate-in fade-in duration-200" 
          onPointerDown={() => setExplainedClue(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 transform-gpu" 
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
      <header className="relative flex items-center px-2 h-16 border-b border-black/40 shadow-xl bg-gradient-to-r from-slate-900/95 via-indigo-900/90 to-slate-900/95 transform-gpu z-40 shrink-0 overflow-hidden text-left text-white">
        
        {/* LEFT MENU BUTTON */}
        <div className="flex items-center z-10 shrink-0 mr-2">
          <button onClick={() => setIsSideMenuOpen(true)} className="p-3 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors text-white drop-shadow-md">
            <span className="material-icons text-xl md:text-2xl">menu</span>
          </button>
        </div>

        {/* IMMERSIVE LEFT-ALIGNED TEXT AREA (Mobile) */}
        <div className={`flex-1 min-w-0 h-full flex items-center z-[60] pointer-events-none select-none ${isDesktop ? 'justify-center' : 'justify-start'}`} style={{ containerType: 'inline-size' }}>
          {hintShowing && activeHint ? (
            <div className={`font-bold text-white drop-shadow-md leading-tight w-full h-full flex flex-col justify-center animate-in fade-in duration-200 pointer-events-auto ${isDesktop ? 'items-center text-center px-4' : 'items-start text-left px-2'}`} style={{ fontSize: isDesktop ? 'clamp(12px, 1.8vh, 18px)' : 'clamp(10px, 4.5cqw, 14px)' }}>
              {activeHint.text.split('<nl>').map((line, i) => (
                <span key={i} className={`block w-full ${isDesktop ? '' : 'truncate'}`}>{line.trim()}</span>
              ))}
            </div>
          ) : hoveredClueText ? (
            <div className={`font-bold text-white drop-shadow-md leading-tight w-full h-full flex flex-col justify-center animate-in fade-in duration-200 pointer-events-auto ${isDesktop ? 'items-center text-center px-4' : 'items-start text-left px-2'}`} style={{ fontSize: isDesktop ? 'clamp(12px, 1.8vh, 18px)' : 'clamp(10px, 4.5cqw, 14px)' }}>
              {hoveredClueText.split('<nl>').map((line, i) => (
                <span key={i} className={`block w-full ${isDesktop ? '' : 'truncate'}`}>{line.trim()}</span>
              ))}
            </div>
          ) : (
            <span className="text-xs md:text-sm font-black uppercase tracking-[0.3em] text-white drop-shadow-lg drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">Deductorist</span>
          )}
        </div>

        {/* INTERACTIVE CONTROLS (Z-Indexed Overlay) */}
        <div className="flex items-center gap-1.5 z-50 shrink-0 pr-2">
          {isGameStarted && (
            <>
            {isDesktop && !(hintShowing && activeHint) && !isGameWon && (
              <div className="flex items-center h-10 space-x-1">
                <div className="w-10 h-10">
                   <DroppableMobileBin showBin={showBin} binnedCount={binnedClueIds.size} onToggle={() => { dismissHint(); setShowBin(!showBin); }} />
                </div>
                {showBin && binnedClueIds.size > 0 && (
                  <button
                    onClick={handleResetBin}
                    className="w-10 h-10 flex items-center justify-center bg-white/10 text-white/80 rounded-lg hover:bg-white/20 hover:text-white transition-colors shadow-sm"
                    title="Reset Binned Clues"
                  >
                    <span className="material-icons text-base">restart_alt</span>
                  </button>
                )}
              </div>
            )}
            {!isGameWon && (hintShowing && activeHint ? (
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
                   className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${hintBtnClass}`}
                 >
                   <span className="material-icons text-base">lightbulb</span>
                   {hintCount > 0 && (
                     <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
                       <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 text-[10px] items-center justify-center text-white font-bold leading-none shadow-sm">
                         {hintCount}
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
                   className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                     gameState && gameState.canUndo
                       ? 'bg-white/10 text-white hover:bg-white/20'
                       : 'bg-black/20 text-white/30 cursor-not-allowed shadow-inner'
                   }`}
                   title="Undo"
                 >
                   <span className="material-icons text-xl drop-shadow-md">undo</span>
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
                       ? 'bg-white/10 text-white hover:bg-white/20'
                       : 'bg-black/20 text-white/30 cursor-not-allowed shadow-inner'
                   }`}
                   title="Redo"
                 >
                   <span className="material-icons text-xl drop-shadow-md">redo</span>
                 </button>
               </>
            ))}
            <div className="ml-1 w-10 flex items-center justify-center font-mono text-[10px] font-black text-slate-400 dark:text-slate-600 shrink-0">
               {formatTime(elapsedSeconds)}
            </div>
          </>
          )}
          </div>
      </header>
      {/* Main Game Area Wrapper */}



      {/* Main Game Area Wrapper */}
      <div className="flex-1 relative overflow-hidden">
        {/* 
            The Game Grid:
            1. NO ANIMATION ON START (Must NOT use transition-all or scale here to avoid 'pop-in' or sluggishness)
            2. Fully hidden (opacity-0) until user clicks 'Start' to ensure a smooth, empty initial load.
        */}
        <main className={`w-full h-full overflow-hidden ${isDesktop ? 'grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[minmax(0,1fr)_auto]' : 'flex flex-col'} ${
          !isGameStarted ? 'blur-[12px] opacity-0 pointer-events-none' : 'blur-0 opacity-100'
        }`}>

        {/* Row 1 (Mobile) / Col 1 Row 1 (Desktop): Board */}
        <div 
          className={`w-full shrink min-h-0 min-w-0 flex items-center justify-center relative overflow-hidden ${isDesktop ? 'w-auto col-start-1 row-start-1' : 'flex-1'}`} 
        >
          {/* Padded inner bounds to provide visual breathing room */}
          <div className="w-full h-full p-2 sm:p-4 lg:p-6 flex items-center justify-center" style={{ containerType: 'size' }}>
            {puzzle && gameState && (
              <div className="relative flex items-center justify-center" style={{ aspectRatio: String(boardAspectRatio), height: `min(100cqh, 100cqw / ${boardAspectRatio})`, containerType: 'size' }}>
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
                    moveLogRef.current.push({ cellIndex: 0, timeOffsetMs: Date.now() });
                  }}
                  onStateChange={() => {
                    dismissHint();
                    handleStateChange();
                  }}
                  hintHighlights={hintHighlights}
                  isLocked={isCascading || isGameWon}
                  flashRed={flashRed}
                  zoomEnabled={zoomEnabled}
                />
              </div>
            )}
            
            {/* GLOBAL BIN HOVER TARGET */}
            <GlobalDropBin activeDragId={activeDragId} />
          </div>
        </div>

        {/* Row 2 (Mobile Only): Swappable Drawer Tabs */}
        <div className={`shrink-0 items-center justify-between px-4 py-3 bg-slate-900/90 shadow-inner z-20 gap-2 transform-gpu ${isDesktop ? 'hidden col-start-1 row-start-2' : 'flex'}`}>
          
          <div className="flex gap-2 items-center">
            {!isGameWon && (
              <>
                <DroppableMobileBin 
                  showBin={showBin} 
                  binnedCount={binnedClueIds.size} 
                  onToggle={() => { dismissHint(); setShowBin(!showBin); }} 
                />
                {showBin && binnedClueIds.size > 0 && (
                  <button
                    onClick={handleResetBin}
                    className="p-2 h-full aspect-square flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-300 transition-colors shadow-sm animate-in fade-in zoom-in duration-200"
                    title="Reset Binned Clues"
                  >
                    <span className="material-icons text-base">restart_alt</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex bg-black/20 rounded-lg p-1 w-full gap-1 shadow-inner">
            <button 
              onClick={() => {
                dismissHint();
                setActiveMobileTab('horizontal');
              }}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                activeMobileTab === 'horizontal' 
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80'
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
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
               Vertical
            </button>
          </div>
        </div>

        {/* Row 3 (Mobile) / Col 2 Row 1-span-2 (Desktop): Horizontal Clues */}
        <div 
          title="GamePage: Horizontal Drawer Wrapper"
          className={`min-h-[0px] flex-col shadow-inner bg-black/20 ${
          isDesktop ? 'flex-1 col-start-2 row-start-1 row-span-2 min-h-0 h-full w-auto visible flex pointer-events-auto relative z-10' 
                    : (activeMobileTab === 'horizontal' ? 'w-full flex shrink-0 z-10 relative visible pointer-events-auto' : 'hidden')
        }`}
          style={!isDesktop ? { height: `${requiredDrawerHeight}px`, maxHeight: `${requiredDrawerHeight}px` } : {}}
        >
          <div 
            title="GamePage: Horizontal Drawer Inner Frame"
            className={`flex-1 min-h-[0px] flex flex-col relative ${isDesktop ? 'overflow-x-auto overflow-y-hidden' : 'overflow-hidden'}`}
          >

            {puzzle && (
              <HorizontalClueList isDesktop={isDesktop} clueIconSize={clueIconSize} hasMouse={hasMouse} 
                clues={puzzle.clues.filter(c => 
                  c.type !== 'ANCHOR' && 
                  (showBin ? binnedClueIds.has(c.id) : !binnedClueIds.has(c.id))
                )} 
                onClueHover={isGameWon ? undefined : (c) => setHoveredClueText(c ? describeRule(c) : null)}
                highlightedClue={hintShowing && activeHint ? activeHint.clue : null}
                onClueToggleBin={isGameWon ? undefined : handleToggleBin}
                binnedIds={binnedClueIds}
                onClueDoubleTap={isGameWon ? undefined : setExplainedClue}
                scrollToClueId={scrollToClueId}
                onMoveClue={() => playInteractionSound('moveclue')}
              />
            )}
          </div>
        </div>

        {/* Row 3 (Mobile) / Col 1 Row 2 (Desktop): Vertical Clues */}
        <div 
          title="GamePage: Vertical Drawer Wrapper"
          className={`min-h-[0px] flex-col shadow-inner bg-black/20 ${
          isDesktop ? 'flex-1 col-start-1 row-start-2 min-h-0 h-full w-full visible flex pointer-events-auto relative z-10' 
                    : (activeMobileTab === 'vertical' ? 'w-full flex shrink-0 z-10 relative visible pointer-events-auto' : 'hidden')
        }`}
          style={!isDesktop ? { height: `${requiredDrawerHeight}px`, maxHeight: `${requiredDrawerHeight}px` } : {}}
        >
          <div 
            title="GamePage: Vertical Drawer Inner Frame"
            className={`flex-1 min-h-[0px] flex flex-col relative ${isDesktop ? 'overflow-y-auto overflow-x-hidden custom-scrollbar' : 'overflow-hidden'}`}
          >

            {puzzle && (
              <VerticalClueList isDesktop={isDesktop} clueIconSize={clueIconSize} hasMouse={hasMouse} 
                clues={puzzle.clues.filter(c => 
                  c.type !== 'ANCHOR' && 
                  (showBin ? binnedClueIds.has(c.id) : !binnedClueIds.has(c.id))
                )} 
                onClueHover={isGameWon ? undefined : (c) => setHoveredClueText(c ? describeRule(c) : null)}
                highlightedClue={hintShowing && activeHint ? activeHint.clue : null}
                onClueToggleBin={isGameWon ? undefined : handleToggleBin}
                binnedIds={binnedClueIds}
                onClueDoubleTap={isGameWon ? undefined : setExplainedClue}
                scrollToClueId={scrollToClueId}
                onMoveClue={() => playInteractionSound('moveclue')}
              />
            )}
          </div>
        </div>

      </main>

        {/* Win Celebration */}
        {isGameWon && !isViewingCompletedBoard && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 animate-in fade-in duration-500 p-4 transform-gpu">
             <div className={`text-center p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-4 ${!isRecoveredWin ? 'animate-in zoom-in-95 duration-300' : ''} max-w-sm w-full relative overflow-y-auto max-h-[95dvh] transform-gpu ${
                 winData.isEpicInfo
                   ? 'border-amber-400 dark:border-amber-500 shadow-[0_0_50px_rgba(251,191,36,0.5)]'
                   : 'border-emerald-500 shadow-emerald-500/20'
               }`}>
                 
                 <button 
                   onClick={() => {
                     if (isSharing) return;
                     const emojiMap: Record<string, string> = { "rocket_launch": "🚀", "emoji_events": "🏆", "star": "🌟", "workspace_premium": "👑", "military_tech": "🏅", "psychology": "🧠" };
                     let msg = `I just beat todays Deductorist in **${formatTime(elapsedSeconds)}**!`;
                     if (winData.isEpicInfo) {
                       msg += `\n\n${emojiMap[winData.icon] || '🎯'} **${winData.text}**`;
                     }
                     
                     setIsSharing(true);
                     fetch('/api/game/share', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ message: msg })
                     }).then(async r => {
                        const data = await r.json();
                        if (data.status === 'success') alert('Score shared structurally to thread!');
                        else alert('Failed to share: ' + data.message);
                     }).catch(console.error).finally(() => setIsSharing(false));
                   }}
                   disabled={isSharing}
                   className={`absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full transition-colors flex items-center justify-center z-20 ${isSharing ? 'text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95'}`}
                   title="Share to Thread"
                 >
                   {isSharing ? <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-indigo-300 border-t-indigo-500 animate-spin" /> : <span className="material-icons sm:text-[24px] text-[20px]">share</span>}
                 </button>

                 {winData.isEpicInfo && <div className="absolute -inset-10 bg-gradient-to-tr from-amber-500/20 via-transparent to-amber-500/20 animate-spin opacity-30 transform-gpu pointer-events-none" style={{ animationDuration: '4s' }} />}
                 <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 mt-4 sm:mt-0 shadow-lg relative z-10 ${
                   winData.isEpicInfo
                     ? `bg-gradient-to-tr from-amber-300 to-amber-500 text-amber-950 shadow-[0_10px_30px_rgba(251,191,36,0.6)] ${!isRecoveredWin ? 'animate-bounce' : ''}`
                     : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-500 shadow-emerald-500/20'
                 }`}>
                  <span className="material-icons text-3xl sm:text-5xl flex items-center justify-center">{winData.icon}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black flex flex-col items-center justify-center mb-1 leading-none bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent uppercase tracking-tighter">
                  {winData.text}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold mb-2 sm:mb-2 text-sm sm:text-base">
                  Puzzle completed in {formatTime(elapsedSeconds)}
                </p>
                
                {isSubmittingScore ? (
                  <div className="flex flex-col items-center justify-center py-4 mb-2">
                     <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-emerald-500 animate-spin mb-2 sm:mb-4"></div>
                     <p className="text-slate-500 font-bold animate-pulse text-xs sm:text-sm">{puzzle?.isCompleted ? 'Loading Leaderboard...' : 'Submitting Time...'}</p>
                  </div>
                ) : leaderboardData && !puzzle?.isRandom && (
                  <div className="mb-4 sm:mb-6 text-xs sm:text-sm">
                     <DistributionChart leaderboardData={leaderboardData} userTimeMs={elapsedSeconds * 1000} />
                  </div>
                )}

                <div className="flex flex-row gap-2 w-full mt-2 sm:mt-3">
                    {selectedDifficulty < 5 && (!puzzle?.isRandom) ? (
                      <button 
                        onClick={() => {
                          setIsViewingCompletedBoard(true); // Drops z-index overlay priority
                          setIsMenuOpen(true);              // Elevates difficulty modal visually
                        }}
                        className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-black shadow-[0_10px_20px_rgba(99,102,241,0.3)] transition-all active:scale-95 uppercase tracking-widest text-[9px] sm:text-xs border border-indigo-400"
                      >
                        More Puzzles
                      </button>
                    ) : (
                      <button 
                        onClick={() => window.location.reload()}
                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/30 transition-all active:scale-95 uppercase tracking-widest text-[10px] sm:text-xs"
                      >
                        {puzzle?.isRandom ? 'Next Puzzle' : 'Replay'}
                      </button>
                    )}
                    <button 
                      onClick={() => setIsViewingCompletedBoard(true)}
                      className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-black shadow-lg transition-all active:scale-95 uppercase tracking-widest text-[9px] sm:text-xs"
                    >
                      View Board
                    </button>
                  </div>
             </div>
          </div>
        )}

        {/* Unified Start Puzzle Overlay - Stays Sharp above the blurred main grid */}
        {!isGameStarted && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/60 pointer-events-none" />
             <div className="relative animate-form-enter transform-gpu">
              <button 
                onClick={handleStartGame}
                disabled={isLoading}
                className={`relative px-10 py-5 rounded-3xl font-black text-3xl uppercase tracking-widest border border-white/20 flex flex-col items-center group overflow-hidden transition-all duration-500 bg-gradient-to-br transform-gpu
                  ${isLoading 
                    ? 'from-blue-600/80 to-indigo-700/80 text-white/60 cursor-not-allowed shadow-none' 
                    : 'from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-[0_20px_50px_rgba(79,70,229,0.4)] hover:shadow-indigo-500/60 transform hover:scale-105 active:scale-95'
                  }`}
              >
                {!isLoading && <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />}
                <span className="relative z-10">{isLoading ? 'Generating...' : 'Start Puzzle'}</span>
                
                {!isLoading && (
                   <>
                     <span className="relative z-10 text-sm font-bold text-white mt-3 uppercase tracking-[0.2em]">
                       {DIFF_NAMES[selectedDifficulty] || 'Puzzle'} // {puzzle?.rows}x{puzzle?.cols}
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

      {isViewingCompletedBoard && isGameWon && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5">
          <button
             onClick={() => setIsViewingCompletedBoard(false)}
             className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-black shadow-xl shadow-indigo-500/30 transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="material-icons text-sm">arrow_back</span>
            Back to Win Screen
          </button>
        </div>
      )}

      {/* DRAG OVERLAY */}
      <DragOverlay zIndex={9999} dropAnimation={null}>
        {draggedClue ? (
          <div className={`pointer-events-none drop-shadow-2xl transition-all duration-300 ${isGlobalBinOver ? 'scale-90 rotate-[-5deg] contrast-125 saturate-200 brightness-110 drop-shadow-[0_0_25px_rgba(239,68,68,0.9)] opacity-90' : 'scale-105 rotate-[2deg] opacity-90'}`}>
            <div className={`${isGlobalBinOver ? '[&>*]:bg-red-50 [&>*]:border-red-500 [&>*]:text-red-600 [&>*]:dark:bg-red-950/80 [&_span.material-icons]:text-red-500 [&_div.bg-slate-300]:bg-red-400 [&_div.bg-white]:bg-red-100' : ''}`}>
              {isDraggedHorizontal ? (
                 <HorizontalClueUI clue={draggedClue} isHighlighted={false} />
              ) : (
                 <VerticalClueUI clue={draggedClue} isHighlighted={false} />
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      <DevMenu puzzleId={puzzle ? `${puzzle.rows}x${puzzle.cols}-${puzzle.difficulty}` : undefined} grid={gameState?.grid} />
      </div>
    </div>
    </DndContext>
  );
};

