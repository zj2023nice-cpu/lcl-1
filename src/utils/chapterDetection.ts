import { Chapter, ChapterDetectionConfig, ChapterDetectionResult, SilenceSegment, WaveformData } from '@/types';

const DEFAULT_CONFIG: ChapterDetectionConfig = {
  minSilenceDuration: 1.5,
  silenceThreshold: 0.15,
  minChapterDuration: 60,
  maxChapterDuration: 600,
  enableTopicDetection: true,
};

export const detectSilenceSegments = (
  waveformData: WaveformData,
  config: Partial<ChapterDetectionConfig> = {}
): SilenceSegment[] => {
  const { minSilenceDuration, silenceThreshold } = { ...DEFAULT_CONFIG, ...config };
  const { data, duration, samplesPerPixel, sampleRate } = waveformData;

  const samplesPerSecond = (sampleRate / samplesPerPixel);
  const minSilenceSamples = Math.ceil(minSilenceDuration * samplesPerSecond);

  const segments: SilenceSegment[] = [];
  let inSilence = false;
  let silenceStart = 0;
  let silenceVolumeSum = 0;
  let silenceSampleCount = 0;

  for (let i = 0; i < data.length; i++) {
    const sample = data[i];
    const isSilent = sample < silenceThreshold;

    if (isSilent && !inSilence) {
      inSilence = true;
      silenceStart = i;
      silenceVolumeSum = sample;
      silenceSampleCount = 1;
    } else if (isSilent && inSilence) {
      silenceVolumeSum += sample;
      silenceSampleCount++;
    } else if (!isSilent && inSilence) {
      const silenceLength = i - silenceStart;
      if (silenceLength >= minSilenceSamples) {
        const startTime = silenceStart / samplesPerSecond;
        const endTime = i / samplesPerSecond;
        segments.push({
          startTime,
          endTime,
          duration: endTime - startTime,
          avgVolume: silenceVolumeSum / silenceSampleCount,
        });
      }
      inSilence = false;
      silenceVolumeSum = 0;
      silenceSampleCount = 0;
    }
  }

  if (inSilence) {
    const silenceLength = data.length - silenceStart;
    if (silenceLength >= minSilenceSamples) {
      const startTime = silenceStart / samplesPerSecond;
      const endTime = duration;
      segments.push({
        startTime,
        endTime,
        duration: endTime - startTime,
        avgVolume: silenceVolumeSum / silenceSampleCount,
      });
    }
  }

  return segments;
};

export const detectTopicChangePoints = (
  waveformData: WaveformData,
  silenceSegments: SilenceSegment[],
  config: Partial<ChapterDetectionConfig> = {}
): number[] => {
  const { minChapterDuration, maxChapterDuration } = { ...DEFAULT_CONFIG, ...config };
  const { duration } = waveformData;

  const changePoints: number[] = [];
  const windowSize = 30;
  const stepSize = 10;
  const samplesPerWindow = Math.floor(waveformData.data.length / (duration / windowSize));

  const energyProfile: number[] = [];
  for (let i = 0; i < waveformData.data.length; i += samplesPerWindow) {
    const window = waveformData.data.slice(i, i + samplesPerWindow);
    const energy = window.reduce((sum, val) => sum + val * val, 0) / window.length;
    energyProfile.push(energy);
  }

  const diffs: number[] = [];
  for (let i = 1; i < energyProfile.length; i++) {
    diffs.push(Math.abs(energyProfile[i] - energyProfile[i - 1]));
  }

  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const threshold = avgDiff * 1.5;

  for (let i = 0; i < diffs.length; i++) {
    if (diffs[i] > threshold) {
      const timePoint = (i + 1) * windowSize;
      if (timePoint < duration - minChapterDuration) {
        changePoints.push(timePoint);
      }
    }
  }

  const filteredBySilence: number[] = [];
  for (const point of changePoints) {
    let nearestSilence: SilenceSegment | null = null;
    let minDist = Infinity;

    for (const seg of silenceSegments) {
      const segMid = (seg.startTime + seg.endTime) / 2;
      const dist = Math.abs(segMid - point);
      if (dist < minDist && dist < 30) {
        minDist = dist;
        nearestSilence = seg;
      }
    }

    if (nearestSilence) {
      const splitPoint = (nearestSilence.startTime + nearestSilence.endTime) / 2;
      filteredBySilence.push(splitPoint);
    } else {
      filteredBySilence.push(point);
    }
  }

  const finalPoints: number[] = [];
  let lastPoint = 0;

  for (const point of [...filteredBySilence].sort((a, b) => a - b)) {
    if (point - lastPoint >= minChapterDuration) {
      if (finalPoints.length > 0 && point - lastPoint > maxChapterDuration) {
        const numSplits = Math.ceil((point - lastPoint) / maxChapterDuration);
        const interval = (point - lastPoint) / numSplits;
        for (let i = 1; i < numSplits; i++) {
          finalPoints.push(lastPoint + interval * i);
        }
      }
      finalPoints.push(point);
      lastPoint = point;
    }
  }

  if (duration - lastPoint > maxChapterDuration) {
    const numSplits = Math.ceil((duration - lastPoint) / maxChapterDuration);
    const interval = (duration - lastPoint) / numSplits;
    for (let i = 1; i < numSplits; i++) {
      finalPoints.push(lastPoint + interval * i);
    }
  }

  return [...new Set(finalPoints.map(Math.round))].sort((a, b) => a - b);
};

