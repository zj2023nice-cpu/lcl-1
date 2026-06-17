import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme-mode';

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'auto';
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return saved || 'auto';
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const resolvedTheme: ResolvedTheme = themeMode === 'auto' ? systemTheme : themeMode;
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    
    root.style.colorScheme = resolvedTheme;
    
    localStorage.setItem(STORAGE_KEY, themeMode);
  }, [resolvedTheme, themeMode]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(prev => {
      if (prev === 'auto') return 'light';
      if (prev === 'light') return 'dark';
      return 'auto';
    });
  }, []);

  return {
    themeMode,
    resolvedTheme,
    isDark,
    setTheme,
    toggleTheme,
    systemTheme,
  };
}
