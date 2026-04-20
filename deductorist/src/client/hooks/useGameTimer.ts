import { useState, useEffect, useRef } from 'react';

export function useGameTimer(isGameStarted: boolean, isGameWon: boolean, initialElapsed: number = 0) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsed);
  const elapsedSecondsRef = useRef(initialElapsed);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

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

  return { elapsedSeconds, setElapsedSeconds, elapsedSecondsRef, formatTime };
}
