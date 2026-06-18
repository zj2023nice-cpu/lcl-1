import { useState, useCallback, useRef, useEffect } from 'react';
import type { UploadProgress } from '../utils/upload/types';

interface UseUploadProgressOptions {
  initialProgress?: number;
  onProgressChange?: (progress: UploadProgress) => void;
  onComplete?: () => void;
  speedWindowSize?: number;
}

interface UseUploadProgressResult {
  progress: UploadProgress;
  isUploading: boolean;
  speed: number;
  updateProgress: (loaded: number, total: number) => void;
  resetProgress: () => void;
  startProgress: (total: number) => void;
  finishProgress: () => void;
}

export function useUploadProgress(options: UseUploadProgressOptions = {}): UseUploadProgressResult {
  const {
    initialProgress = 0,
    onProgressChange,
    onComplete,
    speedWindowSize = 5,
  } = options;

  const [progress, setProgress] = useState<UploadProgress>({
    percent: initialProgress,
    loaded: 0,
    total: 0,
    speed: 0,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [speed, setSpeed] = useState(0);

  const speedHistoryRef = useRef<{ time: number; bytes: number }[]>([]);
  const lastLoadedRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  const calculateSpeed = useCallback(
    (loaded: number) => {
      const now = Date.now();
      const history = speedHistoryRef.current;

      history.push({ time: now, bytes: loaded });

      if (history.length > speedWindowSize) {
        history.shift();
      }

      if (history.length >= 2) {
        const first = history[0];
        const last = history[history.length - 1];
        const timeDiff = (last.time - first.time) / 1000;
        const byteDiff = last.bytes - first.bytes;

        if (timeDiff > 0) {
          return byteDiff / timeDiff;
        }
      }

      return 0;
    },
    [speedWindowSize]
  );

  const updateProgress = useCallback(
    (loaded: number, total: number) => {
      const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
      const currentSpeed = calculateSpeed(loaded);

      const newProgress: UploadProgress = {
        percent: Math.min(percent, 100),
        loaded,
        total,
        speed: currentSpeed,
      };

      setProgress(newProgress);
      setSpeed(currentSpeed);
      onProgressChange?.(newProgress);

      if (loaded >= total && total > 0) {
        setIsUploading(false);
        onComplete?.();
      }
    },
    [calculateSpeed, onProgressChange, onComplete]
  );

  const resetProgress = useCallback(() => {
    setProgress({
      percent: 0,
      loaded: 0,
      total: 0,
      speed: 0,
    });
    setIsUploading(false);
    setSpeed(0);
    speedHistoryRef.current = [];
    lastLoadedRef.current = 0;
    startTimeRef.current = 0;
  }, []);

  const startProgress = useCallback((total: number) => {
    setIsUploading(true);
    setProgress({
      percent: 0,
      loaded: 0,
      total,
      speed: 0,
    });
    speedHistoryRef.current = [];
    lastLoadedRef.current = 0;
    startTimeRef.current = Date.now();
  }, []);

  const finishProgress = useCallback(() => {
    setIsUploading(false);
    setProgress((prev) => ({
      ...prev,
      percent: 100,
      loaded: prev.total,
    }));
    speedHistoryRef.current = [];
  }, []);

  return {
    progress,
    isUploading,
    speed,
    updateProgress,
    resetProgress,
    startProgress,
    finishProgress,
  };
}

export function formatUploadSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(1)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function formatEstimatedTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '--';
  if (seconds < 60) return `${Math.ceil(seconds)} 秒`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} 分钟`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  return `${hours} 小时 ${minutes} 分`;
}
