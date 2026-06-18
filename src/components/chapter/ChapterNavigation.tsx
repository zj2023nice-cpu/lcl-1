import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Play, ChevronLeft, ChevronRight, List, GripVertical } from 'lucide-react';
import { Chapter } from '@/types';
import { formatTime } from '@/utils/time';
import { cn } from '@/lib/utils';

interface ChapterNavigationProps {
  chapters: Chapter[];
  currentTime: number;
  duration: number;
  onChapterClick: (chapter: Chapter) => void;
  onChapterDragEnd?: (chapterId: string, newStartTime: number) => void;
  className?: string;
  compact?: boolean;
}

const CHAPTER_COLORS = [
  'bg-primary-500/80 hover:bg-primary-500',
  'bg-accent-500/80 hover:bg-accent-500',
  'bg-success-500/80 hover:bg-success-500',
  'bg-warning-500/80 hover:bg-warning-500',
  'bg-purple-500/80 hover:bg-purple-500',
  'bg-pink-500/80 hover:bg-pink-500',
  'bg-cyan-500/80 hover:bg-cyan-500',
  'bg-orange-500/80 hover:bg-orange-500',
];

export const ChapterNavigation: React.FC<ChapterNavigationProps> = ({
  chapters,
  currentTime,
  duration,
  onChapterClick,
  onChapterDragEnd,
  className = '',
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showList, setShowList] = useState(false);
  const [draggingChapter, setDraggingChapter] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => a.startTime - b.startTime);
  }, [chapters]);

  const currentChapter = useMemo(() => {
    return sortedChapters.find(
      (chap) => currentTime >= chap.startTime && currentTime < chap.endTime
    );
  }, [sortedChapters, currentTime]);

  const currentIndex = useMemo(() => {
    return sortedChapters.findIndex((c) => c.id === currentChapter?.id);
  }, [sortedChapters, currentChapter]);

  const handlePrevChapter = () => {
    if (currentIndex > 0) {
      onChapterClick(sortedChapters[currentIndex - 1]);
    } else if (sortedChapters.length > 0) {
      onChapterClick(sortedChapters[0]);
    }
  };

  const handleNextChapter = () => {
    if (currentIndex < sortedChapters.length - 1) {
      onChapterClick(sortedChapters[currentIndex + 1]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, chapter: Chapter) => {
    if (!onChapterDragEnd) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || duration === 0) return;

    const clickX = e.clientX - rect.left;
    const chapterX = (chapter.startTime / duration) * rect.width;
    setDragOffset(clickX - chapterX);
    setDraggingChapter(chapter.id);
  };

  useEffect(() => {
    if (!draggingChapter) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || duration === 0) return;

      const x = e.clientX - rect.left - dragOffset;
      const newStartTime = Math.max(0, Math.min(duration - 5, (x / rect.width) * duration));

      const chapter = sortedChapters.find((c) => c.id === draggingChapter);
      if (chapter) {
        const chapterDuration = chapter.endTime - chapter.startTime;
        const clampedStart = Math.min(newStartTime, duration - chapterDuration);
        onChapterDragEnd?.(draggingChapter, clampedStart);
      }
    };

    const handleMouseUp = () => {
      setDraggingChapter(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingChapter, dragOffset, duration, sortedChapters, onChapterDragEnd]);

  if (chapters.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <button
          onClick={handlePrevChapter}
          disabled={currentIndex <= 0}
          className="p-1.5 rounded-lg hover:bg-foreground/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="上一章节"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0 text-center">
          <span className="text-muted text-xs">章节</span>
          <p className="font-medium truncate" title={currentChapter?.title || ''}>
            {currentChapter?.title || '未开始'}
          </p>
        </div>

        <button
          onClick={handleNextChapter}
          disabled={currentIndex >= sortedChapters.length - 1}
          className="p-1.5 rounded-lg hover:bg-foreground/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="下一章节"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground">章节导航</h4>
          <span className="text-xs text-muted">{chapters.length} 个章节</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevChapter}
            disabled={currentIndex <= 0}
            className="p-1.5 rounded-lg hover:bg-foreground/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="上一章节"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextChapter}
            disabled={currentIndex >= sortedChapters.length - 1}
            className="p-1.5 rounded-lg hover:bg-foreground/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="下一章节"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowList(!showList)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              showList ? 'bg-primary-500/20 text-primary-400' : 'hover:bg-foreground/10'
            )}
            title="章节列表"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative h-10 rounded-lg overflow-hidden bg-card/50 cursor-pointer"
      >
        {sortedChapters.map((chapter, index) => {
          const left = (chapter.startTime / duration) * 100;
          const width = ((chapter.endTime - chapter.startTime) / duration) * 100;
          const isActive = currentChapter?.id === chapter.id;
          const isPast = currentTime >= chapter.endTime;
          const colorClass = CHAPTER_COLORS[index % CHAPTER_COLORS.length];

          return (
            <div
              key={chapter.id}
              className={cn(
                'absolute top-0 h-full transition-all group',
                colorClass,
                isActive ? 'ring-2 ring-white/50' : '',
                isPast ? 'opacity-60' : ''
              )}
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 0.5)}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onChapterClick(chapter);
              }}
              onMouseDown={(e) => handleMouseDown(e, chapter)}
              title={`${chapter.title} (${formatTime(chapter.startTime)} - ${formatTime(chapter.endTime)})`}
            >
              {onChapterDragEnd && width > 3 && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity bg-white/30"
                  onMouseDown={(e) => handleMouseDown(e, chapter)}
                />
              )}
              {onChapterDragEnd && width > 3 && (
                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity bg-white/30" />
              )}

              {width > 8 && (
                <div className="absolute inset-0 flex items-center justify-center px-1 overflow-hidden">
                  <span className="text-xs font-medium text-white truncate drop-shadow">
                    {chapter.title}
                  </span>
                </div>
              )}

              {width > 5 && (
                <GripVertical className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          );
        })}

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-10"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>{formatTime(0)}</span>
        <span className="font-medium text-foreground">
          {currentChapter ? `${currentChapter.title} · ${formatTime(currentChapter.startTime)}` : ''}
        </span>
        <span>{formatTime(duration)}</span>
      </div>

      {showList && (
        <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
          {sortedChapters.map((chapter, index) => {
            const isActive = currentChapter?.id === chapter.id;
            return (
              <button
                key={chapter.id}
                onClick={() => onChapterClick(chapter)}
                className={cn(
                  'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                  isActive ? 'bg-primary-500/20' : 'hover:bg-foreground/5'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-white text-xs font-bold',
                    CHAPTER_COLORS[index % CHAPTER_COLORS.length].split(' ')[0]
                  )}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', isActive ? 'text-primary-400' : 'text-foreground')}>
                    {chapter.title}
                  </p>
                  <p className="text-xs text-muted">
                    {formatTime(chapter.startTime)} - {formatTime(chapter.endTime)}
                    <span className="ml-2">
                      时长 {formatTime(chapter.endTime - chapter.startTime)}
                    </span>
                  </p>
                </div>
                <Play className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary-400' : 'text-muted')} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
