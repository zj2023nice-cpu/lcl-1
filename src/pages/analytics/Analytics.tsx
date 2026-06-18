import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Globe,
  Smartphone,
  Trophy,
  TrendingUp,
  Calendar,
  Download,
  GitCompare,
  ChevronDown,
  Play,
  MapPin,
  Monitor,
  Tablet,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Check,
  Filter,
  FileText,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockPrograms } from '@/mock/data';

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'custom';

interface PlaybackTrendPoint {
  date: string;
  plays: number;
  uniqueListeners: number;
  avgDuration: number;
}

interface RegionData {
  name: string;
  listeners: number;
  percentage: number;
}

interface DeviceData {
  name: string;
  count: number;
  percentage: number;
  icon: React.ReactNode;
}

interface ProgramRank {
  id: string;
  name: string;
  coverImage: string;
  plays: number;
  avgListenTime: number;
  likes: number;
  shares: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface RetentionData {
  day: string;
  rate: number;
}

const generatePlaybackTrend = (days: number): PlaybackTrendPoint[] => {
  const data: PlaybackTrendPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const basePlays = 5000 + Math.sin(i * 0.3) * 1500;
    const randomFactor = 0.8 + Math.random() * 0.4;
    data.push({
      date: date.toISOString().split('T')[0],
      plays: Math.round(basePlays * randomFactor),
      uniqueListeners: Math.round(basePlays * randomFactor * 0.7),
      avgDuration: Math.round(45 + Math.random() * 30),
    });
  }
  return data;
};

const regionData: RegionData[] = [
  { name: '北京', listeners: 28450, percentage: 18.5 },
  { name: '上海', listeners: 25320, percentage: 16.5 },
  { name: '广东', listeners: 22180, percentage: 14.4 },
  { name: '浙江', listeners: 15890, percentage: 10.3 },
  { name: '江苏', listeners: 14230, percentage: 9.3 },
  { name: '四川', listeners: 10560, percentage: 6.9 },
  { name: '湖北', listeners: 8920, percentage: 5.8 },
  { name: '其他', listeners: 28450, percentage: 18.3 },
];

const deviceData: DeviceData[] = [
  { name: 'iOS', count: 45230, percentage: 38.2, icon: <Smartphone className="w-5 h-5" /> },
  { name: 'Android', count: 38920, percentage: 32.9, icon: <Smartphone className="w-5 h-5" /> },
  { name: 'Web', count: 21450, percentage: 18.1, icon: <Monitor className="w-5 h-5" /> },
  { name: '平板', count: 8920, percentage: 7.5, icon: <Tablet className="w-5 h-5" /> },
  { name: '车载', count: 3940, percentage: 3.3, icon: <Radio className="w-5 h-5" /> },
];

const generateProgramRanks = (): ProgramRank[] => {
  return mockPrograms.map((program, index) => ({
    id: program.id,
    name: program.name,
    coverImage: program.coverImage,
    plays: Math.round(50000 + Math.random() * 200000) - index * 30000,
    avgListenTime: Math.round(40 + Math.random() * 50),
    likes: Math.round(2000 + Math.random() * 15000),
    shares: Math.round(500 + Math.random() * 5000),
    trend: (['up', 'down', 'stable'] as const)[index % 3],
    trendValue: Math.round((2 + Math.random() * 18) * 10) / 10,
  })).sort((a, b) => b.plays - a.plays);
};

const retentionData: RetentionData[] = [
  { day: '首日', rate: 100 },
  { day: '次日', rate: 68.5 },
  { day: '7日', rate: 42.3 },
  { day: '14日', rate: 31.8 },
  { day: '30日', rate: 24.6 },
  { day: '60日', rate: 18.2 },
  { day: '90日', rate: 14.5 },
];

