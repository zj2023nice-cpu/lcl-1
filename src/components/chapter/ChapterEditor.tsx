import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Download,
  Upload,
  Sparkles,
  Play,
  Image,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  Settings,
  Search,
  Clock,
  GripVertical,
} from 'lucide-react';
import { Chapter, ChapterDetectionConfig, ChapterImportExportData, WaveformData } from '@/types';
import { formatTime, parseTimeString } from '@/utils/time';
import { detectChapters, validateChapterTime, normalizeChapterOrder } from '@/utils/chapterDetection';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface ChapterEditorProps {
  chapters: Chapter[];
  waveformData?: WaveformData;
  duration: number;
  episodeId?: string;
  audioVersionId?: string;
  currentTime?: number;
  onChaptersChange: (chapters: Chapter[]) => void;
  onChapterClick?: (chapter: Chapter) => void;
  onAddChapterAtCurrentTime?: () => void;
  variant?: 'default' | 'borderless';
  className?: string;
}

const DEFAULT_DETECTION_CONFIG: ChapterDetectionConfig = {
  minSilenceDuration: 1.5,
  silenceThreshold: 0.15,
  minChapterDuration: 60,
  maxChapterDuration: 600,
  enableTopicDetection: true,
};

const CHAPTER_COLORS = [
  'bg-primary-500',
  'bg-accent-500',
  'bg-success-500',
  'bg-warning-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-orange-500',
];

