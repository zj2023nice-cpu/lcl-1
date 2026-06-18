import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  Mail,
  Heart,
  Calendar,
  Star,
  Upload,
  Globe,
  MessageCircle,
  Phone,
  Link,
  Loader2,
  ChevronLeft,
  ChevronRight,
  History,
  Plus,
  Check,
  AlertCircle,
} from 'lucide-react';
import { guestApi, episodeApi, programApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import {
  Guest,
  GuestCollaborationHistory,
  CreateGuestRequest,
  UpdateGuestRequest,
  CreateCollaborationHistoryRequest,
  SendGuestEmailRequest,
  CollaborationType,
  Episode,
  Program,
} from '@/types';
import { formatDate } from '@/utils/time';
import { cn } from '@/lib/utils';
import { Empty } from '@/components/Empty';
import { AvatarDisplay } from '@/components/AvatarDisplay';

const collaborationTypeLabels: Record<CollaborationType, string> = {
  RECORDING: '录制',
  INTERVIEW: '访谈',
  GUEST_SPEAKER: '特邀嘉宾',
  CO_HOST: '联合主持',
  OTHER: '其他',
};

const socialLinks = [
  { key: 'weiboUrl', label: '微博', icon: Globe },
  { key: 'zhihuUrl', label: '知乎', icon: Globe },
  { key: 'bilibiliUrl', label: 'B站', icon: Globe },
];

interface GuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest | null;
  onSave: (data: CreateGuestRequest | UpdateGuestRequest) => void;
  loading: boolean;
}

