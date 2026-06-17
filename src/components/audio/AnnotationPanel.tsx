import React, { useState, useCallback } from 'react';
import { MessageSquare, CheckCircle, AlertCircle, HelpCircle, Clock, User, Check, ChevronDown, ChevronUp, Send, ArrowUp, ArrowDown, Quote, CornerDownRight, Loader2 } from 'lucide-react';
import { Annotation, AnnotationType, AnnotationStatus, AnnotationPriority, AnnotationReply, ReplySortOrder } from '@/types';
import { formatTime, formatRelativeTime } from '@/utils/time';
import { getAnnotationColor, mockReplies } from '@/mock/data';

interface AnnotationPanelProps {
  annotations: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
  onStatusChange?: (id: string, status: AnnotationStatus) => void;
  onAddAnnotation?: (data: {
    startTime: number;
    type: AnnotationType;
    content: string;
    priority?: AnnotationPriority;
  }) => void;
  onAddReply?: (annotationId: string, data: { content: string; parentId?: string; quotedReplyId?: string }) => void;
  selectedTime?: number;
  readOnly?: boolean;
  className?: string;
}

const annotationTypeConfig: Record<AnnotationType, { label: string; icon: React.ReactNode; color: string }> = {
  COMMENT: { label: '评论', icon: <MessageSquare className="w-4 h-4" />, color: 'text-primary-400' },
  CORRECTION: { label: '修正', icon: <AlertCircle className="w-4 h-4" />, color: 'text-error' },
  APPROVAL: { label: '通过', icon: <CheckCircle className="w-4 h-4" />, color: 'text-success' },
  QUESTION: { label: '疑问', icon: <HelpCircle className="w-4 h-4" />, color: 'text-warning' },
};

const priorityColors: Record<AnnotationPriority, string> = {
  LOW: 'bg-muted/30 text-muted',
  MEDIUM: 'bg-primary-500/20 text-primary-400',
  HIGH: 'bg-warning/20 text-warning',
  URGENT: 'bg-error/20 text-error',
};

const statusLabels: Record<AnnotationStatus, string> = {
  OPEN: '待处理',
  IN_PROGRESS: '处理中',
  RESOLVED: '已解决',
};

const REPLIES_PAGE_SIZE = 5;

