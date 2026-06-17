import React, { useState } from 'react';
import { Users, ChevronDown, ChevronUp, MessageCircle, Wifi, WifiOff, MoreHorizontal } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { useAuthStore } from '@/store/authStore';
import { OnlineCollaborator, UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/time';

const roleLabels: Record<UserRole, string> = {
  ADMIN: '管理员',
  PRODUCER: '制作人',
  EDITOR: '剪辑师',
  OPERATOR: '运营',
  HOST: '主播',
  GUEST: '嘉宾',
};

interface OnlineUsersProps {
  onOpenChat?: () => void;
  className?: string;
}

const CollaboratorAvatar: React.FC<{ collaborator: OnlineCollaborator; showTooltip?: boolean }> = ({
  collaborator,
  showTooltip = true,
}) => {
  const initial = collaborator.name?.[0] || '?';
  const isSelf = collaborator.userId === useAuthStore.getState().user?.id;

  return (
    <div className="relative group">
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center border-2 flex-shrink-0 text-sm font-semibold text-white',
          isSelf ? 'ring-2 ring-offset-2 ring-offset-background ring-primary-500' : ''
        )}
        style={{
          backgroundColor: collaborator.color,
          borderColor: collaborator.color,
        }}
        title={showTooltip ? undefined : collaborator.name}
      >
        {collaborator.avatarUrl ? (
          <img
            src={collaborator.avatarUrl}
            alt={collaborator.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
            <span>{initial}</span>
          )}
      </div>
      <div
        className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
          collaborator.isActive ? 'bg-success' : 'bg-muted'
        )}
      />
    </div>
  );
};

export const OnlineUsers: React.FC<OnlineUsersProps> = ({ onOpenChat, className = '' }) => {
  const { collaborators, isConnected, cursors, unreadCount } = useCollaborationStore();
  const currentUser = useAuthStore((s) => s.user);
  const [isExpanded, setIsExpanded] = useState(false);

  const activeCount = collaborators.filter((c) => c.isActive).length;
  const others = collaborators.filter((c) => c.userId !== currentUser?.id);
  const visibleAvatars = others.slice(0, 3);
  const extraCount = Math.max(0, others.length - 3);

  return (
    <div className={cn('glass-card overflow-hidden', className)}>
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full p-3 flex items-center justify-between hover:bg-foreground/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Users className="w-5 h-5 text-primary-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">协作成员</p>
            <p className="text-xs text-muted">{activeCount} 人活跃</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2">
            {visibleAvatars.map((c) => (
              <CollaboratorAvatar key={c.userId} collaborator={c} />
            ))}
            {extraCount > 0 && (
              <div className="w-9 h-9 rounded-full bg-card border-2 border-background flex items-center justify-center text-xs font-medium text-muted -ml-1">
                +{extraCount}
              </div>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs">
                {isConnected ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-success" />
                    <span className="text-success">已连接</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-error" />
                    <span className="text-error">连接中...</span>
                  </>
                )}
              </div>
              {onOpenChat && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChat();
                  }}
                  className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors px-2 py-1 rounded-md hover:bg-primary-500/10"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  发送消息
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto px-3 pb-3 space-y-1">
            {collaborators.map((c) => {
              const cursor = cursors[c.userId];
              const isSelf = c.userId === currentUser?.id;

              return (
                <div
                  key={c.userId}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-colors',
                    isSelf ? 'bg-primary-500/10' : 'hover:bg-foreground/5'
                  )}
                >
                  <CollaboratorAvatar collaborator={c} showTooltip={false} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate">
                        {c.name}
                        {isSelf && (
                          <span className="text-xs text-muted ml-1">(我)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: `${c.color}20`,
                          color: c.color,
                        }}
                      >
                        {roleLabels[c.role]}
                      </span>
                      {cursor && !isSelf && (
                        <span className="text-muted">
                          · {Math.floor(cursor.timePosition / 60 | 0)}:{String(Math.floor(cursor.timePosition % 60)).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isSelf && (
                    <span className="text-[10px] text-muted">
                      {c.isActive ? '在线' : `离线 ${formatRelativeTime(c.lastActiveAt)}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