const GuestModal: React.FC<GuestModalProps> = ({ isOpen, onClose, guest, onSave, loading }) => {
  const [formData, setFormData] = useState<CreateGuestRequest>({
    name: '',
    email: '',
    phoneNumber: '',
    topicAreas: '',
    weiboUrl: '',
    wechatId: '',
    zhihuUrl: '',
    bilibiliUrl: '',
    otherLinks: '',
    bio: '',
  });

  useEffect(() => {
    if (guest) {
      setFormData({
        name: guest.name,
        email: guest.email,
        phoneNumber: guest.phoneNumber || '',
        topicAreas: guest.topicAreas || '',
        weiboUrl: guest.weiboUrl || '',
        wechatId: guest.wechatId || '',
        zhihuUrl: guest.zhihuUrl || '',
        bilibiliUrl: guest.bilibiliUrl || '',
        otherLinks: guest.otherLinks || '',
        bio: guest.bio || '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        topicAreas: '',
        weiboUrl: '',
        wechatId: '',
        zhihuUrl: '',
        bilibiliUrl: '',
        otherLinks: '',
        bio: '',
      });
    }
  }, [guest]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-bounce-in">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary-400" />
            {guest ? '编辑嘉宾' : '添加嘉宾'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">姓名 *</label>
              <input
                type="text"
                className="input-field"
                placeholder="输入嘉宾姓名"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">邮箱 *</label>
              <input
                type="email"
                className="input-field"
                placeholder="输入嘉宾邮箱"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">电话</label>
              <input
                type="tel"
                className="input-field"
                placeholder="输入联系电话"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">话题领域</label>
              <input
                type="text"
                className="input-field"
                placeholder="如：科技、商业、文化等，用逗号分隔"
                value={formData.topicAreas}
                onChange={(e) => setFormData({ ...formData, topicAreas: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                社交链接
              </label>
              <div className="grid grid-cols-2 gap-3">
                {socialLinks.map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs text-muted mb-1">{label}</label>
                    <input
                      type="url"
                      className="input-field text-sm"
                      placeholder={`输入${label}链接`}
                      value={(formData as Record<string, string>)[key] || ''}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value } as CreateGuestRequest)}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-muted mb-1">微信号</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="输入微信号"
                    value={formData.wechatId}
                    onChange={(e) => setFormData({ ...formData, wechatId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">其他链接</label>
                  <input
                    type="url"
                    className="input-field text-sm"
                    placeholder="个人网站或博客"
                    value={formData.otherLinks}
                    onChange={(e) => setFormData({ ...formData, otherLinks: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">简介</label>
              <textarea
                className="input-field min-h-[100px] resize-none"
                placeholder="介绍嘉宾的背景、专业领域等"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="btn-secondary">
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!formData.name.trim() || !formData.email.trim() || loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {guest ? '保存修改' : '添加嘉宾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest | null;
  episodes: Episode[];
  programs: Program[];
  onSend: (data: SendGuestEmailRequest) => void;
  loading: boolean;
}

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, guest, episodes, programs, onSend, loading }) => {
  const [emailType, setEmailType] = useState<'INVITATION' | 'THANK_YOU'>('INVITATION');
  const [episodeId, setEpisodeId] = useState<string>('');
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    setEpisodeId('');
    setCustomVariables({});
  }, [guest]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const request: SendGuestEmailRequest = {
      emailType,
      episodeId: episodeId ? parseInt(episodeId) : undefined,
      variables: Object.keys(customVariables).length > 0 ? customVariables : undefined,
    };
    onSend(request);
  };

  if (!isOpen || !guest) return null;

  const getProgramName = (programId: string) => {
    return programs.find((p) => p.id === programId)?.name || '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-lg mx-4 animate-bounce-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary-400" />
            发送邮件给 {guest.name}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">邮件类型</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEmailType('INVITATION')}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all text-left',
                  emailType === 'INVITATION'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-border hover:border-foreground/20'
                )}
              >
                <Mail className={cn('w-5 h-5 mb-1', emailType === 'INVITATION' ? 'text-primary-400' : 'text-muted')} />
                <div className={cn('font-medium', emailType === 'INVITATION' ? 'text-foreground' : 'text-muted')}>
                  邀请邮件
                </div>
                <div className="text-xs text-muted">邀请嘉宾参与节目录制</div>
              </button>
              <button
                type="button"
                onClick={() => setEmailType('THANK_YOU')}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all text-left',
                  emailType === 'THANK_YOU'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-border hover:border-foreground/20'
                )}
              >
                <Heart className={cn('w-5 h-5 mb-1', emailType === 'THANK_YOU' ? 'text-primary-400' : 'text-muted')} />
                <div className={cn('font-medium', emailType === 'THANK_YOU' ? 'text-foreground' : 'text-muted')}>
                  感谢邮件
                </div>
                <div className="text-xs text-muted">感谢嘉宾参与节目录制</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">关联节目</label>
            <select
              className="input-field"
              value={episodeId}
              onChange={(e) => setEpisodeId(e.target.value)}
            >
              <option value="">选择节目（可选）</option>
              {episodes.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {getProgramName(ep.programId)} - {ep.title}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-foreground/5 rounded-lg p-3">
            <div className="text-sm text-muted mb-2">邮件预览信息</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">收件人：</span>
                <span className="text-foreground">{guest.name} &lt;{guest.email}&gt;</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">模板：</span>
                <span className="text-foreground">
                  {emailType === 'INVITATION' ? '嘉宾邀请邮件' : '嘉宾感谢邮件'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="btn-secondary">
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              发送邮件
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest | null;
  episodes: Episode[];
  programs: Program[];
  onAdd: (data: CreateCollaborationHistoryRequest) => void;
  loading: boolean;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, guest, episodes, programs, onAdd, loading }) => {
  const [formData, setFormData] = useState<CreateCollaborationHistoryRequest>({
    collaborationType: 'RECORDING',
    episodeId: undefined,
    topic: '',
    recordingDate: '',
    publishDate: '',
    feedback: '',
    rating: undefined,
    notes: '',
  });

  useEffect(() => {
    setFormData({
      collaborationType: 'RECORDING',
      episodeId: undefined,
      topic: '',
      recordingDate: '',
      publishDate: '',
      feedback: '',
      rating: undefined,
      notes: '',
    });
  }, [guest]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: CreateCollaborationHistoryRequest = {
      ...formData,
      episodeId: formData.episodeId ? Number(formData.episodeId) : undefined,
    };
    onAdd(data);
  };

  if (!isOpen || !guest) return null;

  const getProgramName = (programId: string) => {
    return programs.find((p) => p.id === programId)?.name || '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto animate-bounce-in">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary-400" />
            添加合作记录 - {guest.name}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">合作类型 *</label>
              <select
                className="input-field"
                value={formData.collaborationType}
                onChange={(e) => setFormData({ ...formData, collaborationType: e.target.value as CollaborationType })}
              >
                {Object.entries(collaborationTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">关联节目</label>
              <select
                className="input-field"
                value={formData.episodeId || ''}
                onChange={(e) => setFormData({ ...formData, episodeId: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">选择节目（可选）</option>
                {episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {getProgramName(ep.programId)} - {ep.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">主题</label>
              <input
                type="text"
                className="input-field"
                placeholder="本次合作的主题"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">录制日期</label>
              <input
                type="datetime-local"
                className="input-field"
                value={formData.recordingDate}
                onChange={(e) => setFormData({ ...formData, recordingDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">播出日期</label>
              <input
                type="datetime-local"
                className="input-field"
                value={formData.publishDate}
                onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">评分</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={cn(
                        'w-6 h-6',
                        formData.rating && formData.rating >= star
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-muted'
                      )}
                    />
                  </button>
                ))}
                {formData.rating && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: undefined })}
                    className="ml-2 text-xs text-muted hover:text-foreground"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">嘉宾反馈</label>
              <textarea
                className="input-field min-h-[80px] resize-none"
                placeholder="嘉宾对本次合作的反馈"
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">备注</label>
              <textarea
                className="input-field min-h-[80px] resize-none"
                placeholder="其他需要记录的信息"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="btn-secondary">
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              添加记录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface GuestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest | null;
  episodes: Episode[];
  programs: Program[];
  onEdit: () => void;
  onSendEmail: () => void;
  onAddHistory: () => void;
  onDeleteHistory: (historyId: string) => void;
  onUploadAvatar: (file: File) => void;
  onDeleteAvatar: () => void;
  uploadingAvatar: boolean;
}

const GuestDetailModal: React.FC<GuestDetailModalProps> = ({
  isOpen,
  onClose,
  guest,
  episodes,
  programs,
  onEdit,
  onSendEmail,
  onAddHistory,
  onDeleteHistory,
  onUploadAvatar,
  onDeleteAvatar,
  uploadingAvatar,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  if (!isOpen || !guest) return null;

  const getProgramName = (programId: string) => {
    return programs.find((p) => p.id === programId)?.name || '';
  };

  const getEpisodeTitle = (episodeId?: string) => {
    if (!episodeId) return '';
    const ep = episodes.find((e) => e.id === episodeId);
    if (!ep) return '';
    return `${getProgramName(ep.programId)} - ${ep.title}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadAvatar(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-bounce-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">嘉宾详情</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-start gap-6 mb-6">
            <div className="relative flex-shrink-0">
              <AvatarDisplay
                src={guest.avatarUrl}
                name={guest.name}
                size={100}
                editable
                onUpload={onUploadAvatar}
                uploading={uploadingAvatar}
                onDelete={guest.avatarUrl ? onDeleteAvatar : undefined}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{guest.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-muted">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{guest.email}</span>
                  </div>
                  {guest.phoneNumber && (
                    <div className="flex items-center gap-2 mt-1 text-muted">
                      <Phone className="w-4 h-4" />
                      <span>{guest.phoneNumber}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={onEdit} className="btn-secondary text-sm">
                    <Edit className="w-4 h-4 mr-1" />
                    编辑
                  </button>
                  <button onClick={onSendEmail} className="btn-secondary text-sm">
                    <Mail className="w-4 h-4 mr-1" />
                    发邮件
                  </button>
                </div>
              </div>

              {guest.topicAreas && (
                <div className="mt-4">
                  <div className="text-sm text-muted mb-2">话题领域</div>
                  <div className="flex flex-wrap gap-2">
                    {guest.topicAreas.split(',').map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-primary-500/10 text-primary-400 text-xs rounded-full"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-6 mt-4 text-sm">
                <div>
                  <span className="text-muted">参与集数：</span>
                  <span className="font-medium text-foreground">{guest.participationCount}</span>
                </div>
                <div>
                  <span className="text-muted">创建时间：</span>
                  <span className="text-foreground">{formatDate(guest.createdAt)}</span>
                </div>
                <div>
                  <span className="text-muted">状态：</span>
                  <span
                    className={cn(
                      'font-medium',
                      guest.isActive ? 'text-green-400' : 'text-muted'
                    )}
                  >
                    {guest.isActive ? '活跃' : '已停用'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-1 mb-4 border-b border-border">
            <button
              onClick={() => setActiveTab('info')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'info'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-muted hover:text-foreground'
              )}
            >
              基本信息
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'history'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-muted hover:text-foreground'
              )}
            >
              合作历史
              {guest.collaborationHistory && guest.collaborationHistory.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-foreground/10 text-xs rounded-full">
                  {guest.collaborationHistory.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'info' && (
            <div className="space-y-4">
              {guest.bio && (
                <div>
                  <div className="text-sm font-medium text-foreground mb-2">简介</div>
                  <p className="text-muted text-sm leading-relaxed">{guest.bio}</p>
                </div>
              )}

              <div>
                <div className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  社交链接
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {socialLinks.map(({ key, label }) => {
                    const url = (guest as Record<string, string | undefined>)[key];
                    if (!url) return null;
                    return (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors text-sm"
                      >
                        <Globe className="w-4 h-4 text-primary-400" />
                        <span className="text-muted">{label}：</span>
                        <span className="text-foreground truncate">{url}</span>
                      </a>
                    );
                  })}
                  {guest.wechatId && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-foreground/5 text-sm">
                      <MessageCircle className="w-4 h-4 text-green-400" />
                      <span className="text-muted">微信：</span>
                      <span className="text-foreground">{guest.wechatId}</span>
                    </div>
                  )}
                  {guest.otherLinks && (
                    <a
                      href={guest.otherLinks}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors text-sm"
                    >
                      <Link className="w-4 h-4 text-primary-400" />
                      <span className="text-muted">其他：</span>
                      <span className="text-foreground truncate">{guest.otherLinks}</span>
                    </a>
                  )}
                </div>
              </div>

              {guest.createdByName && (
                <div className="text-sm text-muted">
                  创建人：<span className="text-foreground">{guest.createdByName}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted">
                  共 {guest.collaborationHistory?.length || 0} 条合作记录
                </div>
                <button onClick={onAddHistory} className="btn-secondary text-sm">
                  <Plus className="w-4 h-4 mr-1" />
                  添加记录
                </button>
              </div>

              {guest.collaborationHistory && guest.collaborationHistory.length > 0 ? (
                <div className="space-y-3">
                  {guest.collaborationHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg bg-foreground/5 border border-border"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-primary-500/10 text-primary-400 text-xs rounded">
                              {collaborationTypeLabels[item.collaborationType]}
                            </span>
                            {item.rating && (
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      'w-3 h-3',
                                      i < item.rating!
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-muted'
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          {item.topic && (
                            <div className="font-medium text-foreground mb-1">{item.topic}</div>
                          )}
                          {item.episodeId && (
                            <div className="text-sm text-muted mb-2">
                              节目：{getEpisodeTitle(item.episodeId)}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-4 text-xs text-muted">
                            {item.recordingDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                录制：{formatDate(item.recordingDate)}
                              </span>
                            )}
                            {item.publishDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                播出：{formatDate(item.publishDate)}
                              </span>
                            )}
                          </div>
                          {item.feedback && (
                            <p className="mt-2 text-sm text-muted">{item.feedback}</p>
                          )}
                          {item.notes && (
                            <p className="mt-1 text-xs text-muted/70 italic">备注：{item.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => onDeleteHistory(item.id)}
                          className="p-1 text-muted hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={History}
                  title="暂无合作记录"
                  description="点击上方按钮添加第一条合作记录"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Guests: React.FC = () => {
  const { user } = useAuthStore();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailGuest, setEmailGuest] = useState<Guest | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyGuest, setHistoryGuest] = useState<Guest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailGuest, setDetailGuest] = useState<Guest | null>(null);

  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'PRODUCER' || user?.role === 'HOST';
  const canDelete = user?.role === 'ADMIN' || user?.role === 'PRODUCER';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [guestRes, episodeRes] = await Promise.all([
        guestApi.getAll({ keyword: searchKeyword, page: currentPage, size: pageSize }),
        episodeApi.getAll(),
      ]);

      if (guestRes.data.success && guestRes.data.data) {
        setGuests(guestRes.data.data.content);
        setTotalPages(guestRes.data.data.totalPages);
        setTotalElements(guestRes.data.data.totalElements);
      }

      if (episodeRes.data.success && episodeRes.data.data) {
        setEpisodes(Array.isArray(episodeRes.data.data) ? episodeRes.data.data : []);
      }
    } catch (error) {
      console.error('加载嘉宾数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, currentPage]);

  const loadPrograms = useCallback(async () => {
    try {
      const res = await programApi.getAll();
      if (res.data.success && res.data.data) {
        setPrograms(res.data.data);
      }
    } catch (error) {
      console.error('加载节目数据失败:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadPrograms();
  }, [loadData, loadPrograms]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchKeyword]);

  const handleCreateGuest = async (data: CreateGuestRequest) => {
    try {
      setSaving(true);
      const res = await guestApi.create(data);
      if (res.data.success) {
        setGuestModalOpen(false);
        loadData();
      }
    } catch (error) {
      console.error('创建嘉宾失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGuest = async (data: UpdateGuestRequest) => {
    if (!editingGuest) return;
    try {
      setSaving(true);
      const res = await guestApi.update(editingGuest.id, data);
      if (res.data.success) {
        setGuestModalOpen(false);
        setEditingGuest(null);
        loadData();
        if (detailGuest && detailGuest.id === editingGuest.id && res.data.data) {
          setDetailGuest(res.data.data);
        }
      }
    } catch (error) {
      console.error('更新嘉宾失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('确定要删除该嘉宾吗？此操作不可撤销。')) return;
    try {
      await guestApi.delete(guestId);
      loadData();
      if (detailGuest?.id === guestId) {
        setDetailModalOpen(false);
        setDetailGuest(null);
      }
    } catch (error) {
      console.error('删除嘉宾失败:', error);
    }
  };

  const handleSendEmail = async (data: SendGuestEmailRequest) => {
    if (!emailGuest) return;
    try {
      setSendingEmail(true);
      const res = await guestApi.sendEmail(emailGuest.id, data);
      if (res.data.success) {
        setEmailModalOpen(false);
        setEmailGuest(null);
      }
    } catch (error) {
      console.error('发送邮件失败:', error);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleAddHistory = async (data: CreateCollaborationHistoryRequest) => {
    if (!historyGuest) return;
    try {
      setSaving(true);
      const res = await guestApi.addHistory(historyGuest.id, data);
      if (res.data.success) {
        setHistoryModalOpen(false);
        setHistoryGuest(null);
        if (detailGuest && detailGuest.id === historyGuest.id) {
          const historyRes = await guestApi.getHistory(historyGuest.id);
          if (historyRes.data.success && historyRes.data.data) {
            setDetailGuest({ ...detailGuest, collaborationHistory: historyRes.data.data });
          }
        }
        loadData();
      }
    } catch (error) {
      console.error('添加合作记录失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHistory = async (historyId: string) => {
    if (!confirm('确定要删除这条合作记录吗？')) return;
    if (!detailGuest) return;
    try {
      await guestApi.deleteHistory(historyId);
      const historyRes = await guestApi.getHistory(detailGuest.id);
      if (historyRes.data.success && historyRes.data.data) {
        setDetailGuest({ ...detailGuest, collaborationHistory: historyRes.data.data });
      }
      loadData();
    } catch (error) {
      console.error('删除合作记录失败:', error);
    }
  };

  const handleUploadAvatar = async (file: File) => {
    if (!detailGuest) return;
    try {
      setUploadingAvatar(true);
      const res = await guestApi.uploadAvatar(detailGuest.id, file, file.name);
      if (res.data.success && res.data.data) {
        setDetailGuest({ ...detailGuest, avatarUrl: res.data.data.avatarUrl });
        loadData();
      }
    } catch (error) {
      console.error('上传头像失败:', error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!detailGuest || !confirm('确定要删除头像吗？')) return;
    try {
      await guestApi.deleteAvatar(detailGuest.id);
      setDetailGuest({ ...detailGuest, avatarUrl: undefined });
      loadData();
    } catch (error) {
      console.error('删除头像失败:', error);
    }
  };

  const openEditModal = (guest: Guest) => {
    setEditingGuest(guest);
    setGuestModalOpen(true);
    setActionMenu(null);
  };

  const openEmailModal = (guest: Guest) => {
    setEmailGuest(guest);
    setEmailModalOpen(true);
    setActionMenu(null);
  };

  const openHistoryModal = (guest: Guest) => {
    setHistoryGuest(guest);
    setHistoryModalOpen(true);
    setActionMenu(null);
  };

  const openDetailModal = async (guest: Guest) => {
    try {
      const [detailRes, historyRes] = await Promise.all([
        guestApi.getById(guest.id),
        guestApi.getHistory(guest.id),
      ]);

      if (detailRes.data.success && detailRes.data.data) {
        const fullGuest = detailRes.data.data;
        if (historyRes.data.success && historyRes.data.data) {
          fullGuest.collaborationHistory = historyRes.data.data;
        }
        setDetailGuest(fullGuest);
        setDetailModalOpen(true);
      }
    } catch (error) {
      console.error('加载嘉宾详情失败:', error);
    }
    setActionMenu(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-7 h-7 text-primary-400" />
            嘉宾管理
          </h1>
          <p className="text-muted mt-1">管理播客嘉宾信息、联系方式和合作历史</p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setEditingGuest(null);
              setGuestModalOpen(true);
            }}
            className="btn-primary"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            添加嘉宾
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="搜索嘉宾姓名、邮箱或话题..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </div>
      ) : guests.length > 0 ? (
        <>
          <div className="grid gap-4">
            {guests.map((guest) => (
              <div
                key={guest.id}
                className="glass-card p-4 hover:bg-foreground/5 transition-colors cursor-pointer group"
                onClick={() => openDetailModal(guest)}
              >
                <div className="flex items-center gap-4">
                  <AvatarDisplay
                    src={guest.avatarUrl}
                    name={guest.name}
                    size={56}
                    className="flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">{guest.name}</h3>
                      {guest.isActive ? (
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded">
                          活跃
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-muted/10 text-muted text-xs rounded">
                          已停用
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {guest.email}
                      </span>
                      {guest.phoneNumber && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {guest.phoneNumber}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        参与 {guest.participationCount} 集
                      </span>
                    </div>
                    {guest.topicAreas && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {guest.topicAreas.split(',').slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-primary-500/10 text-primary-400 text-xs rounded"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                        {guest.topicAreas.split(',').length > 3 && (
                          <span className="px-2 py-0.5 bg-foreground/5 text-muted text-xs rounded">
                            +{guest.topicAreas.split(',').length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmailModal(guest);
                          }}
                          className="p-2 rounded-lg hover:bg-foreground/10 text-muted hover:text-primary-400 transition-colors"
                          title="发送邮件"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openHistoryModal(guest);
                          }}
                          className="p-2 rounded-lg hover:bg-foreground/10 text-muted hover:text-primary-400 transition-colors"
                          title="添加合作记录"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActionMenu(actionMenu === guest.id ? null : guest.id)}
                        className="p-2 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {actionMenu === guest.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActionMenu(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-40 py-1 bg-popover border border-border rounded-lg shadow-lg z-20">
                            {canEdit && (
                              <button
                                onClick={() => openEditModal(guest)}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                编辑
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => openEmailModal(guest)}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5 flex items-center gap-2"
                              >
                                <Mail className="w-4 h-4" />
                                发送邮件
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => openHistoryModal(guest)}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5 flex items-center gap-2"
                              >
                                <History className="w-4 h-4" />
                                添加记录
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteGuest(guest.id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                删除
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="p-2 rounded-lg hover:bg-foreground/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-muted px-4">
                第 {currentPage + 1} / {totalPages} 页，共 {totalElements} 条
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                className="p-2 rounded-lg hover:bg-foreground/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <Empty
          icon={Users}
          title="暂无嘉宾"
          description={searchKeyword ? '没有找到匹配的嘉宾，试试其他关键词' : '点击上方按钮添加第一位嘉宾'}
        />
      )}

      <GuestModal
        isOpen={guestModalOpen}
        onClose={() => {
          setGuestModalOpen(false);
          setEditingGuest(null);
        }}
        guest={editingGuest}
        onSave={editingGuest ? handleUpdateGuest : handleCreateGuest}
        loading={saving}
      />

      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          setEmailGuest(null);
        }}
        guest={emailGuest}
        episodes={episodes}
        programs={programs}
        onSend={handleSendEmail}
        loading={sendingEmail}
      />

      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryGuest(null);
        }}
        guest={historyGuest}
        episodes={episodes}
        programs={programs}
        onAdd={handleAddHistory}
        loading={saving}
      />

      <GuestDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailGuest(null);
        }}
        guest={detailGuest}
        episodes={episodes}
        programs={programs}
        onEdit={() => {
          if (detailGuest) {
            setEditingGuest(detailGuest);
            setGuestModalOpen(true);
          }
        }}
        onSendEmail={() => {
          if (detailGuest) {
            setEmailGuest(detailGuest);
            setEmailModalOpen(true);
          }
        }}
        onAddHistory={() => {
          if (detailGuest) {
            setHistoryGuest(detailGuest);
            setHistoryModalOpen(true);
          }
        }}
        onDeleteHistory={handleDeleteHistory}
        onUploadAvatar={handleUploadAvatar}
        onDeleteAvatar={handleDeleteAvatar}
        uploadingAvatar={uploadingAvatar}
      />
    </div>
  );
};
