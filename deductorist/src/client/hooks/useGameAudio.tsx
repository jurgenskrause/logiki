import { useRef, useState, useCallback, useEffect } from 'react';

import eliminateSfx from '../../../assets/sounds/eliminate.wav';
import solveSfx from '../../../assets/sounds/solve.wav';
import mistakeSfx from '../../../assets/sounds/mistake.wav';
import moveClueSfx from '../../../assets/sounds/moveclue.wav';
import winSfx from '../../../assets/sounds/win.wav';
import applauseSfx from '../../../assets/sounds/applause.wav';

export function useGameAudio() {
  const eliminateAudioRef = useRef<HTMLAudioElement | null>(null);
  const solveAudioRef = useRef<HTMLAudioElement | null>(null);
  const mistakeAudioRef = useRef<HTMLAudioElement | null>(null);
  const moveClueAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const applauseAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSoundRef = useRef<'solve' | 'eliminate' | null>(null);

  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  useEffect(() => {
    eliminateAudioRef.current = new Audio(eliminateSfx);
    solveAudioRef.current = new Audio(solveSfx);
    mistakeAudioRef.current = new Audio(mistakeSfx);
    moveClueAudioRef.current = new Audio(moveClueSfx);
    winAudioRef.current = new Audio(winSfx);
    applauseAudioRef.current = new Audio(applauseSfx);
  }, []);

  const internalPlayInteractionSound = useCallback((type: 'solve' | 'eliminate' | 'mistake' | 'moveclue' | 'win' | 'APPLAUSE', force: boolean = false) => {
    if (!force && !isSoundEnabled) return;
    
    let audio: HTMLAudioElement | null = null;
    switch (type) {
      case 'solve': audio = solveAudioRef.current; break;
      case 'eliminate': audio = eliminateAudioRef.current; break;
      case 'mistake': audio = mistakeAudioRef.current; break;
      case 'moveclue': audio = moveClueAudioRef.current; break;
      case 'win': audio = winAudioRef.current; break;
      case 'APPLAUSE': audio = applauseAudioRef.current; break;
    }
    
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }, [isSoundEnabled]);

  return {
    isSoundEnabled,
    setIsSoundEnabled,
    internalPlayInteractionSound,
    pendingSoundRef
  };
}
