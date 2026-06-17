import { useState, useEffect, useCallback } from 'react';

const GLOBAL_STORAGE_KEY = 'playback-rate-global';
const PROGRAM_STORAGE_PREFIX = 'playback-rate-program-';

const DEFAULT_RATE = 1;

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function usePlaybackRate(programId?: string) {
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_RATE;

    if (programId) {
      const programRate = localStorage.getItem(`${PROGRAM_STORAGE_PREFIX}${programId}`);
      if (programRate) return parseFloat(programRate);
    }

    const globalRate = localStorage.getItem(GLOBAL_STORAGE_KEY);
    if (globalRate) return parseFloat(globalRate);

    return DEFAULT_RATE;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (programId) {
      localStorage.setItem(`${PROGRAM_STORAGE_PREFIX}${programId}`, playbackRate.toString());
    }

    localStorage.setItem(GLOBAL_STORAGE_KEY, playbackRate.toString());
  }, [playbackRate, programId]);

  const increaseRate = useCallback(() => {
    setPlaybackRate((prev) => {
      const currentIndex = PLAYBACK_RATES.indexOf(prev);
      const nextIndex = Math.min(currentIndex + 1, PLAYBACK_RATES.length - 1);
      return PLAYBACK_RATES[nextIndex];
    });
  }, []);

  const decreaseRate = useCallback(() => {
    setPlaybackRate((prev) => {
      const currentIndex = PLAYBACK_RATES.indexOf(prev);
      const prevIndex = Math.max(currentIndex - 1, 0);
      return PLAYBACK_RATES[prevIndex];
    });
  }, []);

  const resetRate = useCallback(() => {
    setPlaybackRate(DEFAULT_RATE);
  }, []);

  return {
    playbackRate,
    setPlaybackRate,
    increaseRate,
    decreaseRate,
    resetRate,
    rates: PLAYBACK_RATES,
  };
}
