import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  ChevronDown,
  LogIn,
  LogOut,
  Upload,
  MessageSquarePlus,
  Trash2,
  GitBranch,
  RotateCcw,
  Share2,
  UserPlus,
  UserMinus,
  Shield,
  Clock,
  Globe,
  Calendar,
  Loader2,
} from 'lucide-react';
import { auditApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { AuditLog } from '@/types';
import { formatDate, formatRelativeTime } from '@/utils/time';
import { cn } from '@/lib/utils';

type AuditActionType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'AUDIO_UPLOAD'
  | 'ANNOTATION_ADD'
  | 'ANNOTATION_DELETE'
  | 'VERSION_CHANGE'
  | 'VERSION_ROLLBACK'
  | 'DISTRIBUTION_UPDATE'
  | 'MEMBER_INVITE'
  | 'MEMBER_REMOVE'
  | 'ROLE_CHANGE';

const actionConfig: Record<AuditActionType, {
  label: string;
  className: string;
  icon: React.ElementType;
  description: (log: AuditLog) => string;
}> = {
  LOGIN: {
    label: '登录',
    className: 'badge-success',
    icon: LogIn,
    description: () => '用户登录系统',
  },
  LOGOUT: {
    label: '登出',
    className: 'badge-muted',
    icon: LogOut,
    description: () => '用户登出系统',
  },
  AUDIO_UPLOAD: {
    label: '音频上传',
    className: 'badge-primary',
    icon: Upload,
    description: (log) => `上传了音频文件: ${log.details?.fileName || '未知文件'}`,
  },
  ANNOTATION_ADD: {
    label: '添加标注',
    className: 'badge-warning',
    icon: MessageSquarePlus,
    description: (log) => `在 ${Math.floor((log.details?.startTime || 0) / 60)}:${String(Math.floor((log.details?.startTime || 0) % 60)).padStart(2, '0')} 处添加了${log.details?.type === 'CORRECTION' ? '修正' : log.details?.type === 'APPROVAL' ? '通过' : log.details?.type === 'QUESTION' ? '疑问' : '评论'}标注`,
  },
  ANNOTATION_DELETE: {
    label: '删除标注',
    className: 'badge-error',
    icon: Trash2,
    description: () => '删除了一条标注',
  },
  VERSION_CHANGE: {
    label: '版本变更',
    className: 'badge-primary',
    icon: GitBranch,
    description: (log) => `版本从 ${log.details?.oldVersion || 'v1'} 更新到 ${log.details?.newVersion || 'v2'}`,
  },
  VERSION_ROLLBACK: {
    label: '版本回滚',
    className: 'badge-warning',
    icon: RotateCcw,
    description: (log) =>
      `从 v${log.details?.fromVersion || '?'} 回滚到 v${log.details?.toVersion || '?'}${log.details?.reason ? `，原因：${log.details.reason}` : ''}`,
  },
  DISTRIBUTION_UPDATE: {
    label: '分发更新',
    className: 'badge-success',
    icon: Share2,
    description: (log) => `${log.details?.platform || '平台'}: "${log.details?.episodeTitle || '节目'}" 分发状态更新`,
  },
  MEMBER_INVITE: {
    label: '邀请成员',
    className: 'badge-warning',
    icon: UserPlus,
    description: (log) => `邀请 ${log.details?.email || '用户'} 加入团队，角色为 ${log.details?.role || '成员'}`,
  },
  MEMBER_REMOVE: {
    label: '移除成员',
    className: 'badge-error',
    icon: UserMinus,
    description: (log) => `移除了成员: ${log.details?.userName || '未知用户'}`,
  },
  ROLE_CHANGE: {
    label: '角色变更',
    className: 'badge-primary',
    icon: Shield,
    description: (log) => `${log.details?.userName || '用户'} 的角色从 ${log.details?.oldRole || '旧角色'} 变更为 ${log.details?.newRole || '新角色'}`,
  },
};

const TeamAudit: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditActionType | 'all'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: { action?: string; userId?: string; startTime?: string; endTime?: string } = {};
      if (actionFilter !== 'all') params.action = actionFilter;
      if (userFilter !== 'all') params.userId = userFilter;

      if (dateRange !== 'all') {
        const now = new Date();
        let startTime: Date;
        if (dateRange === 'today') {
          startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (dateRange === '7days') {
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else {
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        params.startTime = startTime.toISOString();
      }

      const res = await auditApi.getLogs(params);
      setLogs(res.data.data || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, userFilter, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const uniqueUsers = useMemo(() => {
    const seen = new Set<string>();
    const users: { id: string; name: string }[] = [];
    logs.forEach((log) => {
      if (log.userId && !seen.has(log.userId)) {
        seen.add(log.userId);
        users.push({ id: log.userId, name: log.userName || log.userId });
      }
    });
    return users;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const actionInfo = actionConfig[log.action as AuditActionType];
        return (
          log.userName?.toLowerCase().includes(query) ||
          log.ipAddress?.includes(query) ||
          actionInfo?.label.toLowerCase().includes(query) ||
          actionInfo?.description(log).toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [logs, searchQuery]);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, AuditLog[]> = {};
    filteredLogs.forEach((log) => {
      const date = formatDate(log.createdAt, 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });
    return groups;
  }, [filteredLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="glass-card p-12 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2">无权限访问</h3>
        <p className="text-muted">此页面仅管理员可访问</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">审计日志</h1>
          <p className="text-muted mt-1">查看团队的操作记录和安全审计</p>
        </div>
      </div>

      <div className="glass-card">
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                placeholder="搜索操作人、IP地址或操作详情..."
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-foreground/5 rounded-xl animate-slide-down">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">操作类型</label>
                <select
                  className="input-field"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as AuditActionType | 'all')}
                >
                  <option value="all">全部操作</option>
                  {(Object.keys(actionConfig) as AuditActionType[]).map((action) => (
                    <option key={action} value={action}>
                      {actionConfig[action].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">操作人</label>
                <select
                  className="input-field"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                >
                  <option value="all">全部人员</option>
                  {uniqueUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">时间范围</label>
                <select
                  className="input-field"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                >
                  <option value="all">全部时间</option>
                  <option value="today">今天</option>
                  <option value="7days">最近 7 天</option>
                  <option value="30days">最近 30 天</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {Object.keys(groupedLogs).length > 0 ? (
        Object.entries(groupedLogs).map(([date, dateLogs]) => (
          <div key={date} className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-foreground">{date}</span>
              <span className="text-xs text-muted">({dateLogs.length} 条记录)</span>
            </div>

            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />

              {dateLogs.map((log) => {
                const actionType = log.action as AuditActionType;
                const action = actionConfig[actionType] || {
                  label: log.action,
                  className: 'badge-muted',
                  icon: FileText,
                  description: () => log.action,
                };
                const ActionIcon = action.icon;

                return (
                  <div
                    key={log.id}
                    className="relative mb-4 last:mb-0"
                  >
                    <div className="absolute -left-4 top-4 w-3 h-3 rounded-full border-2 border-background z-10 bg-primary-500" />

                    <div className="glass-card p-4 hover:bg-foreground/5 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                            action.className.includes('success') && 'bg-success/20',
                            action.className.includes('error') && 'bg-error/20',
                            action.className.includes('warning') && 'bg-warning/20',
                            action.className.includes('primary') && 'bg-primary-500/20',
                            action.className.includes('muted') && 'bg-muted/20',
                          )}>
                            <ActionIcon className={cn(
                              'w-5 h-5',
                              action.className.includes('success') && 'text-success',
                              action.className.includes('error') && 'text-error',
                              action.className.includes('warning') && 'text-warning',
                              action.className.includes('primary') && 'text-primary-400',
                              action.className.includes('muted') && 'text-muted',
                            )} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className={cn('badge', action.className)}>
                                {action.label}
                              </span>
                              <span className="text-sm text-foreground font-medium">
                                {log.userName || '未知用户'}
                              </span>
                            </div>
                            <p className="text-sm text-muted">
                              {action.description(log)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end gap-1 text-xs text-muted flex-shrink-0">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(log.createdAt)}
                          </span>
                          <span className="text-muted">
                            {formatDate(log.createdAt, 'HH:mm:ss')}
                          </span>
                          {log.ipAddress && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {log.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <div className="glass-card p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery || actionFilter !== 'all' || userFilter !== 'all' || dateRange !== 'all'
              ? '未找到匹配的日志'
              : '暂无审计日志'}
          </h3>
          <p className="text-muted">
            {searchQuery || actionFilter !== 'all' || userFilter !== 'all' || dateRange !== 'all'
              ? '尝试调整筛选条件或搜索关键词'
              : '团队操作记录将显示在这里'}
          </p>
        </div>
      )}
    </div>
  );
};

export { TeamAudit };
