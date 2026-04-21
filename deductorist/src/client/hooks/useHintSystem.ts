import React, { useState, useMemo, useCallback } from 'react';
import { applyHint } from '../../shared/engine/HintService';
import type { HintResult } from '../../shared/engine/HintService';
import type { GameState } from '../../shared/engine/GameState';

interface UseHintSystemProps {
  gameState: GameState | null;
  isCascading: boolean;
  isGameWon: boolean;
  binnedClueIds: Set<string>;
  showBin: boolean;
  setShowBin: (val: boolean) => void;
  activeMobileTab: 'horizontal' | 'vertical';
  setActiveMobileTab: (val: 'horizontal' | 'vertical') => void;
  setScrollToClueId: (id: string | null) => void;
  setElapsedSeconds: React.Dispatch<React.SetStateAction<number>>;
  penaltyMsRef: React.MutableRefObject<number>;
  triggerRedFlash: () => void;
  playInteractionSound: (action?: string) => void;
  pendingSoundRef: React.MutableRefObject<string | null>;
  handleStateChange: () => void;
}

export function useHintSystem({
  gameState,
  isCascading,
  isGameWon,
  binnedClueIds,
  showBin,
  setShowBin,
  activeMobileTab,
  setActiveMobileTab,
  setScrollToClueId,
  setElapsedSeconds,
  penaltyMsRef,
  triggerRedFlash,
  playInteractionSound,
  pendingSoundRef,
  handleStateChange
}: UseHintSystemProps) {
  const [activeHint, setActiveHint] = useState<HintResult | null>(null);
  const [hintShowing, setHintShowing] = useState(false);
  const [hintCount, setHintCount] = useState(0);

  const handleHintClick = useCallback(() => {
    if (!activeHint || isGameWon) return;
    if (isCascading) return; 

    if (!hintShowing) {
      if (activeHint.clue?.type === 'error') {
        playInteractionSound('mistake');
        triggerRedFlash();
      }
      setHintShowing(true);
      setHintCount(c => c + 1);
      setElapsedSeconds(s => s + 10);
      penaltyMsRef.current += 10000;

      if (activeHint.clue && activeHint.clue.type !== 'error') {
        const isBinned = binnedClueIds.has(activeHint.clue.id);
        if (showBin !== isBinned) setShowBin(isBinned);

        const isHorizontal = ['LEFT_OF', 'ADJACENT', 'SEQUENCE_THREE', 'GAPPED_NOT_MIDDLE', 'GAPPED_EXCLUSION'].includes(activeHint.clue.type);
        const wantedTab = isHorizontal ? 'horizontal' : 'vertical';
        if (activeMobileTab !== wantedTab) setActiveMobileTab(wantedTab);

        setScrollToClueId(activeHint.clue.id);
      }
    } else {
      if (gameState) {
        if (activeHint.action.type === 'RESTORE') {
          gameState.restoreToLastValid();
        } else {
          pendingSoundRef.current = activeHint.action.type === 'confirm' ? 'solve' : 'eliminate';
          applyHint(gameState, activeHint.action);
        }
        handleStateChange();
      }
      setHintShowing(false);
      setScrollToClueId(null);
    }
  }, [
    activeHint, isGameWon, isCascading, hintShowing, gameState, binnedClueIds,
    playInteractionSound, triggerRedFlash, setElapsedSeconds, penaltyMsRef,
    setShowBin, showBin, activeMobileTab, setActiveMobileTab, setScrollToClueId,
    pendingSoundRef, handleStateChange
  ]);

  const dismissHint = useCallback(() => {
    if (hintShowing) {
      setHintShowing(false);
      setScrollToClueId(null);
    }
  }, [hintShowing, setScrollToClueId]);

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

  return {
    activeHint, setActiveHint,
    hintShowing, setHintShowing,
    hintCount, setHintCount,
    handleHintClick, dismissHint, hintHighlights
  };
}