const ReplyItem: React.FC<{
  reply: AnnotationReply;
  depth?: number;
  onQuote?: (reply: AnnotationReply) => void;
  onReply?: (parentId: string, authorName: string) => void;
  readOnly?: boolean;
}> = ({ reply, depth = 0, onQuote, onReply, readOnly }) => {
  return (
    <div className={depth > 0 ? 'ml-4 pl-3 border-l-2 border-primary-500/30' : ''}>
      <div className="group py-2">
        {reply.quotedContent && (
          <div className="mb-1.5 px-2.5 py-1.5 bg-primary-500/5 border-l-2 border-primary-500/40 rounded-r-md text-xs text-muted">
            <span className="text-primary-400 font-medium">{reply.quotedAuthorName}</span>
            <span className="mx-1">:</span>
            <span className="line-clamp-1">{reply.quotedContent}</span>
          </div>
        )}
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-primary-400 text-xs font-medium">
              {(reply.createdByName || '?')[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{reply.createdByName || '未知用户'}</span>
              <span className="text-xs text-muted">{formatRelativeTime(reply.createdAt)}</span>
            </div>
            <p className="text-sm text-foreground/90 mt-0.5 break-words">{reply.content}</p>
            {!readOnly && (
              <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onReply?.(reply.id, reply.createdByName || ''); }}
                  className="flex items-center gap-1 text-xs text-muted hover:text-primary-400 transition-colors"
                >
                  <CornerDownRight className="w-3 h-3" />
                  回复
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onQuote?.(reply); }}
                  className="flex items-center gap-1 text-xs text-muted hover:text-primary-400 transition-colors"
                >
                  <Quote className="w-3 h-3" />
                  引用
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {reply.children && reply.children.length > 0 && (
        <div>
          {reply.children.map((child) => (
            <ReplyItem
              key={child.id}
              reply={child}
              depth={depth + 1}
              onQuote={onQuote}
              onReply={onReply}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  annotations,
  onAnnotationClick,
  onStatusChange,
  onAddAnnotation,
  onAddReply,
  selectedTime,
  readOnly = false,
  className = '',
}) => {
  const [selectedType, setSelectedType] = useState<AnnotationType>('COMMENT');
  const [selectedPriority, setSelectedPriority] = useState<AnnotationPriority>('MEDIUM');
  const [content, setContent] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AnnotationStatus | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<AnnotationType | 'ALL'>('ALL');
  const [replySortOrder, setReplySortOrder] = useState<ReplySortOrder>('asc');
  const [loadedReplies, setLoadedReplies] = useState<Record<string, AnnotationReply[]>>({});
  const [replyPages, setReplyPages] = useState<Record<string, number>>({});
  const [replyTotal, setReplyTotal] = useState<Record<string, number>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [quickReply, setQuickReply] = useState<Record<string, { content: string; parentId?: string; quotedReplyId?: string; quotedContent?: string; replyToName?: string }>>({});
  const [showQuickReply, setShowQuickReply] = useState<string | null>(null);

  const filteredAnnotations = annotations.filter((a) => {
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (filterType !== 'ALL' && a.type !== filterType) return false;
    return true;
  });

  const loadRepliesForAnnotation = useCallback((annotationId: string, page: number = 0) => {
    setLoadingReplies((prev) => ({ ...prev, [annotationId]: true }));

    setTimeout(() => {
      const allReplies = mockReplies[annotationId] || [];
      const totalCount = countAllReplies(allReplies);
      const sorted = replySortOrder === 'asc' ? [...allReplies] : [...allReplies].reverse();
      const start = page * REPLIES_PAGE_SIZE;
      const end = start + REPLIES_PAGE_SIZE;
      const pageReplies = sorted.slice(start, end);

      setLoadedReplies((prev) => ({
        ...prev,
        [annotationId]: page === 0 ? pageReplies : [...(prev[annotationId] || []), ...pageReplies],
      }));
      setReplyPages((prev) => ({ ...prev, [annotationId]: page }));
      setReplyTotal((prev) => ({ ...prev, [annotationId]: totalCount }));
      setLoadingReplies((prev) => ({ ...prev, [annotationId]: false }));
    }, 300);
  }, [replySortOrder]);

  const countAllReplies = (replies: AnnotationReply[]): number => {
    let count = 0;
    for (const r of replies) {
      count += 1;
      if (r.children && r.children.length > 0) {
        count += countAllReplies(r.children);
      }
    }
    return count;
  };

  const handleExpand = (annotation: Annotation) => {
    const isExpanded = expandedId === annotation.id;
    if (isExpanded) {
      setExpandedId(null);
    } else {
      setExpandedId(annotation.id);
      if (!loadedReplies[annotation.id]) {
        loadRepliesForAnnotation(annotation.id);
      }
    }
    onAnnotationClick?.(annotation);
  };

  const handleLoadMoreReplies = (annotationId: string) => {
    const nextPage = (replyPages[annotationId] || 0) + 1;
    loadRepliesForAnnotation(annotationId, nextPage);
  };

  const handleSubmitQuickReply = (annotationId: string) => {
    const qr = quickReply[annotationId];
    if (!qr?.content.trim()) return;

    onAddReply?.(annotationId, {
      content: qr.content.trim(),
      parentId: qr.parentId,
      quotedReplyId: qr.quotedReplyId,
    });

    const newReply: AnnotationReply = {
      id: `r-new-${Date.now()}`,
      annotationId,
      parentId: qr.parentId,
      quotedReplyId: qr.quotedReplyId,
      quotedContent: qr.quotedContent,
      quotedAuthorName: qr.replyToName,
      content: qr.content.trim(),
      createdById: '1',
      createdByName: '当前用户',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      children: [],
    };

    setLoadedReplies((prev) => {
      const existing = prev[annotationId] || [];
      if (qr.parentId) {
        const addToParent = (replies: AnnotationReply[]): AnnotationReply[] => {
          return replies.map((r) => {
            if (r.id === qr.parentId) {
              return { ...r, children: [...(r.children || []), newReply] };
            }
            if (r.children) {
              return { ...r, children: addToParent(r.children) };
            }
            return r;
          });
        };
        return { ...prev, [annotationId]: addToParent(existing) };
      }
      return { ...prev, [annotationId]: [...existing, newReply] };
    });

    setQuickReply((prev) => ({ ...prev, [annotationId]: { content: '' } }));
    setReplyTotal((prev) => ({ ...prev, [annotationId]: (prev[annotationId] || 0) + 1 }));
  };

  const handleQuoteReply = (annotationId: string, reply: AnnotationReply) => {
    setQuickReply((prev) => ({
      ...prev,
      [annotationId]: {
        content: prev[annotationId]?.content || '',
        quotedReplyId: reply.id,
        quotedContent: reply.content,
        replyToName: reply.createdByName,
        parentId: reply.parentId || undefined,
      },
    }));
    setShowQuickReply(annotationId);
  };

  const handleReplyTo = (annotationId: string, parentId: string, authorName: string) => {
    setQuickReply((prev) => ({
      ...prev,
      [annotationId]: {
        content: prev[annotationId]?.content || '',
        parentId,
        replyToName: authorName,
      },
    }));
    setShowQuickReply(annotationId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || selectedTime === undefined) return;

    onAddAnnotation?.({
      startTime: selectedTime,
      type: selectedType,
      content: content.trim(),
      priority: selectedPriority,
    });

    setContent('');
  };

  const getStatusIcon = (status: AnnotationStatus) => {
    switch (status) {
      case 'RESOLVED':
        return <Check className="w-4 h-4 text-success" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4 text-warning" />;
      default:
        return <AlertCircle className="w-4 h-4 text-error" />;
    }
  };

  return (
    <div className={`glass-card flex flex-col h-full ${className}`}>
      <div className="p-4 border-b border-border">
        <h3 className="font-display text-lg font-semibold mb-4">标注列表</h3>

        {!readOnly && selectedTime !== undefined && (
          <form onSubmit={handleSubmit} className="space-y-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Clock className="w-4 h-4" />
              <span>在 {formatTime(selectedTime)} 处添加标注</span>
            </div>

            <div className="flex gap-2">
              {Object.entries(annotationTypeConfig).map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type as AnnotationType)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm transition-all ${
                    selectedType === type
                      ? 'bg-primary-500/20 border border-primary-500/50'
                      : 'bg-card hover:bg-white/5 border border-border'
                  } ${config.color}`}
                >
                  {config.icon}
                  <span>{config.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as AnnotationPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPriority(p)}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                    selectedPriority === p
                      ? priorityColors[p]
                      : 'bg-card hover:bg-white/5 text-muted'
                  }`}
                >
                  {p === 'LOW' ? '低' : p === 'MEDIUM' ? '中' : p === 'HIGH' ? '高' : '紧急'}
                </button>
              ))}
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入标注内容..."
              className="input-field min-h-[80px] resize-none"
            />

            <button
              type="submit"
              disabled={!content.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              添加标注
            </button>
          </form>
        )}

        <div className="flex gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AnnotationStatus | 'ALL')}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          >
            <option value="ALL">全部状态</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as AnnotationType | 'ALL')}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          >
            <option value="ALL">全部类型</option>
            {Object.entries(annotationTypeConfig).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredAnnotations.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无标注</p>
            <p className="text-sm">点击波形图任意位置添加标注</p>
          </div>
        ) : (
          filteredAnnotations.map((annotation) => {
            const isExpanded = expandedId === annotation.id;
            const typeConfig = annotationTypeConfig[annotation.type];
            const replies = loadedReplies[annotation.id] || [];
            const totalReplies = replyTotal[annotation.id] ?? annotation.replyCount ?? 0;
            const currentPage = replyPages[annotation.id] ?? 0;
            const isLoading = loadingReplies[annotation.id] ?? false;
            const qr = quickReply[annotation.id] || { content: '' };
            const hasMoreReplies = replies.length < totalReplies;

            return (
              <div
                key={annotation.id}
                className={`bg-card rounded-xl border border-border overflow-hidden transition-all ${
                  annotation.status === 'RESOLVED' ? 'opacity-60' : ''
                } ${isExpanded ? 'border-primary-500/50' : 'hover:border-primary-500/50'}`}
              >
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => handleExpand(annotation)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-1 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getAnnotationColor(annotation.type) }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 text-xs ${typeConfig.color}`}>
                            {typeConfig.icon}
                            {typeConfig.label}
                          </span>
                          <span className={`badge ${priorityColors[annotation.priority]}`}>
                            {annotation.priority === 'LOW' ? '低' : annotation.priority === 'MEDIUM' ? '中' : annotation.priority === 'HIGH' ? '高' : '紧急'}
                          </span>
                          {(annotation.replyCount ?? 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-primary-400">
                              <MessageSquare className="w-3 h-3" />
                              {annotation.replyCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate mt-0.5">{annotation.content}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {getStatusIcon(annotation.status)}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-xs text-muted">
                    <span className="font-mono">{formatTime(annotation.startTime)}</span>
                    <span>{formatRelativeTime(annotation.createdAt)}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border/50 animate-fade-in">
                    <div className="px-3 py-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted" />
                        <span>
                          由 <span className="text-foreground">{annotation.createdByName || '未知用户'}</span> 创建
                        </span>
                      </div>

                      {annotation.assigneeName && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted" />
                          <span>
                            分配给 <span className="text-foreground">{annotation.assigneeName}</span>
                          </span>
                        </div>
                      )}

                      {annotation.status === 'RESOLVED' && annotation.resolvedByName && (
                        <div className="flex items-center gap-2 text-sm text-success">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            由 {annotation.resolvedByName} 于 {formatRelativeTime(annotation.resolvedAt!)} 解决
                          </span>
                        </div>
                      )}

                      {!readOnly && annotation.status !== 'RESOLVED' && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange?.(annotation.id, 'IN_PROGRESS');
                            }}
                            disabled={annotation.status === 'IN_PROGRESS'}
                            className="btn-secondary text-xs flex-1 py-1.5"
                          >
                            开始处理
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange?.(annotation.id, 'RESOLVED');
                            }}
                            className="btn-primary text-xs flex-1 py-1.5"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            标记解决
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border/50">
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          回复 {totalReplies > 0 ? `(${totalReplies})` : ''}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newOrder = replySortOrder === 'asc' ? 'desc' : 'asc';
                              setReplySortOrder(newOrder);
                              setLoadedReplies((prev) => {
                                const next = { ...prev };
                                delete next[annotation.id];
                                return next;
                              });
                              setReplyPages((prev) => {
                                const next = { ...prev };
                                delete next[annotation.id];
                                return next;
                              });
                              setTimeout(() => loadRepliesForAnnotation(annotation.id, 0), 0);
                            }}
                            className="flex items-center gap-1 text-xs text-muted hover:text-primary-400 transition-colors px-2 py-1 rounded-md hover:bg-primary-500/10"
                          >
                            {replySortOrder === 'asc' ? (
                              <><ArrowUp className="w-3 h-3" /> 正序</>
                            ) : (
                              <><ArrowDown className="w-3 h-3" /> 倒序</>
                            )}
                          </button>
                        </div>
                      </div>

                      {isLoading && (!replies || replies.length === 0) ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                        </div>
                      ) : replies.length > 0 ? (
                        <div className="px-3 pb-2">
                          {replies.map((reply) => (
                            <ReplyItem
                              key={reply.id}
                              reply={reply}
                              onQuote={(r) => handleQuoteReply(annotation.id, r)}
                              onReply={(parentId, authorName) => handleReplyTo(annotation.id, parentId, authorName)}
                              readOnly={readOnly}
                            />
                          ))}

                          {hasMoreReplies && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadMoreReplies(annotation.id);
                              }}
                              disabled={isLoading}
                              className="w-full py-2 text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center justify-center gap-1"
                            >
                              {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  加载更多回复 ({replies.length}/{totalReplies})
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="px-3 pb-3 text-xs text-muted text-center py-3">
                          暂无回复
                        </div>
                      )}

                      {!readOnly && (
                        <div className="px-3 pb-3">
                          {(qr.quotedContent || qr.replyToName) && (
                            <div className="mb-2 flex items-center justify-between px-2.5 py-1.5 bg-primary-500/5 border border-primary-500/20 rounded-lg">
                              <div className="text-xs text-primary-400 min-w-0">
                                {qr.quotedContent ? (
                                  <span className="truncate">
                                    引用 {qr.replyToName}：{qr.quotedContent}
                                  </span>
                                ) : qr.replyToName ? (
                                  <span>回复 {qr.replyToName}</span>
                                ) : null}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuickReply((prev) => ({
                                    ...prev,
                                    [annotation.id]: { content: prev[annotation.id]?.content || '' },
                                  }));
                                }}
                                className="text-muted hover:text-foreground transition-colors ml-2 flex-shrink-0"
                              >
                                ×
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={qr.content || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                setQuickReply((prev) => ({
                                  ...prev,
                                  [annotation.id]: { ...prev[annotation.id] || {}, content: e.target.value },
                                }));
                                if (!showQuickReply || showQuickReply !== annotation.id) {
                                  setShowQuickReply(annotation.id);
                                }
                              }}
                              onFocus={(e) => {
                                e.stopPropagation();
                                setShowQuickReply(annotation.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSubmitQuickReply(annotation.id);
                                }
                              }}
                              placeholder="快速回复..."
                              className="input-field text-sm py-1.5 flex-1"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubmitQuickReply(annotation.id);
                              }}
                              disabled={!qr.content?.trim()}
                              className="btn-primary py-1.5 px-3 flex-shrink-0"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {showQuickReply === annotation.id && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuickReply((prev) => ({
                                    ...prev,
                                    [annotation.id]: { ...prev[annotation.id] || {}, content: prev[annotation.id]?.content || '' },
                                  }));
                                }}
                                className="flex items-center gap-1 text-xs text-muted hover:text-primary-400 transition-colors"
                              >
                                <Quote className="w-3 h-3" />
                                引用
                              </button>
                              <span className="text-xs text-muted">Enter 发送 · Esc 关闭</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-border text-xs text-muted text-center">
        共 {filteredAnnotations.length} 条标注
      </div>
    </div>
  );
};
