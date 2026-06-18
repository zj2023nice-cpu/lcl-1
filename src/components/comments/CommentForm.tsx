import React from 'react';
import { cn } from '@/lib/utils';

const formatTimeAgo = (dateStr: string): string => {
  const now = new Date().getTime();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;

  return `${Math.floor(months / 12)} 年前`;
};

interface CommentFormProps {
  onSubmit: (content: string, nickname?: string) => void;
  parentName?: string;
  placeholder?: string;
  className?: string;
  showNickname?: boolean;
  loading?: boolean;
  onCancel?: () => void;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  parentName,
  placeholder = '写下你的评论...',
  className,
  showNickname = true,
  loading = false,
  onCancel,
}) => {
  const [content, setContent] = React.useState('');
  const [nickname, setNickname] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content.trim(), showNickname ? nickname.trim() : undefined);
    setContent('');
    setNickname('');
  };

  const autosize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {showNickname && (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {(nickname || '?').charAt(0).toUpperCase()}
          </div>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="请输入昵称（可选）"
            className="input-field flex-1 text-sm py-2"
            maxLength={20}
          />
        </div>
      )}

      <div className="relative">
        {parentName && (
          <div className="mb-2 text-sm text-muted">
            回复 <span className="text-primary-400 font-medium">@{parentName}</span>：
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            autosize();
          }}
          placeholder={placeholder}
          className="input-field resize-none min-h-[80px] py-3"
          maxLength={500}
          rows={3}
        />
        <div className="absolute bottom-3 right-3 text-xs text-muted">
          {content.length}/500
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted">
          {parentName ? '按 Esc 取消回复' : '支持友善、理性的交流'}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="btn-ghost text-sm py-1.5 px-3"
            >
              取消
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
            className="btn-primary text-sm py-1.5 px-4"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                发送中
              </span>
            ) : '发布'}
          </button>
        </div>
      </div>
    </div>
  );
};

export { formatTimeAgo };
