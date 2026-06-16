import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  ListTodo,
  Filter,
  Calendar,
  User,
  X,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlayCircle,
  MoreHorizontal,
  Check,
  Loader2,
} from 'lucide-react';
import { taskApi, teamApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Task, TaskStatus, TaskPriority, User as TUser } from '@/types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/time';

const getStatusConfig = (status: TaskStatus) => {
  const config = {
    TODO: { label: '待处理', className: 'badge-muted', icon: Clock, dotColor: 'bg-muted' },
    IN_PROGRESS: { label: '进行中', className: 'badge-primary', icon: PlayCircle, dotColor: 'bg-primary-400' },
    REVIEW: { label: '审核中', className: 'badge-warning', icon: AlertCircle, dotColor: 'bg-warning' },
    DONE: { label: '已完成', className: 'badge-success', icon: CheckCircle2, dotColor: 'bg-success' },
  };
  return config[status];
};

const getPriorityConfig = (priority: TaskPriority) => {
  const config = {
    LOW: { label: '低', className: 'bg-muted/20 text-muted', borderColor: 'border-muted/30' },
    MEDIUM: { label: '中', className: 'bg-warning/20 text-warning', borderColor: 'border-warning/30' },
    HIGH: { label: '高', className: 'bg-error/20 text-error', borderColor: 'border-error/30' },
    URGENT: { label: '紧急', className: 'bg-error/30 text-error border border-error/50 animate-pulse-slow', borderColor: 'border-error/50' },
  };
  return config[priority as keyof typeof config];
};

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onStatusChange: (status: TaskStatus) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onStatusChange }) => {
  const statusConfig = getStatusConfig(task.status);
  const priorityConfig = getPriorityConfig(task.priority);
  const StatusIcon = statusConfig.icon;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <div
      className={cn(
        'glass-card p-4 cursor-pointer hover:scale-[1.01] transition-all duration-200 group',
        priorityConfig.borderColor,
        'border-l-4'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-foreground truncate">{task.title}</h3>
            <span className={cn('badge', priorityConfig.className)}>
              {priorityConfig.label}
            </span>
            <span className={cn('badge', statusConfig.className)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </span>
          </div>
          {task.description && (
            <p className="text-sm text-muted mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const menu = e.currentTarget.nextElementSibling;
              menu?.classList.toggle('hidden');
            }}
            className="p-1 rounded-lg hover:bg-white/10 text-muted hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <div className="hidden absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
            {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as TaskStatus[]).map((status) => {
              const sc = getStatusConfig(status);
              const SI = sc.icon;
              return (
                <button
                  key={status}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(status);
                    e.currentTarget.parentElement?.classList.add('hidden');
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2 transition-colors',
                    task.status === status && 'text-primary-400'
                  )}
                >
                  <SI className="w-4 h-4" />
                  标记为 {sc.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted flex-wrap">
        {task.assigneeName && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {task.assigneeName}
          </span>
        )}
        {task.dueDate && (
          <span className={cn(
            'flex items-center gap-1',
            isOverdue && 'text-error'
          )}>
            <Calendar className="w-3 h-3" />
            {formatDate(task.dueDate)}
            {isOverdue && ' (已过期)'}
          </span>
        )}
      </div>
    </div>
  );
};

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: { title: string; description?: string; priority?: string; assigneeId?: string; dueDate?: string }) => void;
  teamMembers: TUser[];
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onCreate, teamMembers }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assigneeId: assigneeId || undefined,
      dueDate: dueDate || undefined,
    });

    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setAssigneeId('');
    setDueDate('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-lg mx-4 animate-bounce-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-400" />
            创建新任务
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
            <label className="block text-sm font-medium text-foreground mb-1">任务标题 *</label>
            <input
              type="text"
              className="input-field"
              placeholder="输入任务标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">任务描述</label>
            <textarea
              className="input-field min-h-[100px] resize-none"
              placeholder="输入任务描述..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">优先级</label>
              <select
                className="input-field"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="LOW">低</option>
                <option value="MEDIUM">中</option>
                <option value="HIGH">高</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">截止日期</label>
              <input
                type="date"
                className="input-field"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">负责人</label>
            <select
              className="input-field"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">请选择负责人</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
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
              disabled={!title.trim()}
            >
              创建任务
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TaskDetailDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (status: TaskStatus) => void;
}

