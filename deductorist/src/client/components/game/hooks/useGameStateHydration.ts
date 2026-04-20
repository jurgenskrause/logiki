import { useState, useEffect, useMemo } from 'react';
import type { PuzzleManifest } from '../../../../shared/engine/ManifestLoader';
import { GameState } from '../../../../shared/engine/GameState';
import { StructuralSieve } from '../../../../shared/engine/StructuralSieve';
import { buildTopologyLibrary } from '../../../../shared/engine/PermutationGenerator';
import { TieringService } from '../../../../shared/engine/TieringService';
import type { HintResult } from '../../../../shared/engine/HintService';

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

export function useGameStateHydration({
  ENABLE_RANDOM_MODE,
  selectedDifficulty,
  generationTrigger,
  setActiveHint,
  setHintShowing
}: {
  ENABLE_RANDOM_MODE: boolean;
  selectedDifficulty: number;
  generationTrigger: number;
  setActiveHint: (hint: HintResult | null) => void;
  setHintShowing: (showing: boolean) => void;
}) {
  const [puzzle, setPuzzle] = useState<PuzzleManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManifestLoaded, setIsManifestLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [initRoutingState, setInitRoutingState] = useState<'loading' | 'routing' | 'playing'>('loading');
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);

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
  }, [ENABLE_RANDOM_MODE]);

  useEffect(() => {
    if (!isManifestLoaded) return;

    // Immediately hide the board when starting a load or change
    setIsLoading(true);

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

          const solGrid = telemetry.solution.getRawSolution(gridSize, gridSize);
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', solGrid.buffer as ArrayBuffer);
          const integrityHash = new Uint8Array(hashBuffer);

          const puzzleData: PuzzleManifest = {
            rows: gridSize,
            cols: gridSize,
            difficulty: difficulty,
            clues: telemetry.clues.map(c => sieve.toActiveClue(c, telemetry.solution)),
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const data: PuzzleManifest & { status?: string, message?: string } = await res.json();
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
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (data as any).loadedFullState = stateData.fullState;
                    }
                    if (stateData.binnedClues) {
                      data.loadedBinnedClues = stateData.binnedClues;
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
  }, [selectedDifficulty, isManifestLoaded, generationTrigger, ENABLE_RANDOM_MODE, setActiveHint, setHintShowing]);

  const gameState = useMemo(() => {
    if (!puzzle) return null;
    const gs = new GameState(puzzle.rows, puzzle.cols);
    puzzle.clues.forEach(clue => {
      if (clue.type === 'ANCHOR' && clue.targetCol !== undefined && clue.params?.[0]) {
        const { row, item } = clue.params[0];
        gs.confirmCell(row, clue.targetCol, item);
      }
    });
    
    if (puzzle.loadedFullState) {
       gs.importFullState(puzzle.loadedFullState);
    } else if (puzzle.loadedSnapshot) {
       gs.importSnapshot(puzzle.loadedSnapshot);
    } else {
       gs.pushHistory();
       gs.saveGoodState();
    }
    return gs;
  }, [puzzle]);

  return {
    puzzle, setPuzzle,
    isLoading, setIsLoading,
    isManifestLoaded, setIsManifestLoaded,
    loadError,
    initRoutingState, setInitRoutingState,
    completedLevels, setCompletedLevels,
    gameState
  };
}
