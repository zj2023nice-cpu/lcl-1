import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Search,
  Filter,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  X,
  ChevronDown,
  Ban,
  CheckSquare,
  Square,
  Send,
} from 'lucide-react';
import { distributionApi, programApi, episodeApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { DistributionRecord, DistributionStatus, DistributionPlatform, Episode, Program } from '@/types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/time';

const getStatusConfig = (status: DistributionStatus) => {
  const config = {
    PENDING: { label: '等待中', className: 'badge-muted', icon: Clock, dotColor: 'bg-muted' },
    PUBLISHING: { label: '发布中', className: 'badge-primary', icon: Loader2, dotColor: 'bg-primary-400' },
    PUBLISHED: { label: '已发布', className: 'badge-success', icon: CheckCircle2, dotColor: 'bg-success' },
    FAILED: { label: '发布失败', className: 'badge-error', icon: AlertCircle, dotColor: 'bg-error' },
    CANCELLED: { label: '已取消', className: 'badge-muted', icon: Ban, dotColor: 'bg-muted' },
  };
  return config[status];
};

const getPlatformIcon = (type: string) => {
  const icons: Record<string, string> = {
    XIAOYUZHOU: '🎧',
    XIMALAYA: '🏔️',
    APPLE: '🍎',
    SPOTIFY: '🟢',
    RSS: '📡',
    OTHER: '🌐',
  };
  return icons[type] || '🌐';
};

interface DistributionCardProps {
  record: DistributionRecord;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  isRetrying: boolean;
  isCancelling: boolean;
}

const DistributionCard: React.FC<DistributionCardProps> = ({
  record,
  isSelected,
  onSelect,
  onRetry,
  onCancel,
  isRetrying,
  isCancelling,
}) => {
  const statusConfig = getStatusConfig(record.status);
  const StatusIcon = statusConfig.icon;
  const canRetry = record.status === 'FAILED' || record.status === 'CANCELLED';
  const canCancel = record.status === 'PENDING' || record.status === 'PUBLISHING';
  const showProgress = record.status === 'PUBLISHING';

  return (
    <div className={cn(
      'glass-card p-4 transition-all duration-200',
      isSelected && 'ring-2 ring-primary-400'
    )}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onSelect(record.id)}
          className="mt-1 flex-shrink-0 text-muted hover:text-foreground transition-colors"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-primary-400" />
          ) : (
            <Square className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl" title={record.platformName}>
                {getPlatformIcon(record.platformType || '')}
              </span>
              <div className="min-w-0">
                <h3 className="font-medium text-foreground truncate">
                  {record.episodeTitle || '未知节目'}
                </h3>
                <p className="text-sm text-muted truncate">
                  {record.platformName}
                  {record.retryCount > 0 && (
                    <span className="ml-2 text-warning">
                      (已重试 {record.retryCount} 次)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <span className={cn('badge flex-shrink-0', statusConfig.className)}>
              <StatusIcon className={cn('w-3 h-3 mr-1', record.status === 'PUBLISHING' && 'animate-spin')} />
              {statusConfig.label}
            </span>
          </div>

          {showProgress && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span>分发进度</span>
                <span>{record.progress}%</span>
              </div>
              <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-400 rounded-full transition-all duration-300"
                  style={{ width: `${record.progress}%` }}
                />
              </div>
            </div>
          )}

          {record.status === 'PUBLISHED' && record.publishUrl && (
            <div className="mt-3">
              <a
                href={record.publishUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors truncate block"
              >
                查看发布内容 →
              </a>
            </div>
          )}

          {record.status === 'FAILED' && record.errorMessage && (
            <div className="mt-3 p-2 bg-error/10 border border-error/30 rounded-lg">
              <p className="text-sm text-error">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {record.errorMessage}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted">
              {formatDate(record.createdAt)}
            </span>
            <div className="flex items-center gap-2">
              {canRetry && (
                <button
                  onClick={() => onRetry(record.id)}
                  disabled={isRetrying}
                  className="px-3 py-1 text-sm bg-primary-400/10 text-primary-400 hover:bg-primary-400/20 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {isRetrying ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  重试
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => onCancel(record.id)}
                  disabled={isCancelling}
                  className="px-3 py-1 text-sm bg-error/10 text-error hover:bg-error/20 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {isCancelling ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  取消
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CreateDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  platforms: DistributionPlatform[];
  programs: Program[];
  episodes: Episode[];
  onSubmit: (data: { episodeId: string; platformIds: string[] }) => void;
  loading: boolean;
}

const CreateDistributionModal: React.FC<CreateDistributionModalProps> = ({
  isOpen,
  onClose,
  platforms,
  programs,
  episodes,
  onSubmit,
  loading,
}) => {
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedEpisode, setSelectedEpisode] = useState<string>('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedProgram('');
      setSelectedEpisode('');
      setSelectedPlatforms([]);
    }
  }, [isOpen]);

  const filteredEpisodes = episodes.filter(e => e.programId === selectedProgram);

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSubmit = () => {
    if (selectedEpisode && selectedPlatforms.length > 0) {
      onSubmit({
        episodeId: selectedEpisode,
        platformIds: selectedPlatforms,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">批量分发</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              选择节目
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => {
                setSelectedProgram(e.target.value);
                setSelectedEpisode('');
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="">请选择节目</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              选择单集
            </label>
            <select
              value={selectedEpisode}
              onChange={(e) => setSelectedEpisode(e.target.value)}
              disabled={!selectedProgram}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-50"
            >
              <option value="">请选择单集</option>
              {filteredEpisodes.map(episode => (
                <option key={episode.id} value={episode.id}>
                  {episode.title} ({episode.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              选择分发平台 ({selectedPlatforms.length}/{platforms.length})
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {platforms.length === 0 ? (
                <p className="text-sm text-muted p-4 text-center bg-foreground/5 rounded-lg">
                  暂无可用平台，请先在设置中添加分发平台
                </p>
              ) : (
                platforms.map(platform => (
                  <div
                    key={platform.id}
                    onClick={() => handlePlatformToggle(platform.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border',
                      selectedPlatforms.includes(platform.id)
                        ? 'bg-primary-400/10 border-primary-400/50'
                        : 'bg-background border-border hover:border-foreground/30'
                    )}
                  >
                    {selectedPlatforms.includes(platform.id) ? (
                      <CheckSquare className="w-5 h-5 text-primary-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-muted flex-shrink-0" />
                    )}
                    <span className="text-xl">{getPlatformIcon(platform.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {platform.name}
                      </p>
                      <p className="text-xs text-muted">{platform.type}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedEpisode || selectedPlatforms.length === 0 || loading}
            className="px-4 py-2 text-sm bg-primary-400 text-white hover:bg-primary-500 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            开始分发
          </button>
        </div>
      </div>
    </div>
  );
};

const Distribution: React.FC = () => {
  const teamId = useAuthStore(state => state.user?.teamId || '1');
  const [records, setRecords] = useState<DistributionRecord[]>([]);
  const [platforms, setPlatforms] = useState<DistributionPlatform[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryingIds, setRetryingIds] = useState<string[]>([]);
  const [cancellingIds, setCancellingIds] = useState<string[]>([]);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [recordsRes, platformsRes, programsRes] = await Promise.all([
        distributionApi.getRecords({ teamId, status: statusFilter || undefined }),
        distributionApi.getPlatforms(teamId),
        programApi.getAll(),
      ]);

      if (recordsRes.data?.data) {
        setRecords(recordsRes.data.data);
      }
      if (platformsRes.data?.data) {
        setPlatforms(platformsRes.data.data);
      }
      if (programsRes.data?.data) {
        setPrograms(programsRes.data.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, statusFilter]);

  const loadEpisodes = useCallback(async (programId: string) => {
    try {
      const res = await episodeApi.getByProgram(programId);
      if (res.data?.data) {
        setEpisodes(res.data.data);
      }
    } catch (error) {
      console.error('加载单集失败:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (programs.length > 0) {
      programs.forEach(p => loadEpisodes(p.id));
    }
  }, [programs, loadEpisodes]);

  useEffect(() => {
    const hasPublishing = records.some(r => r.status === 'PUBLISHING');
    if (hasPublishing && !pollingInterval) {
      const interval = window.setInterval(() => {
        loadData();
      }, 2000);
      setPollingInterval(interval);
    } else if (!hasPublishing && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [records, pollingInterval, loadData]);

  const filteredRecords = records.filter(record => {
    const matchesSearch = !searchQuery ||
      record.episodeTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.platformName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleSelectRecord = (id: string) => {
    setSelectedRecords(prev =>
      prev.includes(id)
        ? prev.filter(r => r !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === filteredRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map(r => r.id));
    }
  };

  const handleCreateDistribution = async (data: { episodeId: string; platformIds: string[] }) => {
    try {
      setIsSubmitting(true);
      await distributionApi.createBatch(data, teamId);
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('创建分发失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      setRetryingIds(prev => [...prev, id]);
      await distributionApi.retry(id, teamId);
      await loadData();
    } catch (error) {
      console.error('重试失败:', error);
    } finally {
      setRetryingIds(prev => prev.filter(r => r !== id));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      setCancellingIds(prev => [...prev, id]);
      await distributionApi.cancel(id, teamId);
      await loadData();
    } catch (error) {
      console.error('取消失败:', error);
    } finally {
      setCancellingIds(prev => prev.filter(c => c !== id));
    }
  };

  const handleBatchRetry = async () => {
    const failedIds = selectedRecords.filter(id => {
      const record = records.find(r => r.id === id);
      return record && (record.status === 'FAILED' || record.status === 'CANCELLED');
    });
    if (failedIds.length === 0) return;

    try {
      setRetryingIds(prev => [...prev, ...failedIds]);
      await distributionApi.retryBatch(failedIds, teamId);
      setSelectedRecords([]);
      await loadData();
    } catch (error) {
      console.error('批量重试失败:', error);
    } finally {
      setRetryingIds(prev => prev.filter(r => !failedIds.includes(r)));
    }
  };

  const handleBatchCancel = async () => {
    const cancellableIds = selectedRecords.filter(id => {
      const record = records.find(r => r.id === id);
      return record && (record.status === 'PENDING' || record.status === 'PUBLISHING');
    });
    if (cancellableIds.length === 0) return;

    try {
      setCancellingIds(prev => [...prev, ...cancellableIds]);
      await distributionApi.cancelBatch(cancellableIds, teamId);
      setSelectedRecords([]);
      await loadData();
    } catch (error) {
      console.error('批量取消失败:', error);
    } finally {
      setCancellingIds(prev => prev.filter(c => !cancellableIds.includes(c)));
    }
  };

  const stats = {
    total: records.length,
    pending: records.filter(r => r.status === 'PENDING').length,
    publishing: records.filter(r => r.status === 'PUBLISHING').length,
    published: records.filter(r => r.status === 'PUBLISHED').length,
    failed: records.filter(r => r.status === 'FAILED').length,
    cancelled: records.filter(r => r.status === 'CANCELLED').length,
  };

  const selectedFailedCount = selectedRecords.filter(id => {
    const r = records.find(rec => rec.id === id);
    return r && (r.status === 'FAILED' || r.status === 'CANCELLED');
  }).length;

  const selectedCancellableCount = selectedRecords.filter(id => {
    const r = records.find(rec => rec.id === id);
    return r && (r.status === 'PENDING' || r.status === 'PUBLISHING');
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">分发管理</h1>
          <p className="text-sm text-muted mt-1">管理内容分发到各个平台</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary-400 text-white hover:bg-primary-500 rounded-lg transition-colors flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          新建分发
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted mt-1">总计</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-muted">{stats.pending}</p>
          <p className="text-xs text-muted mt-1">等待中</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary-400">{stats.publishing}</p>
          <p className="text-xs text-muted mt-1">发布中</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-success">{stats.published}</p>
          <p className="text-xs text-muted mt-1">已发布</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-error">{stats.failed}</p>
          <p className="text-xs text-muted mt-1">失败</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-muted">{stats.cancelled}</p>
          <p className="text-xs text-muted mt-1">已取消</p>
        </div>
      </div>

      <div className="glass-card">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="搜索节目或平台..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-400 appearance-none cursor-pointer"
              >
                <option value="">全部状态</option>
                <option value="PENDING">等待中</option>
                <option value="PUBLISHING">发布中</option>
                <option value="PUBLISHED">已发布</option>
                <option value="FAILED">发布失败</option>
                <option value="CANCELLED">已取消</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-4 py-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              刷新
            </button>
          </div>

          {selectedRecords.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
              <span className="text-sm text-muted">
                已选择 {selectedRecords.length} 项
              </span>
              <button
                onClick={handleSelectAll}
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                {selectedRecords.length === filteredRecords.length ? '取消全选' : '全选'}
              </button>
              <div className="flex-1" />
              {selectedFailedCount > 0 && (
                <button
                  onClick={handleBatchRetry}
                  disabled={retryingIds.length > 0}
                  className="px-3 py-1.5 text-sm bg-primary-400/10 text-primary-400 hover:bg-primary-400/20 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  批量重试 ({selectedFailedCount})
                </button>
              )}
              {selectedCancellableCount > 0 && (
                <button
                  onClick={handleBatchCancel}
                  disabled={cancellingIds.length > 0}
                  className="px-3 py-1.5 text-sm bg-error/10 text-error hover:bg-error/20 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  批量取消 ({selectedCancellableCount})
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <Share2 className="w-12 h-12 mx-auto mb-4 text-muted opacity-50" />
              <p className="text-muted">
                {searchQuery || statusFilter ? '没有匹配的分发记录' : '暂无分发记录'}
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 text-sm bg-primary-400/10 text-primary-400 hover:bg-primary-400/20 rounded-lg transition-colors"
              >
                创建第一个分发任务
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map(record => (
                <DistributionCard
                  key={record.id}
                  record={record}
                  isSelected={selectedRecords.includes(record.id)}
                  onSelect={handleSelectRecord}
                  onRetry={handleRetry}
                  onCancel={handleCancel}
                  isRetrying={retryingIds.includes(record.id)}
                  isCancelling={cancellingIds.includes(record.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateDistributionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        platforms={platforms}
        programs={programs}
        episodes={episodes}
        onSubmit={handleCreateDistribution}
        loading={isSubmitting}
      />
    </div>
  );
};

export { Distribution };
