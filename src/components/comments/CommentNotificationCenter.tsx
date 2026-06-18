import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Bell,
  MessageCircle,
  ThumbsUp,
  Shield,
  AlertTriangle,
  Check,
  CheckCheck,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { shareCommentApi } from '@/services/api';
import { formatTimeAgo } from './CommentForm';

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const iconMap: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  NEW_COMMENT: { icon: MessageCircle, color: 'text-primary-400', bg: 'bg-primary-500/15' },
  NEW_REPORT: { icon: AlertTriangle, color: 'text-accent-500', bg: 'bg-accent-500/15' },
  COMMENT_APPROVED: { icon: Check, color: 'text-success', bg: 'bg-success/15' },
  ADMIN_REPLY: { icon: Shield, color: 'text-primary-400', bg: 'bg-primary-500/15' },
  NEW_LIKE: { icon: ThumbsUp, color: 'text-accent-500', bg: 'bg-accent-500/15' },
};

interface CommentNotificationCenterProps {
  className?: string;
  showBadgeOnly?: boolean;
}

export const CommentNotificationCenter: React.FC<CommentNotificationCenterProps> = ({
  className,
  showBadgeOnly = false,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [n, c] = await Promise.all([
        shareCommentApi.getNotifications(),
        shareCommentApi.getUnreadNotificationCount(),
      ]);
      if (n.success && n.data) setNotifications(n.data);
      if (c.success && c.data !== undefined) setUnreadCount(c.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 10000);
    return () => clearInterval(id);
  }, [loadData]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const markRead = async (id: string) => {
    await shareCommentApi.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await shareCommentApi.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  };

  const renderItem = (n: NotificationItem) => {
    const cfg = iconMap[n.type] || { icon: Bell, color: 'text-muted', bg: 'bg-muted/15' };
    const Icon = cfg.icon;

    return (
      <button
        key={n.id}
        onClick={() => !n.read && markRead(n.id)}
        className={cn(
          'w-full text-left p-3 flex gap-3 rounded-lg transition-all',
          !n.read
            ? 'bg-primary-500/5 hover:bg-primary-500/10 border border-primary-500/20'
            : 'hover:bg-foreground/5 border border-transparent'
        )}
      >
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
          <Icon className={cn('w-4 h-4', cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn('text-sm font-medium', !n.read ? 'text-foreground' : 'text-foreground/70')}>
              {n.type === 'NEW_COMMENT' && '新评论'}
              {n.type === 'NEW_REPORT' && '新举报'}
              {n.type === 'COMMENT_APPROVED' && '评论审核通过'}
              {n.type === 'ADMIN_REPLY' && '管理员回复'}
              {n.type === 'NEW_LIKE' && '收到点赞'}
              {!iconMap[n.type] && '通知'}
            </span>
            {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500" />}
          </div>
          <p className={cn('text-xs line-clamp-2', !n.read ? 'text-muted' : 'text-muted/70')}>
            {n.message}
          </p>
          <p className="text-[10px] text-muted/60 mt-1">
            {formatTimeAgo(n.timestamp)}
          </p>
        </div>
      </button>
    );
  };

  if (showBadgeOnly) {
    return (
      <div className="relative inline-block">
        <Bell className={cn('w-5 h-5', className)} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-all',
          isOpen
            ? 'bg-primary-500/10 text-primary-400'
            : 'text-muted hover:text-foreground hover:bg-foreground/5',
          className
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[360px] max-w-[90vw] glass-card shadow-xl animate-in fade-in zoom-in-95 duration-150 origin-top-right">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <span className="font-display font-semibold">通知中心</span>
              {unreadCount > 0 && (
                <span className="badge badge-error">{unreadCount} 条未读</span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="btn-ghost p-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="w-full text-left px-4 py-2 border-b border-border text-xs text-primary-400 hover:bg-primary-500/5 flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {markingAll ? '处理中...' : '全部标为已读'}
            </button>
          )}

          <div className="max-h-[400px] overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-10 h-10 text-muted/20 mx-auto mb-2" />
                <p className="text-sm text-muted">暂无通知</p>
                <p className="text-xs text-muted/60 mt-1">新动态将在这里显示</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map(renderItem)}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-border text-center">
            <button
              onClick={loadData}
              className="text-xs text-muted hover:text-foreground flex items-center justify-center gap-1 w-full py-1.5"
            >
              <Sparkles className="w-3 h-3" />
              点击刷新通知
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
