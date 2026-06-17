import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Download,
  Trash2,
  Plus,
  Merge,
  Scissors,
  Languages,
  Play,
  Pause,
  RefreshCw,
  Check,
  X,
  Mic,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { Subtitle, SubtitleCue, SubtitleCueUpdateRequest } from '@/types';
import { subtitleApi } from '@/services/api';
import { formatTimeWithMs, parseTimeString } from '@/utils/time';
import { useAuthStore } from '@/store/authStore';
import { SubtitleSearch } from './SubtitleSearch';
import { highlightText } from '@/utils/fuzzySearch';

interface SubtitleEditorProps {
  audioVersionId: string;
  audioUrl?: string;
  duration?: number;
  onCurrentTimeChange?: (time: number) => void;
  onSeek?: (time: number) => void;
  currentTime?: number;
  isPlaying?: boolean;
  variant?: 'default' | 'borderless';
  className?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
  'fr-FR': 'Français',
  'de-DE': 'Deutsch',
  'es-ES': 'Español',
  'ru-RU': 'Русский',
  'ar-SA': 'العربية',
  'hi-IN': 'हिन्दी',
};

const SPEAKER_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-yellow-500',
  'bg-red-500',
];

export const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  audioVersionId,
  audioUrl,
  duration,
  onCurrentTimeChange,
  onSeek,
  currentTime = 0,
  isPlaying = false,
  variant = 'default',
  className = '',
}) => {
  const user = useAuthStore((s) => s.user);
  const teamId = user?.teamId;
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<Subtitle | null>(null);
  const [editingCue, setEditingCue] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { startTime: string; endTime: string; text: string; speakerName: string }>>({});
  const [selectedCues, setSelectedCues] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('zh-CN');
  const [speakerDetection, setSpeakerDetection] = useState(true);
  const [exportFormat, setExportFormat] = useState<'SRT' | 'VTT'>('SRT');
  const [isExporting, setIsExporting] = useState(false);
  const [loadingCues, setLoadingCues] = useState(false);
  const [savingCue, setSavingCue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const searchMatches = useMemo(() => {
    if (!searchKeyword.trim() || !selectedSubtitle?.cues) return new Map<string, Array<{ start: number; end: number }>>();

    const matches = new Map<string, Array<{ start: number; end: number }>>();
    const keyword = searchKeyword.toLowerCase().trim();

    for (const cue of selectedSubtitle.cues) {
      const cueMatches: Array<{ start: number; end: number }> = [];
      const lowerText = cue.text.toLowerCase();

      let index = 0;
      while ((index = lowerText.indexOf(keyword, index)) !== -1) {
        cueMatches.push({ start: index, end: index + keyword.length });
        index += keyword.length;
      }

      if (cue.speakerName) {
        const lowerSpeaker = cue.speakerName.toLowerCase();
        let speakerIndex = 0;
        while ((speakerIndex = lowerSpeaker.indexOf(keyword, speakerIndex)) !== -1) {
          cueMatches.push({ start: speakerIndex, end: speakerIndex + keyword.length });
          speakerIndex += keyword.length;
        }
      }

      if (cueMatches.length > 0) {
        matches.set(cue.id, cueMatches);
      }
    }

    return matches;
  }, [searchKeyword, selectedSubtitle?.cues]);

  const renderHighlightedText = (text: string, cueId: string, isSpeaker: boolean = false) => {
    if (!searchKeyword.trim()) return text;

    const matches = searchMatches.get(cueId);
    if (!matches || matches.length === 0) return text;

    const relevantMatches = matches.filter((m) => {
      if (isSpeaker) return true;
      return true;
    });

    const segments = highlightText(text, relevantMatches);
    return segments.map((segment, index) =>
      segment.isHighlight ? (
        <mark key={index} className="bg-yellow-500/40 text-yellow-200 px-0.5 rounded">
          {segment.text}
        </mark>
      ) : (
        <span key={index}>{segment.text}</span>
      )
    );
  };

  const handleSearchResultClick = (cue: SubtitleCue) => {
    onSeek?.(cue.startTime);
    setShowSearch(false);
  };

  useEffect(() => {
    loadSubtitles();
    loadSupportedLanguages();
  }, [audioVersionId, teamId]);

  useEffect(() => {
    if (selectedSubtitle) {
      loadSubtitleCues(selectedSubtitle.id);
    }
  }, [selectedSubtitle?.id]);

  const loadSubtitles = async () => {
    if (!teamId) return;
    try {
      const response = await subtitleApi.getByAudioVersion(audioVersionId, teamId);
      if (response.data.success) {
        setSubtitles(response.data.data || []);
        if (response.data.data && response.data.data.length > 0 && !selectedSubtitle) {
          setSelectedSubtitle(response.data.data[0]);
        }
      }
    } catch (err) {
      console.error('加载字幕列表失败:', err);
    }
  };

  const loadSupportedLanguages = async () => {
    try {
      const response = await subtitleApi.getSupportedLanguages();
      if (response.data.success) {
        setSupportedLanguages(response.data.data || []);
      }
    } catch (err) {
      console.error('加载支持语言失败:', err);
    }
  };

  const loadSubtitleCues = async (subtitleId: string) => {
    if (!teamId) return;
    setLoadingCues(true);
    try {
      const response = await subtitleApi.getById(subtitleId, teamId, true);
      if (response.data.success && response.data.data) {
        setSelectedSubtitle(response.data.data);
      }
    } catch (err) {
      console.error('加载字幕条目失败:', err);
    } finally {
      setLoadingCues(false);
    }
  };

  const handleGenerateSubtitle = async () => {
    if (!teamId) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await subtitleApi.generate({
        audioVersionId,
        language: selectedLanguage,
        speakerDetectionEnabled: speakerDetection,
      });
      if (response.data.success && response.data.data) {
        setShowLanguageModal(false);
        await loadSubtitles();
        const pollInterval = setInterval(async () => {
          await loadSubtitles();
          const subtitle = subtitles.find(s => s.id === response.data.data?.id);
          if (subtitle && subtitle.status !== 'GENERATING') {
            clearInterval(pollInterval);
            await loadSubtitleCues(subtitle.id);
          }
        }, 2000);
        setTimeout(() => clearInterval(pollInterval), 60000);
      } else {
        setError(response.data.message || '生成字幕失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '生成字幕失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCueClick = (cue: SubtitleCue) => {
    onSeek?.(cue.startTime);
  };

  const handleStartEdit = (cue: SubtitleCue) => {
    setEditingCue(cue.id);
    setEditValues({
      ...editValues,
      [cue.id]: {
        startTime: formatTimeWithMs(cue.startTime),
        endTime: formatTimeWithMs(cue.endTime),
        text: cue.text,
        speakerName: cue.speakerName || '',
      },
    });
  };

  const handleSaveEdit = async (cueId: string) => {
    if (!teamId || !editValues[cueId]) return;
    setSavingCue(cueId);
    try {
      const values = editValues[cueId];
      const request: SubtitleCueUpdateRequest = {
        startTime: parseTimeString(values.startTime),
        endTime: parseTimeString(values.endTime),
        text: values.text,
        speakerName: values.speakerName || undefined,
      };

      const response = await subtitleApi.updateCue(cueId, teamId, request);
      if (response.data.success) {
        setEditingCue(null);
        if (selectedSubtitle) {
          await loadSubtitleCues(selectedSubtitle.id);
        }
      }
    } catch (err) {
      console.error('保存字幕失败:', err);
    } finally {
      setSavingCue(null);
    }
  };

  const handleCancelEdit = (cueId: string) => {
    setEditingCue(null);
    const newEditValues = { ...editValues };
    delete newEditValues[cueId];
    setEditValues(newEditValues);
  };

  const handleToggleSelect = (cueId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedCues);
    if (newSelected.has(cueId)) {
      newSelected.delete(cueId);
    } else {
      newSelected.add(cueId);
    }
    setSelectedCues(newSelected);
  };

  const handleMergeCues = async () => {
    if (!teamId || selectedCues.size < 2) return;
    try {
      const response = await subtitleApi.mergeCues(teamId, Array.from(selectedCues));
      if (response.data.success) {
        setSelectedCues(new Set());
        if (selectedSubtitle) {
          await loadSubtitleCues(selectedSubtitle.id);
        }
      }
    } catch (err) {
      console.error('合并字幕失败:', err);
    }
  };

  const handleSplitCue = async (cueId: string) => {
    if (!teamId) return;
    const cue = selectedSubtitle?.cues?.find(c => c.id === cueId);
    if (!cue) return;
    const splitTime = (cue.startTime + cue.endTime) / 2;
    try {
      const response = await subtitleApi.splitCue(cueId, teamId, splitTime);
      if (response.data.success) {
        if (selectedSubtitle) {
          await loadSubtitleCues(selectedSubtitle.id);
        }
      }
    } catch (err) {
      console.error('拆分字幕失败:', err);
    }
  };

  const handleAddCue = async () => {
    if (!teamId || !selectedSubtitle) return;
    const lastCue = selectedSubtitle.cues?.[selectedSubtitle.cues.length - 1];
    const startTime = lastCue ? lastCue.endTime + 0.1 : 0;
    const request: SubtitleCueUpdateRequest = {
      startTime,
      endTime: startTime + 3,
      text: '',
    };
    try {
      const response = await subtitleApi.addCue(selectedSubtitle.id, teamId, request);
      if (response.data.success) {
        await loadSubtitleCues(selectedSubtitle.id);
      }
    } catch (err) {
      console.error('添加字幕失败:', err);
    }
  };

  const handleDeleteCue = async (cueId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!teamId) return;
    if (!confirm('确定要删除这条字幕吗？')) return;
    try {
      await subtitleApi.deleteCue(cueId, teamId);
      if (selectedSubtitle) {
        await loadSubtitleCues(selectedSubtitle.id);
      }
    } catch (err) {
      console.error('删除字幕失败:', err);
    }
  };

  const handleExport = async () => {
    if (!teamId || !selectedSubtitle) return;
    setIsExporting(true);
    try {
      const response = await subtitleApi.export(selectedSubtitle.id, teamId, exportFormat);
      const blob = new Blob([response.data], { type: exportFormat === 'VTT' ? 'text/vtt' : 'application/x-subrip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subtitle_${selectedSubtitle.id}.${exportFormat.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出字幕失败:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefreshSubtitle = async () => {
    if (selectedSubtitle) {
      await loadSubtitleCues(selectedSubtitle.id);
    }
  };

  const getSpeakerColor = (speakerId?: string) => {
    if (!speakerId) return 'bg-gray-400';
    const index = parseInt(speakerId.replace(/\D/g, '')) % SPEAKER_COLORS.length;
    return SPEAKER_COLORS[index] || 'bg-gray-400';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      GENERATING: 'bg-yellow-500/20 text-yellow-400',
      DRAFT: 'bg-blue-500/20 text-blue-400',
      REVIEW: 'bg-purple-500/20 text-purple-400',
      FINALIZED: 'bg-green-500/20 text-green-400',
    };
    const labels: Record<string, string> = {
      GENERATING: '生成中',
      DRAFT: '草稿',
      REVIEW: '审核中',
      FINALIZED: '已完成',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const isCueActive = (cue: SubtitleCue) => {
    return currentTime >= cue.startTime && currentTime <= cue.endTime;
  };

  return (
    <div className={`${variant === 'default' ? 'glass-card' : ''} p-6 h-full flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold">字幕编辑器</h3>
        <div className="flex items-center gap-2">
          {selectedSubtitle && selectedSubtitle.status !== 'GENERATING' && (
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-lg transition-colors ${
                showSearch
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'hover:bg-foreground/10 text-muted hover:text-foreground'
              }`}
              title="搜索字幕"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowLanguageModal(true)}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Mic className="w-4 h-4" />
            生成字幕
          </button>
        </div>
      </div>

      {showSearch && selectedSubtitle && (
        <div className="mb-4">
          <SubtitleSearch
            cues={selectedSubtitle.cues || []}
            audioVersionId={audioVersionId}
            onResultClick={handleSearchResultClick}
            onKeywordChange={setSearchKeyword}
            currentTime={currentTime}
          />
          {searchKeyword.trim() && (
            <div className="mt-2 text-xs text-muted">
              匹配 {searchMatches.size} 条字幕
            </div>
          )}
        </div>
      )}

      {subtitles.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {subtitles.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubtitle(sub)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                selectedSubtitle?.id === sub.id
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50'
                  : 'bg-card hover:bg-foreground/10'
              }`}
            >
              <Languages className="w-4 h-4" />
              <span>{LANGUAGE_NAMES[sub.language] || sub.language}</span>
              {getStatusBadge(sub.status)}
            </button>
          ))}
        </div>
      )}

      {selectedSubtitle && selectedSubtitle.status === 'GENERATING' && (
        <div className="flex items-center justify-center gap-2 p-4 bg-yellow-500/10 rounded-lg mb-4">
          <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
          <span className="text-yellow-400">正在生成字幕，请稍候...</span>
        </div>
      )}

      {selectedSubtitle && selectedSubtitle.status !== 'GENERATING' && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">
              共 {selectedSubtitle.cueCount} 条字幕
            </span>
            {selectedSubtitle.speakerDetectionEnabled && (
              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                已识别说话人
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshSubtitle}
              className="p-2 rounded-lg hover:bg-foreground/10 transition-colors"
              title="刷新"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleAddCue}
              className="p-2 rounded-lg hover:bg-foreground/10 transition-colors"
              title="添加字幕"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleMergeCues}
              disabled={selectedCues.size < 2}
              className="p-2 rounded-lg hover:bg-foreground/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={`合并选中 (${selectedCues.size})`}
            >
              <Merge className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'SRT' | 'VTT')}
                className="bg-transparent px-2 py-1 text-sm focus:outline-none"
              >
                <option value="SRT">SRT</option>
                <option value="VTT">VTT</option>
              </select>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="p-1.5 rounded hover:bg-foreground/10 transition-colors"
                title="导出"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-400 rounded-lg mb-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {loadingCues && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        )}

        {!loadingCues && selectedSubtitle?.cues?.map((cue, index) => {
          const isSearchMatch = searchKeyword.trim() && searchMatches.has(cue.id);
          return (
          <div
            key={cue.id}
            className={`group relative rounded-lg border transition-all ${
              isCueActive(cue)
                ? 'border-primary-500 bg-primary-500/10'
                : isSearchMatch
                ? 'border-yellow-500/50 bg-yellow-500/5'
                : editingCue === cue.id
                ? 'border-primary-400/50 bg-foreground/5'
                : selectedCues.has(cue.id)
                ? 'border-primary-400/50 bg-primary-500/5'
                : 'border-border hover:border-foreground/30'
            }`}
          >
            <div className="flex items-start gap-3 p-3">
              <input
                type="checkbox"
                checked={selectedCues.has(cue.id)}
                onChange={(e) => {}}
                onClick={(e) => handleToggleSelect(cue.id, e)}
                className="mt-1.5 w-4 h-4 rounded border-border text-primary-500 focus:ring-primary-500 bg-transparent"
              />

              {cue.speakerId && (
                <div className="flex flex-col items-center gap-1 pt-1">
                  <div className={`w-3 h-3 rounded-full ${getSpeakerColor(cue.speakerId)}`} title={cue.speakerName} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {editingCue === cue.id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValues[cue.id]?.startTime || ''}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          [cue.id]: { ...editValues[cue.id], startTime: e.target.value }
                        })}
                        className="w-28 px-2 py-1 bg-card border border-border rounded text-sm font-mono focus:outline-none focus:border-primary-400"
                        placeholder="00:00.000"
                      />
                      <span className="text-muted">→</span>
                      <input
                        type="text"
                        value={editValues[cue.id]?.endTime || ''}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          [cue.id]: { ...editValues[cue.id], endTime: e.target.value }
                        })}
                        className="w-28 px-2 py-1 bg-card border border-border rounded text-sm font-mono focus:outline-none focus:border-primary-400"
                        placeholder="00:00.000"
                      />
                      {selectedSubtitle?.speakerDetectionEnabled && (
                        <input
                          type="text"
                          value={editValues[cue.id]?.speakerName || ''}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            [cue.id]: { ...editValues[cue.id], speakerName: e.target.value }
                          })}
                          placeholder="说话人"
                          className="w-24 px-2 py-1 bg-card border border-border rounded text-sm focus:outline-none focus:border-primary-400"
                        />
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => handleSaveEdit(cue.id)}
                          disabled={savingCue === cue.id}
                          className="p-1.5 rounded hover:bg-green-500/20 text-green-400 transition-colors"
                        >
                          {savingCue === cue.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCancelEdit(cue.id)}
                          className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editValues[cue.id]?.text || ''}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        [cue.id]: { ...editValues[cue.id], text: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-card border border-border rounded text-sm focus:outline-none focus:border-primary-400 resize-none"
                      rows={2}
                      placeholder="输入字幕内容..."
                    />
                  </div>
                ) : (
                  <div
                    className="cursor-pointer"
                    onClick={() => handleCueClick(cue)}
                    onDoubleClick={() => handleStartEdit(cue)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted">
                        {formatTimeWithMs(cue.startTime)} → {formatTimeWithMs(cue.endTime)}
                      </span>
                      <span className="text-xs text-muted">#{index + 1}</span>
                      {cue.confidence !== undefined && (
                        <span className={`text-xs ${cue.confidence >= 0.9 ? 'text-green-400' : cue.confidence >= 0.7 ? 'text-yellow-400' : 'text-red-400'}`}>
                          置信度: {(cue.confidence * 100).toFixed(1)}%
                        </span>
                      )}
                      <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(cue); }}
                          className="p-1 rounded hover:bg-foreground/10"
                          title="编辑"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSplitCue(cue.id); }}
                          className="p-1 rounded hover:bg-foreground/10"
                          title="拆分"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCue(cue.id, e)}
                          className="p-1 rounded hover:bg-red-500/20 text-red-400"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {cue.speakerName && (
                        <span className="text-primary-400 font-medium">
                          {renderHighlightedText(cue.speakerName, cue.id, true)}
                          {': '}
                        </span>
                      )}
                      {renderHighlightedText(cue.text, cue.id)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {isCueActive(cue) && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-l-lg" />
            )}
          </div>
        );
        })}

        {!loadingCues && selectedSubtitle?.cues?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <Languages className="w-12 h-12 mb-3 opacity-30" />
            <p>暂无字幕内容</p>
            <button
              onClick={handleAddCue}
              className="mt-3 btn-secondary text-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              添加第一条字幕
            </button>
          </div>
        )}

        {!loadingCues && !selectedSubtitle && subtitles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <Mic className="w-12 h-12 mb-3 opacity-30" />
            <p>还没有生成字幕</p>
            <button
              onClick={() => setShowLanguageModal(true)}
              className="mt-3 btn-primary text-sm"
            >
              <Mic className="w-4 h-4 mr-1.5" />
              自动生成字幕
            </button>
          </div>
        )}
      </div>

      {showLanguageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl border border-border">
            <h3 className="font-display text-lg font-semibold mb-4">生成字幕</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">选择语言</label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {supportedLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        selectedLanguage === lang
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50'
                          : 'bg-foreground/5 hover:bg-foreground/10 border border-transparent'
                      }`}
                    >
                      {LANGUAGE_NAMES[lang] || lang}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={speakerDetection}
                  onChange={(e) => setSpeakerDetection(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary-500 focus:ring-primary-500 bg-transparent"
                />
                <div>
                  <span className="text-sm font-medium">说话人识别</span>
                  <p className="text-xs text-muted">自动区分不同说话人</p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowLanguageModal(false)}
                className="btn-secondary text-sm"
              >
                取消
              </button>
              <button
                onClick={handleGenerateSubtitle}
                disabled={isGenerating}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                开始生成
              </button>
            </div>
          </div>
        </div>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={(e) => onCurrentTimeChange?.(e.currentTarget.currentTime)}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};
