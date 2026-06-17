import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  FileAudio,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { AudioEnhancementTask, AudioEnhancementItem, AudioEnhancementWSMessage, AudioVersion } from '@/types';
import { audioEnhancementApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface AudioEnhancementProgressProps {
  teamId: string;
  episodeId: string;
  audioVersions?: AudioVersion[];
  onTaskComplete?: (task: AudioEnhancementTask) => void;
  onTaskFailed?: (task: AudioEnhancementTask) => void;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  NOISE_REDUCTION: '降噪处理',
  VOLUME_BALANCE: '音量平衡',
  VOICE_ENHANCE: '人声增强',
  FULL_ENHANCE: '完整增强',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-muted text-muted',
  PROCESSING: 'bg-primary-500/20 text-primary-400',
  COMPLETED: 'bg-success/20 text-success',
  FAILED: 'bg-error/20 text-error',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '等待中',
  PROCESSING: '处理中',
  COMPLETED: '已完成',
  FAILED: '失败',
};

export const AudioEnhancementProgress: React.FC<AudioEnhancementProgressProps> = ({
  teamId,
  episodeId,
  audioVersions = [],
  onTaskComplete,
  onTaskFailed,
}) => {
  const user = useAuthStore((s) => s.user);
  const [tasks, setTasks] = useState<AudioEnhancementTask[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const response = await audioEnhancementApi.getTasksByEpisode(episodeId, teamId);
      const taskData = response.data.data || [];
      setTasks(taskData);
    } catch (err) {
      console.error('加载增强任务失败:', err);
    } finally {
      setLoading(false);
    }
  }, [episodeId, teamId]);

  const connectWebSocket = useCallback(() => {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) return;

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/audio-enhancement?token=${encodeURIComponent(accessToken)}&teamId=${teamId}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('音频增强 WebSocket 连接已建立');
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: AudioEnhancementWSMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (e) {
          console.error('解析 WebSocket 消息失败:', e);
        }
      };

      ws.onclose = () => {
        console.log('音频增强 WebSocket 连接已关闭');
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('音频增强 WebSocket 错误:', error);
      };
    } catch (e) {
      console.error('建立 WebSocket 连接失败:', e);
    }
  }, [teamId]);

  const handleWebSocketMessage = useCallback((message: AudioEnhancementWSMessage) => {
    if (message.type === 'PONG') return;

    const { data } = message;

    setTasks((prevTasks) => {
      const taskIndex = prevTasks.findIndex((t) => t.id === data.taskId);
      
      if (taskIndex === -1) {
        loadTasks();
        return prevTasks;
      }

      const updatedTasks = [...prevTasks];
      const task = { ...updatedTasks[taskIndex] };
      task.status = data.status;
      task.progress = data.progress;
      task.completedAudioCount = data.completedAudioCount;
      task.totalAudioCount = data.totalAudioCount;
      task.items = data.items || task.items;

      if (message.type === 'TASK_COMPLETED') {
        task.resultAudioVersionIds = data.resultAudioVersionIds;
        task.completedAt = data.completedAt;
        task.errorMessage = data.errorMessage;
        
        if (onTaskComplete) {
          onTaskComplete(task);
        }
      } else if (message.type === 'TASK_FAILED') {
        task.errorMessage = data.errorMessage;
        
        if (onTaskFailed) {
          onTaskFailed(task);
        }
      }

      updatedTasks[taskIndex] = task;
      return updatedTasks;
    });
  }, [loadTasks, onTaskComplete, onTaskFailed]);

  useEffect(() => {
    loadTasks();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [loadTasks, connectWebSocket]);

  const getVersionLabel = useCallback((versionId: string) => {
    const version = audioVersions.find((v) => v.id === versionId);
    if (version) {
      return `v${version.version}`;
    }
    return versionId;
  }, [audioVersions]);

  const activeTasks = tasks.filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'FAILED');

  if (loading && tasks.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted">加载处理状态...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {activeTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-400" />
            正在处理 ({activeTasks.length})
          </h3>
          {activeTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              expanded={expandedTaskId === task.id}
              onToggle={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
              getVersionLabel={getVersionLabel}
            />
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted" />
            最近完成 ({Math.min(completedTasks.length, 5)})
          </h3>
          {completedTasks.slice(0, 5).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              expanded={expandedTaskId === task.id}
              onToggle={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
              getVersionLabel={getVersionLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface TaskCardProps {
  task: AudioEnhancementTask;
  expanded: boolean;
  onToggle: () => void;
  getVersionLabel: (id: string) => string;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, expanded, onToggle, getVersionLabel }) => {
  const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.PENDING;
  const statusLabel = STATUS_LABELS[task.status] || task.status;

  return (
    <div className="glass-card overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-foreground/5 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', statusColor)}>
              {task.status === 'COMPLETED' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : task.status === 'FAILED' ? (
                <XCircle className="w-4 h-4" />
              ) : task.status === 'PROCESSING' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="font-medium text-foreground flex items-center gap-2">
                {TASK_TYPE_LABELS[task.taskType] || task.taskType}
                <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColor)}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-xs text-muted">
                {task.completedAudioCount} / {task.totalAudioCount} 个音频
                {' · '}
                {new Date(task.createdAt).toLocaleString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">
                {task.progress}%
              </div>
              {task.status === 'PROCESSING' && (
                <p className="text-xs text-primary-400">正在处理...</p>
              )}
            </div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted" />
            )}
          </div>
        </div>

        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500 rounded-full',
              task.status === 'FAILED'
                ? 'bg-error'
                : task.status === 'COMPLETED'
                ? 'bg-success'
                : 'bg-primary-500'
            )}
            style={{ width: `${task.progress}%` }}
          />
        </div>

        {task.errorMessage && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-error/10 rounded-lg">
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
            <p className="text-xs text-error">{task.errorMessage}</p>
          </div>
        )}
      </div>

      {expanded && task.items && task.items.length > 0 && (
        <div className="border-t border-border">
          {task.items.map((item) => (
            <ItemRow key={item.id} item={item} getVersionLabel={getVersionLabel} />
          ))}
        </div>
      )}
    </div>
  );
};

interface ItemRowProps {
  item: AudioEnhancementItem;
  getVersionLabel: (id: string) => string;
}

const ItemRow: React.FC<ItemRowProps> = ({ item, getVersionLabel }) => {
  const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.PENDING;
  const statusLabel = STATUS_LABELS[item.status] || item.status;

  return (
    <div className="p-3 border-b border-border last:border-b-0 hover:bg-foreground/5 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileAudio className="w-4 h-4 text-muted" />
          <div>
            <div className="text-sm font-medium text-foreground">
              版本 {getVersionLabel(String(item.sourceAudioVersionId))}
            </div>
            {item.errorMessage && (
              <p className="text-xs text-error mt-1">{item.errorMessage}</p>
            )}
            {item.resultAudioVersionId && (
              <p className="text-xs text-success mt-1">
                生成新版本: {getVersionLabel(String(item.resultAudioVersionId))}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {item.status === 'PROCESSING' ? (
            <>
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">{item.progress}%</div>
              </div>
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </>
          ) : null}
          <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColor)}>
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
