import React, { useCallback, useRef, useState } from 'react';
import {
  Upload,
  FileAudio,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Clock,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioUpload, UseAudioUploadOptions } from '@/hooks/useAudioUpload';
import { formatFileSize } from '@/utils/upload/fileValidator';
import { formatUploadSpeed, formatEstimatedTime } from '@/hooks/useUploadProgress';
import { formatDuration } from '@/utils/time';

interface AudioUploaderProps extends UseAudioUploadOptions {
  className?: string;
  variant?: 'default' | 'compact' | 'dropzone';
  showPreview?: boolean;
  showFileInfo?: boolean;
  label?: string;
  description?: string;
  onUploadComplete?: (result: unknown) => void;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  className = '',
  variant = 'default',
  showPreview = true,
  showFileInfo = true,
  label,
  description,
  onUploadComplete,
  ...uploadOptions
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const {
    status,
    file,
    error,
    metadata,
    waveformData,
    progress,
    isUploading,
    uploadSpeed,
    handleFileSelect,
    handleInputChange,
    startUpload,
    cancelUpload,
    reset,
  } = useAudioUpload({
    ...uploadOptions,
    onUploadSuccess: (result) => {
      onUploadComplete?.(result);
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        await handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !file) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!previewUrlRef.current) {
        previewUrlRef.current = URL.createObjectURL(file);
        audioRef.current.src = previewUrlRef.current;
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [file, isPlaying]);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const renderWaveform = useCallback(() => {
    if (!waveformData || waveformData.length === 0) return null;

    return (
      <div className="flex items-end gap-0.5 h-12 w-full">
        {waveformData.map((value, index) => (
          <div
            key={index}
            className="flex-1 bg-primary-500/60 rounded-sm transition-all"
            style={{ height: `${Math.max(value * 100, 10)}%` }}
          />
        ))}
      </div>
    );
  }, [waveformData]);

  const estimatedTime =
    uploadSpeed > 0 && file ? (file.size - (progress / 100) * file.size) / uploadSpeed : 0;

  if (variant === 'dropzone') {
    return (
      <div className={cn('relative', className)}>
        <div
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer',
            isDragging
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-border hover:border-primary-500/50 hover:bg-foreground/5',
            status === 'error' && 'border-error bg-error/10',
            status === 'success' && 'border-success bg-success/10'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={uploadOptions.allowedTypes?.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />

          {status === 'success' ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-success mb-3" />
              <p className="font-medium text-foreground">上传成功</p>
              <p className="text-sm text-muted mt-1">{file?.name}</p>
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center">
              <AlertCircle className="w-12 h-12 text-error mb-3" />
              <p className="font-medium text-error">上传失败</p>
              <p className="text-sm text-muted mt-1">{error}</p>
            </div>
          ) : isUploading ? (
            <div className="space-y-4 w-full max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <FileAudio className="w-5 h-5 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{file?.name}</p>
                  <p className="text-xs text-muted">
                    {formatFileSize(file?.size || 0)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">上传中...</span>
                  <span className="text-primary-400 font-medium">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs text-muted">
                <span>
                  速度: {formatUploadSpeed(uploadSpeed)}
                </span>
                <span>
                  剩余: {formatEstimatedTime(estimatedTime)}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cancelUpload();
                }}
                className="btn-secondary text-sm w-full"
              >
                <X className="w-4 h-4 mr-1" />
                取消上传
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-primary-400" />
              </div>
              <p className="font-medium text-foreground mb-1">
                {label || '拖拽音频文件到此处'}
              </p>
              <p className="text-sm text-muted mb-4">
                {description || '或点击选择文件，支持 MP3、WAV、FLAC 等格式'}
              </p>
              <button type="button" className="btn-primary text-sm">
                <FileAudio className="w-4 h-4 mr-1.5" />
                选择文件
              </button>
            </div>
          )}
        </div>

        {error && status !== 'error' && (
          <div className="mt-3 flex items-center gap-2 text-sm text-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('inline-block', className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept={uploadOptions.allowedTypes?.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleClick}
          className="btn-secondary text-sm flex items-center gap-1.5"
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {isUploading ? '上传中...' : '上传音频'}
        </button>
      </div>
    );
  }

  return (
    <div className={cn('glass-card overflow-hidden', className)}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-400" />
            {label || '音频上传'}
          </h3>
          {file && (
            <button
              type="button"
              onClick={reset}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              重新选择
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {!file ? (
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer',
              isDragging
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-border hover:border-primary-500/50 hover:bg-foreground/5'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={uploadOptions.allowedTypes?.join(',')}
              onChange={handleInputChange}
              className="hidden"
            />
            <FileAudio className="w-10 h-10 text-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-foreground mb-1">
              拖拽文件到此处或点击选择
            </p>
            <p className="text-xs text-muted">
              支持 MP3、WAV、FLAC、OGG 等格式，最大 500MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center flex-shrink-0">
                <FileAudio className="w-6 h-6 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{file.name}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                  <span>{formatFileSize(file.size)}</span>
                  {metadata && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(metadata.duration)}
                    </span>
                  )}
                  {metadata?.format && <span>{metadata.format}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={reset}
                className="p-1.5 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {showPreview && waveformData && waveformData.length > 0 && (
              <div className="bg-card rounded-lg p-3">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0 hover:bg-primary-600 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                  {renderWaveform()}
                </div>
                <audio ref={audioRef} onEnded={handleAudioEnded} />
              </div>
            )}

            {isUploading ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">上传进度</span>
                    <span className="text-primary-400 font-medium">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-xs text-muted">
                  <span>上传速度: {formatUploadSpeed(uploadSpeed)}</span>
                  <span>剩余时间: {formatEstimatedTime(estimatedTime)}</span>
                </div>

                <button
                  type="button"
                  onClick={cancelUpload}
                  className="btn-secondary text-sm w-full"
                >
                  <X className="w-4 h-4 mr-1" />
                  取消上传
                </button>
              </div>
            ) : status === 'success' ? (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">上传成功</span>
              </div>
            ) : status === 'error' ? (
              <div className="flex items-center gap-2 text-error">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={startUpload}
                className="btn-primary w-full text-sm"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                开始上传
              </button>
            )}
          </div>
        )}

        {error && !isUploading && status !== 'error' && (
          <div className="mt-3 flex items-center gap-2 text-sm text-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
