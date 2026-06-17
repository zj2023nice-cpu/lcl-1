import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, Clock, Filter, Calendar, ChevronDown, Mic, Radio, CheckSquare, MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Program, Episode, Task, Annotation } from '@/types';
import { mockPrograms, mockEpisodes, mockTasks, mockAnnotations } from '@/mock/data';
import { useNavigate } from 'react-router-dom';
import { format, isWithinInterval, parseISO } from 'date-fns';

type SearchCategory = 'all' | 'programs' | 'episodes' | 'tasks' | 'annotations';

interface SearchItem {
  id: string;
  type: SearchCategory;
  title: string;
  subtitle?: string;
  createdAt: string;
  data: Program | Episode | Task | Annotation;
}

interface DateRange {
  start?: string;
  end?: string;
}

const CATEGORY_OPTIONS: { value: SearchCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: '全部', icon: <Search size={14} />, color: 'text-gray-500' },
  { value: 'programs', label: '节目', icon: <Radio size={14} />, color: 'text-blue-500' },
  { value: 'episodes', label: '集数', icon: <Mic size={14} />, color: 'text-purple-500' },
  { value: 'tasks', label: '任务', icon: <CheckSquare size={14} />, color: 'text-amber-500' },
  { value: 'annotations', label: '标注', icon: <MessageSquare size={14} />, color: 'text-green-500' },
];

const HISTORY_KEY = 'global_search_history';
const MAX_HISTORY = 10;

const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/60 text-yellow-900 dark:text-yellow-100 rounded px-0.5 font-medium">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    )
  );
};

const getCategoryIcon = (type: SearchCategory) => {
  const option = CATEGORY_OPTIONS.find(o => o.value === type);
  return option?.icon || <Search size={14} />;
};

const getCategoryColor = (type: SearchCategory) => {
  const option = CATEGORY_OPTIONS.find(o => o.value === type);
  return option?.color || 'text-gray-500';
};

