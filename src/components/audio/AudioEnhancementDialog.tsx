import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Zap,
  Volume2,
  Mic,
  Waves,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PlayCircle,
  FileAudio,
} from 'lucide-react';
import {
  AudioEnhancementRequest,
  AudioEnhancementTaskType,
  AudioEnhancementSettings,
  AudioVersion,
  AudioEnhancementTask,
} from '@/types';
import { audioEnhancementApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface AudioEnhancementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  episodeId: string;
  teamId: string;
  audioVersions: AudioVersion[];
  currentVersionId?: string;
  onEnhancementComplete?: (task: AudioEnhancementTask) => void;
}

const TASK_TYPE_OPTIONS: {
  value: AudioEnhancementTaskType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'NOISE_REDUCTION',
    label: '降噪处理',
    description: '自动去除背景噪音，提升音质清晰度',
    icon: <Waves className="w-5 h-5" />,
  },
  {
    value: 'VOLUME_BALANCE',
    label: '音量平衡',
    description: '自动平衡音量，保持一致的听觉体验',
    icon: <Volume2 className="w-5 h-5" />,
  },
  {
    value: 'VOICE_ENHANCE',
    label: '人声增强',
    description: '突出人声音频，优化语音清晰度',
    icon: <Mic className="w-5 h-5" />,
  },
  {
    value: 'FULL_ENHANCE',
    label: '完整增强',
    description: '降噪 + 音量平衡 + 人声增强一站式处理',
    icon: <Zap className="w-5 h-5" />,
  },
];

interface SliderSettingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
}

const SliderSetting: React.FC<SliderSettingProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  description,
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <span className="text-sm font-mono text-primary-400">
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary-500"
    />
    {description && <p className="text-xs text-muted">{description}</p>}
  </div>
);

