import React, { useEffect, useState } from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { useAuthStore } from '@/store/authStore';
import { CollaboratorCursor } from '@/types';
import { formatTime } from '@/utils/time';

const INACTIVITY_FADE_TIMEOUT = 15000;
const INACTIVITY_HIDE_TIMEOUT = 30000;

interface CollaboratorCursorsProps {
  duration: number;
  containerWidth: number;
  zoom: number;
}

export const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = ({
  duration,
  containerWidth,
  zoom,
}) => {
  const { cursors } = useCollaborationStore();
  const currentUser = useAuthStore((s) => s.user);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!duration || !containerWidth) return null;

  const activeCursors = Object.values(cursors).filter(
    (c) => c.userId !== currentUser?.id
  );

  const getCursorOpacity = (cursor: CollaboratorCursor): number => {
    const inactiveMs = Date.now() - new Date(cursor.lastActiveAt).getTime();
    if (inactiveMs >= INACTIVITY_HIDE_TIMEOUT) return 0;
    if (inactiveMs >= INACTIVITY_FADE_TIMEOUT) {
      const fadeProgress =
        (inactiveMs - INACTIVITY_FADE_TIMEOUT) /
        (INACTIVITY_HIDE_TIMEOUT - INACTIVITY_FADE_TIMEOUT);
      return Math.max(0, 1 - fadeProgress);
    }
    return 1;
  };

  const getIsInactive = (cursor: CollaboratorCursor): boolean => {
    return Date.now() - new Date(cursor.lastActiveAt).getTime() >= INACTIVITY_FADE_TIMEOUT;
  };

  return (
    <>
      {activeCursors.map((cursor) => {
        const leftPercent = (cursor.timePosition / duration) * 100;
        const leftPx = (cursor.timePosition / duration) * containerWidth * (zoom / 50);
        const opacity = getCursorOpacity(cursor);
        const isInactive = getIsInactive(cursor);

        if (opacity <= 0) return null;

        return (
          <div
            key={cursor.userId}
            className="absolute top-0 bottom-0 pointer-events-none z-20 transition-opacity duration-500"
            style={{
              left: `${Math.min(Math.max(leftPx, 0), containerWidth * (zoom / 50) - 40)}px`,
              opacity,
            }}
          >
            <div
              className="absolute top-0 bottom-0 w-0.5 transition-opacity"
              style={{
                backgroundColor: cursor.color,
                opacity: isInactive ? 0.3 : 0.8,
                boxShadow: `0 0 8px ${cursor.color}60`,
              }}
            />

            <div
              className="absolute -top-10 -translate-x-1/2 flex flex-col items-center"
              style={{ filter: isInactive ? 'grayscale(0.5)' : 'none' }}
            >
              <div
                className="relative flex items-center gap-1.5 px-2 py-1 rounded-full text-white text-[10px] font-semibold whitespace-nowrap shadow-lg"
                style={{ backgroundColor: cursor.color }}
              >
                <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {cursor.avatarUrl ? (
                    <img
                      src={cursor.avatarUrl}
                      alt={cursor.userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[8px]">{cursor.userName?.[0] || '?'}</span>
                  )}
                </div>
                <span className="truncate max-w-[60px]">{cursor.userName}</span>
                <span className="text-white/80 font-mono">
                  {formatTime(cursor.timePosition)}
                </span>
              </div>
              <div
                className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px]"
                style={{ borderTopColor: cursor.color }}
              />
            </div>

            <div
              className="absolute bottom-6 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity pointer-events-auto cursor-help bg-card px-2 py-1 rounded text-[10px] border border-border whitespace-nowrap shadow-lg"
              style={{ color: cursor.color }}
            >
              <span className="font-medium">{cursor.userName}</span>
              <span className="text-muted ml-1">正在此位置编辑</span>
            </div>
          </div>
        );
      })}
    </>
  );
};
