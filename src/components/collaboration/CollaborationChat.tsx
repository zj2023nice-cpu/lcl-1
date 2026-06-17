import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Clock,
  Play,
  Pin,
  Users,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
} from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { useAuthStore } from '@/store/authStore';
import { CollaborationMessage, OnlineCollaborator } from '@/types';
import { formatTime, formatRelativeTime } from '@/utils/time';
import { cn } from '@/lib/utils';

interface CollaborationChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentTime: number;
  onSeekTo?: (time: number) => void;
}

const MessageAvatar: React.FC<{ message: CollaborationMessage; color?: string }> = ({
  message,
  color,
}) => {
  const initial = message.senderName?.[0] || '?';
  const bgColor = color || '#6366F1';

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white"
      style={{ backgroundColor: bgColor }}
    >
      {message.senderAvatar ? (
        <img
          src={message.senderAvatar}
          alt={message.senderName}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};

const MessageBubble: React.FC<{
  message: CollaborationMessage;
  isOwn: boolean;
  collaborators: OnlineCollaborator[];
  onSeekTo?: (time: number) => void;
}> = ({ message, isOwn, collaborators, onSeekTo }) => {
  const collaborator = collaborators.find((c) => c.userId === message.senderId);
  const color = collaborator?.color || '#6366F1';

  const shouldShowAvatar = isOwn ? true : true;

  return (
    <div
      className={cn(
        'flex gap-2 group',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {shouldShowAvatar && <MessageAvatar message={message} color={color} />}
      <div className={cn('flex flex-col max-w-[75%] gap-1', isOwn ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-foreground">{message.senderName}</span>
          <span className="text-muted">{formatRelativeTime(message.createdAt)}</span>
        </div>
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap',
            isOwn
              ? 'bg-primary-500 text-white rounded-tr-sm'
              : 'bg-card border border-border rounded-tl-sm'
          )}
        >
          {message.content}
        </div>
        {message.timePosition !== undefined && (
          <button
            onClick={() => onSeekTo?.(message.timePosition!)}
            className={cn(
              'flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors',
              isOwn
                ? 'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20'
                : 'bg-card/50 text-muted hover:bg-card border border-border/50'
            )}
          >
            <Clock className="w-3 h-3" />
            <span className="font-mono">{formatTime(message.timePosition)}</span>
            <Play className="w-3 h-3 ml-1" />
          </button>
        )}
      </div>
    </div>
  );
};

const TimeTagButton: React.FC<{
  currentTime: number;
  onClick: () => void;
  isActive: boolean;
}> = ({ currentTime, onClick, isActive }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all border',
        isActive
          ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
          : 'bg-card border-border text-muted hover:text-foreground hover:border-primary-500/30'
      )}
      title="附带当前时间位置到消息"
    >
      <Pin className={cn('w-3 h-3', isActive && 'animate-pulse')} />
      <span className="font-mono">{formatTime(currentTime)}</span>
    </button>
  );
};

export const CollaborationChat: React.FC<CollaborationChatProps> = ({
  isOpen,
  onClose,
  currentTime,
  onSeekTo,
}) => {
  const {
    messages,
    collaborators,
    sendMessage,
    markMessagesRead,
    unreadCount,
  } = useCollaborationStore();
  const currentUser = useAuthStore((s) => s.user);
  const [input, setInput] = useState('');
  const [attachTime, setAttachTime] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markMessagesRead();
    }
  }, [isOpen, unreadCount, markMessagesRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isOpen]);

  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    sendMessage({
      content: input.trim(),
      timePosition: attachTime ? currentTime : undefined,
    });

    setInput('');
    setAttachTime(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  const activeCount = collaborators.filter((c) => c.isActive).length;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] flex flex-col glass-card shadow-2xl animate-slide-in-up overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">协作聊天</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Users className="w-3 h-3" />
              <span>{activeCount} 人在线</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-background/30">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted py-8">
            <MessageSquare className="w-12 h-12 opacity-20 mb-3" />
            <p className="text-sm font-medium text-foreground/60">暂无消息</p>
            <p className="text-xs mt-1">发送第一条消息开始协作吧！</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === currentUser?.id}
              collaborators={collaborators}
              onSeekTo={onSeekTo}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-3 space-y-2 bg-card/30">
        <div className="flex items-center justify-between gap-2">
          <TimeTagButton
            currentTime={currentTime}
            onClick={() => setAttachTime((v) => !v)}
            isActive={attachTime}
          />
          <span className="text-[10px] text-muted flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" />
            Enter 发送 · Shift+Enter 换行
          </span>
        </div>

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            className="input-field text-sm py-2 flex-1 resize-none min-h-[40px] max-h-32"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              'p-2.5 rounded-lg transition-all self-end',
              input.trim()
                ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25 active:scale-95'
                : 'bg-muted/20 text-muted cursor-not-allowed'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
