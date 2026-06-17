import { useState, useEffect, useCallback } from 'react';

const MAX_HISTORY = 20;

export interface SearchHistoryItem {
  keyword: string;
  timestamp: number;
}

const getStorageKey = (audioVersionId: string) => `subtitle_search_history_${audioVersionId}`;

export const useSearchHistory = (audioVersionId: string) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    if (!audioVersionId) return;

    try {
      const stored = localStorage.getItem(getStorageKey(audioVersionId));
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error('读取搜索历史失败:', err);
    }
  }, [audioVersionId]);

  const saveHistory = useCallback((items: SearchHistoryItem[]) => {
    if (!audioVersionId) return;
    try {
      localStorage.setItem(getStorageKey(audioVersionId), JSON.stringify(items));
    } catch (err) {
      console.error('保存搜索历史失败:', err);
    }
  }, [audioVersionId]);

  const addToHistory = useCallback((keyword: string) => {
    if (!keyword.trim()) return;

    setHistory((prev) => {
      const filtered = prev.filter((item) => item.keyword.toLowerCase() !== keyword.toLowerCase());
      const newHistory = [
        { keyword, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_HISTORY);

      saveHistory(newHistory);
      return newHistory;
    });
  }, [saveHistory]);

  const removeFromHistory = useCallback((keyword: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter((item) => item.keyword !== keyword);
      saveHistory(newHistory);
      return newHistory;
    });
  }, [saveHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (audioVersionId) {
      localStorage.removeItem(getStorageKey(audioVersionId));
    }
  }, [audioVersionId]);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
};
