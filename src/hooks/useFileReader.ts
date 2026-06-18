import { useState, useCallback, useRef } from 'react';
import type { UploadStatus } from '../utils/upload/types';

interface UseFileReaderOptions {
  readAs?: 'dataURL' | 'text' | 'arrayBuffer';
  onLoadStart?: () => void;
  onLoad?: (result: string | ArrayBuffer) => void;
  onError?: (error: string) => void;
  onLoadEnd?: () => void;
}

interface UseFileReaderResult {
  status: UploadStatus;
  result: string | ArrayBuffer | null;
  error: string | null;
  readFile: (file: File) => Promise<string | ArrayBuffer>;
  reset: () => void;
  abort: () => void;
}

export function useFileReader(options: UseFileReaderOptions = {}): UseFileReaderResult {
  const { readAs = 'dataURL', onLoadStart, onLoad, onError, onLoadEnd } = options;
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [result, setResult] = useState<string | ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<FileReader | null>(null);

  const readFile = useCallback(
    (file: File): Promise<string | ArrayBuffer> => {
      return new Promise((resolve, reject) => {
        if (readerRef.current) {
          readerRef.current.abort();
        }

        const reader = new FileReader();
        readerRef.current = reader;

        setStatus('reading');
        setError(null);
        onLoadStart?.();

        reader.onload = (e) => {
          const fileResult = e.target?.result as string | ArrayBuffer;
          setResult(fileResult);
          setStatus('success');
          onLoad?.(fileResult);
          resolve(fileResult);
        };

        reader.onerror = () => {
          const errorMsg = '读取文件失败';
          setError(errorMsg);
          setStatus('error');
          onError?.(errorMsg);
          reject(new Error(errorMsg));
        };

        reader.onloadend = () => {
          onLoadEnd?.();
        };

        switch (readAs) {
          case 'text':
            reader.readAsText(file);
            break;
          case 'arrayBuffer':
            reader.readAsArrayBuffer(file);
            break;
          case 'dataURL':
          default:
            reader.readAsDataURL(file);
            break;
        }
      });
    },
    [readAs, onLoadStart, onLoad, onError, onLoadEnd]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
    if (readerRef.current) {
      readerRef.current.abort();
      readerRef.current = null;
    }
  }, []);

  const abort = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.abort();
      setStatus('cancelled');
    }
  }, []);

  return {
    status,
    result,
    error,
    readFile,
    reset,
    abort,
  };
}
