import React, { useState, useCallback } from 'react';
import type { LeaderboardResponse } from '../../shared/api';
import type { PuzzleManifest } from '../../shared/engine/ManifestLoader';
import type { GameState } from '../../shared/engine/GameState';

interface UseLeaderboardSyncProps {
  DEV_BUILD: boolean;
  puzzle: PuzzleManifest | null;
  gameState: GameState | null;
  moveLogRef: React.MutableRefObject<{ cellIndex: number; timeOffsetMs: number }[]>;
  penaltyMsRef: React.MutableRefObject<number>;
  setSubmittedAward?: (award: { emoji: string; label: string } | null) => void;
}

export function useLeaderboardSync({ DEV_BUILD, puzzle, gameState, moveLogRef, penaltyMsRef, setSubmittedAward }: UseLeaderboardSyncProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const fetchLeaderboard = useCallback(async (puzzleDate: string, sizeStr: string) => {
    try {
      const r = await fetch(`/api/game/leaderboard?gridSize=${sizeStr}&date=${puzzleDate}`);
      if (r.ok) {
        const res = await r.json();
        if (res.type === 'leaderboard') setLeaderboardData(res);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const submitScore = useCallback(async () => {
    if (!puzzle || !gameState) return;
    
    if (puzzle.isRandom) {
       setIsSubmittingScore(false);
       setUserRank(null);
       return;
    }

    const todayLocal = new Date().toISOString().split('T')[0];
    const puzzleDate = puzzle.date || todayLocal;
    const isHistorical = puzzleDate !== todayLocal && puzzleDate !== 'today';
    const sizeStr = `${puzzle.rows}x${puzzle.cols}`;

    setIsSubmittingScore(true);

    if (isHistorical) {
        await fetchLeaderboard(puzzleDate, sizeStr);
        setIsSubmittingScore(false);
    } else {
        try {
            const submitResponse = await fetch('/api/game/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                puzzleId: `${puzzleDate}-${sizeStr}-${puzzle.difficulty}`,
                boardState: Array.from(gameState.grid),
                moveLog: moveLogRef.current,
                isDevBuild: DEV_BUILD,
                penaltyMs: penaltyMsRef.current
              })
            });
            const submitData = await submitResponse.json();
            
            if (submitData.status === 'verified' || DEV_BUILD) {
               if (submitData.rank !== undefined) setUserRank(submitData.rank);
               if (submitData.award !== undefined && setSubmittedAward) setSubmittedAward(submitData.award);
               await fetchLeaderboard(puzzleDate, sizeStr);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmittingScore(false);
        }
    }
  }, [puzzle, gameState, moveLogRef, penaltyMsRef, DEV_BUILD, fetchLeaderboard]);

  const shareScore = useCallback(async (msg: string) => {
    setIsSharing(true);
    try {
      const r = await fetch('/api/game/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await r.json();
      if (data.status === 'success') alert('Score shared structurally to thread!');
      else alert('Failed to share: ' + data.message);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSharing(false);
    }
  }, []);

  return {
    leaderboardData,
    setLeaderboardData,
    userRank,
    setUserRank,
    isSubmittingScore,
    setIsSubmittingScore,
    isSharing,
    submitScore,
    fetchLeaderboard,
    shareScore
  };
}
