import type { FileValidationOptions, FileValidationResult } from './types';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  if (allowedTypes.length === 0) return true;

  if (allowedTypes.includes(file.type)) {
    return true;
  }

  const fileName = file.name.toLowerCase();
  return allowedTypes.some((type) => {
    if (type.startsWith('.')) {
      return fileName.endsWith(type.toLowerCase());
    }
    if (type.endsWith('/*')) {
      const category = type.replace('/*', '');
      return file.type.startsWith(category);
    }
    return false;
  });
}

export function validateFileSize(file: File, maxSize: number, minSize = 0): boolean {
  return file.size >= minSize && file.size <= maxSize;
}

export function validateFile(
  file: File,
  options: FileValidationOptions
): FileValidationResult {
  if (!options.allowedTypes.includes(file.type)) {
    const allowedFormats = options.allowedTypes.join('、');
    return {
      valid: false,
      error: `不支持的文件格式 "${file.type}"，仅支持 ${allowedFormats}`,
    };
  }

  if (file.size > options.maxSize) {
    return {
      valid: false,
      error: `文件大小 ${formatFileSize(file.size)} 超过限制，最大支持 ${formatFileSize(options.maxSize)}`,
    };
  }

  if (options.minSize !== undefined && file.size < options.minSize) {
    return {
      valid: false,
      error: `文件大小 ${formatFileSize(file.size)} 小于最小限制 ${formatFileSize(options.minSize)}`,
    };
  }

  return { valid: true };
}

export function validateFiles(
  files: FileList | File[],
  options: FileValidationOptions
): FileValidationResult & { validFiles: File[] } {
  const fileArray = Array.from(files);
  const validFiles: File[] = [];
  let firstError: string | undefined;

  for (const file of fileArray) {
    const result = validateFile(file, options);
    if (result.valid) {
      validFiles.push(file);
    } else if (!firstError) {
      firstError = result.error;
    }
  }

  return {
    valid: validFiles.length === fileArray.length,
    error: firstError,
    validFiles,
  };
}