export const ChapterEditor: React.FC<ChapterEditorProps> = ({
  chapters,
  waveformData,
  duration,
  episodeId,
  audioVersionId,
  currentTime = 0,
  onChaptersChange,
  onChapterClick,
  onAddChapterAtCurrentTime,
  variant = 'default',
  className = '',
}) => {
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    thumbnailUrl: string;
  }>>({});
  const [showDetectionSettings, setShowDetectionSettings] = useState(false);
  const [detectionConfig, setDetectionConfig] = useState<ChapterDetectionConfig>(DEFAULT_DETECTION_CONFIG);
  const [isDetecting, setIsDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => a.startTime - b.startTime);
  }, [chapters]);

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return sortedChapters;
    const query = searchQuery.toLowerCase();
    return sortedChapters.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        (c.description || '').toLowerCase().includes(query)
    );
  }, [sortedChapters, searchQuery]);

  const currentChapter = useMemo(() => {
    return sortedChapters.find(
      (chap) => currentTime >= chap.startTime && currentTime < chap.endTime
    );
  }, [sortedChapters, currentTime]);

  const handleAutoDetect = useCallback(async () => {
    if (!waveformData || !episodeId || !audioVersionId) {
      setError('缺少波形数据或音频信息，无法自动检测');
      return;
    }

    try {
      setIsDetecting(true);
      setError(null);

      await new Promise((resolve) => setTimeout(resolve, 800));

      const result = detectChapters(waveformData, episodeId, audioVersionId, detectionConfig);
      const normalized = normalizeChapterOrder(result.chapters);

      onChaptersChange(normalized);
    } catch (err: any) {
      setError(err.message || '自动检测失败');
    } finally {
      setIsDetecting(false);
    }
  }, [waveformData, episodeId, audioVersionId, detectionConfig, onChaptersChange]);

  const handleAddChapter = useCallback(() => {
    if (!episodeId || !audioVersionId) return;

    const startTime = currentTime;
    const endTime = Math.min(startTime + 60, duration);

    const newChapter: Chapter = {
      id: `chap_${Date.now()}`,
      episodeId,
      audioVersionId,
      startTime,
      endTime,
      title: `新章节 ${sortedChapters.length + 1}`,
      description: '',
      order: sortedChapters.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newChapters = normalizeChapterOrder([...chapters, newChapter]);
    onChaptersChange(newChapters);
    setEditingChapter(newChapter.id);
    setEditValues({
      [newChapter.id]: {
        title: newChapter.title,
        description: '',
        startTime: formatTime(newChapter.startTime),
        endTime: formatTime(newChapter.endTime),
        thumbnailUrl: '',
      },
    });
  }, [episodeId, audioVersionId, currentTime, duration, sortedChapters.length, chapters, onChaptersChange]);

  const handleDeleteChapter = useCallback((chapterId: string) => {
    const newChapters = chapters.filter((c) => c.id !== chapterId);
    onChaptersChange(normalizeChapterOrder(newChapters));
    if (editingChapter === chapterId) {
      setEditingChapter(null);
    }
  }, [chapters, editingChapter, onChaptersChange]);

  const handleStartEdit = useCallback((chapter: Chapter) => {
    setEditingChapter(chapter.id);
    setSelectedChapterId(chapter.id);
    setEditValues({
      [chapter.id]: {
        title: chapter.title,
        description: chapter.description || '',
        startTime: formatTime(chapter.startTime),
        endTime: formatTime(chapter.endTime),
        thumbnailUrl: chapter.thumbnailUrl || '',
      },
    });
  }, []);

  const handleSaveEdit = useCallback((chapterId: string) => {
    const values = editValues[chapterId];
    if (!values) return;

    const startTime = parseTimeString(values.startTime);
    const endTime = parseTimeString(values.endTime);

    const validation = validateChapterTime(chapters, chapterId, startTime, endTime, duration);
    if (!validation.valid) {
      setError(validation.error || '时间无效');
      return;
    }

    const newChapters = chapters.map((c) =>
      c.id === chapterId
        ? {
            ...c,
            title: values.title || '未命名章节',
            description: values.description,
            startTime,
            endTime,
            thumbnailUrl: values.thumbnailUrl || undefined,
            updatedAt: new Date().toISOString(),
          }
        : c
    );

    onChaptersChange(normalizeChapterOrder(newChapters));
    setEditingChapter(null);
    setError(null);
  }, [editValues, chapters, duration, onChaptersChange]);

  const handleCancelEdit = useCallback(() => {
    setEditingChapter(null);
    setError(null);
  }, []);

  const handleMoveChapter = useCallback((chapterId: string, direction: 'up' | 'down') => {
    const index = sortedChapters.findIndex((c) => c.id === chapterId);
    if (index === -1) return;

    const newChapters = [...sortedChapters];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newChapters.length) return;

    const current = newChapters[index];
    const target = newChapters[targetIndex];

    const currentStart = current.startTime;
    const currentEnd = current.endTime;
    const targetStart = target.startTime;
    const targetEnd = target.endTime;

    newChapters[index] = {
      ...current,
      startTime: targetStart,
      endTime: targetStart + (currentEnd - currentStart),
      updatedAt: new Date().toISOString(),
    };
    newChapters[targetIndex] = {
      ...target,
      startTime: currentStart,
      endTime: currentStart + (targetEnd - targetStart),
      updatedAt: new Date().toISOString(),
    };

    onChaptersChange(normalizeChapterOrder(newChapters));
  }, [sortedChapters, onChaptersChange]);

  const handleExport = useCallback(() => {
    const exportData: ChapterImportExportData = {
      version: '1.0',
      episodeId,
      audioVersionId,
      duration,
      chapters: sortedChapters.map((c) => ({
        startTime: c.startTime,
        endTime: c.endTime,
        title: c.title,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chapters_${episodeId || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [episodeId, audioVersionId, duration, sortedChapters]);

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !episodeId || !audioVersionId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ChapterImportExportData;

        if (!data.chapters || !Array.isArray(data.chapters)) {
          throw new Error('文件格式不正确：缺少 chapters 数组');
        }

        const importedChapters: Chapter[] = data.chapters.map((c, index) => ({
          id: `chap_imported_${Date.now()}_${index}`,
          episodeId,
          audioVersionId,
          startTime: c.startTime,
          endTime: c.endTime,
          title: c.title || `导入章节 ${index + 1}`,
          description: c.description,
          thumbnailUrl: c.thumbnailUrl,
          order: index,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        onChaptersChange(normalizeChapterOrder(importedChapters));
        setError(null);
      } catch (err: any) {
        setError(`导入失败：${err.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [episodeId, audioVersionId, onChaptersChange]);

  const handleThumbnailUpload = useCallback((chapterId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setEditValues((prev) => ({
          ...prev,
          [chapterId]: {
            ...prev[chapterId],
            thumbnailUrl: dataUrl,
          },
        }));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  const containerClasses = cn(
    variant === 'default' && 'glass-card overflow-hidden',
    'flex flex-col',
    className
  );

  return (
    <div className={containerClasses}>
      {variant === 'default' && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-400" />
              章节管理
              <span className="text-xs text-muted font-normal">
                ({chapters.length} 个章节)
              </span>
            </h3>
          </div>
        </div>
      )}

      {variant === 'default' && (
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="搜索章节..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAutoDetect}
              disabled={isDetecting || !waveformData}
              className="btn-primary text-sm flex items-center gap-1.5 flex-1 justify-center"
            >
              {isDetecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  检测中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  自动检测
                </>
              )}
            </button>

            <button
              onClick={handleAddChapter}
              disabled={!episodeId || !audioVersionId}
              className="btn-secondary text-sm flex items-center gap-1.5"
              title="添加章节"
            >
              <Plus className="w-4 h-4" />
            </button>

            {onAddChapterAtCurrentTime && (
              <button
                onClick={onAddChapterAtCurrentTime}
                className="btn-secondary text-sm flex items-center gap-1.5"
                title="在当前时间点添加章节"
              >
                <Play className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleExport}
              disabled={chapters.length === 0}
              className="btn-secondary text-sm flex items-center gap-1.5"
              title="导出章节"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-sm flex items-center gap-1.5"
              title="导入章节"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />

            <button
              onClick={() => setShowDetectionSettings(!showDetectionSettings)}
              className={cn(
                'text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors',
                showDetectionSettings
                  ? 'bg-primary-500/20 border-primary-500/30 text-primary-400'
                  : 'border-border hover:bg-foreground/5 text-muted hover:text-foreground'
              )}
              title="检测设置"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showDetectionSettings && (
        <div className="p-3 border-b border-border bg-muted/10 space-y-3">
          <h4 className="text-sm font-medium text-foreground">自动检测设置</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-xs text-muted block mb-1">
                最小静音时长 (秒)
              </label>
              <input
                type="number"
                value={detectionConfig.minSilenceDuration}
                onChange={(e) =>
                  setDetectionConfig({
                    ...detectionConfig,
                    minSilenceDuration: parseFloat(e.target.value) || 0,
                  })
                }
                className="input-field py-1.5 text-sm"
                min="0.1"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">
                静音阈值 (0-1)
              </label>
              <input
                type="number"
                value={detectionConfig.silenceThreshold}
                onChange={(e) =>
                  setDetectionConfig({
                    ...detectionConfig,
                    silenceThreshold: parseFloat(e.target.value) || 0,
                  })
                }
                className="input-field py-1.5 text-sm"
                min="0"
                max="1"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">
                最小章节时长 (秒)
              </label>
              <input
                type="number"
                value={detectionConfig.minChapterDuration}
                onChange={(e) =>
                  setDetectionConfig({
                    ...detectionConfig,
                    minChapterDuration: parseInt(e.target.value) || 0,
                  })
                }
                className="input-field py-1.5 text-sm"
                min="5"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">
                最大章节时长 (秒)
              </label>
              <input
                type="number"
                value={detectionConfig.maxChapterDuration}
                onChange={(e) =>
                  setDetectionConfig({
                    ...detectionConfig,
                    maxChapterDuration: parseInt(e.target.value) || 0,
                  })
                }
                className="input-field py-1.5 text-sm"
                min="30"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={detectionConfig.enableTopicDetection}
              onChange={(e) =>
                setDetectionConfig({
                  ...detectionConfig,
                  enableTopicDetection: e.target.checked,
                })
              }
              className="rounded border-border"
            />
            启用话题变化检测
          </label>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 bg-error/10 border-b border-error/30 text-error text-sm flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {filteredChapters.length === 0 ? (
          <div className="p-8 text-center text-muted">
            {chapters.length === 0 ? (
              <>
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-2">暂无章节</p>
                <p className="text-xs">点击「自动检测」或「添加」创建章节</p>
              </>
            ) : (
              <p className="text-sm">没有找到匹配的章节</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredChapters.map((chapter, index) => {
              const isEditing = editingChapter === chapter.id;
              const isActive = currentChapter?.id === chapter.id;
              const isSelected = selectedChapterId === chapter.id;
              const colorClass = CHAPTER_COLORS[index % CHAPTER_COLORS.length];

              return (
                <div
                  key={chapter.id}
                  className={cn(
                    'p-3 transition-colors group',
                    isActive && 'bg-primary-500/10',
                    isSelected && !isEditing && 'bg-foreground/5',
                    !isActive && !isSelected && 'hover:bg-foreground/5'
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editValues[chapter.id]?.title || ''}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [chapter.id]: { ...prev[chapter.id], title: e.target.value },
                            }))
                          }
                          className="input-field py-1.5 text-sm font-medium flex-1"
                          placeholder="章节标题"
                          autoFocus
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted block mb-1">开始时间</label>
                          <input
                            type="text"
                            value={editValues[chapter.id]?.startTime || ''}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [chapter.id]: { ...prev[chapter.id], startTime: e.target.value },
                              }))
                            }
                            className="input-field py-1.5 text-sm font-mono"
                            placeholder="0:00"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted block mb-1">结束时间</label>
                          <input
                            type="text"
                            value={editValues[chapter.id]?.endTime || ''}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [chapter.id]: { ...prev[chapter.id], endTime: e.target.value },
                              }))
                            }
                            className="input-field py-1.5 text-sm font-mono"
                            placeholder="0:00"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-muted block mb-1">描述</label>
                        <textarea
                          value={editValues[chapter.id]?.description || ''}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [chapter.id]: { ...prev[chapter.id], description: e.target.value },
                            }))
                          }
                          className="input-field py-1.5 text-sm resize-none min-h-[60px]"
                          placeholder="章节描述..."
                        />
                      </div>

                      <div>
                        <label className="text-xs text-muted block mb-1">缩略图</label>
                        <div className="flex items-center gap-2">
                          {editValues[chapter.id]?.thumbnailUrl ? (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                              <img
                                src={editValues[chapter.id].thumbnailUrl}
                                alt="缩略图"
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    [chapter.id]: { ...prev[chapter.id], thumbnailUrl: '' },
                                  }))
                                }
                                className="absolute top-1 right-1 p-0.5 rounded bg-black/50 text-white hover:bg-black/70"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                'w-16 h-16 rounded-lg flex items-center justify-center cursor-pointer',
                                colorClass + '/20'
                              )}
                              onClick={() => handleThumbnailUpload(chapter.id)}
                            >
                              <Image className="w-6 h-6 text-muted" />
                            </div>
                          )}
                          <button
                            onClick={() => handleThumbnailUpload(chapter.id)}
                            className="btn-secondary text-xs"
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            上传
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={handleCancelEdit}
                          className="btn-secondary text-sm px-3 py-1.5"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleSaveEdit(chapter.id)}
                          className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
                        >
                          <Save className="w-4 h-4" />
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-sm',
                          colorClass
                        )}
                      >
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              'font-medium truncate cursor-pointer',
                              isActive ? 'text-primary-400' : 'text-foreground'
                            )}
                            onClick={() => onChapterClick?.(chapter)}
                          >
                            {chapter.title}
                          </p>
                          {isActive && (
                            <span className="badge badge-primary text-[10px] py-0">播放中</span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {formatTime(chapter.startTime)} - {formatTime(chapter.endTime)}
                          <span className="mx-1">·</span>
                          时长 {formatTime(chapter.endTime - chapter.startTime)}
                        </p>
                        {chapter.description && (
                          <p className="text-xs text-muted mt-1 line-clamp-1">
                            {chapter.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleMoveChapter(chapter.id, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-foreground/10 text-muted disabled:opacity-30"
                          title="上移"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveChapter(chapter.id, 'down')}
                          disabled={index === filteredChapters.length - 1}
                          className="p-1 rounded hover:bg-foreground/10 text-muted disabled:opacity-30"
                          title="下移"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStartEdit(chapter)}
                          className="p-1 rounded hover:bg-foreground/10 text-muted hover:text-foreground"
                          title="编辑"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteChapter(chapter.id)}
                          className="p-1 rounded hover:bg-error/20 text-muted hover:text-error"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
