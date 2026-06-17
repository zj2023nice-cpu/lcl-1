import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  Plus,
  Film,
  Clock,
  Edit3,
  MoreVertical,
  FileAudio,
  PlayCircle,
  Podcast,
  X,
  Loader2,
  AlertCircle,
  Undo2,
  GripVertical,
  RefreshCw,
  Users,
} from 'lucide-react';
import { programApi, episodeApi } from '@/services/api';
import { formatRelativeTime } from '@/utils/time';
import { Program, Episode, EpisodeStatus, SortUpdateMessage } from '@/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const getEpisodeStatusBadge = (status: EpisodeStatus) => {
  const config = {
    DRAFT: { label: '草稿', className: 'badge-muted' },
    IN_PROGRESS: { label: '制作中', className: 'badge-primary' },
    REVIEW: { label: '审核中', className: 'badge-warning' },
    FINALIZED: { label: '已完成', className: 'badge-success' },
    DISTRIBUTED: { label: '已发布', className: 'bg-accent-500/20 text-accent-400' },
  };
  return config[status];
};

interface SortableEpisodeItemProps {
  episode: Episode;
  onClick: () => void;
}

const SortableEpisodeItem: React.FC<SortableEpisodeItemProps> = ({ episode, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: episode.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusConfig = getEpisodeStatusBadge(episode.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-b border-border bg-background transition-all duration-200 group',
        isDragging && 'opacity-50 shadow-lg z-10'
      )}
    >
      <div className="flex items-center px-6 py-4">
        <button
          className="p-1 mr-2 text-muted hover:text-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary-500/30 group-hover:to-accent-500/30 transition-all duration-200">
            <FileAudio className="w-5 h-5 text-primary-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground truncate group-hover:text-gradient transition-all duration-200">
              {episode.title}
            </p>
            {episode.description && (
              <p className="text-xs text-muted mt-0.5 truncate">
                {episode.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6 flex-shrink-0">
          <span className={cn('badge', statusConfig.className)}>
            {statusConfig.label}
          </span>
          <span className="text-sm text-foreground flex items-center gap-1.5 w-16">
            <PlayCircle className="w-4 h-4 text-muted" />
            v{episode.currentVersion}
          </span>
          <span className="text-sm text-muted flex items-center gap-1.5 w-24">
            <Clock className="w-4 h-4" />
            {formatRelativeTime(episode.updatedAt)}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="p-2 rounded-lg hover:bg-foreground/10 text-muted hover:text-primary-400 transition-colors duration-200"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CreateEpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; description?: string }) => void;
  isCreating: boolean;
}

const CreateEpisodeModal: React.FC<CreateEpisodeModalProps> = ({ isOpen, onClose, onCreate, isCreating }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
    });
    setTitle('');
    setDescription('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-lg mx-4 animate-bounce-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-400" />
            创建新集数
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">集数标题 *</label>
            <input
              type="text"
              className="input-field"
              placeholder="输入集数标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">集数描述</label>
            <textarea
              className="input-field min-h-[100px] resize-none"
              placeholder="输入集数描述..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!title.trim() || isCreating}
            >
              {isCreating ? '创建中...' : '创建集数'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ConflictToastProps {
  message: string;
  onResolve: () => void;
  userName?: string;
}

const ConflictToast: React.FC<ConflictToastProps> = ({ message, onResolve, userName }) => {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-slide-in">
      <div className="glass-card border-warning/30 bg-warning/10 p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">排序冲突</p>
            <p className="text-sm text-muted mt-1">
              {userName ? `${userName} 刚刚` : ''}{message}
            </p>
            <button
              onClick={onResolve}
              className="mt-3 text-sm text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              刷新并使用最新排序
            </button>
          </div>
          <button onClick={onResolve} className="text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface SyncIndicatorProps {
  isConnected: boolean;
  isSaving: boolean;
  lastSaved?: string;
}

const SyncIndicator: React.FC<SyncIndicatorProps> = ({ isConnected, isSaving, lastSaved }) => {
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      {isSaving ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-primary-400" />
          <span>保存中...</span>
        </>
      ) : isConnected ? (
        <>
          <div className="w-2 h-2 rounded-full bg-success" />
          <span>已同步{lastSaved ? ` · ${lastSaved}` : ''}</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 rounded-full bg-error" />
          <span>未连接</span>
        </>
      )}
    </div>
  );
};

