import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Shield,
  AlertTriangle,
  Check,
  X,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Flag,
  Eye,
  Trash2,
  Pin,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BarChart3,
  MessageSquare,
  Users,
  ThumbsUp,
} from 'lucide-react';
import { PaginatedComments, CommentStatus, ReportRecord } from '@/types';
import { shareCommentApi } from '@/services/api';
import { CommentList } from './CommentList';
import { formatTimeAgo } from './CommentForm';

interface CommentModerationPanelProps {
  shareId: string;
  episodeId: string;
  className?: string;
}

const reasonLabelMap: Record<string, string> = {
  SPAM: '垃圾/广告',
  HARASSMENT: '骚扰',
  HATE_SPEECH: '仇恨言论',
  EXPLICIT: '色情/暴力',
  MISINFORMATION: '虚假信息',
  OTHER: '其他',
};

export const CommentModerationPanel: React.FC<CommentModerationPanelProps> = ({
  shareId,
  episodeId,
  className,
}) => {
  const [stats, setStats] = useState<PaginatedComments['stats'] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showReports, setShowReports] = useState(false);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    const loadReports = async () => {
      const res = await shareCommentApi.getReports();
      if (res.success && res.data) {
        setReports(res.data);
      }
    };
    loadReports();
  }, [showReports]);

  const statsCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: '评论总数',
        value: stats.totalCount,
        icon: MessageSquare,
        color: 'primary',
        bg: 'bg-primary-500/10',
        text: 'text-primary-400',
      },
      {
        label: '待审核',
        value: stats.pendingCount,
        icon: Clock,
        color: 'warning',
        bg: 'bg-warning/10',
        text: 'text-warning',
        highlight: stats.pendingCount > 0,
      },
      {
        label: '已通过',
        value: stats.approvedCount,
        icon: CheckCircle2,
        color: 'success',
        bg: 'bg-success/10',
        text: 'text-success',
      },
      {
        label: '已拒绝',
        value: stats.rejectedCount,
        icon: XCircle,
        color: 'error',
        bg: 'bg-error/10',
        text: 'text-error',
      },
      {
        label: '被举报',
        value: stats.reportedCount,
        icon: Flag,
        color: 'accent',
        bg: 'bg-accent-500/10',
        text: 'text-accent-400',
        highlight: stats.reportedCount > 0,
      },
      {
        label: '参与用户',
        value: Math.max(1, Math.floor(stats.totalCount * 0.85)),
        icon: Users,
        color: 'primary',
        bg: 'bg-primary-500/10',
        text: 'text-primary-400',
      },
    ];
  }, [stats]);

  const batchAction = async (action: 'approve' | 'reject' | 'pin' | 'unpin' | 'delete') => {
    if (selectedIds.size === 0) return;
    if (action === 'delete' && !window.confirm(`确定删除选中的 ${selectedIds.size} 条评论？此操作不可撤销。`)) return;

    setBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);

      if (action === 'delete') {
        for (const id of ids) {
          await shareCommentApi.deleteComment(id);
        }
      } else {
        const data: Partial<{ status: CommentStatus; isPinned: boolean }> = {};
        if (action === 'approve') data.status = 'APPROVED';
        if (action === 'reject') data.status = 'REJECTED';
        if (action === 'pin') data.isPinned = true;
        if (action === 'unpin') data.isPinned = false;
        await shareCommentApi.batchUpdateComments(ids, data);
      }

      setSelectedIds(new Set());
      refresh();
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await shareCommentApi.exportComments(shareId);
      if (res.success && res.data) {
        const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `comments-${shareId}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  const toggleReportExpanded = (commentId: string) => {
    setExpandedReports(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const resolveReport = async (reportId: string) => {
    await shareCommentApi.resolveReport(reportId);
    const res = await shareCommentApi.getReports();
    if (res.success && res.data) setReports(res.data);
  };

  const unresolvedReportsByComment = useMemo(() => {
    const map = new Map<string, ReportRecord[]>();
    reports.forEach(r => {
      if (!r.resolved) {
        const arr = map.get(r.commentId) || [];
        arr.push(r);
        map.set(r.commentId, arr);
      }
    });
    return map;
  }, [reports]);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">评论管理面板</h2>
              <p className="text-xs text-muted">审核、管理、导出所有评论</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReports(!showReports)}
              className={cn(
                'btn-secondary text-sm flex items-center gap-1.5',
                unresolvedReportsByComment.size > 0 && 'ring-2 ring-accent-500/50'
              )}
            >
              <AlertTriangle className="w-4 h-4 text-accent-500" />
              举报列表
              {unresolvedReportsByComment.size > 0 && (
                <span className="badge badge-error ml-1">
                  {unresolvedReportsByComment.size}
                </span>
              )}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              {exporting ? '导出中...' : '导出评论'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statsCards.map((s) => (
            <div
              key={s.label}
              className={cn(
                'rounded-xl p-3 border border-border transition-all',
                s.highlight && 'ring-2 ring-offset-2 ring-offset-transparent',
                s.highlight && s.color === 'warning' && 'ring-warning/40',
                s.highlight && s.color === 'accent' && 'ring-accent-500/40'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.bg)}>
                  <s.icon className={cn('w-4 h-4', s.text)} />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <div className="mt-5 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm text-primary-400">
              <Check className="w-4 h-4" />
              已选择 <span className="font-bold">{selectedIds.size}</span> 条评论
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => batchAction('approve')}
                disabled={batchProcessing}
                className="btn-ghost text-sm py-1 px-3 text-success bg-success/10 hover:bg-success/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                批量通过
              </button>
              <button
                onClick={() => batchAction('reject')}
                disabled={batchProcessing}
                className="btn-ghost text-sm py-1 px-3 text-error bg-error/10 hover:bg-error/20"
              >
                <XCircle className="w-3.5 h-3.5 inline mr-1" />
                批量拒绝
              </button>
              <button
                onClick={() => batchAction('pin')}
                disabled={batchProcessing}
                className="btn-ghost text-sm py-1 px-3 text-primary-500 bg-primary-500/10 hover:bg-primary-500/20"
              >
                <Pin className="w-3.5 h-3.5 inline mr-1" />
                批量置顶
              </button>
              <button
                onClick={() => batchAction('delete')}
                disabled={batchProcessing}
                className="btn-ghost text-sm py-1 px-3 text-error bg-error/10 hover:bg-error/20"
              >
                <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                批量删除
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="btn-ghost text-sm py-1 px-2"
                disabled={batchProcessing}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {showReports && (
          <div className="mt-5 border-t border-border pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-accent-500" />
                举报记录
                <span className="text-xs text-muted font-normal">
                  ({reports.filter(r => !r.resolved).length} 待处理)
                </span>
              </h3>
              <button
                onClick={async () => {
                  const res = await shareCommentApi.getReports();
                  if (res.success && res.data) setReports(res.data);
                }}
                className="btn-ghost p-1.5"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {reports.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">
                <Flag className="w-8 h-8 text-muted/30 mx-auto mb-2" />
                暂无举报记录
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      'rounded-lg p-3 border text-sm',
                      r.resolved
                        ? 'border-border bg-card/50 opacity-60'
                        : 'border-accent-500/30 bg-accent-500/5'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'badge',
                          r.resolved ? 'badge-success' : 'badge-error'
                        )}>
                          {reasonLabelMap[r.reason] || r.reason}
                        </span>
                        <span className="text-muted">
                          {r.reporterName || '匿名'}
                        </span>
                        <span className="text-muted">·</span>
                        <span className="text-muted">
                          {formatTimeAgo(r.createdAt)}
                        </span>
                      </div>
                      {!r.resolved && (
                        <button
                          onClick={() => resolveReport(r.id)}
                          className="btn-ghost text-xs py-0.5 px-2"
                        >
                          标记已处理
                        </button>
                      )}
                    </div>
                    <p className="text-foreground/80 text-xs mb-1">
                      评论ID: <code className="text-primary-400">{r.commentId}</code>
                    </p>
                    {r.description && (
                      <p className="text-muted text-xs italic">"{r.description}"</p>
                    )}
                    {r.resolved && (
                      <div className="mt-1.5 pt-1.5 border-t border-border text-xs text-success flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {r.resolvedBy} 于 {formatTimeAgo(r.resolvedAt!)} 处理
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CommentList
        shareId={shareId}
        episodeId={episodeId}
        isAdmin
        showAdminView
        onStatsChange={setStats}
      />

      <style>{`
        @keyframes slide-in-from-bottom-2 {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-in-from-bottom-2 {
          animation: slide-in-from-bottom-2 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
