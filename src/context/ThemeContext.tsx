import React, { createContext, useContext, ReactNode } from 'react';
import { useTheme, ThemeMode, ResolvedTheme } from '@/hooks/useTheme';

interface ThemeContextValue {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  systemTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const theme = useTheme();

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
