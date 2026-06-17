import React, { useState, useCallback, useEffect } from 'react';
import { MessageSquare, CheckCircle, AlertCircle, HelpCircle, Clock, User, Check, ChevronDown, ChevronUp, Send, ArrowUp, ArrowDown, Quote, CornerDownRight, Loader2, X, Reply } from 'lucide-react';
import { Annotation, AnnotationType, AnnotationStatus, AnnotationPriority, AnnotationReply, ReplySortOrder } from '@/types';
import { formatTime, formatRelativeTime } from '@/utils/time';
import { getAnnotationColor } from '@/mock/data';
import { annotationReplyApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

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

const ROOT_PAGE_SIZE = 5;
const CHILD_PAGE_SIZE = 3;

interface ReplyThreadItemProps {
  reply: AnnotationReply;
  depth?: number;
  onQuote?: (reply: AnnotationReply) => void;
  onReply?: (reply: AnnotationReply) => void;
  onLoadChildren?: (replyId: string) => Promise<void>;
  loadedChildren?: Record<string, AnnotationReply[]>;
  childPages?: Record<string, number>;
  childTotals?: Record<string, number>;
  loadingChildren?: Record<string, boolean>;
  annotationId: string;
  teamId: string;
  sortOrder: ReplySortOrder;
  readOnly?: boolean;
}

const ReplyThreadItem: React.FC<ReplyThreadItemProps> = ({
  reply,
  depth = 0,
  onQuote,
  onReply,
  onLoadChildren,
  loadedChildren = {},
  childPages = {},
  childTotals = {},
  loadingChildren = {},
  annotationId,
  teamId,
  sortOrder,
  readOnly,
}) => {
  const children = loadedChildren[reply.id] || [];
  const totalChildren = childTotals[reply.id] ?? reply.childCount ?? 0;
  const currentPage = childPages[reply.id] ?? 0;
  const isLoading = loadingChildren[reply.id] ?? false;
  const hasMore = children.length < totalChildren;
  const hasChildren = totalChildren > 0;

  const [showChildren, setShowChildren] = useState(hasChildren && children.length > 0);

  useEffect(() => {
    if (hasChildren && children.length > 0 && !showChildren) {
      setShowChildren(true);
    }
  }, [hasChildren, children.length, showChildren]);

  const handleLoadChildren = async () => {
    if (onLoadChildren && reply.id) {
      await onLoadChildren(reply.id);
      setShowChildren(true);
    }
  };

  return (
    <div className={depth > 0 ? 'ml-4 pl-3 border-l-2 border-primary-500/30' : ''}>
      <div className="group py-2">
        {reply.quotedContent && reply.quotedReplyId && (
          <div className="mb-1.5 px-2.5 py-1.5 bg-primary-500/5 border-l-2 border-primary-500/40 rounded-r-md text-xs text-muted">
            <div className="flex items-start gap-1">
              <Quote className="w-3 h-3 text-primary-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-primary-400 font-medium">{reply.quotedAuthorName}</span>
                <p className="line-clamp-2 mt-0.5">{reply.quotedContent}</p>
              </div>
            </div>
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
            <p className="text-sm text-foreground/90 mt-0.5 break-words whitespace-pre-wrap">{reply.content}</p>
            {!readOnly && (
              <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onReply?.(reply); }}
                  className="flex items-center gap-1 text-xs text-muted hover:text-primary-400 transition-colors"
                >
                  <Reply className="w-3 h-3" />
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

      {hasChildren && (
        <div>
          {!showChildren && children.length === 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLoadChildren();
              }}
              disabled={isLoading}
              className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors ml-2 mb-2"
            >
              {isLoading ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> 加载中...</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> 查看 {totalChildren} 条回复</>
              )}
            </button>
          ) : showChildren && children.length > 0 ? (
            <div>
              {children.map((child) => (
                <ReplyThreadItem
                  key={child.id}
                  reply={child}
                  depth={depth + 1}
                  onQuote={onQuote}
                  onReply={onReply}
                  onLoadChildren={onLoadChildren}
                  loadedChildren={loadedChildren}
                  childPages={childPages}
                  childTotals={childTotals}
                  loadingChildren={loadingChildren}
                  annotationId={annotationId}
                  teamId={teamId}
                  sortOrder={sortOrder}
                  readOnly={readOnly}
                />
              ))}
              {hasMore && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadChildren();
                  }}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors ml-2 my-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <><ChevronDown className="w-3 h-3" /> 更多回复 ({children.length}/{totalChildren})</>
                  )}
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

interface ReplyComposerProps {
  annotationId: string;
  teamId: string;
  parentReply?: AnnotationReply | null;
  quotedReply?: AnnotationReply | null;
  replyToName?: string;
  onCancel?: () => void;
  onSubmit: (data: { content: string; parentId?: string; quotedReplyId?: string }) => void;
}

const ReplyComposer: React.FC<ReplyComposerProps> = ({
  annotationId,
  teamId,
  parentReply,
  quotedReply,
  replyToName,
  onCancel,
  onSubmit,
}) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      onSubmit({
        content: content.trim(),
        parentId: parentReply?.id || quotedReply?.parentId,
        quotedReplyId: quotedReply?.id,
      });
      setContent('');
    } finally {
      setSubmitting(false);
    }
  };

  const hasContext = !!(quotedReply || replyToName);

  return (
    <div className="space-y-2">
      {hasContext && (
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-primary-500/5 border border-primary-500/20 rounded-lg">
          <div className="text-xs text-primary-400 min-w-0 flex items-center gap-1">
            <CornerDownRight className="w-3 h-3 flex-shrink-0" />
            {quotedReply ? (
              <span className="truncate">
                引用 <span className="font-medium">{quotedReply.createdByName}</span>：{quotedReply.content}
              </span>
            ) : replyToName ? (
              <span>回复 <span className="font-medium">{replyToName}</span></span>
            ) : null}
          </div>
          <button
            onClick={onCancel}
            className="text-muted hover:text-foreground transition-colors ml-2 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
            if (e.key === 'Escape' && onCancel) {
              e.preventDefault();
              onCancel();
            }
          }}
          placeholder={hasContext ? '写下你的回复...' : '快速回复...'}
          className="input-field text-sm py-2 flex-1 resize-none min-h-[40px] max-h-32"
          rows={1}
        />
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          className="btn-primary py-2 px-3 flex-shrink-0 self-end"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      {!hasContext && (
        <div className="text-xs text-muted">
          <span>Enter 发送 · Shift+Enter 换行</span>
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

  const [rootReplies, setRootReplies] = useState<Record<string, AnnotationReply[]>>({});
  const [rootReplyPages, setRootReplyPages] = useState<Record<string, number>>({});
  const [rootReplyTotals, setRootReplyTotals] = useState<Record<string, number>>({});
  const [rootReplyRootTotals, setRootReplyRootTotals] = useState<Record<string, number>>({});
  const [loadingRootReplies, setLoadingRootReplies] = useState<Record<string, boolean>>({});

  const [childReplies, setChildReplies] = useState<Record<string, AnnotationReply[]>>({});
  const [childReplyPages, setChildReplyPages] = useState<Record<string, number>>({});
  const [childReplyTotals, setChildReplyTotals] = useState<Record<string, number>>({});
  const [loadingChildReplies, setLoadingChildReplies] = useState<Record<string, boolean>>({});

  const [expandedChildParents, setExpandedChildParents] = useState<Set<string>>(new Set());

  const [activeReplyContext, setActiveReplyContext] = useState<Record<string, {
    quotedReply?: AnnotationReply;
    replyToReply?: AnnotationReply;
  }>>({});

  const user = useAuthStore((state) => state.user);
  const teamId = user?.teamId;

  const filteredAnnotations = annotations.filter((a) => {
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (filterType !== 'ALL' && a.type !== filterType) return false;
    return true;
  });

  const loadRootReplies = useCallback(async (annotationId: string, page: number = 0, reset: boolean = false) => {
    if (!teamId) return;

    setLoadingRootReplies((prev) => ({ ...prev, [annotationId]: true }));

    try {
      const response = await annotationReplyApi.getReplies(annotationId, {
        teamId,
        page,
        size: ROOT_PAGE_SIZE,
        sort: replySortOrder,
      });

      const data = response.data.data as any;
      const items: any[] = data.items || [];
      const total = data.total || 0;
      const rootTotal = data.rootTotal || 0;

      setRootReplies((prev) => ({
        ...prev,
        [annotationId]: reset ? items : [...(prev[annotationId] || []), ...items],
      }));
      setRootReplyPages((prev) => ({ ...prev, [annotationId]: page }));
      setRootReplyTotals((prev) => ({ ...prev, [annotationId]: total }));
      setRootReplyRootTotals((prev) => ({ ...prev, [annotationId]: rootTotal }));
    } catch (error) {
      console.error('Failed to load replies:', error);
    } finally {
      setLoadingRootReplies((prev) => ({ ...prev, [annotationId]: false }));
    }
  }, [teamId, replySortOrder]);

  const loadChildReplies = useCallback(async (annotationId: string, parentId: string) => {
    if (!teamId) return;

    const currentPage = childReplyPages[parentId] ?? -1;
    const nextPage = currentPage + 1;
    const existing = childReplies[parentId] || [];

    if (existing.length > 0 && nextPage === 0) {
      return;
    }

    setLoadingChildReplies((prev) => ({ ...prev, [parentId]: true }));

    try {
      const response = await annotationReplyApi.getChildReplies(annotationId, parentId, {
        teamId,
        page: nextPage,
        size: CHILD_PAGE_SIZE,
        sort: replySortOrder,
      });

      const data = response.data.data as any;
      const items: any[] = data.items || [];
      const total = data.total || 0;

      setChildReplies((prev) => ({
        ...prev,
        [parentId]: nextPage === 0 ? items : [...(prev[parentId] || []), ...items],
      }));
      setChildReplyPages((prev) => ({ ...prev, [parentId]: nextPage }));
      setChildReplyTotals((prev) => ({ ...prev, [parentId]: total }));

      if (nextPage === 0 && items.length > 0) {
        setExpandedChildParents((prev) => {
          const next = new Set(prev);
          next.add(parentId);
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to load child replies:', error);
    } finally {
      setLoadingChildReplies((prev) => ({ ...prev, [parentId]: false }));
    }
  }, [teamId, replySortOrder, childReplyPages, childReplies]);

  const handleExpand = (annotation: Annotation) => {
    const isExpanded = expandedId === annotation.id;
    if (isExpanded) {
      setExpandedId(null);
    } else {
      setExpandedId(annotation.id);
      if (!rootReplies[annotation.id]) {
        loadRootReplies(annotation.id, 0, true);
      }
    }
    onAnnotationClick?.(annotation);
  };

  const handleLoadMoreRootReplies = (annotationId: string) => {
    const nextPage = (rootReplyPages[annotationId] ?? -1) + 1;
    loadRootReplies(annotationId, nextPage, false);
  };

  const updateParentChildCount = useCallback((annotationId: string, parentId: string, delta: number) => {
    setRootReplies((prev) => {
      const rootList = prev[annotationId] || [];
      const updatedRoot = rootList.map((r) =>
        r.id === parentId ? { ...r, childCount: Math.max(0, (r.childCount || 0) + delta) } : r
      );
      return { ...prev, [annotationId]: updatedRoot };
    });

    setChildReplies((prev) => {
      const next = { ...prev };
      for (const [key, list] of Object.entries(next)) {
        if (list.some((r) => r.id === parentId)) {
          next[key] = list.map((r) =>
            r.id === parentId ? { ...r, childCount: Math.max(0, (r.childCount || 0) + delta) } : r
          );
        }
      }
      return next;
    });
  }, []);

  const handleCreateReply = async (annotationId: string, data: { content: string; parentId?: string; quotedReplyId?: string }) => {
    if (!teamId) return;

    try {
      const response = await annotationReplyApi.createReply(annotationId, teamId, data);
      const newReply = response.data.data as AnnotationReply;

      if (!data.parentId) {
        const updatedReply = { ...newReply, childCount: 0 };
        setRootReplies((prev) => ({
          ...prev,
          [annotationId]: replySortOrder === 'asc'
            ? [...(prev[annotationId] || []), updatedReply]
            : [updatedReply, ...(prev[annotationId] || [])],
        }));
        setRootReplyTotals((prev) => ({
          ...prev,
          [annotationId]: (prev[annotationId] || 0) + 1,
        }));
        setRootReplyRootTotals((prev) => ({
          ...prev,
          [annotationId]: (prev[annotationId] || 0) + 1,
        }));
      } else {
        const parentId = data.parentId;
        const updatedReply = { ...newReply, childCount: 0 };
        setChildReplies((prev) => {
          const existing = prev[parentId] || [];
          return {
            ...prev,
            [parentId]: replySortOrder === 'asc'
              ? [...existing, updatedReply]
              : [updatedReply, ...existing],
          };
        });
        setChildReplyTotals((prev) => ({
          ...prev,
          [parentId]: (prev[parentId] || 0) + 1,
        }));
        setRootReplyTotals((prev) => ({
          ...prev,
          [annotationId]: (prev[annotationId] || 0) + 1,
        }));

        updateParentChildCount(annotationId, parentId, 1);
      }

      setActiveReplyContext((prev) => {
        const next = { ...prev };
        delete next[annotationId];
        return next;
      });
    } catch (error) {
      console.error('Failed to create reply:', error);
    }
  };

  const handleQuoteReply = (annotationId: string, reply: AnnotationReply) => {
    setActiveReplyContext((prev) => ({
      ...prev,
      [annotationId]: {
        ...prev?.[annotationId],
        quotedReply: reply,
        replyToReply: undefined,
      },
    }));
  };

  const handleReplyTo = (annotationId: string, reply: AnnotationReply) => {
    setActiveReplyContext((prev) => ({
      ...prev,
      [annotationId]: {
        ...prev?.[annotationId],
        replyToReply: reply,
        quotedReply: undefined,
      },
    }));
  };

  const handleCancelReplyContext = (annotationId: string) => {
    setActiveReplyContext((prev) => {
      const next = { ...prev };
      delete next[annotationId];
      return next;
    });
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

  const handleSortToggle = (annotationId: string) => {
    const expandedParents = new Set(expandedChildParents);
    const newOrder = replySortOrder === 'asc' ? 'desc' : 'asc';
    setReplySortOrder(newOrder);

    setRootReplies((prev) => {
      const next = { ...prev };
      delete next[annotationId];
      return next;
    });
    setRootReplyPages((prev) => {
      const next = { ...prev };
      delete next[annotationId];
      return next;
    });
    setChildReplies({});
    setChildReplyPages({});
    setChildReplyTotals({});
    setLoadingChildReplies({});
    setExpandedChildParents(new Set());

    setTimeout(async () => {
      await loadRootReplies(annotationId, 0, true);
      if (expandedParents.size > 0) {
        expandedParents.forEach((parentId) => {
          loadChildReplies(annotationId, parentId);
        });
        setExpandedChildParents(expandedParents);
      }
    }, 0);
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
                      : 'bg-card hover:bg-foreground/5 border border-border'
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
                      : 'bg-card hover:bg-foreground/5 text-muted'
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
            const replies = rootReplies[annotation.id] || [];
            const totalReplies = rootReplyTotals[annotation.id] ?? annotation.replyCount ?? 0;
            const rootTotal = rootReplyRootTotals[annotation.id] ?? 0;
            const isLoading = loadingRootReplies[annotation.id] ?? false;
            const context = activeReplyContext[annotation.id];
            const hasMoreRoot = replies.length < rootTotal && rootTotal > 0;

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
                          {totalReplies > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-primary-400">
                              <MessageSquare className="w-3 h-3" />
                              {totalReplies}
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
                              handleSortToggle(annotation.id);
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

                      {isLoading && replies.length === 0 ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                        </div>
                      ) : replies.length > 0 ? (
                        <div className="px-3 pb-2">
                          {replies.map((reply) => (
                            <ReplyThreadItem
                              key={reply.id}
                              reply={reply}
                              onQuote={(r) => handleQuoteReply(annotation.id, r)}
                              onReply={(r) => handleReplyTo(annotation.id, r)}
                              onLoadChildren={(parentId) => loadChildReplies(annotation.id, parentId)}
                              loadedChildren={childReplies}
                              childPages={childReplyPages}
                              childTotals={childReplyTotals}
                              loadingChildren={loadingChildReplies}
                              annotationId={annotation.id}
                              teamId={teamId}
                              sortOrder={replySortOrder}
                              readOnly={readOnly}
                            />
                          ))}

                          {hasMoreRoot && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadMoreRootReplies(annotation.id);
                              }}
                              disabled={isLoading}
                              className="w-full py-2 text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center justify-center gap-1"
                            >
                              {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  加载更多 ({replies.length} 条顶层 / 共 {totalReplies} 条)
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
                        <div className="px-3 pb-3 pt-1">
                          <ReplyComposer
                            annotationId={annotation.id}
                            teamId={teamId}
                            quotedReply={context?.quotedReply}
                            replyToName={context?.replyToReply?.createdByName}
                            onCancel={() => handleCancelReplyContext(annotation.id)}
                            onSubmit={(data) => handleCreateReply(annotation.id, {
                              ...data,
                              parentId: data.parentId || context?.replyToReply?.id,
                            })}
                          />
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
