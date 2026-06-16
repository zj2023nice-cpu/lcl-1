import React, { useState } from 'react';
import { MessageSquare, CheckCircle, AlertCircle, HelpCircle, Clock, User, MoreHorizontal, Check, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { Annotation, AnnotationType, AnnotationStatus, AnnotationPriority } from '@/types';
import { formatTime, formatRelativeTime } from '@/utils/time';
import { getAnnotationColor } from '@/mock/data';

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

  const filteredAnnotations = annotations.filter((a) => {
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (filterType !== 'ALL' && a.type !== filterType) return false;
    return true;
  });

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
            
            return (
              <div
                key={annotation.id}
                className={`bg-card rounded-xl border border-border overflow-hidden transition-all cursor-pointer hover:border-primary-500/50 ${
                  annotation.status === 'RESOLVED' ? 'opacity-60' : ''
                }`}
                onClick={() => {
                  setExpandedId(isExpanded ? null : annotation.id);
                  onAnnotationClick?.(annotation);
                }}
              >
                <div className="p-3">
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
                  <div className="px-3 pb-3 pt-0 border-t border-border/50 animate-fade-in">
                    <div className="mt-3 space-y-2">
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
                        <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
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
