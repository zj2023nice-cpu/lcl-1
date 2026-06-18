import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import { ShareComment, CommentSortOrder, CommentStatus, PaginatedComments } from '@/types';
import { shareCommentApi } from '@/services/api';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';

interface CommentListProps {
  shareId: string;
  episodeId: string;
  isAdmin?: boolean;
  showAdminView?: boolean;
  onStatsChange?: (stats: PaginatedComments['stats'] | null) => void;
  className?: string;
}

const sortOptions: { value: CommentSortOrder; label: string }[] = [
  { value: 'PINNED_FIRST', label: '置顶优先' },
  { value: 'NEWEST', label: '最新发表' },
  { value: 'OLDEST', label: '最早发表' },
  { value: 'MOST_LIKED', label: '最多点赞' },
  { value: 'MOST_REPLIES', label: '最多回复' },
];

export const CommentList: React.FC<CommentListProps> = ({
  shareId,
  episodeId,
  isAdmin = false,
  showAdminView = false,
  onStatsChange,
  className,
}) => {
  const [comments, setComments] = useState<ShareComment[]>([]);
  const [pinnedComments, setPinnedComments] = useState<ShareComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState<CommentSortOrder>('PINNED_FIRST');
  const [statusFilter, setStatusFilter] = useState<CommentStatus | undefined>(
    showAdminView ? undefined : 'APPROVED'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shareCommentApi.listComments(shareId, {
        page,
        pageSize,
        sort,
        status: statusFilter,
        searchQuery: searchQuery || undefined,
      });
      if (res.success && res.data) {
        setComments(res.data.items);
        setPinnedComments(res.data.pinnedComments);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
        if (onStatsChange) {
          onStatsChange(res.data.stats);
        }
      }
    } catch (e) {
      console.error('Failed to load comments:', e);
    } finally {
      setLoading(false);
    }
  }, [shareId, page, pageSize, sort, statusFilter, searchQuery, refreshKey, onStatsChange]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [sort, statusFilter, searchQuery, showAdminView]);

  const handleSubmit = async (content: string, nickname?: string) => {
    setSubmitting(true);
    try {
      await shareCommentApi.createComment({
        shareId,
        episodeId,
        content,
        guestNickname: nickname,
        parentId: replyingTo?.id,
      });
      setReplyingTo(null);
      refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    await shareCommentApi.toggleLike(commentId);
    refresh();
  };

  const handleReport = async (commentId: string) => {
    await shareCommentApi.reportComment(commentId, {
      reason: 'OTHER',
      description: '从评论卡片触发举报（对话框内已选具体原因）',
    });
    refresh();
  };

  const handlePin = async (commentId: string, pinned: boolean) => {
    await shareCommentApi.updateComment(commentId, { isPinned: pinned });
    refresh();
  };

  const handleUpdateStatus = async (commentId: string, status: CommentStatus) => {
    await shareCommentApi.updateComment(commentId, { status });
    refresh();
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('确定要删除这条评论吗？此操作不可撤销。')) return;
    await shareCommentApi.deleteComment(commentId);
    refresh();
  };

  const handleAdminReply = (commentId: string) => {
    const comment = [...comments, ...pinnedComments].find(c => c.id === commentId);
    if (!comment) return;
    const reply = window.prompt(`管理员回复 @${comment.createdByName}：`, comment.adminReply || '');
    if (reply !== null) {
      shareCommentApi.updateComment(commentId, { adminReply: reply }).then(() => refresh());
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <div className="text-sm text-muted">
          共 {total} 条评论 · 第 {page}/{totalPages} 页
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-ghost p-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={cn(
                  'w-8 h-8 rounded-lg text-sm font-medium transition-all',
                  page === pageNum
                    ? 'bg-primary-500 text-white'
                    : 'hover:bg-foreground/5 text-foreground/70'
                )}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-ghost p-1.5"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('glass-card p-4 sm:p-6', className)}>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary-500" />
          <h3 className="font-display text-lg font-semibold">评论区</h3>
          {!showAdminView && (
            <span className="badge badge-muted text-xs">
              {total > 0 ? `${total} 条` : '暂无评论'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {showAdminView && (
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索评论..."
                className="input-field text-sm pl-8 py-2 w-44"
              />
            </div>
          )}
          <div className="flex items-center gap-1 bg-card rounded-lg border border-border p-0.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted ml-2" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CommentSortOrder)}
              className="bg-transparent text-sm py-1.5 pr-2 pl-1 outline-none cursor-pointer text-foreground/80"
            >
              {sortOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="btn-ghost p-2"
            title="刷新"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {showAdminView && (
        <div className="flex items-center gap-2 mb-4 flex-wrap pb-4 border-b border-border">
          <span className="text-sm text-muted">状态筛选：</span>
          {[
            { v: undefined, l: '全部' },
            { v: 'PENDING', l: '待审核' },
            { v: 'APPROVED', l: '已通过' },
            { v: 'REJECTED', l: '已拒绝' },
          ].map((f) => (
            <button
              key={f.l}
              onClick={() => setStatusFilter(f.v as CommentStatus | undefined)}
              className={cn(
                'px-3 py-1 text-xs rounded-full transition-all border',
                statusFilter === f.v
                  ? 'bg-primary-500/10 border-primary-500/50 text-primary-400'
                  : 'border-border text-muted hover:text-foreground'
              )}
            >
              {f.l}
            </button>
          ))}
        </div>
      )}

      {!showAdminView && (
        <div className="mb-6">
          <CommentForm
            onSubmit={handleSubmit}
            loading={submitting}
            showNickname={true}
          />
        </div>
      )}

      {showAdminView && replyingTo && (
        <div className="mb-6 bg-foreground/3 rounded-xl p-4">
          <div className="text-sm text-muted mb-2">
            回复 <span className="text-primary-400 font-medium">@{replyingTo.name}</span>
          </div>
          <CommentForm
            onSubmit={handleSubmit}
            onCancel={() => setReplyingTo(null)}
            showNickname={false}
            loading={submitting}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-4 py-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-border flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="h-4 bg-border rounded w-24" />
                  <div className="h-4 bg-border rounded w-16" />
                </div>
                <div className="h-4 bg-border rounded w-full" />
                <div className="h-4 bg-border rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {!showAdminView && pinnedComments.length > 0 && page === 1 && (
            <div className="space-y-3 mb-6 pb-4 border-b-2 border-dashed border-primary-500/30">
              {pinnedComments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  isAdmin={isAdmin}
                  showAdminActions={showAdminView}
                  onLike={handleLike}
                  onReply={(id, name) => setReplyingTo({ id, name })}
                  onReport={handleReport}
                  onPin={handlePin}
                  onUpdateStatus={handleUpdateStatus}
                  onAdminReply={handleAdminReply}
                  onDelete={handleDelete}
                >
                  {c.replies && c.replies.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {c.replies.map((r) => (
                        <CommentItem
                          key={r.id}
                          comment={r}
                          isReply
                          isAdmin={isAdmin}
                          showAdminActions={showAdminView}
                          onLike={handleLike}
                          onReport={handleReport}
                          onUpdateStatus={handleUpdateStatus}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </CommentItem>
              ))}
            </div>
          )}

          {comments.length === 0 ? (
            <div className="py-16 text-center">
              <MessageCircle className="w-12 h-12 text-muted/30 mx-auto mb-3" />
              <p className="text-muted text-sm">
                {searchQuery || statusFilter ? '没有找到匹配的评论' : '暂无评论，快来抢沙发吧~'}
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                isAdmin={isAdmin}
                showAdminActions={showAdminView}
                onLike={handleLike}
                onReply={(id, name) => setReplyingTo({ id, name })}
                onReport={handleReport}
                onPin={handlePin}
                onUpdateStatus={handleUpdateStatus}
                onAdminReply={handleAdminReply}
                onDelete={handleDelete}
              >
                {c.replies && c.replies.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {c.replies.map((r) => (
                      <CommentItem
                        key={r.id}
                        comment={r}
                        isReply
                        isAdmin={isAdmin}
                        showAdminActions={showAdminView}
                        onLike={handleLike}
                        onReport={handleReport}
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </CommentItem>
            ))
          )}

          {!showAdminView && replyingTo && (
            <div className="mt-4 bg-foreground/3 rounded-xl p-4 animate-in slide-in-from-bottom-2 duration-200">
              <div className="text-sm text-muted mb-2">
                回复 <span className="text-primary-400 font-medium">@{replyingTo.name}</span>
              </div>
              <CommentForm
                onSubmit={handleSubmit}
                onCancel={() => setReplyingTo(null)}
                showNickname={true}
                loading={submitting}
              />
            </div>
          )}

          {renderPagination()}
        </div>
      )}
    </div>
  );
};
