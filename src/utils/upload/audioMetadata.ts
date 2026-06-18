import type { AudioMetadata } from './types';
import { AUDIO_FORMAT_LABELS } from './types';

export function getAudioFormatLabel(mimeType: string): string {
  return AUDIO_FORMAT_LABELS[mimeType] || mimeType || '未知格式';
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

export async function extractAudioMetadata(file: File): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.remove();
    };

    audio.addEventListener('loadedmetadata', () => {
      const metadata: AudioMetadata = {
        duration: audio.duration,
        sampleRate: undefined,
        channels: undefined,
        bitRate: undefined,
        format: getAudioFormatLabel(file.type),
      };

      cleanup();
      resolve(metadata);
    });

    audio.addEventListener('error', (error) => {
      cleanup();
      reject(new Error('无法解析音频文件元数据'));
    });

    audio.src = url;
    audio.preload = 'metadata';
  });
}

export async function extractWaveformData(
  file: File,
  samples: number = 100
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(channelData.length / samples);
        const waveformData: number[] = [];

        for (let i = 0; i < samples; i++) {
          let sum = 0;
          const start = i * blockSize;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[start + j]);
          }
          waveformData.push(sum / blockSize);
        }

        const max = Math.max(...waveformData);
        const normalized = waveformData.map((v) => (max > 0 ? v / max : 0));

        resolve(normalized);
      } catch (error) {
        reject(error);
      } finally {
        audioContext.close();
      }
    };

    reader.onerror = () => reject(new Error('读取音频文件失败'));
    reader.readAsArrayBuffer(file);
  });
}

export function generateAudioWaveform(
  waveformData: number[],
  width: number,
  height: number,
  color: string = '#6366f1'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  const barWidth = width / waveformData.length;
  const centerY = height / 2;

  ctx.fillStyle = color;

  waveformData.forEach((value, index) => {
    const barHeight = value * height * 0.8;
    const x = index * barWidth;
    const y = centerY - barHeight / 2;

    ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight);
  });

  return canvas.toDataURL();
}
