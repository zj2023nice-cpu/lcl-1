import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  parseISO,
  differenceInDays,
  addDays,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListTodo,
  AlertTriangle,
  Clock,
  Radio,
  GripVertical,
  X,
  CheckCircle2,
  AlertCircle,
  Timer,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScheduleItem, ScheduleConflict, EpisodeStatus, TaskStatus } from '@/types';
import { scheduleApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

type ViewMode = 'week' | 'month';

interface DragState {
  isDragging: boolean;
  item: ScheduleItem | null;
  overDate: string | null;
}

const episodeStatusColors: Record<EpisodeStatus, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
  REVIEW: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
  FINALIZED: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
  DISTRIBUTED: 'bg-green-500/20 text-green-300 border-green-500/50',
};

const taskStatusColors: Record<TaskStatus, string> = {
  TODO: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
  REVIEW: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
  DONE: 'bg-green-500/20 text-green-300 border-green-500/50',
};

const taskPriorityColors: Record<string, string> = {
  LOW: 'ring-gray-400',
  MEDIUM: 'ring-blue-400',
  HIGH: 'ring-orange-400',
  URGENT: 'ring-red-500',
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    IN_PROGRESS: '制作中',
    REVIEW: '审核中',
    FINALIZED: '已定稿',
    DISTRIBUTED: '已发布',
    TODO: '待办',
    DONE: '已完成',
  };
  return map[status] || status;
};

const getPriorityLabel = (priority: string) => {
  const map: Record<string, string> = {
    LOW: '低',
    MEDIUM: '中',
    HIGH: '高',
    URGENT: '紧急',
  };
  return map[priority] || priority;
};