const LineChart: React.FC<{
  data: PlaybackTrendPoint[];
  height?: number;
  compareData?: PlaybackTrendPoint[];
}> = ({ data, height = 280, compareData }) => {
  const width = 800;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxPlays = Math.max(
    ...data.map((d) => d.plays),
    ...(compareData?.map((d) => d.plays) || [0])
  ) * 1.1;

  const xScale = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
  const yScale = (value: number) => padding.top + chartHeight - (value / maxPlays) * chartHeight;

  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.plays)}`)
    .join(' ');

  const areaD = `${pathD} L ${xScale(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  const comparePathD = compareData
    ? compareData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.plays)}`).join(' ')
    : '';

  const yTicks = 5;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (maxPlays / yTicks) * i);
  const xTickInterval = Math.max(1, Math.floor(data.length / 8));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        <linearGradient id="playsGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(139 92 246)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="compareGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(34 211 238)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(34 211 238)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((tick, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={yScale(tick)}
            x2={width - padding.right}
            y2={yScale(tick)}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="4 4"
          />
          <text
            x={padding.left - 8}
            y={yScale(tick) + 4}
            textAnchor="end"
            className="fill-muted text-xs"
          >
            {Math.round(tick / 1000)}k
          </text>
        </g>
      ))}

      {data.map((d, i) =>
        i % xTickInterval === 0 ? (
          <text
            key={i}
            x={xScale(i)}
            y={height - 15}
            textAnchor="middle"
            className="fill-muted text-xs"
          >
            {d.date.slice(5)}
          </text>
        ) : null
      )}

      <path d={areaD} fill="url(#playsGradient)" />
      <path
        d={pathD}
        fill="none"
        stroke="rgb(139 92 246)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => (
        <circle
          key={i}
          cx={xScale(i)}
          cy={yScale(d.plays)}
          r="3"
          fill="rgb(139 92 246)"
          className="hover:r-5 transition-all"
        />
      ))}

      {compareData && comparePathD && (
        <>
          <path
            d={comparePathD}
            fill="none"
            stroke="rgb(34 211 238)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
          />
          {compareData.map((d, i) => (
            <circle
              key={`c-${i}`}
              cx={xScale(i)}
              cy={yScale(d.plays)}
              r="3"
              fill="rgb(34 211 238)"
            />
          ))}
        </>
      )}
    </svg>
  );
};

const DonutChart: React.FC<{ data: DeviceData[]; size?: number }> = ({ data, size = 220 }) => {
  const radius = size / 2 - 30;
  const center = size / 2;
  const total = data.reduce((sum, d) => sum + d.count, 0);

  let currentAngle = -Math.PI / 2;
  const colors = ['#8b5cf6', '#22d3ee', '#f59e0b', '#10b981', '#ec4899'];

  const segments = data.map((item, index) => {
    const angle = (item.count / total) * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const innerRadius = radius - 35;
    const ix1 = center + innerRadius * Math.cos(startAngle);
    const iy1 = center + innerRadius * Math.sin(startAngle);
    const ix2 = center + innerRadius * Math.cos(endAngle);
    const iy2 = center + innerRadius * Math.sin(endAngle);

    const pathD = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ');

    return { pathD, color: colors[index % colors.length], item };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[220px] mx-auto">
      {segments.map((seg, i) => (
        <path key={i} d={seg.pathD} fill={seg.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
      ))}
      <text x={center} y={center - 8} textAnchor="middle" className="fill-foreground text-lg font-bold">
        {Math.round(total / 1000)}k
      </text>
      <text x={center} y={center + 14} textAnchor="middle" className="fill-muted text-xs">
        总听众
      </text>
    </svg>
  );
};

const RetentionChart: React.FC<{ data: RetentionData[] }> = ({ data }) => {
  const width = 600;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const barWidth = (width - padding.left - padding.right) / data.length - 16;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(52 211 153)" />
          <stop offset="100%" stopColor="rgb(16 185 129 / 0.5)" />
        </linearGradient>
      </defs>

      {[0, 25, 50, 75, 100].map((tick) => {
        const y = padding.top + ((100 - tick) / 100) * (height - padding.top - padding.bottom);
        return (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeDasharray="4 4"
            />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" className="fill-muted text-xs">
              {tick}%
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const x = padding.left + i * (barWidth + 16) + 8;
        const barHeight = (d.rate / 100) * (height - padding.top - padding.bottom);
        const y = height - padding.bottom - barHeight;
        return (
          <g key={d.day}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="6"
              fill="url(#retentionGradient)"
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
            <text
              x={x + barWidth / 2}
              y={y - 8}
              textAnchor="middle"
              className="fill-foreground text-xs font-semibold"
            >
              {d.rate}%
            </text>
            <text
              x={x + barWidth / 2}
              y={height - 15}
              textAnchor="middle"
              className="fill-muted text-xs"
            >
              {d.day}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  subtext?: string;
  trend?: { value: number; direction: 'up' | 'down' };
}> = ({ title, value, icon, gradient, subtext, trend }) => {
  return (
    <div className="glass-card p-5 hover:scale-[1.02] transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted mb-2">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
          {subtext && <p className="text-xs text-muted mt-1">{subtext}</p>}
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 mt-2 text-xs font-medium',
                trend.direction === 'up' ? 'text-success' : 'text-error'
              )}
            >
              {trend.direction === 'up' ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {trend.value}% 较上期
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0 ml-3',
            gradient
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const CompareModal: React.FC<{
  programs: ProgramRank[];
  selected: string[];
  onSelect: (id: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ programs, selected, onSelect, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary-400" />
            选择对比节目
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-foreground/5 text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2">
          {programs.map((program) => (
            <button
              key={program.id}
              onClick={() => onSelect(program.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                selected.includes(program.id)
                  ? 'border-primary-500/50 bg-primary-500/10'
                  : 'border-border hover:border-foreground/20 hover:bg-foreground/5'
              )}
            >
              <img
                src={program.coverImage}
                alt={program.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{program.name}</p>
                <p className="text-xs text-muted">播放量 {program.plays.toLocaleString()}</p>
              </div>
              <div
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  selected.includes(program.id)
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-border'
                )}
              >
                {selected.includes(program.id) && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-border flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            已选择 <span className="text-primary-400 font-medium">{selected.length}</span> 个节目
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-foreground/5 transition-colors text-sm"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={selected.length < 2}
              className={cn(
                'px-4 py-2 rounded-lg text-white text-sm font-medium transition-all',
                selected.length >= 2
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 hover:shadow-glow'
                  : 'bg-muted cursor-not-allowed opacity-50'
              )}
            >
              开始对比
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const daysMap: Record<Exclude<TimeRange, 'custom'>, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };

  const currentDays = timeRange === 'custom' ? 30 : daysMap[timeRange];

  const playbackTrend = useMemo(() => generatePlaybackTrend(currentDays), [currentDays]);
  const compareTrend = useMemo(() => {
    if (!isComparing) return undefined;
    return generatePlaybackTrend(currentDays).map((d) => ({
      ...d,
      plays: Math.round(d.plays * (0.6 + Math.random() * 0.5)),
    }));
  }, [currentDays, isComparing]);
  const programRanks = useMemo(() => generateProgramRanks(), []);

  const totalPlays = useMemo(
    () => playbackTrend.reduce((sum, d) => sum + d.plays, 0),
    [playbackTrend]
  );
  const totalUniqueListeners = useMemo(
    () => playbackTrend.reduce((sum, d) => sum + d.uniqueListeners, 0),
    [playbackTrend]
  );
  const avgDuration = useMemo(
    () => Math.round(playbackTrend.reduce((sum, d) => sum + d.avgDuration, 0) / playbackTrend.length),
    [playbackTrend]
  );
  const totalRegionListeners = useMemo(
    () => regionData.reduce((sum, d) => sum + d.listeners, 0),
    []
  );

  const handleProgramSelect = useCallback((id: string) => {
    setSelectedPrograms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  }, []);

  const handleStartCompare = useCallback(() => {
    setIsComparing(true);
    setShowCompareModal(false);
  }, []);

  const handleStopCompare = useCallback(() => {
    setIsComparing(false);
    setSelectedPrograms([]);
  }, []);

  const handleExport = useCallback(async () => {
    setExportLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const csvContent = [
      ['播客听众数据分析报告'],
      [`生成时间,${new Date().toLocaleString('zh-CN')}`],
      [`统计范围,${timeRange === 'custom' ? `${customStartDate} 至 ${customEndDate}` : timeRange}`],
      [],
      ['核心指标'],
      ['总播放量', totalPlays.toLocaleString()],
      ['独立听众数', totalUniqueListeners.toLocaleString()],
      ['平均收听时长(分钟)', avgDuration],
      ['总地域听众', totalRegionListeners.toLocaleString()],
      [],
      ['播放量趋势'],
      ['日期', '播放量', '独立听众', '平均时长(分)'],
      ...playbackTrend.map((d) => [d.date, d.plays, d.uniqueListeners, d.avgDuration]),
      [],
      ['地域分布'],
      ['地区', '听众数', '占比(%)'],
      ...regionData.map((d) => [d.name, d.listeners, d.percentage]),
      [],
      ['设备来源'],
      ['设备', '数量', '占比(%)'],
      ...deviceData.map((d) => [d.name, d.count, d.percentage]),
      [],
      ['节目排行'],
      ['排名', '节目', '播放量', '平均时长(分)', '点赞', '分享'],
      ...programRanks.map((p, i) => [i + 1, p.name, p.plays, p.avgListenTime, p.likes, p.shares]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `听众数据分析报告_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    setExportLoading(false);
  }, [timeRange, customStartDate, customEndDate, totalPlays, totalUniqueListeners, avgDuration, totalRegionListeners, playbackTrend, programRanks]);

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: '近7天' },
    { key: '30d', label: '近30天' },
    { key: '90d', label: '近90天' },
    { key: '1y', label: '近1年' },
    { key: 'custom', label: '自定义' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary-400" />
            听众数据分析
          </h1>
          <p className="text-muted mt-1">深度洞察听众行为，优化内容策略</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={isComparing ? handleStopCompare : () => setShowCompareModal(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all',
              isComparing
                ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30 hover:bg-accent-500/30'
                : 'border border-border text-foreground hover:bg-foreground/5'
            )}
          >
            <GitCompare className="w-4 h-4" />
            {isComparing ? '取消对比' : '节目对比'}
          </button>
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium text-sm hover:shadow-glow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exportLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            导出报告
          </button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <span className="text-sm text-muted whitespace-nowrap">时间段：</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {timeRanges.map((range) => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  timeRange === range.key
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'border border-border text-muted hover:text-foreground hover:bg-foreground/5'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2 sm:ml-auto">
              <Calendar className="w-4 h-4 text-muted" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-foreground/5 border border-border text-foreground text-sm focus:outline-none focus:border-primary-500/50"
              />
              <span className="text-muted">至</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-foreground/5 border border-border text-foreground text-sm focus:outline-none focus:border-primary-500/50"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总播放量"
          value={totalPlays.toLocaleString()}
          icon={<Play className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-primary-500 to-primary-700"
          subtext="累计播放次数"
          trend={{ value: 12.5, direction: 'up' }}
        />
        <StatCard
          title="独立听众"
          value={totalUniqueListeners.toLocaleString()}
          icon={<Users className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-accent-500 to-cyan-600"
          subtext="不重复用户数"
          trend={{ value: 8.3, direction: 'up' }}
        />
        <StatCard
          title="平均收听时长"
          value={`${avgDuration} 分`}
          icon={<TrendingUp className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-warning to-orange-600"
          subtext="单次收听均值"
          trend={{ value: 2.1, direction: 'down' }}
        />
        <StatCard
          title="覆盖地区"
          value={`${regionData.length - 1}+`}
          icon={<MapPin className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-success to-emerald-600"
          subtext="个省市自治区"
          trend={{ value: 5.0, direction: 'up' }}
        />
      </div>

      <div className="glass-card">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-400" />
              播放量趋势
            </h2>
            <p className="text-sm text-muted mt-1">每日播放量与独立听众变化</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary-500"></span>
              <span className="text-muted">主数据播放量</span>
            </div>
            {isComparing && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-cyan-400" style={{ borderTop: '3px dashed rgb(34 211 238)' }}></span>
                <span className="text-muted">对比节目</span>
              </div>
            )}
          </div>
        </div>
        <div className="p-4">
          <LineChart data={playbackTrend} compareData={compareTrend} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-5 h-5 text-accent-400" />
              地域分布
            </h2>
            <p className="text-sm text-muted mt-1">听众来源地区 TOP 8</p>
          </div>
          <div className="p-4 space-y-3">
            {regionData.map((region, index) => (
              <div key={region.name} className="group">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold',
                        index === 0
                          ? 'bg-primary-500/20 text-primary-400'
                          : index === 1
                          ? 'bg-accent-500/20 text-accent-400'
                          : index === 2
                          ? 'bg-warning/20 text-warning'
                          : 'bg-foreground/5 text-muted'
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="text-foreground font-medium">{region.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-foreground font-semibold">
                      {region.listeners.toLocaleString()}
                    </span>
                    <span className="text-muted ml-2 text-xs">{region.percentage}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-foreground/5 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700 group-hover:opacity-80',
                      index === 0
                        ? 'bg-gradient-to-r from-primary-500 to-primary-400'
                        : index === 1
                        ? 'bg-gradient-to-r from-accent-500 to-accent-400'
                        : index === 2
                        ? 'bg-gradient-to-r from-warning to-orange-400'
                        : 'bg-gradient-to-r from-success/70 to-emerald-400/70'
                    )}
                    style={{ width: `${region.percentage * 3}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary-400" />
              设备来源
            </h2>
            <p className="text-sm text-muted mt-1">听众使用的设备类型分布</p>
          </div>
          <div className="p-4">
            <div className="mb-4">
              <DonutChart data={deviceData} />
            </div>
            <div className="space-y-2">
              {deviceData.map((device, index) => {
                const colors = ['bg-primary-500', 'bg-cyan-400', 'bg-warning', 'bg-success', 'bg-pink-500'];
                return (
                  <div
                    key={device.name}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-foreground/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center text-white',
                          colors[index % colors.length]
                        )}
                      >
                        {device.icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{device.name}</p>
                        <p className="text-xs text-muted">{device.count.toLocaleString()} 台</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{device.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            最受欢迎节目排行
          </h2>
          <p className="text-sm text-muted mt-1">按播放量排序的热门节目</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  排名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  节目
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  播放量
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  平均时长
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  点赞
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  分享
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  趋势
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {programRanks.map((program, index) => (
                <tr key={program.id} className="hover:bg-foreground/5 transition-colors">
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={cn(
                        'w-7 h-7 rounded-md inline-flex items-center justify-center text-sm font-bold',
                        index === 0
                          ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white'
                          : index === 1
                          ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
                          : index === 2
                          ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                          : 'bg-foreground/5 text-muted'
                      )}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={program.coverImage}
                        alt={program.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <span className="font-medium text-foreground">{program.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-foreground">
                    {program.plays.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right text-muted">
                    {program.avgListenTime} 分
                  </td>
                  <td className="px-4 py-3.5 text-right text-muted">
                    {program.likes.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right text-muted">
                    {program.shares.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                        program.trend === 'up'
                          ? 'bg-success/10 text-success'
                          : program.trend === 'down'
                          ? 'bg-error/10 text-error'
                          : 'bg-foreground/5 text-muted'
                      )}
                    >
                      {program.trend === 'up' ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : program.trend === 'down' ? (
                        <ArrowDownRight className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3 -rotate-90" />
                      )}
                      {program.trendValue}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-success" />
            听众留存率
          </h2>
          <p className="text-sm text-muted mt-1">首次收听后各时间点的用户留存情况</p>
        </div>
        <div className="p-4">
          <RetentionChart data={retentionData} />
        </div>
      </div>

      {showCompareModal && (
        <CompareModal
          programs={programRanks}
          selected={selectedPrograms}
          onSelect={handleProgramSelect}
          onClose={() => setShowCompareModal(false)}
          onConfirm={handleStartCompare}
        />
      )}
    </div>
  );
};
