import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, ZoomIn, ZoomOut, Upload } from 'lucide-react';
import { formatTime } from '@/utils/time';
import { Annotation, WaveformData } from '@/types';
import { getAnnotationColor, getAnnotationBgColor } from '@/mock/data';
import { useThemeContext } from '@/context/ThemeContext';

interface WaveformPlayerProps {
  audioUrl?: string;
  waveformData?: WaveformData;
  annotations?: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
  onAddAnnotation?: (time: number) => void;
  onReady?: (duration: number) => void;
  onTimeUpdate?: (currentTime: number) => void;
  readOnly?: boolean;
  className?: string;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  audioUrl,
  waveformData,
  annotations = [],
  onAnnotationClick,
  onAddAnnotation,
  onReady,
  onTimeUpdate,
  readOnly = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [zoom, setZoom] = useState(50);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { isDark } = useThemeContext();

  useEffect(() => {
    if (!containerRef.current) return;

    const style = getComputedStyle(document.documentElement);
    const colors = {
      waveColor: `rgb(${style.getPropertyValue('--waveform-start').trim()})`,
      progressColor: `rgb(${style.getPropertyValue('--waveform-mid').trim()})`,
      cursorColor: `rgb(${style.getPropertyValue('--accent-500').trim()})`,
    };
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: colors.waveColor,
      progressColor: colors.progressColor,
      cursorColor: colors.cursorColor,
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 200,
      normalize: true,
      backend: 'WebAudio',
      fillParent: true,
    });

    wavesurferRef.current = ws;

    if (waveformData) {
      ws.load('', [waveformData.data]);
    } else if (audioUrl) {
      ws.load(audioUrl);
    }

    ws.on('ready', () => {
      setDuration(ws.getDuration());
      setIsLoading(false);
      onReady?.(ws.getDuration());
    });