const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({ task, isOpen, onClose, onStatusChange }) => {
  if (!task) return null;

  const statusConfig = getStatusConfig(task.status);
  const priorityConfig = getPriorityConfig(task.priority);
  const StatusIcon = statusConfig.icon;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex justify-end transition-opacity duration-300',
      isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
    )}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative w-full max-w-md h-full bg-card border-l border-border overflow-y-auto transition-transform duration-300',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        <div className="sticky top-0 bg-card/80 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">任务详情</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-muted hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={cn('badge', priorityConfig.className)}>
                {priorityConfig.label}优先级
              </span>
              <span className={cn('badge', statusConfig.className)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </span>
            </div>
            <h3 className="text-xl font-bold text-foreground">{task.title}</h3>
            {task.description && (
              <p className="text-muted mt-2">{task.description}</p>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">快速更改状态</h4>
            <div className="grid grid-cols-2 gap-2">
              {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as TaskStatus[]).map((status) => {
                const sc = getStatusConfig(status);
                const SI = sc.icon;
                return (
                  <button
                    key={status}
                    onClick={() => onStatusChange(status)}
                    className={cn(
                      'flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all',
                      task.status === status
                        ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                        : 'border-border hover:bg-white/5 text-muted hover:text-foreground'
                    )}
                  >
                    <SI className="w-4 h-4" />
                    {sc.label}
                    {task.status === status && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">负责人</span>
              <span className="text-sm text-foreground">{task.assigneeName || '未分配'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">截止日期</span>
              <span className={cn(
                'text-sm',
                isOverdue ? 'text-error' : 'text-foreground'
              )}>
                {task.dueDate ? formatDate(task.dueDate) : '未设置'}
                {isOverdue && ' (已过期)'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">创建人</span>
              <span className="text-sm text-foreground">{task.createdByName || '未知'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">创建时间</span>
              <span className="text-sm text-foreground">{formatDate(task.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Tasks: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await taskApi.getAll();
      setTasks(res.data.data || []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    if (!user?.teamId) return;
    try {
      const res = await teamApi.getMembers(user.teamId);
      setTeamMembers(res.data.data || []);
    } catch {
      setTeamMembers([]);
    }
  }, [user?.teamId]);

  useEffect(() => {
    fetchTasks();
    fetchTeamMembers();
  }, [fetchTasks, fetchTeamMembers]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (activeTab === 'my' && task.assigneeId !== user?.id) return false;
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'all' && task.assigneeId !== assigneeFilter) return false;
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [tasks, activeTab, statusFilter, priorityFilter, assigneeFilter, searchQuery, user?.id]);

  const taskStats = useMemo(() => {
    const statuses: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
    filteredTasks.forEach((task) => {
      statuses[task.status]++;
    });
    return statuses;
  }, [filteredTasks]);

  const handleCreateTask = async (taskData: { title: string; description?: string; priority?: string; assigneeId?: string; dueDate?: string }) => {
    try {
      await taskApi.create(taskData);
      fetchTasks();
    } catch {
      // error handled silently
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await taskApi.updateStatus(taskId, newStatus);
      setTasks(tasks.map((task) =>
        task.id === taskId
          ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
          : task
      ));
      if (selectedTask?.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus, updatedAt: new Date().toISOString() });
      }
    } catch {
      // error handled silently
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowDetailDrawer(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">任务管理</h1>
          <p className="text-muted mt-1">管理和跟踪团队的工作任务</p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4" />
          创建任务
        </button>
      </div>

      <div className="glass-card">
        <div className="flex items-center border-b border-border">
          <button
            onClick={() => setActiveTab('my')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'my'
                ? 'text-primary-400'
                : 'text-muted hover:text-foreground'
            )}
          >
            我的任务
            {activeTab === 'my' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-500" />
            )}
          </button>
          <div className="w-px h-6 bg-border" />
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'all'
                ? 'text-primary-400'
                : 'text-muted hover:text-foreground'
            )}
          >
            全部任务
            {activeTab === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-500" />
            )}
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                placeholder="搜索任务标题..."
                className="input-field pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'btn-secondary flex items-center gap-2',
                showFilters && 'bg-primary-500/20 border-primary-500/50 text-primary-400'
              )}
            >
              <Filter className="w-4 h-4" />
              筛选
              <ChevronDown className={cn('w-4 h-4 transition-transform', showFilters && 'rotate-180')} />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-white/5 rounded-xl animate-slide-down">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">状态</label>
                <select
                  className="input-field"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                >
                  <option value="all">全部</option>
                  <option value="TODO">待处理</option>
                  <option value="IN_PROGRESS">进行中</option>
                  <option value="REVIEW">审核中</option>
                  <option value="DONE">已完成</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">优先级</label>
                <select
                  className="input-field"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
                >
                  <option value="all">全部</option>
                  <option value="LOW">低</option>
                  <option value="MEDIUM">中</option>
                  <option value="HIGH">高</option>
                  <option value="URGENT">紧急</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">负责人</label>
                <select
                  className="input-field"
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                >
                  <option value="all">全部</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as TaskStatus[]).map((status) => {
              const config = getStatusConfig(status);
              const Icon = config.icon;
              const count = taskStats[status];
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(isActive ? 'all' : status)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all',
                    isActive
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50'
                      : 'text-muted hover:text-foreground hover:bg-white/5'
                  )}
                >
                  <div className={cn('w-2 h-2 rounded-full', config.dotColor)} />
                  <Icon className="w-4 h-4" />
                  {config.label}
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs',
                    isActive ? 'bg-primary-500/30' : 'bg-white/10'
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filteredTasks.length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task)}
              onStatusChange={(status) => handleStatusChange(task.id, status)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <ListTodo className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all'
              ? '未找到匹配的任务'
              : activeTab === 'my' ? '暂无分配给你的任务' : '暂无任务'}
          </h3>
          <p className="text-muted mb-6">
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all'
              ? '尝试调整筛选条件或搜索关键词'
              : '点击上方按钮创建第一个任务'}
          </p>
          {!(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all') && (
            <button
              className="btn-primary inline-flex items-center gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4" />
              创建任务
            </button>
          )}
        </div>
      )}

      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateTask}
        teamMembers={teamMembers}
      />

      <TaskDetailDrawer
        task={selectedTask}
        isOpen={showDetailDrawer}
        onClose={() => setShowDetailDrawer(false)}
        onStatusChange={(status) => selectedTask && handleStatusChange(selectedTask.id, status)}
      />
    </div>
  );
};

export { Tasks };
