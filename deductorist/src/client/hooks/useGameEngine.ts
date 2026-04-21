import React, { useState, useCallback, useRef, useEffect } from 'react';
import { analyzeState } from '../../shared/engine/HintService';
import type { HintResult } from '../../shared/engine/HintService';
import { ManifestLoader } from '../../shared/engine/ManifestLoader';
import type { PuzzleManifest } from '../../shared/engine/ManifestLoader';
import type { GameState } from '../../shared/engine/GameState';

const loader = new ManifestLoader();

interface UseGameEngineProps {
  gameState: GameState | null;
  puzzle: PuzzleManifest | null;
  isGameWon: boolean;
  setIsGameWon: (val: boolean) => void;
  isGameStarted: boolean;
  setIsGameStarted: (val: boolean) => void;
  warningsEnabled: boolean;
  binnedClueIds: Set<string>;
  triggerRedFlash: () => void;
  playInteractionSound: (action?: string) => void;
  pendingSoundRef: React.MutableRefObject<string | null>;
  setHintCount: React.Dispatch<React.SetStateAction<number>>;
  setTick: React.Dispatch<React.SetStateAction<number>>;
  triggerSave: () => void;
  enqueue: (task: () => Promise<void>) => void;
  clearQueue: () => void;
  setActiveHint: (hint: HintResult | null) => void;
  setHintShowing: (val: boolean) => void;
  submitScore: () => void;
  fetchLeaderboard: (date: string, size: string) => Promise<void>;
}

export function useGameEngine({
  gameState, puzzle, isGameWon, setIsGameWon, isGameStarted, setIsGameStarted,
  warningsEnabled, binnedClueIds, triggerRedFlash, playInteractionSound,
  pendingSoundRef, setHintCount, setTick, triggerSave, enqueue, clearQueue,
  setActiveHint, setHintShowing, submitScore, fetchLeaderboard
}: UseGameEngineProps) {
  const [isCascading, setIsCascading] = useState(false);
  const cascadeStartSolveCountRef = useRef<number>(0);

  const countConfirmed = useCallback(() => {
    let count = 0;
    if (!gameState || !puzzle) return 0;
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        if (gameState.isConfirmed(r, c)) count++;
      }
    }
    return count;
  }, [gameState, puzzle]);

  const runAnalysis = useCallback(() => {
    if (!gameState || !puzzle) return;
    const result = analyzeState(gameState, puzzle.clues);

    if (result.isContradiction) {
      gameState.markError();
      setActiveHint({
        clue: { id: 'error', type: 'error', params: [] },
        action: { 
          type: 'RESTORE',
          cellId: 'restore',
          row: 0, 
          col: 0, 
          itemIndex: 0 
        }, 
        text: "Restore to last correct state"
      });
    } else {
      if (gameState.isError) gameState.clearError();
      gameState.saveGoodState();
      setActiveHint(result.hint);
    }
    setHintShowing(false);
  }, [gameState, puzzle, setActiveHint, setHintShowing]);

  const checkWin = useCallback(async () => {
    if (!gameState || !puzzle || isGameWon) return;

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
    
    if (!fullyConfirmed) return;

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
      playInteractionSound('win');
      submitScore();
      const puzzleDate = puzzle.date || 'today';
      void fetchLeaderboard(puzzleDate, `${puzzle.rows}x${puzzle.cols}`);
    }
  }, [gameState, puzzle, isGameWon, playInteractionSound, submitScore, setIsGameWon, setIsGameStarted, fetchLeaderboard]);

  const runCascadeRef = useRef<(() => void) | null>(null);

  const runCascade = useCallback(() => {
    if (!gameState) return;
    
    const nextTraces = gameState.findAndApplyNextDeduction();
    
    if (nextTraces) {
      const hasConfirm = nextTraces.some(t => t.type === 'CONFIRM');
      if (hasConfirm) {
        playInteractionSound('solve');
      }

      setTick(t => t + 1); 
      enqueue(async () => {
        await new Promise(res => setTimeout(res, 250));
        runCascadeRef.current?.();
      });
    } else {
      setIsCascading(false);
      gameState.pushHistory();
      void checkWin(); 
      setTimeout(runAnalysis, 50);

      const delta = countConfirmed() - cascadeStartSolveCountRef.current;
      if (delta >= 2) {
         playInteractionSound('APPLAUSE');
      }
    }
  }, [gameState, runAnalysis, playInteractionSound, checkWin, setTick, enqueue, countConfirmed]);

  useEffect(() => {
    runCascadeRef.current = runCascade;
  }, [runCascade]);

  const handleStateChange = useCallback(() => {
    if (isGameWon) return;
    
    clearQueue();
    
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
        return; 
      }
    }
    
    cascadeStartSolveCountRef.current = countConfirmed();

    if (pendingSoundRef.current) {
      playInteractionSound(pendingSoundRef.current);
      pendingSoundRef.current = null;
    }
    
    setTick(t => t + 1);
    setIsCascading(true);
    triggerSave();
    enqueue(async () => {
      await new Promise(res => setTimeout(res, 250));
      runCascadeRef.current?.();
    });
  }, [warningsEnabled, gameState, puzzle, binnedClueIds, triggerRedFlash, triggerSave, isGameWon, clearQueue, enqueue, playInteractionSound, pendingSoundRef, setHintCount, setTick, countConfirmed]);

  return { isCascading, setIsCascading, handleStateChange, runAnalysis, checkWin };
}
