import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Clock, Trash2, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { SubtitleCue } from '@/types';
import { formatTimeWithMs } from '@/utils/time';
import { fuzzySearch, highlightText, FuzzySearchResult } from '@/utils/fuzzySearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';

interface SubtitleSearchProps {
  cues: SubtitleCue[];
  audioVersionId: string;
  onResultClick: (cue: SubtitleCue) => void;
  onKeywordChange?: (keyword: string) => void;
  currentTime?: number;
  className?: string;
}

export const SubtitleSearch: React.FC<SubtitleSearchProps> = ({
  cues,
  audioVersionId,
  onResultClick,
  onKeywordChange,
  currentTime = 0,
  className = '',
}) => {
  const [keyword, setKeyword] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory(audioVersionId);

  const searchResults = useMemo<FuzzySearchResult[]>(() => {
    if (!keyword.trim()) return [];
    return fuzzySearch(
      cues.map((c) => ({
        id: c.id,
        startTime: c.startTime,
        endTime: c.endTime,
        text: c.text,
        speakerName: c.speakerName,
      })),
      keyword,
      { threshold: 0.6, includeSpeaker: true }
    );
  }, [cues, keyword]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults.length]);

  useEffect(() => {
    if (showResults && resultsContainerRef.current && searchResults.length > 0) {
      const selectedEl = resultsContainerRef.current.querySelector(
        `[data-result-index="${selectedIndex}"]`
      ) as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showResults, searchResults.length]);

  const handleSearch = (searchKeyword: string) => {
    setKeyword(searchKeyword);
    onKeywordChange?.(searchKeyword);
    if (searchKeyword.trim()) {
      setShowResults(true);
      setShowHistory(false);
    } else {
      setShowResults(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      const result = searchResults[selectedIndex];
      const cue = cues.find((c) => c.id === result.cueId);
      if (cue) {
        addToHistory(keyword.trim());
        onResultClick(cue);
        setShowResults(false);
      }
    }
  };

  const handleResultClick = (result: FuzzySearchResult) => {
    const cue = cues.find((c) => c.id === result.cueId);
    if (cue) {
      addToHistory(keyword.trim());
      onResultClick(cue);
      setShowResults(false);
    }
  };

  const handleHistoryClick = (item: { keyword: string }) => {
    handleSearch(item.keyword);
    setShowHistory(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showResults && searchResults.length > 0) {
        setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
      } else if (showHistory && history.length > 0) {
        setSelectedIndex((prev) => Math.min(prev + 1, history.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showResults && searchResults.length > 0) {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (showHistory && history.length > 0) {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
    } else if (e.key === 'Enter') {
      if (showResults && searchResults.length > 0) {
        handleResultClick(searchResults[selectedIndex]);
      } else if (showHistory && history.length > 0) {
        handleHistoryClick(history[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
      setShowHistory(false);
      inputRef.current?.blur();
    }
  };

  const isCueActive = (startTime: number, endTime: number) => {
    return currentTime >= startTime && currentTime <= endTime;
  };

  const renderHighlightedText = (text: string, matches: Array<{ start: number; end: number }>) => {
    const segments = highlightText(text, matches);
    return segments.map((segment, index) =>
      segment.isHighlight ? (
        <mark key={index} className="bg-yellow-500/40 text-yellow-200 px-0.5 rounded">
          {segment.text}
        </mark>
      ) : (
        <span key={index}>{segment.text}</span>
      )
    );
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={keyword}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              if (!keyword.trim() && history.length > 0) {
                setShowHistory(true);
              }
              if (keyword.trim()) {
                setShowResults(true);
              }
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => {
                setShowHistory(false);
                setShowResults(false);
              }, 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder="搜索字幕内容..."
            className={`w-full pl-10 pr-10 py-2.5 bg-card border rounded-lg text-sm focus:outline-none transition-all ${
              isFocused
                ? 'border-primary-500 ring-2 ring-primary-500/20'
                : 'border-border hover:border-foreground/30'
            }`}
          />
          {keyword && (
            <button
              type="button"
              onClick={() => {
                setKeyword('');
                setShowResults(false);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {showHistory && history.length > 0 && !keyword.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs text-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              搜索历史
            </span>
            <button
              onClick={clearHistory}
              className="text-xs text-muted hover:text-error flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {history.map((item, index) => (
              <button
                key={`${item.keyword}-${item.timestamp}`}
                onClick={() => handleHistoryClick(item)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  selectedIndex === index
                    ? 'bg-primary-500/10 text-foreground'
                    : 'hover:bg-foreground/5 text-foreground'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                <span className="truncate flex-1">{item.keyword}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromHistory(item.keyword);
                  }}
                  className="p-0.5 rounded hover:bg-foreground/10 text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {showResults && keyword.trim() && (
        <div
          ref={resultsContainerRef}
          className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden"
        >
          {searchResults.length > 0 ? (
            <>
              <div className="px-3 py-2 border-b border-border">
                <span className="text-xs text-muted">
                  找到 {searchResults.length} 个匹配结果
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={result.cueId}
                    data-result-index={index}
                    onClick={() => handleResultClick(result)}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/50 last:border-b-0 ${
                      selectedIndex === index
                        ? 'bg-primary-500/10'
                        : 'hover:bg-foreground/5'
                    } ${isCueActive(result.startTime, result.endTime) ? 'bg-primary-500/5' : ''}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Play
                        className={`w-3.5 h-3.5 ${
                          isCueActive(result.startTime, result.endTime)
                            ? 'text-primary-400'
                            : 'text-muted'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted">
                          {formatTimeWithMs(result.startTime)}
                        </span>
                        {result.speakerName && (
                          <span className="text-xs text-primary-400 font-medium">
                            {result.speakerName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                        {renderHighlightedText(result.text, result.matches)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted">未找到匹配的字幕内容</p>
              <p className="text-xs text-muted/70 mt-1">
                试试其他关键词，或检查拼写是否正确
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
