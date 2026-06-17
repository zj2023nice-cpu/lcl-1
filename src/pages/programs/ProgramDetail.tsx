import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { programApi, episodeApi } from '@/services/api';
import { formatRelativeTime } from '@/utils/time';
import { Program, Episode, EpisodeStatus } from '@/types';
import { cn } from '@/lib/utils';

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

interface EpisodeRowProps {
  episode: Episode;
  onClick: () => void;
}

const EpisodeRow: React.FC<EpisodeRowProps> = ({ episode, onClick }) => {
  const statusConfig = getEpisodeStatusBadge(episode.status);

  return (
    <tr
      className="border-b border-border hover:bg-white/5 transition-colors duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary-500/30 group-hover:to-accent-500/30 transition-all duration-200">
            <FileAudio className="w-5 h-5 text-primary-400" />
          </div>
          <div className="min-w-0">
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
      </td>
      <td className="px-6 py-4">
        <span className={cn('badge', statusConfig.className)}>
          {statusConfig.label}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-foreground flex items-center gap-1.5">
          <PlayCircle className="w-4 h-4 text-muted" />
          v{episode.currentVersion}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-muted flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {formatRelativeTime(episode.updatedAt)}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <button
            className="p-2 rounded-lg hover:bg-white/10 text-muted hover:text-primary-400 transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-white/10 text-muted hover:text-foreground transition-colors duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
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
            className="p-1 rounded-lg hover:bg-white/10 text-muted hover:text-foreground transition-colors"
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

const ProgramDetail: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();

  const [program, setProgram] = useState<Program | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchProgramDetail = async () => {
    if (!programId) return;
    try {
      setLoading(true);
      setError(null);
      const [programRes, episodesRes] = await Promise.all([
        programApi.getById(programId),
        episodeApi.getByProgram(programId),
      ]);
      setProgram(programRes.data.data);
      setEpisodes(episodesRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '获取节目详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgramDetail();
  }, [programId]);

  const fetchEpisodes = async () => {
    if (!programId) return;
    try {
      const episodesRes = await episodeApi.getByProgram(programId);
      setEpisodes(episodesRes.data.data);
    } catch {
      // 静默处理，不覆盖已有错误
    }
  };

  const handleCreateEpisode = async (data: { title: string; description?: string }) => {
    if (!programId) return;
    try {
      setIsCreating(true);
      await episodeApi.create(programId, data);
      setShowCreateModal(false);
      fetchEpisodes();
    } catch (err: any) {
      setError(err.response?.data?.message || '创建集数失败');
    } finally {
      setIsCreating(false);
    }
  };

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
      <div className="flex items-center gap-4">
        <button
          className="p-2 rounded-lg hover:bg-white/10 text-muted hover:text-foreground transition-colors duration-200"
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
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Film className="w-5 h-5 text-primary-400" />
              集数列表
            </h3>
            <span className="text-sm text-muted">
              共 {episodes.length} 集
            </span>
          </div>
        </div>
        {episodes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-white/5">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    标题
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    版本
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    更新时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {episodes.map((episode) => (
                  <EpisodeRow
                    key={episode.id}
                    episode={episode}
                    onClick={() => navigate(`/editor/${episode.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
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
