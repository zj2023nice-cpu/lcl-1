import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileAudio,
  Clock,
  User,
  Archive,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  History,
  X,
  Loader2,
  AlertCircle,
  Shield,
  ArchiveRestore,
  FileWarning,
  PlayCircle,
} from 'lucide-react';
import { audioVersionApi, episodeApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useCollaborationStore } from '@/store/collaborationStore';
import {
  mockEpisodes,
  mockAudioVersions,
  mockRollbackLogs,
  mockAnnotations,
  mockWaveformData,
} from '@/mock/data';
import { Episode, AudioVersion, RollbackLog, UserRole, Annotation, AnnotationStatus, AnnotationType, AnnotationPriority } from '@/types';
import { formatRelativeTime, formatFileSize, formatDuration } from '@/utils/time';
import { cn } from '@/lib/utils';
import { WaveformPlayer } from '@/components/audio/WaveformPlayer';
import { AnnotationPanel } from '@/components/audio/AnnotationPanel';
import { OnlineUsers } from '@/components/collaboration/OnlineUsers';
import { CollaborationChat } from '@/components/collaboration/CollaborationChat';

const ROLLBACK_ALLOWED_ROLES: UserRole[] = ['ADMIN', 'PRODUCER'];

interface VersionBadgeProps {
  version: AudioVersion;
  isCurrent: boolean;
}

const VersionBadge: React.FC<VersionBadgeProps> = ({ version, isCurrent }) => {
  if (version.isCorrupted) {
    return (
      <span className="badge badge-error flex items-center gap-1">
        <FileWarning className="w-3 h-3" />
        已损坏
      </span>
    );
  }
  if (isCurrent) {
    return (
      <span className="badge badge-success flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        当前版本
      </span>
    );
  }
  if (version.isArchived) {
    return (
      <span className="badge badge-muted flex items-center gap-1">
        <Archive className="w-3 h-3" />
        已归档
      </span>
    );
  }
  return (
    <span className="badge badge-primary flex items-center gap-1">
      <PlayCircle className="w-3 h-3" />
      可用
    </span>
  );
};

interface RollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetVersion: AudioVersion | null;
  currentVersion: AudioVersion | null;
  onConfirm: (reason: string) => void;
  isRollingBack: boolean;
}

