import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Share2, Lock, Clock, ArrowLeft, AlertCircle } from 'lucide-react';
import { WaveformPlayer } from '@/components/audio/WaveformPlayer';
import { AnnotationPanel } from '@/components/audio/AnnotationPanel';
import { mockPrograms, mockEpisodes, mockWaveformData, mockAnnotations } from '@/mock/data';
import { Episode, Program, Annotation } from '@/types';

type ShareStatus = 'loading' | 'valid' | 'expired' | 'invalid';

interface ShareData {
  episode: Episode;
  program: Program;
  annotations: Annotation[];
}

const VALID_TOKEN = 'valid-share-token-123';
const EXPIRED_TOKEN = 'expired-share-token-456';

export const ShareViewer: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<ShareStatus>('loading');
  const [shareData, setShareData] = useState<ShareData | null>(null);

  useEffect(() => {
    const loadShareData = async () => {
      setStatus('loading');

      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (!token) {
        setStatus('invalid');
        return;
      }

      if (token === EXPIRED_TOKEN) {
        setStatus('expired');
        return;
      }

      if (token !== VALID_TOKEN) {
        setStatus('invalid');
        return;
      }

      const episode = mockEpisodes[0];
      const program = mockPrograms.find((p) => p.id === episode.programId)!;

      setShareData({
        episode,
        program,
        annotations: mockAnnotations,
      });
      setStatus('valid');
    };

    loadShareData();
  }, [token]);

  const renderLoadingSkeleton = () => (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl space-y-6">
        <div className="glass-card p-8 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-border" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-border rounded w-32" />
              <div className="h-6 bg-border rounded w-64" />
            </div>
          </div>
          <div className="h-4 bg-border rounded w-48" />
          <div className="h-20 bg-border rounded-xl" />
        </div>

        <div className="glass-card p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-border rounded w-32" />
          <div className="h-48 bg-primary-950/50 rounded-xl" />
          <div className="h-12 bg-border rounded-lg" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 h-96 animate-pulse">
            <div className="h-6 bg-border rounded w-24 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-border rounded-xl" />
              ))}
            </div>
          </div>
          <div className="glass-card p-6 h-96 animate-pulse">
            <div className="h-6 bg-border rounded w-24 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-border rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExpiredPage = () => (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-10 text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-warning/20 flex items-center justify-center">
          <Clock className="w-12 h-12 text-warning" />
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground mb-3">
          分享链接已过期
        </h1>

        <p className="text-muted mb-2">
          此访客分享链接的有效期为 7 天
        </p>
        <p className="text-muted mb-8">
          链接已过期，请联系分享者重新生成新的分享链接
        </p>

        <Link
          to="/login"
          className="btn-primary inline-flex items-center justify-center gap-2 w-full"
        >
          <ArrowLeft className="w-5 h-5" />
          返回首页
        </Link>

        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-xs text-muted">
            <Lock className="w-4 h-4" />
            <span>播客协作平台 · 安全分享</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInvalidPage = () => (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-10 text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-error/20 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-error" />
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground mb-3">
          分享链接无效
        </h1>

        <p className="text-muted mb-2">
          您访问的分享链接不存在或格式不正确
        </p>
        <p className="text-muted mb-8">
          请检查链接是否完整，或联系分享者获取正确的访问地址
        </p>

        <Link
          to="/login"
          className="btn-primary inline-flex items-center justify-center gap-2 w-full"
        >
          <ArrowLeft className="w-5 h-5" />
          返回首页
        </Link>

        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-xs text-muted">
            <Lock className="w-4 h-4" />
            <span>播客协作平台 · 安全分享</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderValidPage = () => {
    if (!shareData) return null;
    const { episode, program, annotations } = shareData;

    return (
      <div className="min-h-screen bg-background">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 lg:py-12">
          <header className="glass-card p-6 lg:p-8 mb-6">
            <div className="flex items-start gap-4 lg:gap-6">
              <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                {program.coverImage ? (
                  <img
                    src={program.coverImage}
                    alt={program.name}
                    className="w-full h-full object-cover content-image"
                  />
                ) : (
                  <Share2 className="w-8 h-8 text-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-primary flex items-center gap-1">
                    <Share2 className="w-3 h-3" />
                    访客分享
                  </span>
                  <span className="badge badge-muted">
                    {program.name}
                  </span>
                </div>

                <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground mb-2 truncate">
                  {episode.title}
                </h1>

                {episode.description && (
                  <p className="text-muted text-sm lg:text-base line-clamp-2">
                    {episode.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>
                      {Math.floor(episode.duration / 60)} 分 {episode.duration % 60} 秒
                    </span>
                  </div>
                  <div>
                    集数 #{episode.id} · 共 {annotations.length} 条标注
                  </div>
                </div>
              </div>
            </div>
          </header>

          <WaveformPlayer
            waveformData={mockWaveformData}
            annotations={annotations}
            readOnly={true}
            className="mb-6"
            episodeId={episode.id}
            programId={program.id}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <AnnotationPanel
                annotations={annotations}
                readOnly={true}
                className="h-[500px]"
              />
            </div>

            <div className="space-y-6">
              <div className="glass-card p-6">
                <h3 className="font-display text-lg font-semibold mb-4">
                  关于本节目
                </h3>
                <p className="text-muted text-sm mb-4">
                  {program.description || '暂无节目介绍'}
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">节目名称</span>
                    <span className="text-foreground">{program.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">总集数</span>
                    <span className="text-foreground">{program.episodeCount} 集</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">当前版本</span>
                    <span className="text-foreground">v{episode.currentVersion}</span>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="font-display text-lg font-semibold mb-4">
                  标注统计
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary-500/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-primary-400">
                      {annotations.filter((a) => a.type === 'COMMENT').length}
                    </div>
                    <div className="text-xs text-muted mt-1">评论</div>
                  </div>
                  <div className="bg-error/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-error">
                      {annotations.filter((a) => a.type === 'CORRECTION').length}
                    </div>
                    <div className="text-xs text-muted mt-1">修正</div>
                  </div>
                  <div className="bg-success/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-success">
                      {annotations.filter((a) => a.type === 'APPROVAL').length}
                    </div>
                    <div className="text-xs text-muted mt-1">通过</div>
                  </div>
                  <div className="bg-warning/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-warning">
                      {annotations.filter((a) => a.type === 'QUESTION').length}
                    </div>
                    <div className="text-xs text-muted mt-1">疑问</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 border border-border text-xs text-muted">
              <Clock className="w-4 h-4" />
              <span>此为访客分享链接，7天内有效</span>
              <span className="mx-2 text-border">|</span>
              <Lock className="w-4 h-4" />
              <span>只读模式，无法编辑</span>
            </div>
          </footer>
        </div>
      </div>
    );
  };

  switch (status) {
    case 'loading':
      return renderLoadingSkeleton();
    case 'expired':
      return renderExpiredPage();
    case 'invalid':
      return renderInvalidPage();
    case 'valid':
      return renderValidPage();
    default:
      return renderLoadingSkeleton();
  }
};