export const generateChapterTitle = (index: number, startTime: number): string => {
  const hours = Math.floor(startTime / 3600);
  const minutes = Math.floor((startTime % 3600) / 60);
  const secs = Math.floor(startTime % 60);

  let timeStr = '';
  if (hours > 0) {
    timeStr = `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  return `第 ${index + 1} 章 (${timeStr})`;
};

export const generateChapterThumbnail = (index: number): string => {
  const colors = [
    'from-primary-500 to-primary-600',
    'from-accent-500 to-accent-600',
    'from-success-500 to-success-600',
    'from-warning-500 to-warning-600',
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-cyan-500 to-cyan-600',
    'from-orange-500 to-orange-600',
  ];
  const colorClass = colors[index % colors.length];
  return `linear-gradient(135deg, var(--${colorClass.split(' ')[0].replace('from-', '')}), var(--${colorClass.split(' ')[1].replace('to-', '')}))`;
};

export const detectChapters = (
  waveformData: WaveformData,
  episodeId: string,
  audioVersionId: string,
  config: Partial<ChapterDetectionConfig> = {}
): ChapterDetectionResult => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const { duration } = waveformData;

  const silenceSegments = detectSilenceSegments(waveformData, fullConfig);

  const topicChangePoints = fullConfig.enableTopicDetection
    ? detectTopicChangePoints(waveformData, silenceSegments, fullConfig)
    : [];

  const allSplitPoints = [
    ...silenceSegments.map((s) => (s.startTime + s.endTime) / 2),
    ...topicChangePoints,
  ].sort((a, b) => a - b);

  const chapters: Chapter[] = [];
  let chapterStartTime = 0;
  let chapterIndex = 0;
  const minDuration = fullConfig.minChapterDuration;

  const filteredPoints: number[] = [];
  for (const point of allSplitPoints) {
    if (point - chapterStartTime >= minDuration && point < duration - minDuration) {
      filteredPoints.push(point);
      chapterStartTime = point;
    }
  }

  chapterStartTime = 0;
  for (const point of filteredPoints) {
    const endTime = Math.min(point, duration);
    chapters.push({
      id: `chap_${Date.now()}_${chapterIndex}`,
      episodeId,
      audioVersionId,
      startTime: chapterStartTime,
      endTime,
      title: generateChapterTitle(chapterIndex, chapterStartTime),
      description: '',
      order: chapterIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    chapterStartTime = point;
    chapterIndex++;
  }

  if (chapterStartTime < duration) {
    chapters.push({
      id: `chap_${Date.now()}_${chapterIndex}`,
      episodeId,
      audioVersionId,
      startTime: chapterStartTime,
      endTime: duration,
      title: generateChapterTitle(chapterIndex, chapterStartTime),
      description: '',
      order: chapterIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    chapters,
    silenceSegments,
    topicChangePoints,
  };
};

export const validateChapterTime = (
  chapters: Chapter[],
  chapterId: string,
  newStartTime: number,
  newEndTime: number,
  duration: number
): { valid: boolean; error?: string } => {
  if (newStartTime < 0) {
    return { valid: false, error: '开始时间不能小于 0' };
  }
  if (newEndTime > duration) {
    return { valid: false, error: '结束时间不能超过音频总时长' };
  }
  if (newEndTime <= newStartTime) {
    return { valid: false, error: '结束时间必须大于开始时间' };
  }
  if (newEndTime - newStartTime < 5) {
    return { valid: false, error: '章节时长至少为 5 秒' };
  }

  const otherChapters = chapters.filter((c) => c.id !== chapterId);
  for (const chap of otherChapters) {
    if (newStartTime < chap.endTime && newEndTime > chap.startTime) {
      return { valid: false, error: `与章节 "${chap.title}" 时间重叠` };
    }
  }

  return { valid: true };
};

export const normalizeChapterOrder = (chapters: Chapter[]): Chapter[] => {
  return [...chapters]
    .sort((a, b) => a.startTime - b.startTime)
    .map((chap, index) => ({
      ...chap,
      order: index,
      updatedAt: new Date().toISOString(),
    }));
};
