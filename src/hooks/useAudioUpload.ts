import { useState, useCallback, useRef } from 'react';
import type {
  UploadStatus,
  AudioUploadConfig,
  AudioMetadata,
  UploadResult,
  FileValidationOptions,
} from '../utils/upload/types';
import { DEFAULT_AUDIO_UPLOAD_CONFIG } from '../utils/upload/types';
import { validateFile } from '../utils/upload/fileValidator';
import { extractAudioMetadata, extractWaveformData } from '../utils/upload/audioMetadata';
import { useUploadProgress } from './useUploadProgress';

export interface UseAudioUploadOptions extends Partial<AudioUploadConfig> {
  uploadFn?: (file: File, onProgress: (percent: number) => void) => Promise<unknown>;
  extractMetadata?: boolean;
  extractWaveform?: boolean;
  waveformSamples?: number;
  onFileSelect?: (file: File) => void;
  onValidationError?: (error: string) => void;
  onUploadStart?: (file: File) => void;
  onUploadProgress?: (percent: number) => void;
  onUploadSuccess?: (result: unknown) => void;
  onUploadError?: (error: string) => void;
  onMetadataReady?: (metadata: AudioMetadata) => void;
}

export interface UseAudioUploadResult {
  status: UploadStatus;
  file: File | null;
  error: string | null;
  metadata: AudioMetadata | null;
  waveformData: number[] | null;
  progress: number;
  isUploading: boolean;
  uploadSpeed: number;
  handleFileSelect: (file: File) => Promise<boolean>;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  startUpload: () => Promise<UploadResult>;
  cancelUpload: () => void;
  reset: () => void;
  openFileDialog: () => void;
}

export function useAudioUpload(options: UseAudioUploadOptions = {}): UseAudioUploadResult {
  const {
    allowedTypes,
    maxSize,
    uploadFn,
    extractMetadata = true,
    extractWaveform = false,
    waveformSamples = 100,
    onFileSelect,
    onValidationError,
    onUploadStart,
    onUploadProgress,
    onUploadSuccess,
    onUploadError,
    onMetadataReady,
  } = {
    ...DEFAULT_AUDIO_UPLOAD_CONFIG,
    ...options,
  };

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    progress,
    isUploading,
    speed: uploadSpeed,
    startProgress,
    updateProgress,
    resetProgress,
  } = useUploadProgress({
    onProgressChange: (p) => onUploadProgress?.(p.percent),
  });

  const validateOptions: FileValidationOptions = {
    allowedTypes: allowedTypes || DEFAULT_AUDIO_UPLOAD_CONFIG.allowedTypes,
    maxSize: maxSize || DEFAULT_AUDIO_UPLOAD_CONFIG.maxSize,
  };

  const handleFileSelect = useCallback(
    async (selectedFile: File): Promise<boolean> => {
      setError(null);

      const validation = validateFile(selectedFile, validateOptions);
      if (!validation.valid) {
        setError(validation.error || '文件验证失败');
        setStatus('error');
        onValidationError?.(validation.error || '文件验证失败');
        return false;
      }

      setFile(selectedFile);
      setStatus('validating');
      onFileSelect?.(selectedFile);

      if (extractMetadata) {
        try {
          setStatus('reading');
          const meta = await extractAudioMetadata(selectedFile);
          setMetadata(meta);
          onMetadataReady?.(meta);
        } catch (err) {
          console.warn('提取音频元数据失败:', err);
        }
      }

      if (extractWaveform) {
        try {
          const waveform = await extractWaveformData(selectedFile, waveformSamples);
          setWaveformData(waveform);
        } catch (err) {
          console.warn('提取波形数据失败:', err);
        }
      }

      setStatus('idle');
      return true;
    },
    [
      validateOptions,
      extractMetadata,
      extractWaveform,
      waveformSamples,
      onFileSelect,
      onValidationError,
      onMetadataReady,
    ]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
      if (event.target) {
        event.target.value = '';
      }
    },
    [handleFileSelect]
  );

  const startUpload = useCallback(async (): Promise<UploadResult> => {
    if (!file) {
      return { success: false, error: '没有选择文件' };
    }

    if (!uploadFn) {
      return { success: false, error: '没有提供上传函数' };
    }

    try {
      setStatus('uploading');
      setError(null);
      startProgress(file.size);
      onUploadStart?.(file);

      abortControllerRef.current = new AbortController();

      const result = await uploadFn(file, (percent) => {
        const loaded = (percent / 100) * file.size;
        updateProgress(loaded, file.size);
      });

      setStatus('success');
      onUploadSuccess?.(result);

      return { success: true, data: result };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatus('cancelled');
        return { success: false, error: '上传已取消' };
      }

      const errorMsg = err.message || '上传失败';
      setError(errorMsg);
      setStatus('error');
      onUploadError?.(errorMsg);

      return { success: false, error: errorMsg };
    }
  }, [file, uploadFn, startProgress, updateProgress, onUploadStart, onUploadSuccess, onUploadError]);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('cancelled');
    resetProgress();
  }, [resetProgress]);

  const reset = useCallback(() => {
    cancelUpload();
    setFile(null);
    setError(null);
    setMetadata(null);
    setWaveformData(null);
    setStatus('idle');
    resetProgress();
  }, [cancelUpload, resetProgress]);

  const openFileDialog = useCallback(() => {
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = (allowedTypes || DEFAULT_AUDIO_UPLOAD_CONFIG.allowedTypes).join(',');
      input.style.display = 'none';
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        const selectedFile = target.files?.[0];
        if (selectedFile) {
          handleFileSelect(selectedFile);
        }
        document.body.removeChild(input);
      };
      document.body.appendChild(input);
      fileInputRef.current = input;
    }
    fileInputRef.current.click();
  }, [allowedTypes, handleFileSelect]);

  return {
    status,
    file,
    error,
    metadata,
    waveformData,
    progress: progress.percent,
    isUploading,
    uploadSpeed,
    handleFileSelect,
    handleInputChange,
    startUpload,
    cancelUpload,
    reset,
    openFileDialog,
  };
}