export const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch {
        setSearchHistory([]);
      }
    }
  }, []);

  const saveHistory = useCallback((term: string) => {
    if (!term.trim()) return;
    const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, MAX_HISTORY);
    setSearchHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  }, [searchHistory]);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const allSearchItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = [];
    mockPrograms.forEach(p => items.push({
      id: `p-${p.id}`,
      type: 'programs',
      title: p.name,
      subtitle: p.description,
      createdAt: p.createdAt,
      data: p,
    }));
    mockEpisodes.forEach(e => items.push({
      id: `e-${e.id}`,
      type: 'episodes',
      title: e.title,
      subtitle: e.description,
      createdAt: e.createdAt,
      data: e,
    }));
    mockTasks.forEach(t => items.push({
      id: `t-${t.id}`,
      type: 'tasks',
      title: t.title,
      subtitle: t.description,
      createdAt: t.createdAt,
      data: t,
    }));
    mockAnnotations.forEach(a => items.push({
      id: `a-${a.id}`,
      type: 'annotations',
      title: a.content,
      subtitle: `${a.type} · ${a.status}`,
      createdAt: a.createdAt,
      data: a,
    }));
    return items;
  }, []);

  const suggestions = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return [];

    const filtered = allSearchItems.filter(item => {
      const matchesQuery =
        item.title.toLowerCase().includes(trimmedQuery) ||
        (item.subtitle?.toLowerCase().includes(trimmedQuery) ?? false);

      const matchesCategory = activeCategory === 'all' || item.type === activeCategory;

      let matchesDate = true;
      if (dateRange.start || dateRange.end) {
        try {
          const itemDate = parseISO(item.createdAt);
          const start = dateRange.start ? parseISO(dateRange.start) : new Date(0);
          const end = dateRange.end ? parseISO(dateRange.end) : new Date();
          end.setHours(23, 59, 59, 999);
          matchesDate = isWithinInterval(itemDate, { start, end });
        } catch {
          matchesDate = false;
        }
      }

      return matchesQuery && matchesCategory && matchesDate;
    });

    filtered.sort((a, b) => {
      const aTitle = a.title.toLowerCase().startsWith(trimmedQuery) ? 0 : 1;
      const bTitle = b.title.toLowerCase().startsWith(trimmedQuery) ? 0 : 1;
      return aTitle - bTitle;
    });

    return filtered.slice(0, 15);
  }, [query, activeCategory, dateRange, allSearchItems]);

  const showResults = isOpen && (query.trim().length > 0 || searchHistory.length > 0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [query, activeCategory, dateRange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = query.trim() ? suggestions : searchHistory;
    if (!showResults) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev < items.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        saveHistory(query.trim());
      }
      if (highlightIndex >= 0) {
        if (query.trim()) {
          handleSelectItem(suggestions[highlightIndex]);
        } else {
          setQuery(searchHistory[highlightIndex]);
          inputRef.current?.focus();
        }
      } else if (query.trim()) {
        saveHistory(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectItem = (item: SearchItem) => {
    saveHistory(query.trim());
    setIsOpen(false);
    setQuery('');
    setDateRange({});
    setActiveCategory('all');

    switch (item.type) {
      case 'programs':
        navigate(`/programs`);
        break;
      case 'episodes':
        navigate(`/programs/${(item.data as Episode).programId}`);
        break;
      case 'tasks':
        navigate(`/tasks`);
        break;
      case 'annotations':
        navigate(`/editor/${(item.data as Annotation).episodeId}`);
        break;
    }
  };

  const handleSelectHistory = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const activeFilterCount = (activeCategory !== 'all' ? 1 : 0) + ((dateRange.start || dateRange.end) ? 1 : 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <div className={cn(
          "flex items-center gap-2 rounded-xl border bg-background transition-all",
          isOpen ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20" : "border-border hover:border-input"
        )}>
          <Search size={18} className="ml-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="搜索节目、集数、任务、标注..."
            className="flex-1 bg-transparent py-2.5 pr-2 outline-none text-sm placeholder:text-muted-foreground"
          />
          {activeFilterCount > 0 && (
            <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-2 rounded-lg transition-colors flex-shrink-0",
              showFilters ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Filter size={16} />
          </button>
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="p-2 mr-1 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="absolute top-full left-0 right-0 mt-2 p-4 rounded-xl border border-border bg-popover shadow-xl z-50">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">分类筛选</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setActiveCategory(activeCategory === opt.value ? 'all' : opt.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        activeCategory === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1.5">
                  <Calendar size={12} />
                  时间范围
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <span className="text-muted-foreground">至</span>
                  <input
                    type="date"
                    value={dateRange.end || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {(dateRange.start || dateRange.end) && (
                    <button
                      onClick={() => setDateRange({})}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      title="清除时间筛选"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-popover shadow-xl z-50 overflow-hidden">
            {query.trim() ? (
              suggestions.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b border-border sticky top-0">
                    找到 {suggestions.length} 个结果
                  </div>
                  {suggestions.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setHighlightIndex(index)}
                      className={cn(
                        "w-full px-4 py-3 text-left border-b border-border last:border-b-0 transition-colors flex items-start gap-3",
                        highlightIndex === index ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <div className={cn("mt-0.5 flex-shrink-0", getCategoryColor(item.type))}>
                        {getCategoryIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {highlightText(item.title, query)}
                        </div>
                        {item.subtitle && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {highlightText(item.subtitle, query)}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(item.createdAt), 'yyyy-MM-dd HH:mm')}
                        </div>
                      </div>
                      <ChevronDown size={14} className="text-muted-foreground flex-shrink-0 mt-1 rotate-[-90deg]" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  未找到匹配的结果
                </div>
              )
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b border-border sticky top-0 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Clock size={12} />搜索历史</span>
                  {searchHistory.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      清空
                    </button>
                  )}
                </div>
                {searchHistory.length > 0 ? (
                  searchHistory.map((term, index) => (
                    <button
                      key={`${term}-${index}`}
                      onClick={() => handleSelectHistory(term)}
                      onMouseEnter={() => setHighlightIndex(index)}
                      className={cn(
                        "w-full px-4 py-2.5 text-left border-b border-border last:border-b-0 transition-colors flex items-center gap-3",
                        highlightIndex === index ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground flex-1 truncate">{term}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    暂无搜索历史
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