export const ScheduleCalendar: React.FC = () => {
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    item: null,
    overDate: null,
  });
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [upcomingReminders, setUpcomingReminders] = useState<ScheduleItem[]>([]);
  const [showReminderPanel, setShowReminderPanel] = useState(true);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const start = viewMode === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfMonth(currentDate);
      const end = viewMode === 'week' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : endOfMonth(currentDate);
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const [scheduleRes, conflictsRes, remindersRes] = await Promise.all([
        scheduleApi.getSchedule(startStr, endStr),
        scheduleApi.getConflicts(startStr, endStr),
        scheduleApi.getUpcomingReminders(7),
      ]);

      if (scheduleRes.data.success && scheduleRes.data.data) {
        setItems(scheduleRes.data.data);
      }
      if (conflictsRes.data.success && conflictsRes.data.data) {
        setConflicts(conflictsRes.data.data);
      }
      if (remindersRes.data.success && remindersRes.data.data) {
        setUpcomingReminders(remindersRes.data.data);
      }
    } catch (error) {
      console.error('加载排期失败:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const calendarDays = useMemo(() => {
    const start = viewMode === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = viewMode === 'week' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate, viewMode]);

  const weekDays = useMemo(() => {
    return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  }, []);

  const getItemsForDate = useCallback((date: Date): ScheduleItem[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return items.filter((item) => item.date === dateStr);
  }, [items]);

  const getConflictForDate = useCallback((date: Date): ScheduleConflict | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return conflicts.find((c) => c.date === dateStr);
  }, [conflicts]);

  const handleDragStart = (e: React.DragEvent, item: ScheduleItem) => {
    setDragState({ isDragging: true, item, overDate: null });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
  };

  const handleDragEnd = () => {
    setDragState({ isDragging: false, item: null, overDate: null });
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const dateStr = format(date, 'yyyy-MM-dd');
    if (dragState.overDate !== dateStr) {
      setDragState((prev) => ({ ...prev, overDate: dateStr }));
    }
  };

  const handleDragLeave = () => {
    setDragState((prev) => ({ ...prev, overDate: null }));
  };

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (!dragState.item) return;

    const newDateStr = format(date, 'yyyy-MM-dd');
    const item = dragState.item;

    try {
      if (item.itemType === 'EPISODE') {
        await scheduleApi.updateEpisodePublishDate(item.id, newDateStr);
      } else if (item.itemType === 'TASK') {
        await scheduleApi.updateTaskDueDate(item.id, newDateStr);
      }
      await loadSchedule();
    } catch (error) {
      console.error('更新日期失败:', error);
    } finally {
      setDragState({ isDragging: false, item: null, overDate: null });
    }
  };

  const handleRemoveDate = async (item: ScheduleItem) => {
    try {
      if (item.itemType === 'EPISODE') {
        await scheduleApi.updateEpisodePublishDate(item.id, undefined);
      } else if (item.itemType === 'TASK') {
        await scheduleApi.updateTaskDueDate(item.id, undefined);
      }
      setSelectedItem(null);
      await loadSchedule();
    } catch (error) {
      console.error('清除日期失败:', error);
    }
  };

  const navigatePrevious = () => {
    setCurrentDate((prev) => (viewMode === 'week' ? subWeeks(prev, 1) : subMonths(prev, 1)));
  };

  const navigateNext = () => {
    setCurrentDate((prev) => (viewMode === 'week' ? addWeeks(prev, 1) : addMonths(prev, 1)));
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const isOverdue = (item: ScheduleItem): boolean => {
    if (!item.date || item.status === 'DONE' || item.status === 'DISTRIBUTED') return false;
    const today = format(new Date(), 'yyyy-MM-dd');
    return item.date < today;
  };

  const isDueSoon = (item: ScheduleItem): boolean => {
    if (!item.date || item.status === 'DONE' || item.status === 'DISTRIBUTED') return false;
    const today = new Date();
    const itemDate = parseISO(item.date);
    const diff = differenceInDays(itemDate, today);
    return diff >= 0 && diff <= 3;
  };

  const renderItemCard = (item: ScheduleItem, compact = false) => {
    const overdue = isOverdue(item);
    const dueSoon = isDueSoon(item);
    const statusColor =
      item.itemType === 'EPISODE'
        ? episodeStatusColors[item.status as EpisodeStatus] || episodeStatusColors.DRAFT
        : taskStatusColors[item.status as TaskStatus] || taskStatusColors.TODO;

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, item)}
        onDragEnd={handleDragEnd}
        onClick={() => setSelectedItem(item)}
        className={cn(
          'group relative rounded-md border px-2 py-1 text-xs cursor-grab active:cursor-grabbing transition-all hover:ring-2 hover:ring-primary-500/50 overflow-hidden',
          statusColor,
          overdue && '!bg-red-500/30 !text-red-200 !border-red-500',
          compact && 'text-[10px] px-1.5 py-0.5'
        )}
      >
        <div className="flex items-start gap-1">
          <GripVertical className="w-3 h-3 opacity-40 group-hover:opacity-80 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className={cn(
              'font-medium truncate flex items-center gap-1',
              compact && 'text-[10px]'
            )}>
              {item.itemType === 'EPISODE' ? (
                <Radio className="w-3 h-3 flex-shrink-0" />
              ) : (
                <ListTodo className="w-3 h-3 flex-shrink-0" />
              )}
              <span className="truncate">{item.title}</span>
            </div>
            {!compact && (
              <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-70">
                {item.programName && <span className="truncate">{item.programName}</span>}
                {item.assigneeName && <span>· {item.assigneeName}</span>}
                {(overdue || dueSoon) && (
                  <span className={cn(
                    'ml-auto flex items-center gap-0.5',
                    overdue ? 'text-red-300' : 'text-yellow-300'
                  )}>
                    {overdue ? <AlertCircle className="w-3 h-3" /> : <Timer className="w-3 h-3" />}
                    {overdue ? '已逾期' : '即将到期'}
                  </span>
                )}
              </div>
            )}
          </div>
          {item.priority && item.itemType === 'TASK' && (
            <div className={cn(
              'w-1.5 h-1.5 rounded-full ring-2 flex-shrink-0 mt-1',
              taskPriorityColors[item.priority]
            )} />
          )}
        </div>
      </div>
    );
  };

  const renderDayCell = (date: Date) => {
    const dayItems = getItemsForDate(date);
    const conflict = getConflictForDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    const isCurrentMonth = isSameMonth(date, currentDate);
    const isDragOver = dragState.overDate === dateStr;

    return (
      <div
        key={dateStr}
        onDragOver={(e) => handleDragOver(e, date)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, date)}
        className={cn(
          'relative min-h-[100px] p-1.5 border border-border transition-all',
          viewMode === 'month' && !isCurrentMonth && 'bg-foreground/[0.02]',
          isToday(date) && 'ring-2 ring-inset ring-primary-500/50',
          isDragOver && 'bg-primary-500/10 ring-2 ring-inset ring-primary-500',
          conflict?.hasConflict && 'bg-error/5'
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            'text-xs font-medium',
            isToday(date) && 'w-5 h-5 rounded-full bg-primary-500 text-white text-center leading-5',
            !isCurrentMonth && 'text-muted/50'
          )}>
            {format(date, 'd')}
          </span>
          {conflict?.hasConflict && (
            <span title={conflict.message}>
              <AlertTriangle className="w-3.5 h-3.5 text-error" />
            </span>
          )}
        </div>
        <div className={cn(
          'space-y-1',
          viewMode === 'month' && dayItems.length > 3 && 'max-h-[80px] overflow-hidden'
        )}>
          {dayItems.slice(0, viewMode === 'month' ? 3 : dayItems.length).map((item) => (
            <div key={`${item.itemType}-${item.id}`}>
              {renderItemCard(item, viewMode === 'month')}
            </div>
          ))}
          {viewMode === 'month' && dayItems.length > 3 && (
            <div className="text-[10px] text-muted text-center">
              +{dayItems.length - 3} 更多
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full gap-4">
      <div className={cn('flex-1 flex flex-col transition-all', showReminderPanel && 'mr-72')}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary-400" />
              节目排期日历
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-foreground/5 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  viewMode === 'week'
                    ? 'bg-primary-500 text-white'
                    : 'text-muted hover:text-foreground'
                )}
              >
                周视图
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  viewMode === 'month'
                    ? 'bg-primary-500 text-white'
                    : 'text-muted hover:text-foreground'
                )}
              >
                月视图
              </button>
            </div>
            <button
              onClick={() => setShowReminderPanel(!showReminderPanel)}
              className={cn(
                'p-2 rounded-lg transition-all',
                showReminderPanel ? 'bg-primary-500/20 text-primary-400' : 'hover:bg-foreground/5 text-muted'
              )}
              title={showReminderPanel ? '隐藏提醒' : '显示提醒'}
            >
              <Clock className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={navigatePrevious}
              className="p-2 rounded-lg hover:bg-foreground/5 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={navigateToday}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-foreground/5 hover:bg-foreground/10 transition-colors"
            >
              今天
            </button>
            <button
              onClick={navigateNext}
              className="p-2 rounded-lg hover:bg-foreground/5 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-lg font-semibold">
            {viewMode === 'week'
              ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy年M月d日', { locale: zhCN })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'M月d日', { locale: zhCN })}`
              : format(currentDate, 'yyyy年M月', { locale: zhCN })}
          </h2>
          <div className="flex items-center gap-4 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span>节目</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5 text-green-400" />
              <span>任务</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-error" />
              <span>冲突</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-error" />
              <span>逾期</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span>即将到期</span>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
          {viewMode === 'week' ? (
            <div>
              <div className="grid grid-cols-7 border-b border-border">
                {weekDays.map((day, idx) => (
                  <div
                    key={day}
                    className={cn(
                      'px-3 py-2.5 text-center text-sm font-medium border-r border-border last:border-r-0',
                      (idx === 5 || idx === 6) && 'text-error/70'
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 h-full">
                {calendarDays.map((day) => (
                  <div key={format(day, 'yyyy-MM-dd')} className="border-r border-border last:border-r-0">
                    {renderDayCell(day)}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-7 border-b border-border">
                {weekDays.map((day, idx) => (
                  <div
                    key={day}
                    className={cn(
                      'px-3 py-2 text-center text-xs font-medium border-r border-border last:border-r-0 text-muted',
                      (idx === 5 || idx === 6) && 'text-error/60'
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => (
                  <div key={format(day, 'yyyy-MM-dd')} className="border-b border-r border-border last:border-r-0">
                    {renderDayCell(day)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showReminderPanel && (
        <div className="fixed right-4 top-20 bottom-4 w-72 bg-card rounded-xl border border-border flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-400" />
              即将到期提醒
            </h3>
            <span className="text-xs text-muted">{upcomingReminders.length} 项</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {upcomingReminders.length === 0 ? (
              <div className="text-center text-muted text-sm py-8">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                暂无即将到期的事项
              </div>
            ) : (
              upcomingReminders.map((item) => {
                const overdue = isOverdue(item);
                const dueSoon = isDueSoon(item);
                return (
                  <div
                    key={`${item.itemType}-${item.id}`}
                    onClick={() => setSelectedItem(item)}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-all hover:ring-2 hover:ring-primary-500/50',
                      overdue
                        ? 'bg-error/10 border-error/50'
                        : dueSoon
                        ? 'bg-yellow-500/10 border-yellow-500/50'
                        : 'bg-foreground/5 border-border hover:bg-foreground/10'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {item.itemType === 'EPISODE' ? (
                        <Radio className={cn(
                          'w-4 h-4 mt-0.5 flex-shrink-0',
                          overdue ? 'text-error' : 'text-blue-400'
                        )} />
                      ) : (
                        <ListTodo className={cn(
                          'w-4 h-4 mt-0.5 flex-shrink-0',
                          overdue ? 'text-error' : 'text-green-400'
                        )} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.title}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className={cn(
                            overdue ? 'text-error font-medium' : dueSoon ? 'text-yellow-400' : 'text-muted'
                          )}>
                            {item.date && `${format(parseISO(item.date), 'M月d日')}`}
                            {overdue && ' · 已逾期'}
                            {!overdue && dueSoon && item.date && ` · ${differenceInDays(parseISO(item.date), new Date())}天后`}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted truncate">
                          {getStatusLabel(item.status || '')}
                          {item.programName && ` · ${item.programName}`}
                          {item.assigneeName && ` · ${item.assigneeName}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div
            className="bg-card rounded-xl border border-border w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {selectedItem.itemType === 'EPISODE' ? (
                  <Radio className="w-5 h-5 text-blue-400" />
                ) : (
                  <ListTodo className="w-5 h-5 text-green-400" />
                )}
                <h3 className="text-lg font-semibold">
                  {selectedItem.itemType === 'EPISODE' ? '节目详情' : '任务详情'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg hover:bg-foreground/5 transition-colors text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted mb-1">标题</div>
                <div className="font-medium">{selectedItem.title}</div>
              </div>
              {selectedItem.description && (
                <div>
                  <div className="text-sm text-muted mb-1">描述</div>
                  <div className="text-sm">{selectedItem.description}</div>
                </div>
              )}
              {selectedItem.programName && (
                <div>
                  <div className="text-sm text-muted mb-1">所属节目</div>
                  <div className="text-sm">{selectedItem.programName}</div>
                </div>
              )}
              {selectedItem.assigneeName && (
                <div>
                  <div className="text-sm text-muted mb-1">负责人</div>
                  <div className="text-sm">{selectedItem.assigneeName}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-muted mb-1">状态</div>
                <div className="text-sm">{getStatusLabel(selectedItem.status || '')}</div>
              </div>
              {selectedItem.priority && (
                <div>
                  <div className="text-sm text-muted mb-1">优先级</div>
                  <div className="text-sm">{getPriorityLabel(selectedItem.priority)}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-muted mb-1">日期</div>
                <div className="text-sm flex items-center gap-2">
                  {selectedItem.date ? format(parseISO(selectedItem.date), 'yyyy年M月d日') : '未设置'}
                  {selectedItem.date && isOverdue(selectedItem) && (
                    <span className="text-error text-xs">已逾期</span>
                  )}
                  {selectedItem.date && !isOverdue(selectedItem) && isDueSoon(selectedItem) && (
                    <span className="text-yellow-400 text-xs">即将到期</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 justify-end">
              {selectedItem.date && (
                <button
                  onClick={() => handleRemoveDate(selectedItem)}
                  className="px-3 py-2 rounded-lg text-sm text-error hover:bg-error/10 transition-colors"
                >
                  清除日期
                </button>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-lg text-sm bg-primary-500 hover:bg-primary-500/90 text-white transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