export const AudioEnhancementDialog: React.FC<AudioEnhancementDialogProps> = ({
  isOpen,
  onClose,
  episodeId,
  teamId,
  audioVersions,
  currentVersionId,
  onEnhancementComplete,
}) => {
  const user = useAuthStore((s) => s.user);
  const [selectedType, setSelectedType] = useState<AudioEnhancementTaskType>('FULL_ENHANCE');
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<AudioEnhancementSettings>({
    noiseReductionStrength: 0.7,
    noiseFloor: -50,
    frequencySmoothing: 0.5,
    targetLoudness: -16,
    truePeak: -1,
    loudnessRange: 11,
    lowCutFreq: 80,
    highCutFreq: 12000,
    presenceGain: 3,
  });

  useEffect(() => {
    if (isOpen && currentVersionId) {
      setSelectedVersions([currentVersionId]);
    }
  }, [isOpen, currentVersionId]);

  const handleVersionToggle = useCallback((versionId: string) => {
    setSelectedVersions((prev) =>
      prev.includes(versionId)
        ? prev.filter((id) => id !== versionId)
        : [...prev, versionId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    const availableVersionIds = audioVersions
      .filter((v) => !v.isArchived && !v.isCorrupted)
      .map((v) => v.id);
    setSelectedVersions((prev) =>
      prev.length === availableVersionIds.length ? [] : availableVersionIds
    );
  }, [audioVersions]);

  const handleEnhance = useCallback(async () => {
    if (selectedVersions.length === 0) {
      setError('请至少选择一个音频版本');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const request: AudioEnhancementRequest = {
        teamId,
        episodeId,
        audioVersionIds: selectedVersions,
        taskType: selectedType,
        settings,
      };

      const response = await audioEnhancementApi.createTask(request);
      const task = response.data.data;

      if (task && onEnhancementComplete) {
        onEnhancementComplete(task);
      }

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '音频增强任务创建失败');
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedVersions,
    teamId,
    episodeId,
    selectedType,
    settings,
    onEnhancementComplete,
    onClose,
  ]);

  const updateSetting = useCallback(
    <K extends keyof AudioEnhancementSettings>(
      key: K,
      value: AudioEnhancementSettings[K]
    ) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const availableVersions = audioVersions.filter(
    (v) => !v.isArchived && !v.isCorrupted
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden animate-bounce-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-400" />
            音频增强处理
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {error && (
            <div className="bg-error/10 border border-error/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error">处理失败</p>
                <p className="text-sm text-error/80">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              选择增强类型
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TASK_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedType(option.value)}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all duration-200',
                    selectedType === option.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-border hover:border-primary-500/50 hover:bg-foreground/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        selectedType === option.value
                          ? 'bg-primary-500/20 text-primary-400'
                          : 'bg-muted/20 text-muted'
                      )}
                    >
                      {option.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {option.label}
                        </span>
                        {selectedType === option.value && (
                          <CheckCircle2 className="w-4 h-4 text-primary-400" />
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-foreground">
                选择音频版本
                <span className="text-muted ml-2">
                  ({selectedVersions.length} 个已选)
                </span>
              </label>
              <button
                onClick={handleSelectAll}
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                {selectedVersions.length === availableVersions.length ? '取消全选' : '全选可用版本'}
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-xl p-2">
              {availableVersions.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <FileAudio className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">没有可用的音频版本</p>
                </div>
              ) : (
                availableVersions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => handleVersionToggle(version.id)}
                    className={cn(
                      'w-full p-3 rounded-lg flex items-center gap-3 transition-all duration-200',
                      selectedVersions.includes(version.id)
                        ? 'bg-primary-500/10 border border-primary-500/30'
                        : 'hover:bg-foreground/5 border border-transparent'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        selectedVersions.includes(version.id)
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-muted'
                      )}
                    >
                      {selectedVersions.includes(version.id) && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <PlayCircle className="w-4 h-4 text-muted" />
                        <span className="font-medium text-foreground">
                          v{version.version}
                        </span>
                        {version.id === currentVersionId && (
                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-success/20 text-success">
                            当前版本
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted truncate">
                        {version.fileName}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              <Settings className="w-4 h-4" />
              {showAdvanced ? '收起高级设置' : '展开高级设置'}
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-foreground/5 rounded-xl space-y-6">
                {(selectedType === 'NOISE_REDUCTION' || selectedType === 'FULL_ENHANCE') && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Waves className="w-4 h-4 text-primary-400" />
                      降噪设置
                    </h4>
                    <SliderSetting
                      label="降噪强度"
                      value={settings.noiseReductionStrength! * 100}
                      onChange={(v) => updateSetting('noiseReductionStrength', v / 100)}
                      min={0}
                      max={100}
                      unit="%"
                      description="控制降噪的强度，值越大降噪越明显，但可能影响音质"
                    />
                    <SliderSetting
                      label="噪声基底"
                      value={settings.noiseFloor!}
                      onChange={(v) => updateSetting('noiseFloor', v)}
                      min={-70}
                      max={-30}
                      unit=" dB"
                      description="低于此音量的声音将被视为噪声"
                    />
                    <SliderSetting
                      label="频率平滑度"
                      value={settings.frequencySmoothing! * 100}
                      onChange={(v) => updateSetting('frequencySmoothing', v / 100)}
                      min={0}
                      max={100}
                      unit="%"
                      description="频率域的平滑程度，减少音乐失真"
                    />
                  </div>
                )}

                {(selectedType === 'VOLUME_BALANCE' || selectedType === 'FULL_ENHANCE') && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-primary-400" />
                      音量平衡设置
                    </h4>
                    <SliderSetting
                      label="目标响度"
                      value={settings.targetLoudness!}
                      onChange={(v) => updateSetting('targetLoudness', v)}
                      min={-24}
                      max={-12}
                      unit=" LUFS"
                      description="建议播客使用 -16 LUFS"
                    />
                    <SliderSetting
                      label="峰值限制"
                      value={settings.truePeak!}
                      onChange={(v) => updateSetting('truePeak', v)}
                      min={-4}
                      max={0}
                      unit=" dB"
                      description="最大峰值音量，防止破音"
                    />
                    <SliderSetting
                      label="响度范围"
                      value={settings.loudnessRange!}
                      onChange={(v) => updateSetting('loudnessRange', v)}
                      min={5}
                      max={20}
                      unit=" LU"
                      description="动态范围控制，值越小音量越平稳"
                    />
                  </div>
                )}

                {(selectedType === 'VOICE_ENHANCE' || selectedType === 'FULL_ENHANCE') && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Mic className="w-4 h-4 text-primary-400" />
                      人声增强设置
                    </h4>
                    <SliderSetting
                      label="低频切除"
                      value={settings.lowCutFreq!}
                      onChange={(v) => updateSetting('lowCutFreq', v)}
                      min={20}
                      max={200}
                      unit=" Hz"
                      description="去除低于此频率的低频噪音"
                    />
                    <SliderSetting
                      label="高频切除"
                      value={settings.highCutFreq!}
                      onChange={(v) => updateSetting('highCutFreq', v)}
                      min={8000}
                      max={20000}
                      unit=" Hz"
                      description="去除高于此频率的高频噪音"
                    />
                    <SliderSetting
                      label="人声增益"
                      value={settings.presenceGain!}
                      onChange={(v) => updateSetting('presenceGain', v)}
                      min={0}
                      max={10}
                      unit=" dB"
                      description="提升人声频段的音量，增加清晰度"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border bg-background/50">
          <div className="text-sm text-muted">
            {selectedVersions.length > 0 ? (
              <span>
                将处理 <span className="font-medium text-foreground">{selectedVersions.length}</span> 个音频版本
              </span>
            ) : (
              <span className="text-error">请选择要处理的音频版本</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="btn-secondary"
              disabled={isProcessing}
            >
              取消
            </button>
            <button
              onClick={handleEnhance}
              className="btn-primary flex items-center gap-2"
              disabled={isProcessing || selectedVersions.length === 0}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  开始增强
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
