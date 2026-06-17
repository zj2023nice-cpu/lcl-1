import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Eye,
  X,
  Loader2,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { emailLogApi } from '@/services/api';
import { EmailLog, EmailStatus, EmailStats } from '@/types';
import { cn } from '@/lib/utils';
import { formatDate, formatRelativeTime } from '@/utils/time';

const statusConfig: Record<EmailStatus, {
  label: string;
  className: string;
  icon: React.ElementType;
}> = {
  PENDING: {
    label: '等待中',
    className: 'badge-muted',
    icon: Clock,
  },
  SENDING: {
    label: '发送中',
    className: 'badge-primary',
    icon: Send,
  },
  SENT: {
    label: '已发送',
    className: 'badge-success',
    icon: CheckCircle,
  },
  FAILED: {
    label: '发送失败',
    className: 'badge-error',
    icon: XCircle,
  },
  RETRYING: {
    label: '重试中',
    className: 'badge-warning',
    icon: RotateCcw,
  },
};

const EmailLogs: React.FC = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmailStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const pageSize = 20;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: { page: number; size: number; status?: string } = {
        page,
        size: pageSize,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const res = await emailLogApi.getLogs(params);
      const data = res.data.data;
      setLogs(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await emailLogApi.getStats();
      setStats(res.data.data || null);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
    }
  };

  const handleRetry = async (log: EmailLog) => {
    try {
      setRetryingId(log.id);
      await emailLogApi.retry(log.id);
      await fetchLogs();
      await fetchStats();
    } catch {
      // ignore
    } finally {
      setRetryingId(null);
    }
  };

  const handleViewDetail = (log: EmailLog) => {
    setSelectedLog(log);
    setShowDetail(true);
  };

  const filteredLogs = logs.filter((log) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.recipientEmail.toLowerCase().includes(query) ||
        log.subject.toLowerCase().includes(query) ||
        (log.recipientName && log.recipientName.toLowerCase().includes(query)) ||
        (log.templateKey && log.templateKey.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const StatCard: React.FC<{
    label: string;
    value: number;
    icon: React.ElementType;
    className: string;
  }> = ({ label, value, icon: Icon, className }) => (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', className)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted">{label}</p>
        </div>
      </div>
    </div>
  );

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
          <h1 className="text-2xl font-bold text-foreground">邮件记录</h1>
          <p className="text-muted mt-1">查看所有邮件发送记录和状态</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="等待发送"
          value={stats?.pending || 0}
          icon={Clock}
          className="bg-muted/20 text-muted"
        />
        <StatCard
          label="已发送"
          value={stats?.sent || 0}
          icon={CheckCircle}
          className="bg-success/20 text-success"
        />
        <StatCard
          label="失败"
          value={stats?.failed || 0}
          icon={XCircle}
          className="bg-error/20 text-error"
        />
        <StatCard
          label="重试中"
          value={stats?.retrying || 0}
          icon={RotateCcw}
          className="bg-warning/20 text-warning"
        />
      </div>

      <div className="glass-card">
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                placeholder="搜索收件人、主题或模板..."
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-foreground/5 rounded-xl animate-slide-down">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">发送状态</label>
                <select
                  className="input-field"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as EmailStatus | 'all');
                    setPage(0);
                  }}
                >
                  <option value="all">全部状态</option>
                  {(Object.keys(statusConfig) as EmailStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {statusConfig[status].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {filteredLogs.length > 0 ? (
          <>
            <div className="divide-y divide-border">
              {filteredLogs.map((log) => {
                const status = statusConfig[log.status];
                const StatusIcon = status.icon;

                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-foreground/5 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(log)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          log.status === 'SENT' && 'bg-success/20',
                          log.status === 'FAILED' && 'bg-error/20',
                          log.status === 'RETRYING' && 'bg-warning/20',
                          (log.status === 'PENDING' || log.status === 'SENDING') && 'bg-muted/20',
                        )}>
                          <StatusIcon className={cn(
                            'w-5 h-5',
                            log.status === 'SENT' && 'text-success',
                            log.status === 'FAILED' && 'text-error',
                            log.status === 'RETRYING' && 'text-warning',
                            (log.status === 'PENDING' || log.status === 'SENDING') && 'text-muted',
                          )} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('badge', status.className)}>
                              {status.label}
                            </span>
                            <span className="text-sm font-medium text-foreground truncate">
                              {log.subject}
                            </span>
                          </div>
                          <p className="text-sm text-muted truncate">
                            收件人：{log.recipientName ? `${log.recipientName} <${log.recipientEmail}>` : log.recipientEmail}
                          </p>
                          {log.templateKey && (
                            <p className="text-xs text-muted mt-1 font-mono">
                              模板：{log.templateKey}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-muted">
                            {formatRelativeTime(log.createdAt)}
                          </p>
                          <p className="text-xs text-muted">
                            {formatDate(log.createdAt, 'HH:mm:ss')}
                          </p>
                        </div>
                        {(log.status === 'FAILED' || log.status === 'RETRYING') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetry(log);
                            }}
                            disabled={retryingId === log.id}
                            className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                          >
                            {retryingId === log.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            重试
                          </button>
                        )}
                      </div>
                    </div>

                    {log.errorMessage && log.status === 'FAILED' && (
                      <div className="mt-3 p-3 bg-error/10 rounded-lg">
                        <p className="text-xs text-error flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="truncate">{log.errorMessage}</span>
                        </p>
                      </div>
                    )}

                    {log.retryCount > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                        <RotateCcw className="w-3 h-3" />
                        <span>已重试 {log.retryCount}/{log.maxRetries} 次</span>
                        {log.nextRetryAt && log.status === 'RETRYING' && (
                          <span>
                            · 下次重试：{formatRelativeTime(log.nextRetryAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 flex items-center justify-between border-t border-border">
              <p className="text-sm text-muted">
                共 {totalElements} 条记录，第 {page + 1}/{totalPages || 1} 页
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    page === 0
                      ? 'text-muted cursor-not-allowed'
                      : 'text-foreground hover:bg-foreground/10'
                  )}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages - 1}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    page >= totalPages - 1
                      ? 'text-muted cursor-not-allowed'
                      : 'text-foreground hover:bg-foreground/10'
                  )}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <Mail className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery || statusFilter !== 'all'
                ? '未找到匹配的邮件记录'
                : '暂无邮件记录'}
            </h3>
            <p className="text-muted">
              {searchQuery || statusFilter !== 'all'
                ? '尝试调整筛选条件或搜索关键词'
                : '系统发送的邮件记录将显示在这里'}
            </p>
          </div>
        )}
      </div>

      {showDetail && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">邮件详情</h3>
              <button
                onClick={() => setShowDetail(false)}
                className="p-1 hover:bg-foreground/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted mb-1">状态</p>
                  <span className={cn('badge', statusConfig[selectedLog.status].className)}>
                    {statusConfig[selectedLog.status].label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">模板</p>
                  <p className="text-sm font-medium text-foreground font-mono">
                    {selectedLog.templateKey || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">收件人</p>
                  <p className="text-sm text-foreground">
                    {selectedLog.recipientName || selectedLog.recipientEmail}
                  </p>
                  {selectedLog.recipientName && (
                    <p className="text-xs text-muted">{selectedLog.recipientEmail}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">发送时间</p>
                  <p className="text-sm text-foreground">
                    {selectedLog.sentAt
                      ? formatDate(selectedLog.sentAt, 'yyyy-MM-dd HH:mm:ss')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">创建时间</p>
                  <p className="text-sm text-foreground">
                    {formatDate(selectedLog.createdAt, 'yyyy-MM-dd HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">重试次数</p>
                  <p className="text-sm text-foreground">
                    {selectedLog.retryCount}/{selectedLog.maxRetries}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted mb-2">主题</p>
                <p className="text-base font-medium text-foreground">{selectedLog.subject}</p>
              </div>

              {selectedLog.errorMessage && (
                <div className="p-4 bg-error/10 rounded-xl">
                  <p className="text-sm font-medium text-error mb-1">错误信息</p>
                  <p className="text-sm text-error/80">{selectedLog.errorMessage}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted mb-2">邮件内容</p>
                <div className="bg-foreground/5 rounded-xl overflow-hidden">
                  <div className="p-3 border-b border-border flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted" />
                    <span className="text-xs text-muted">
                      {selectedLog.content.includes('<') ? 'HTML 预览' : '纯文本'}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-auto p-4">
                    {selectedLog.content.includes('<') ? (
                      <div
                        className="bg-white p-4 rounded-lg"
                        dangerouslySetInnerHTML={{ __html: selectedLog.content }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
                        {selectedLog.content}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              {(selectedLog.status === 'FAILED' || selectedLog.status === 'RETRYING') && (
                <button
                  onClick={() => handleRetry(selectedLog)}
                  disabled={retryingId === selectedLog.id}
                  className="btn-secondary flex items-center gap-2"
                >
                  {retryingId === selectedLog.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  重新发送
                </button>
              )}
              <button
                onClick={() => setShowDetail(false)}
                className="btn-primary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { EmailLogs };
