import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useThemeContext } from '@/context/ThemeContext';
import { ThemeMode } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export const ThemeToggle: React.FC = () => {
  const { themeMode, setTheme } = useThemeContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: '浅色模式', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: '深色模式', icon: <Moon className="w-4 h-4" /> },
    { value: 'auto', label: '跟随系统', icon: <Monitor className="w-4 h-4" /> },
  ];

  const currentOption = options.find(o => o.value === themeMode) || options[2];

  const handleSelect = (mode: ThemeMode) => {
    setTheme(mode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
          'hover:bg-foreground/5 text-muted hover:text-foreground',
          isOpen && 'bg-foreground/5'
        )}
      >
        {currentOption.icon}
        <span className="text-sm font-medium hidden sm:inline">{currentOption.label}</span>
        <ChevronDown className={cn(
          'w-4 h-4 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-40 glass-card p-1 z-50 animate-slide-down">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors duration-200',
                themeMode === option.value
                  ? 'bg-primary-500/20 text-primary-500'
                  : 'text-muted hover:text-foreground hover:bg-foreground/5'
              )}
            >
              {option.icon}
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
