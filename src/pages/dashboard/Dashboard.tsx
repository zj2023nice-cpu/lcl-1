import React, { useState, useEffect } from 'react';
import {
  Podcast,
  Film,
  ListTodo,
  PencilLine,
  Clock,
  User,
  Upload,
  MessageSquare,
  CheckCircle2,
  Send,
  UserPlus,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { dashboardApi } from '@/services/api';
import { formatRelativeTime } from '@/utils/time';
import { cn } from '@/lib/utils';

interface Activity {
  action: string;
  userName: string;
  details?: Record<string, any>;
  createdAt: string;
}

interface DashboardStatsData {
  programCount: number;
  episodeCount: number;
  pendingTaskCount: number;
  recentActivities: Activity[];
}

const getActivityIcon = (action: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    UPLOAD_AUDIO: <Upload className="w-4 h-4" />,
    CREATE_ANNOTATION: <MessageSquare className="w-4 h-4" />,
    UPDATE_TASK_STATUS: <CheckCircle2 className="w-4 h-4" />,
    PUBLISH_DISTRIBUTION: <Send className="w-4 h-4" />,
    INVITE_MEMBER: <UserPlus className="w-4 h-4" />,
  };
  return iconMap[action] || <Clock className="w-4 h-4" />;
};

const getActivityText = (action: string) => {
  const actionMap: Record<string, string> = {
    UPLOAD_AUDIO: '上传了音频文件',
    CREATE_ANNOTATION: '添加了标注',
    UPDATE_TASK_STATUS: '更新了任务状态',
    PUBLISH_DISTRIBUTION: '发布了内容',
    INVITE_MEMBER: '邀请了成员',
  };
  return actionMap[action] || action;
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, iconBg }) => {
  return (
    <div
      className={cn(
        'glass-card p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer group'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground group-hover:text-gradient transition-all duration-300">
            {value}
          </p>
        </div>
        <div
          className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-white',
          iconBg,
          gradient
        )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

interface ActivityItemProps {
  activity: Activity;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const icon = getActivityIcon(activity.action);
  const text = getActivityText(activity.action);

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors duration-200">
      <div className="w-8 h-8 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-medium">{activity.userName}</span>
          <span className="text-muted"> {text}</span>
        </p>
        {activity.details && (
          <p className="text-xs text-muted mt-0.5 truncate">
            {activity.details.fileName || activity.details.episodeTitle || activity.details.email || ''}
          </p>
        )}
        <p className="text-xs text-muted mt-1">
          {formatRelativeTime(activity.createdAt)}
        </p>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [statsData, setStatsData] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await dashboardApi.getStats();
        setStatsData(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || '获取仪表盘数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        <span className="ml-3 text-muted">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-12 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-error" />
        <h3 className="text-lg font-semibold text-foreground mb-2">加载失败</h3>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  const stats = [
    {
      title: '节目数',
      value: statsData?.programCount ?? 0,
      icon: <Podcast className="w-6 h-6" />,
      gradient: 'bg-gradient-to-br from-primary-500 to-primary-700',
      iconBg: 'shadow-glow',
    },
    {
      title: '集数',
      value: statsData?.episodeCount ?? 0,
      icon: <Film className="w-6 h-6" />,
      gradient: 'bg-gradient-to-br from-accent-500 to-accent-700',
      iconBg: 'shadow-glow-accent',
    },
    {
      title: '待处理任务',
      value: statsData?.pendingTaskCount ?? 0,
      icon: <AlertCircle className="w-6 h-6" />,
      gradient: 'bg-gradient-to-br from-warning to-warning/70',
      iconBg: '',
    },
    {
      title: '本周标注数',
      value: 0,
      icon: <PencilLine className="w-6 h-6" />,
      gradient: 'bg-gradient-to-br from-success to-success/70',
      iconBg: '',
    },
  ];

  const recentActivities = statsData?.recentActivities ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">仪表盘</h1>
          <p className="text-muted mt-1">欢迎回来，查看团队工作概览</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <User className="w-4 h-4" />
          <span>声动工作室</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-primary-400" />
                  待处理任务
                </h2>
                <span className="text-sm text-muted">
                  {statsData?.pendingTaskCount ?? 0} 个任务
                </span>
              </div>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {statsData?.pendingTaskCount ? (
                <div className="p-8 text-center text-muted">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>待处理任务 {statsData.pendingTaskCount} 个</p>
                </div>
              ) : (
                <div className="p-8 text-center text-muted">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无待处理任务</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Film className="w-5 h-5 text-accent-400" />
                  最近更新
                </h2>
                <button className="text-sm text-primary-400 hover:text-primary-300 transition-colors duration-200">
                  查看全部
                </button>
              </div>
            </div>
            <div className="p-2 space-y-1">
              <div className="p-8 text-center text-muted">
                <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>共 {statsData?.episodeCount ?? 0} 集</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card h-fit">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-400" />
                最近活动
              </h2>
              <button className="text-sm text-primary-400 hover:text-primary-300 transition-colors duration-200">
                更多
              </button>
            </div>
          </div>
          <div className="p-2 max-h-[600px] overflow-y-auto">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <ActivityItem key={index} activity={activity} />
              ))
            ) : (
              <div className="p-8 text-center text-muted">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无最近活动</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Dashboard };