    ws.on('audioprocess', () => {
      const time = ws.getCurrentTime();
      setCurrentTime(time);
      onTimeUpdate?.(time);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    ws.on('click', (relativeX) => {
      if (!readOnly) {
        const clickedTime = relativeX * ws.getDuration();
        onAddAnnotation?.(clickedTime);
      }
    });

    ws.on('zoom', (newZoom) => {
      setZoom(newZoom);
    });

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [audioUrl, waveformData]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  useEffect(() => {
    if (!wavesurferRef.current) return;

    const style = getComputedStyle(document.documentElement);
    const colors = {
      waveColor: `rgb(${style.getPropertyValue('--waveform-start').trim()})`,
      progressColor: `rgb(${style.getPropertyValue('--waveform-mid').trim()})`,
      cursorColor: `rgb(${style.getPropertyValue('--accent-500').trim()})`,
    };
    const ws = wavesurferRef.current;
    
    ws.setOptions({
      waveColor: colors.waveColor,
      progressColor: colors.progressColor,
      cursorColor: colors.cursorColor,
    });
  }, [isDark]);

  const handlePlayPause = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const handleSkipBack = useCallback(() => {
    if (wavesurferRef.current) {
      const newTime = Math.max(0, currentTime - 5);
      wavesurferRef.current.setTime(newTime);
    }
  }, [currentTime]);

  const handleSkipForward = useCallback(() => {
    if (wavesurferRef.current) {
      const newTime = Math.min(duration, currentTime + 5);
      wavesurferRef.current.setTime(newTime);
    }
  }, [currentTime, duration]);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + 20, 200);
    setZoom(newZoom);
    wavesurferRef.current?.zoom(newZoom);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - 20, 10);
    setZoom(newZoom);
    wavesurferRef.current?.zoom(newZoom);
  }, [zoom]);

  const handleToggleLoop = useCallback(() => {
    const newLooping = !isLooping;
    setIsLooping(newLooping);
    if (wavesurferRef.current) {
      const media = (wavesurferRef.current as unknown as { media: HTMLMediaElement }).media;
      if (media) {
        media.loop = newLooping;
      }
    }
  }, [isLooping]);

  const handleSeekAnnotation = useCallback((annotation: Annotation) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setTime(annotation.startTime);
      onAnnotationClick?.(annotation);
    }
  }, [onAnnotationClick]);

  const handleRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlaybackRate(parseFloat(e.target.value));
  };

  const renderAnnotationMarkers = () => {
    if (!duration || !containerRef.current) return null;
    
    const containerWidth = containerRef.current.offsetWidth;
    
    return annotations.map((annotation) => {
      const leftPosition = (annotation.startTime / duration) * containerWidth * (zoom / 50);
      const color = getAnnotationColor(annotation.type);
      const bgColor = getAnnotationBgColor(annotation.type);
      const hasEndTime = annotation.endTime && annotation.endTime > annotation.startTime;
      
      if (hasEndTime && annotation.endTime) {
        const width = ((annotation.endTime - annotation.startTime) / duration) * containerWidth * (zoom / 50);
        return (
          <div
            key={annotation.id}
            className="absolute top-0 h-full cursor-pointer group"
            style={{
              left: `${leftPosition}px`,
              width: `${Math.max(width, 4)}px`,
              backgroundColor: bgColor,
              borderLeft: `2px solid ${color}`,
              borderRight: `2px solid ${color}`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleSeekAnnotation(annotation);
            }}
            title={`${annotation.type}: ${annotation.content}`}
          >
            <div 
              className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-card px-2 py-1 rounded text-xs border border-border z-10"
              style={{ color }}
            >
              {formatTime(annotation.startTime)} - {annotation.type}
            </div>
          </div>
        );
      }
      
      return (
        <div
          key={annotation.id}
          className="absolute top-0 h-full cursor-pointer group"
          style={{ left: `${leftPosition}px` }}
          onClick={(e) => {
            e.stopPropagation();
            handleSeekAnnotation(annotation);
          }}
        >
          <div 
            className="w-1 h-full transition-all group-hover:w-1.5"
            style={{ backgroundColor: color }}
          />
          <div 
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-card px-2 py-1 rounded text-xs border border-border z-10"
            style={{ color }}
          >
            {formatTime(annotation.startTime)} - {annotation.type}
          </div>
        </div>
      );
    });
  };

  return (
    <div className={`glass-card p-6 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-semibold">波形编辑器</h3>
          {isLoading && (
            <span className="badge badge-primary animate-pulse">加载中...</span>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-sm">
              <Upload className="w-4 h-4 mr-2" />
              上传新版本
            </button>
          </div>
        )}
      </div>

      <div className="relative mb-6 rounded-xl overflow-hidden bg-card/50 dark:bg-primary-950/30">
        <div ref={containerRef} className="w-full" />
        <div className="absolute inset-0 pointer-events-none">
          {renderAnnotationMarkers()}
        </div>
        
        <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs text-muted font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg hover:bg-foreground/10 transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted w-16 text-center">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg hover:bg-foreground/10 transition-colors"
            title="放大"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSkipBack}
            className="p-2 rounded-lg hover:bg-foreground/10 transition-colors"
            title="后退5秒"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={handlePlayPause}
            className="p-3 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white transition-all hover:shadow-glow active:scale-95"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          
          <button
            onClick={handleSkipForward}
            className="p-2 rounded-lg hover:bg-foreground/10 transition-colors"
            title="前进5秒"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={playbackRate}
            onChange={handleRateChange}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>

          <button
            onClick={handleToggleLoop}
            className={`p-2 rounded-lg transition-colors ${isLooping ? 'bg-primary-500/20 text-primary-400' : 'hover:bg-foreground/10'}`}
            title="循环播放"
          >
            <Repeat className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-lg hover:bg-foreground/10 transition-colors"
              title={isMuted ? '取消静音' : '静音'}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-20 accent-primary-500"
            />
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="mt-4 text-sm text-muted">
          <p className="flex items-center gap-2">
            <span className="text-xs">💡 提示：点击波形图任意位置可添加标注</span>
          </p>
        </div>
      )}
    </div>
  );
};