const ProgramDetail: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const [program, setProgram] = useState<Program | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');

  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [conflictUserName, setConflictUserName] = useState<string | null>(null);

  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchProgramDetail = useCallback(async () => {
    if (!programId) return;
    try {
      setLoading(true);
      setError(null);
      const [programRes, episodesRes, canUndoRes] = await Promise.all([
        programApi.getById(programId),
        episodeApi.getByProgram(programId),
        episodeApi.canUndoSort(programId).catch(() => ({ data: { data: false } })),
      ]);
      setProgram(programRes.data.data);
      setEpisodes(episodesRes.data.data);
      setCanUndo(canUndoRes.data?.data || false);
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || '获取节目详情失败');
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchProgramDetail();
  }, [fetchProgramDetail]);

  const handleRemoteSortUpdate = useCallback(async (message: SortUpdateMessage) => {
    if (!programId) return;

    try {
      const episodesRes = await episodeApi.getByProgram(programId);
      const newEpisodes = episodesRes.data.data;
      
      setEpisodes(newEpisodes);
      setProgram(prev => prev ? { ...prev, sortVersion: message.sortVersion } : prev);
      
      setConflictMessage('修改了集数排序');
      setConflictUserName(message.updatedByName);
    } catch (e) {
      console.error('Failed to fetch updated episodes:', e);
    }
  }, [programId]);

  useEffect(() => {
    if (!programId || !accessToken) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/episode-sort?token=${accessToken}&programId=${programId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const message: SortUpdateMessage = JSON.parse(event.data);
        if (message.type === 'SORT_UPDATED') {
          handleRemoteSortUpdate(message);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [programId, accessToken, handleRemoteSortUpdate]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = episodes.findIndex((e) => e.id === active.id);
      const newIndex = episodes.findIndex((e) => e.id === over.id);

      const newEpisodes = arrayMove(episodes, oldIndex, newIndex);
      setEpisodes(newEpisodes);

      await saveSortOrder(newEpisodes);
    }
  };

  const saveSortOrder = async (sortedEpisodes: Episode[]) => {
    if (!programId || !program) return;

    setIsSaving(true);
    try {
      const episodeIds = sortedEpisodes.map((e) => e.id);
      const response = await episodeApi.updateSort(programId, {
        episodeIds,
        baseSortVersion: program.sortVersion,
      });

      const result = response.data.data;
      
      if (result && result.conflict) {
        setConflictMessage(result.message || '排序已被其他人修改');
        setConflictUserName(null);
        if (result.episodes) {
          setEpisodes(result.episodes);
        }
      } else if (result && result.success) {
        setEpisodes(result.episodes);
        setProgram(prev => prev ? { ...prev, sortVersion: result.sortVersion } : prev);
        setCanUndo(true);
        setLastSaved(formatRelativeTime(new Date().toISOString()));
      }
    } catch (err) {
      console.error('Failed to save sort order:', err);
      fetchEpisodes();
    } finally {
      setIsSaving(false);
    }
  };

  const fetchEpisodes = async () => {
    if (!programId) return;
    try {
      const episodesRes = await episodeApi.getByProgram(programId);
      setEpisodes(episodesRes.data.data);
    } catch {
      // 静默处理
    }
  };

  const handleCreateEpisode = async (data: { title: string; description?: string }) => {
    if (!programId) return;
    try {
      setIsCreating(true);
      await episodeApi.create(programId, data);
      setShowCreateModal(false);
      fetchProgramDetail();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || '创建集数失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUndo = async () => {
    if (!programId || isUndoing) return;

    setIsUndoing(true);
    try {
      const response = await episodeApi.undoSort(programId, {
        baseSortVersion: program.sortVersion,
      });
      const result = response.data.data;
      
      if (result && result.success) {
        setEpisodes(result.episodes);
        setProgram(prev => prev ? { ...prev, sortVersion: result.sortVersion } : prev);
        setCanUndo(false);
        setLastSaved(formatRelativeTime(new Date().toISOString()));
      } else if (result && result.conflict) {
        setConflictedEpisodes(result.episodes);
        if (result.episodes && result.episodes.length > 0) {
          setEpisodes(result.episodes);
        }
        setProgram(prev => prev ? { ...prev, sortVersion: result.sortVersion } : prev);
        setConflictMessage(result.message || '排序已被其他人修改，无法撤销');
        setConflictUserName('其他用户');
      }
    } catch (err) {
      console.error('Failed to undo sort:', err);
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || '撤销失败');
    } finally {
      setIsUndoing(false);
    }
  };

  const resolveConflict = async () => {
    setConflictMessage(null);
    setConflictUserName(null);
    fetchProgramDetail();
  };

  const activeEpisode = activeId ? episodes.find((e) => e.id === activeId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        <span className="ml-3 text-muted">加载中...</span>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="glass-card p-12 text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-error" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {error ? '加载失败' : '节目不存在'}
        </h3>
        <p className="text-muted mb-6">{error || '找不到您要查看的节目'}</p>
        <button
          className="btn-primary inline-flex items-center gap-2"
          onClick={() => navigate('/programs')}
        >
          <ArrowLeft className="w-4 h-4" />
          返回节目列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {conflictMessage && (
        <ConflictToast
          message={conflictMessage}
          userName={conflictUserName || undefined}
          onResolve={resolveConflict}
        />
      )}

      <div className="flex items-center gap-4">
        <button
          className="p-2 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors duration-200"
          onClick={() => navigate('/programs')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">节目详情</h1>
          <p className="text-muted mt-1">管理节目内容和集数</p>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="relative h-48 sm:h-64">
          {program.coverImage ? (
            <img
              src={program.coverImage}
              alt={program.name}
              className="w-full h-full object-cover content-image"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center">
              <Podcast className="w-24 h-24 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="p-6 -mt-20 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden border-4 border-background flex-shrink-0 bg-card">
              {program.coverImage ? (
                <img
                  src={program.coverImage}
                  alt={program.name}
                  className="w-full h-full object-cover content-image"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Podcast className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{program.name}</h2>
              {program.description && (
                <p className="text-muted mt-2 max-w-2xl">{program.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <Film className="w-4 h-4" />
                  {episodes.length} 集
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  更新于 {formatRelativeTime(program.updatedAt)}
                </span>
              </div>
            </div>
            <button
              className="btn-primary flex items-center gap-2 self-start sm:self-auto"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4" />
              创建集数
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Film className="w-5 h-5 text-primary-400" />
                集数列表
              </h3>
              <span className="text-sm text-muted">
                共 {episodes.length} 集
              </span>
            </div>
            <div className="flex items-center gap-3">
              <SyncIndicator
                isConnected={wsConnected}
                isSaving={isSaving}
                lastSaved={lastSaved}
              />
              <button
                className={cn(
                  'btn-secondary inline-flex items-center gap-2 text-sm',
                  (!canUndo || isUndoing) && 'opacity-50 cursor-not-allowed'
                )}
                onClick={handleUndo}
                disabled={!canUndo || isUndoing}
              >
                <Undo2 className={cn('w-4 h-4', isUndoing && 'animate-spin')} />
                撤销
              </button>
            </div>
          </div>
          {episodes.length > 0 && (
            <p className="text-xs text-muted mt-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              拖动左侧手柄调整集数顺序，修改后自动保存
            </p>
          )}
        </div>
        {episodes.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={episodes.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-border">
                {episodes.map((episode) => (
                  <SortableEpisodeItem
                    key={episode.id}
                    episode={episode}
                    onClick={() => navigate(`/editor/${episode.id}`)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeEpisode ? (
                <div className="glass-card shadow-xl opacity-90">
                  <div className="flex items-center px-6 py-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center flex-shrink-0">
                        <FileAudio className="w-5 h-5 text-primary-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {activeEpisode.title}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="p-12 text-center">
            <FileAudio className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">暂无集数</h3>
            <p className="text-muted mb-6">为这个节目创建第一集内容吧</p>
            <button
              className="btn-primary inline-flex items-center gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4" />
              创建集数
            </button>
          </div>
        )}
      </div>

      <CreateEpisodeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateEpisode}
        isCreating={isCreating}
      />
    </div>
  );
};

export { ProgramDetail };
