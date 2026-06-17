import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Subtitle, SubtitleCue } from '@/types';
import { subtitleApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { formatTime } from '@/utils/time';

interface SubtitleDisplayProps {
  audioVersionId: string;
  currentTime: number;
  duration?: number;
  onCueClick?: (cue: SubtitleCue) => void;
  className?: string;
}

const SPEAKER_COLORS = [
  'text-blue-400',
  'text-green-400',
  'text-purple-400',
  'text-orange-400',
  'text-pink-400',
  'text-cyan-400',
  'text-yellow-400',
  'text-red-400',
];

export const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({
  audioVersionId,
  currentTime,
  duration,
  onCueClick,
  className = '',
}) => {
  const user = useAuthStore((s) => s.user);
  const teamId = user?.teamId;
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<Subtitle | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    loadSubtitles();
  }, [audioVersionId, teamId]);

  useEffect(() => {
    if (subtitles.length > 0 && !selectedSubtitle) {
      setSelectedSubtitle(subtitles[0]);
    }
  }, [subtitles]);

  const loadSubtitles = async () => {
    if (!teamId || !audioVersionId) return;
    setLoading(true);
    try {
      const response = await subtitleApi.getByAudioVersion(audioVersionId, teamId);
      if (response.data.success && response.data.data) {
        const subsWithCues = await Promise.all(
          response.data.data.map(async (sub) => {
            if (sub.status !== 'GENERATING') {
              const detailResponse = await subtitleApi.getById(sub.id, teamId, true);
              if (detailResponse.data.success && detailResponse.data.data) {
                return detailResponse.data.data;
              }
            }
            return sub;
          })
        );
        setSubtitles(subsWithCues);
      }
    } catch (err) {
      console.error('加载字幕失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeCues = useMemo(() => {
    if (!selectedSubtitle?.cues) return [];
    return selectedSubtitle.cues.filter(
      (cue) => currentTime >= cue.startTime && currentTime <= cue.endTime
    );
  }, [selectedSubtitle, currentTime]);

  const surroundingCues = useMemo(() => {
    if (!selectedSubtitle?.cues) return [];
    return selectedSubtitle.cues.filter(
      (cue) => currentTime >= cue.startTime - 5 && currentTime <= cue.endTime + 5
    );
  }, [selectedSubtitle, currentTime]);

  const getSpeakerColor = (speakerId?: string) => {
    if (!speakerId) return 'text-foreground';
    const index = parseInt(speakerId.replace(/\D/g, '')) % SPEAKER_COLORS.length;
    return SPEAKER_COLORS[index] || 'text-foreground';
  };

  const isCueActive = (cue: SubtitleCue) => {
    return currentTime >= cue.startTime && currentTime <= cue.endTime;
  };

  const LANGUAGE_NAMES: Record<string, string> = {
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文',
    'en-US': 'English',
    'ja-JP': '日本語',
    'ko-KR': '한국어',
  };

  if (subtitles.length === 0 && !loading) {
    return null;
  }

  return (
    <div className={`glass-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h4 className="font-medium text-sm">字幕</h4>
          {subtitles.length > 1 && (
            <select
              value={selectedSubtitle?.id || ''}
              onChange={(e) => {
                const sub = subtitles.find(s => s.id === e.target.value);
                setSelectedSubtitle(sub || null);
              }}
              className="bg-card border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary-400"
            >
              {subtitles.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {LANGUAGE_NAMES[sub.language] || sub.language}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={() => setVisible(!visible)}
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          {visible ? '隐藏' : '显示'}
        </button>
      </div>

      {loading && (
        <div className="text-center py-4 text-sm text-muted">
          加载字幕中...
        </div>
      )}

      {!loading && visible && selectedSubtitle?.status === 'GENERATING' && (
        <div className="text-center py-4 text-sm text-yellow-400">
          字幕正在生成中...
        </div>
      )}

      {!loading && visible && selectedSubtitle?.status !== 'GENERATING' && (
        <div className="space-y-2">
          {activeCues.length > 0 ? (
            <div className="space-y-2">
              {activeCues.map((cue) => (
                <div
                  key={cue.id}
                  className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/30 cursor-pointer hover:bg-primary-500/20 transition-colors"
                  onClick={() => onCueClick?.(cue)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted font-mono">
                      {formatTime(cue.startTime)}
                    </span>
                    {cue.speakerName && (
                      <span className={`text-xs font-medium ${getSpeakerColor(cue.speakerId)}`}>
                        {cue.speakerName}
                      </span>
                    )}
                  </div>
                  <p className="text-base leading-relaxed">{cue.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 text-sm text-muted">
              当前位置无字幕
            </div>
          )}

          {surroundingCues.length > activeCues.length && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs text-muted mb-2">前后字幕预览</p>
              <div className="space-y-1">
                {surroundingCues
                  .filter((cue) => !isCueActive(cue))
                  .slice(0, 3)
                  .map((cue) => (
                    <div
                      key={cue.id}
                      className="p-2 rounded text-sm cursor-pointer hover:bg-foreground/5 transition-colors opacity-60 hover:opacity-100"
                      onClick={() => onCueClick?.(cue)}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-muted font-mono">
                          {formatTime(cue.startTime)}
                        </span>
                        {cue.speakerName && (
                          <span className={`text-xs ${getSpeakerColor(cue.speakerId)}`}>
                            {cue.speakerName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-1">{cue.text}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
