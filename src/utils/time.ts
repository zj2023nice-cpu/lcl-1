import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatTimeWithMs = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00.000';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

export const parseTimeString = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const [mins, secs] = parts;
    return parseInt(mins) * 60 + parseFloat(secs);
  } else if (parts.length === 3) {
    const [hrs, mins, secs] = parts;
    return parseInt(hrs) * 3600 + parseInt(mins) * 60 + parseFloat(secs);
  }
  return 0;
};

const toDate = (date: string | Date | null | undefined): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  try {
    const d = parseISO(date);
    if (!isNaN(d.getTime())) return d;
  } catch {
    // ignore
  }
  try {
    const fallback = new Date(date);
    return isNaN(fallback.getTime()) ? null : fallback;
  } catch {
    return null;
  }
};

export const formatDate = (date: string | Date | null | undefined, formatStr: string = 'yyyy-MM-dd HH:mm'): string => {
  const d = toDate(date);
  if (!d) return '-';
  return format(d, formatStr, { locale: zhCN });
};

export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  const d = toDate(date);
  if (!d) return '-';
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟${seconds % 60}秒`;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}小时${mins}分钟`;
};
