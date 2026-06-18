export type UploadStatus = 'idle' | 'validating' | 'reading' | 'uploading' | 'processing' | 'success' | 'error' | 'cancelled';

export interface FileValidationOptions {
  allowedTypes: string[];
  maxSize: number;
  minSize?: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface AudioMetadata {
  duration: number;
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
  format?: string;
}

export interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
  speed?: number;
}

export interface UploadResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AudioUploadConfig {
  allowedTypes: string[];
  maxSize: number;
  uploadUrl?: string;
  autoUpload?: boolean;
  showPreview?: boolean;
}

export const DEFAULT_AUDIO_UPLOAD_CONFIG: AudioUploadConfig = {
  allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/x-m4a'],
  maxSize: 500 * 1024 * 1024,
  autoUpload: false,
  showPreview: true,
};

export const AUDIO_FORMAT_LABELS: Record<string, string> = {
  'audio/mpeg': 'MP3',
  'audio/wav': 'WAV',
  'audio/ogg': 'OGG',
  'audio/flac': 'FLAC',
  'audio/aac': 'AAC',
  'audio/mp4': 'M4A',
  'audio/x-m4a': 'M4A',
};
