import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Film,
  Clock,
  ChevronRight,
  Podcast,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { programApi } from '@/services/api';
import { formatRelativeTime } from '@/utils/time';
import { Program } from '@/types';
import { cn } from '@/lib/utils';

interface ProgramCardProps {
  program: Program;
  onClick: () => void;
}

const ProgramCard: React.FC<ProgramCardProps> = ({ program, onClick }) => {
  return (
    <div
      className="glass-card overflow-hidden cursor-pointer group hover:scale-[1.02] transition-all duration-300"
      onClick={onClick}
    >
      <div className="relative aspect-video overflow-hidden">
        {program.coverImage ? (
          <img
            src={program.coverImage}
            alt={program.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center">
            <Podcast className="w-16 h-16 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-2">
            <span className="badge badge-primary">
              <Film className="w-3 h-3 mr-1" />
              {program.episodeCount} 集
            </span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-gradient transition-all duration-200">
          {program.name}
        </h3>
        {program.description && (
          <p className="text-sm text-muted mt-1 line-clamp-2">
            {program.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(program.updatedAt)}
          </span>
          <ChevronRight className="w-4 h-4 text-muted group-hover:text-primary-400 group-hover:translate-x-1 transition-all duration-200" />
        </div>
      </div>
    </div>
  );
};

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description?: string }) => void;
  isCreating: boolean;
}

const CreateProgramModal: React.FC<CreateProgramModalProps> = ({ isOpen, onClose, onCreate, isCreating }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setName('');
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
            创建新节目
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
            <label className="block text-sm font-medium text-foreground mb-1">节目名称 *</label>
            <input
              type="text"
              className="input-field"
              placeholder="输入节目名称..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">节目描述</label>
            <textarea
              className="input-field min-h-[100px] resize-none"
              placeholder="输入节目描述..."
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
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? '创建中...' : '创建节目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Programs: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await programApi.getAll();
      setPrograms(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '获取节目列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleCreateProgram = async (data: { name: string; description?: string }) => {
    try {
      setIsCreating(true);
      await programApi.create(data);
      setShowCreateModal(false);
      fetchPrograms();
    } catch (err: any) {
      setError(err.response?.data?.message || '创建节目失败');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredPrograms = programs.filter(program =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (program.description && program.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        <span className="ml-3 text-muted">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-12 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-error" />
        <h3 className="text-lg font-semibold text-foreground mb-2">加载失败</h3>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">节目管理</h1>
          <p className="text-muted mt-1">管理您的播客节目和内容</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          创建节目
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="搜索节目名称或描述..."
            className="input-field pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredPrograms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPrograms.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              onClick={() => navigate(`/programs/${program.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <Podcast className={cn('w-16 h-16 mx-auto mb-4 opacity-50', searchQuery ? 'text-muted' : 'text-primary-400')} />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? '未找到匹配的节目' : '暂无节目'}
          </h3>
          <p className="text-muted mb-6">
            {searchQuery ? '尝试使用其他关键词搜索' : '点击上方按钮创建您的第一个节目'}
          </p>
          {!searchQuery && (
            <button className="btn-primary inline-flex items-center gap-2" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" />
              创建节目
            </button>
          )}
        </div>
      )}

      <CreateProgramModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProgram}
        isCreating={isCreating}
      />
    </div>
  );
};

export { Programs };
