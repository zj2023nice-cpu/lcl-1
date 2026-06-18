import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ThumbsUp,
  MessageSquare,
  Flag,
  Pin,
  MoreHorizontal,
  X,
  AlertTriangle,
  Send,
  Shield,
} from 'lucide-react';
import { ShareComment, ReportReason, CommentStatus } from '@/types';
import { formatTimeAgo } from './CommentForm';

const reportReasons: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: '垃圾信息/广告' },
  { value: 'HARASSMENT', label: '骚扰/人身攻击' },
  { value: 'HATE_SPEECH', label: '仇恨言论' },
  { value: 'EXPLICIT', label: '色情/暴力内容' },
  { value: 'MISINFORMATION', label: '虚假信息' },
  { value: 'OTHER', label: '其他违规' },
];

const statusBadgeClass: Record<CommentStatus, string> = {
  PENDING: 'bg-warning/20 text-warning',
  APPROVED: 'bg-success/20 text-success',
  REJECTED: 'bg-error/20 text-error',
  HIDDEN: 'bg-muted/20 text-muted',
};

const statusLabel: Record<CommentStatus, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  HIDDEN: '已隐藏',
};

interface CommentItemProps {
  comment: ShareComment;
  isAdmin?: boolean;
  isReply?: boolean;
  showAdminActions?: boolean;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string, parentName: string) => void;
  onReport?: (commentId: string) => void;
  onPin?: (commentId: string, pinned: boolean) => void;
  onUpdateStatus?: (commentId: string, status: CommentStatus) => void;
  onAdminReply?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  children?: React.ReactNode;
  className?: string;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isAdmin = false,
  isReply = false,
  showAdminActions = false,
  onLike,
  onReply,
  onReport,
  onPin,
  onUpdateStatus,
  onAdminReply,
  onDelete,
  children,
  className,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('SPAM');
  const [reportDescription, setReportDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const handleLike = () => {
    if (!onLike) return;
    setLikeAnimating(true);
    onLike(comment.id);
    setTimeout(() => setLikeAnimating(false), 300);
  };

  const handleReportSubmit = async () => {
    if (!onReport) return;
    setReportSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    onReport(comment.id);
    setReportSubmitting(false);
    setShowReportDialog(false);
    setReportDescription('');
    setReporterName('');
    setReportReason('SPAM');
  };

  const displayName = comment.isGuest
    ? comment.guestNickname || comment.createdByName
    : comment.createdByName;

  const isHidden = comment.status === 'REJECTED' || comment.status === 'HIDDEN';
  const canSeeHidden = isAdmin || showAdminActions;

  return (
    <>
      <div
        className={cn(
          'group relative rounded-xl transition-all duration-200',
          isReply ? 'pl-4 border-l-2 border-border/50' : 'p-4 hover:bg-foreground/3',
          comment.isPinned && !isReply && 'bg-primary-500/5 border border-primary-500/20',
          className
        )}
      >
        {comment.isPinned && !isReply && (
          <div className="absolute -top-2 left-4 flex items-center gap-1 text-xs text-primary-400 font-medium bg-primary-500/10 px-2 py-0.5 rounded-full">
            <Pin className="w-3 h-3" />
            置顶
          </div>
        )}

        {showAdminActions && comment.status !== 'APPROVED' && (
          <div className={cn('absolute top-2 right-2', 'badge', statusBadgeClass[comment.status])}>
            {statusLabel[comment.status]}
          </div>
        )}

        <div className={cn('flex gap-3', isReply ? 'pt-2' : '')}>
          <div className="flex-shrink-0">
            <div className={cn(
              'overflow-hidden border border-border',
              isReply ? 'w-8 h-8 rounded-full' : 'w-10 h-10 rounded-xl'
            )}>
              <img
                src={comment.createdByAvatar}
                alt={displayName}
                className="w-full h-full object-cover bg-card"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div
                className={cn(
                  'w-full h-full bg-gradient-to-br flex items-center justify-center text-white font-medium',
                  isReply ? 'text-xs' : 'text-sm',
                  'from-primary-500 to-accent-500'
                )}
                style={{ display: 'none' }}
                id={`fallback-${comment.id}`}
              >
                {displayName?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-foreground text-sm">
                {displayName}
              </span>
              {!comment.isGuest && (
                <span className="badge badge-primary text-[10px] py-0">
                  内部
                </span>
              )}
              <span className="text-xs text-muted">
                {formatTimeAgo(comment.createdAt)}
              </span>
              {comment.reportCount > 0 && (showAdminActions || isAdmin) && (
                <span className="badge badge-error text-[10px] py-0 flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {comment.reportCount}
                </span>
              )}
            </div>

            {isHidden && !canSeeHidden ? (
              <div className="text-sm text-muted italic bg-muted/10 rounded-lg px-3 py-2">
                该评论因违规已被隐藏
              </div>
            ) : (
              <div className="text-sm text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
                {comment.content}
              </div>
            )}

            {comment.adminReply && (
              <div className="mt-2 bg-success/5 border border-success/20 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="w-3.5 h-3.5 text-success" />
                  <span className="text-xs font-medium text-success">
                    {comment.adminRepliedBy || '管理员回复'}
                  </span>
                  <span className="text-xs text-muted">
                    · {comment.adminRepliedAt && formatTimeAgo(comment.adminRepliedAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground/90">{comment.adminReply}</p>
              </div>
            )}

            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <button
                onClick={handleLike}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all',
                  comment.likedByMe
                    ? 'text-primary-500 bg-primary-500/10'
                    : 'text-muted hover:text-foreground hover:bg-foreground/5',
                  likeAnimating && 'scale-110'
                )}
              >
                <ThumbsUp className={cn('w-3.5 h-3.5', comment.likedByMe && 'fill-current')} />
                <span>{comment.likeCount > 0 ? comment.likeCount : '点赞'}</span>
              </button>

              {!isReply && !isHidden && (
                <button
                  onClick={() => onReply && onReply(comment.id, displayName)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted hover:text-foreground hover:bg-foreground/5 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>回复{comment.replyCount > 0 ? ` ${comment.replyCount}` : ''}</span>
                </button>
              )}

              {!isHidden && !comment.reportedByMe && (
                <button
                  onClick={() => setShowReportDialog(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted hover:text-error hover:bg-error/5 transition-all"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>举报</span>
                </button>
              )}

              {comment.reportedByMe && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-warning bg-warning/10">
                  <Flag className="w-3.5 h-3.5 fill-current" />
                  <span>已举报</span>
                </span>
              )}

              {(showAdminActions || isAdmin) && (
                <div className="relative ml-auto">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted hover:text-foreground hover:bg-foreground/5 transition-all"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    <span>管理</span>
                  </button>

                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 z-20 glass-card p-1 min-w-[160px] shadow-lg">
                        <button
                          onClick={() => { onPin && onPin(comment.id, !comment.isPinned); setShowMenu(false); }}
                          className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-foreground/5 flex items-center gap-2"
                        >
                          <Pin className="w-3.5 h-3.5" />
                          {comment.isPinned ? '取消置顶' : '置顶评论'}
                        </button>
                        <button
                          onClick={() => { onAdminReply && onAdminReply(comment.id); setShowMenu(false); }}
                          className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-foreground/5 flex items-center gap-2"
                        >
                          <Send className="w-3.5 h-3.5" />
                          管理员回复
                        </button>
                        <div className="my-1 border-t border-border" />
                        {comment.status !== 'APPROVED' && (
                          <button
                            onClick={() => { onUpdateStatus && onUpdateStatus(comment.id, 'APPROVED'); setShowMenu(false); }}
                            className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-success/10 text-success flex items-center gap-2"
                          >
                            ✓ 通过审核
                          </button>
                        )}
                        {comment.status !== 'PENDING' && (
                          <button
                            onClick={() => { onUpdateStatus && onUpdateStatus(comment.id, 'PENDING'); setShowMenu(false); }}
                            className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-warning/10 text-warning flex items-center gap-2"
                          >
                            标记待审
                          </button>
                        )}
                        {comment.status !== 'REJECTED' && (
                          <button
                            onClick={() => { onUpdateStatus && onUpdateStatus(comment.id, 'REJECTED'); setShowMenu(false); }}
                            className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-error/10 text-error flex items-center gap-2"
                          >
                            拒绝/隐藏
                          </button>
                        )}
                        <div className="my-1 border-t border-border" />
                        <button
                          onClick={() => { onDelete && onDelete(comment.id); setShowMenu(false); }}
                          className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-error/10 text-error flex items-center gap-2"
                        >
                          <X className="w-3.5 h-3.5" />
                          删除评论
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {children}
          </div>
        </div>
      </div>

      {showReportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                举报评论
              </h3>
              <button
                onClick={() => setShowReportDialog(false)}
                className="btn-ghost p-1.5 -mr-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  举报原因
                </label>
                <div className="space-y-1.5">
                  {reportReasons.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setReportReason(r.value)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-sm border transition-all',
                        reportReason === r.value
                          ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                          : 'border-border hover:border-foreground/30 text-foreground/80'
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  补充说明（可选）
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="请详细描述违规内容..."
                  className="input-field resize-none text-sm h-20"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  您的称呼（可选）
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="便于我们后续跟进..."
                  className="input-field text-sm"
                  maxLength={20}
                />
              </div>

              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 text-xs text-warning">
                举报提交后我们会在 24 小时内处理。恶意举报将导致账号受限。
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowReportDialog(false)}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleReportSubmit}
                disabled={reportSubmitting}
                className="btn-accent flex-1"
              >
                {reportSubmitting ? '提交中...' : '确认举报'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