const RollbackModal: React.FC<RollbackModalProps> = ({
  isOpen,
  onClose,
  targetVersion,
  currentVersion,
  onConfirm,
  isRollingBack,
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen || !targetVersion || !currentVersion) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-lg mx-4 animate-bounce-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-warning" />
            确认版本回滚
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
            disabled={isRollingBack}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm text-warning">
                <p className="font-medium mb-1">版本回滚操作不可逆</p>
                <p className="text-warning/80">
                  回滚后当前版本将被自动归档，目标版本将恢复为可用状态。
                  {targetVersion.isArchived && (
                    <span className="block mt-1 flex items-center gap-1">
                      <ArchiveRestore className="w-3 h-3" />
                      目标版本当前已归档，回滚时将自动恢复为可用。
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-foreground/5 rounded-xl p-3">
              <p className="text-xs text-muted mb-1">当前版本</p>
              <p className="text-lg font-bold text-foreground">v{currentVersion.version}</p>
              <p className="text-xs text-muted mt-1 truncate">{currentVersion.fileName}</p>
            </div>
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-3">
              <p className="text-xs text-primary-400 mb-1">回滚至</p>
              <p className="text-lg font-bold text-primary-400">v{targetVersion.version}</p>
              <p className="text-xs text-muted mt-1 truncate">{targetVersion.fileName}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              回滚原因 <span className="text-muted">(可选)</span>
            </label>
            <textarea
              className="input-field min-h-[80px] resize-none"
              placeholder="请说明回滚原因，便于后续追溯..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isRollingBack}
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim() || undefined)}
            className="btn-primary flex items-center gap-2"
            disabled={isRollingBack}
          >
            {isRollingBack ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                回滚中...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                确认回滚
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const Editor: React.FC = () => {
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { init: initCollaboration, disconnect: disconnectCollaboration } = useCollaborationStore();

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [versions, setVersions] = useState<AudioVersion[]>([]);
  const [rollbackLogs, setRollbackLogs] = useState<RollbackLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<AudioVersion | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [activeTab, setActiveTab] = useState<'versions' | 'history'>('versions');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotationTime, setSelectedAnnotationTime] = useState<number | undefined>();
  const wavesurferRef = useRef<{ setTime: (time: number) => void } | null>(null);

  const canRollback = useMemo(() => {
    if (!user) return false;
    return ROLLBACK_ALLOWED_ROLES.includes(user.role);
  }, [user]);

  const currentVersion = useMemo(() => {
    return versions.find((v) => v.version === episode?.currentVersion) || null;
  }, [versions, episode]);

  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => b.version - a.version);
  }, [versions]);

  const sortedRollbackLogs = useMemo(() => {
    return [...rollbackLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [rollbackLogs]);

  useEffect(() => {
    if (episodeId) {
      initCollaboration(episodeId);
    }
    return () => {
      disconnectCollaboration();
    };
  }, [episodeId, initCollaboration, disconnectCollaboration]);

  const fetchData = useCallback(async () => {
    if (!episodeId) return;
    try {
      setLoading(true);
      setError(null);

      let episodeData: Episode | null = null;
      let versionsData: AudioVersion[] = [];
      let logsData: RollbackLog[] = [];

      try {
        const [episodeRes, versionsRes, logsRes] = await Promise.all([
          episodeApi.getById(episodeId),
          audioVersionApi.getByEpisode(episodeId),
          audioVersionApi.getRollbackLogs(episodeId),
        ]);
        episodeData = episodeRes.data.data;
        versionsData = versionsRes.data.data || [];
        logsData = logsRes.data.data || [];
      } catch {
        episodeData = mockEpisodes.find((e) => e.id === episodeId) || null;
        versionsData = mockAudioVersions.filter((v) => v.episodeId === episodeId);
        logsData = mockRollbackLogs.filter((l) => l.episodeId === episodeId);
      }

      setEpisode(episodeData);
      setVersions(versionsData);
      setRollbackLogs(logsData);
      setAnnotations(mockAnnotations.filter((a) => a.episodeId === episodeId));
    } catch (err: any) {
      setError(err.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRollback = async (reason?: string) => {
    if (!rollbackTarget || !episode || !currentVersion || !user) return;

    try {
      setIsRollingBack(true);

      try {
        await audioVersionApi.rollback(episodeId!, {
          targetVersionId: rollbackTarget.id,
          reason,
        });
      } catch {
        // Fallback: simulate rollback locally
      }

      const updatedVersions = versions.map((v) => {
        if (v.id === currentVersion.id) {
          return { ...v, isArchived: true };
        }
        if (v.id === rollbackTarget.id) {
          return { ...v, isArchived: false };
        }
        return v;
      });

      const newLog: RollbackLog = {
        id: `rb_${Date.now()}`,
        episodeId: episode.id,
        episodeTitle: episode.title,
        fromVersionId: currentVersion.id,
        fromVersionNumber: currentVersion.version,
        toVersionId: rollbackTarget.id,
        toVersionNumber: rollbackTarget.version,
        reason,
        rolledBackBy: user.id,
        rolledBackByName: user.name,
        createdAt: new Date().toISOString(),
      };

      setVersions(updatedVersions);
      setEpisode({
        ...episode,
        currentVersion: rollbackTarget.version,
        duration: rollbackTarget.duration,
        updatedAt: new Date().toISOString(),
      });
      setRollbackLogs((prev) => [newLog, ...prev]);
      setRollbackTarget(null);
    } catch (err: any) {
      setError(err.message || '回滚失败');
    } finally {
      setIsRollingBack(false);
    }
  };

  const openRollbackModal = (version: AudioVersion) => {
    if (version.isCorrupted) return;
    if (!canRollback) return;
    if (version.version === episode?.currentVersion) return;
    setRollbackTarget(version);
  };

  const handleAddAnnotation = useCallback((data: {
    startTime: number;
    type: AnnotationType;
    content: string;
    priority?: AnnotationPriority;
  }) => {
    if (!episode || !currentVersion || !user) return;

    const newAnnotation: Annotation = {
      id: `ann_${Date.now()}`,
      episodeId: episode.id,
      audioVersionId: currentVersion.id,
      startTime: data.startTime,
      content: data.content,
      type: data.type,
      status: 'OPEN',
      priority: data.priority || 'MEDIUM',
      createdBy: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replyCount: 0,
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
    setSelectedAnnotationTime(undefined);
  }, [episode, currentVersion, user]);

  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setSelectedAnnotationTime(annotation.startTime);
  }, []);

  const handleAnnotationStatusChange = useCallback((id: string, status: AnnotationStatus) => {
    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              updatedAt: new Date().toISOString(),
              resolvedBy: status === 'RESOLVED' ? user?.id : undefined,
              resolvedByName: status === 'RESOLVED' ? user?.name : undefined,
              resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : undefined,
            }
          : a
      )
    );
  }, [user]);

  const handleAddAnnotationClick = useCallback((time: number) => {
    setSelectedAnnotationTime(time);
  }, []);

  const handleWaveformTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSeekTo = useCallback((time: number) => {
    setCurrentTime(time);
    if (wavesurferRef.current) {
      wavesurferRef.current.setTime(time);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        <span className="ml-3 text-muted">加载中...</span>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="glass-card p-12 text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-error" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {error ? '加载失败' : '集数不存在'}
        </h3>
        <p className="text-muted mb-6">{error || '找不到您要编辑的集数'}</p>
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
      <div className="flex items-center gap-4">
        <button
          className="p-2 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors duration-200"
          onClick={() => navigate('/programs')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{episode.title}</h1>
          <p className="text-muted mt-1">
            音频编辑器 · 当前版本 v{episode.currentVersion}
          </p>
        </div>
        <div className="hidden sm:block">
          <OnlineUsers onOpenChat={() => setIsChatOpen(true)} />
        </div>
        {!canRollback && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/10 text-xs text-muted">
            <Shield className="w-4 h-4" />
            无回滚权限
          </div>
        )}
      </div>

      <div className="sm:hidden mb-4">
        <OnlineUsers onOpenChat={() => setIsChatOpen(true)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WaveformPlayer
            waveformData={mockWaveformData}
            annotations={annotations}
            onAnnotationClick={handleAnnotationClick}
            onAddAnnotation={handleAddAnnotationClick}
            onTimeUpdate={handleWaveformTimeUpdate}
            enableCollaboration={true}
            onQuickChat={() => setIsChatOpen(true)}
            programId={episode.programId}
            className="h-full"
          />

          <div className="glass-card">
            <div className="p-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center flex-shrink-0">
                    <FileAudio className="w-7 h-7 text-primary-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-foreground">
                      {episode.title}
                    </h3>
                    {episode.description && (
                      <p className="text-sm text-muted mt-0.5 line-clamp-2">
                        {episode.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(episode.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <History className="w-3.5 h-3.5" />
                        共 {versions.length} 个历史版本
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex border-b border-border overflow-x-auto">
              <button
                onClick={() => setActiveTab('versions')}
                className={cn(
                  'px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0',
                  activeTab === 'versions'
                    ? 'text-primary-400'
                    : 'text-muted hover:text-foreground'
                )}
              >
                <span className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4" />
                  版本历史
                </span>
                {activeTab === 'versions' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  'px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0',
                  activeTab === 'history'
                    ? 'text-primary-400'
                    : 'text-muted hover:text-foreground'
                )}
              >
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  回滚记录
                  {sortedRollbackLogs.length > 0 && (
                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary-500/20 text-primary-400">
                      {sortedRollbackLogs.length}
                    </span>
                  )}
                </span>
                {activeTab === 'history' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
                )}
              </button>
            </div>

        {activeTab === 'versions' && (
          <div className="divide-y divide-border">
            {sortedVersions.map((version) => {
              const isCurrent = version.version === episode.currentVersion;
              const canRollbackThis =
                canRollback && !isCurrent && !version.isCorrupted;

              return (
                <div
                  key={version.id}
                  className={cn(
                    'p-4 transition-colors',
                    isCurrent && 'bg-primary-500/5',
                    version.isCorrupted && 'bg-error/5',
                    !isCurrent && !version.isCorrupted && 'hover:bg-foreground/5'
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          isCurrent && 'bg-success/20',
                          version.isCorrupted && 'bg-error/20',
                          version.isArchived && !isCurrent && !version.isCorrupted && 'bg-muted/20',
                          !isCurrent && !version.isArchived && !version.isCorrupted && 'bg-primary-500/20'
                        )}
                      >
                        {version.isCorrupted ? (
                          <FileWarning className="w-5 h-5 text-error" />
                        ) : isCurrent ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : version.isArchived ? (
                          <Archive className="w-5 h-5 text-muted" />
                        ) : (
                          <FileAudio className="w-5 h-5 text-primary-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">
                            v{version.version}
                          </span>
                          <VersionBadge version={version} isCurrent={isCurrent} />
                        </div>
                        <p className="text-sm text-foreground truncate">
                          {version.fileName}
                        </p>
                        {version.note && (
                          <p className="text-sm text-muted mt-1">{version.note}</p>
                        )}
                        {version.isCorrupted && version.corruptedReason && (
                          <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-error/10 border border-error/20">
                            <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-error">{version.corruptedReason}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {version.createdByName || version.createdBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(version.createdAt)}
                          </span>
                          <span>{formatFileSize(version.fileSize)}</span>
                          <span>{formatDuration(version.duration)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canRollbackThis && (
                        <button
                          onClick={() => openRollbackModal(version)}
                          className="btn-secondary flex items-center gap-2 text-sm"
                        >
                          <RotateCcw className="w-4 h-4" />
                          回滚到此版本
                        </button>
                      )}
                      {version.isCorrupted && (
                        <span className="text-xs text-error flex items-center gap-1 px-3 py-2 rounded-lg bg-error/10">
                          <AlertCircle className="w-4 h-4" />
                          无法回滚 - 文件已损坏
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-xs text-success flex items-center gap-1 px-3 py-2 rounded-lg bg-success/10">
                          <CheckCircle2 className="w-4 h-4" />
                          当前使用中
                        </span>
                      )}
                      {!canRollback && !isCurrent && !version.isCorrupted && (
                        <span
                          className="text-xs text-muted flex items-center gap-1 px-3 py-2 rounded-lg bg-muted/10"
                          title="需要管理员或制作人权限"
                        >
                          <Shield className="w-4 h-4" />
                          无权限回滚
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {sortedRollbackLogs.length > 0 ? (
              <div className="relative pl-6 py-4">
                <div className="absolute left-2 top-4 bottom-4 w-px bg-border" />
                {sortedRollbackLogs.map((log, index) => (
                  <div key={log.id} className="relative mb-6 last:mb-0">
                    <div className="absolute -left-4 top-4 w-3 h-3 rounded-full border-2 border-background z-10 bg-warning" />
                    <div className="glass-card p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                            <RotateCcw className="w-5 h-5 text-warning" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="badge badge-warning">版本回滚</span>
                              <span className="text-sm font-medium text-foreground">
                                {log.rolledBackByName || log.rolledBackBy}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">
                              从{' '}
                              <span className="font-semibold">v{log.fromVersionNumber}</span>{' '}
                              回滚至{' '}
                              <span className="font-semibold text-primary-400">
                                v{log.toVersionNumber}
                              </span>
                            </p>
                            {log.reason && (
                              <p className="text-sm text-muted mt-2 italic">
                                「{log.reason}」
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end gap-1 text-xs text-muted flex-shrink-0">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(log.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {index < sortedRollbackLogs.length - 1 && (
                      <div className="absolute left-[-1.5rem] top-12 w-6 border-t border-dashed border-border" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <RotateCcw className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  暂无回滚记录
                </h3>
                <p className="text-muted">
                  此集数尚未执行过版本回滚操作
                </p>
              </div>
            )}
          </div>
        )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
            <AnnotationPanel
              annotations={annotations}
              onAnnotationClick={handleAnnotationClick}
              onStatusChange={handleAnnotationStatusChange}
              onAddAnnotation={handleAddAnnotation}
              selectedTime={selectedAnnotationTime}
              className="lg:h-full lg:min-h-[600px]"
            />
          </div>
        </div>
      </div>

      <RollbackModal
        isOpen={!!rollbackTarget}
        onClose={() => !isRollingBack && setRollbackTarget(null)}
        targetVersion={rollbackTarget}
        currentVersion={currentVersion}
        onConfirm={handleRollback}
        isRollingBack={isRollingBack}
      />

      <CollaborationChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentTime={currentTime}
        onSeekTo={handleSeekTo}
      />
    </div>
  );
};

export { Editor };
