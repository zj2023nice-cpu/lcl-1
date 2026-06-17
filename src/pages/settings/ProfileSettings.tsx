import React, { useState } from 'react';
import {
  User,
  Mail,
  Clock,
  Globe,
  Bell,
  Palette,
  Languages,
  Save,
  CheckCircle2,
  Moon,
  Sun,
  Loader2,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/services/api';
import { cn } from '@/lib/utils';
import { AvatarUpload } from '@/components/AvatarUpload';

interface NotificationSettings {
  emailNotifications: boolean;
  taskUpdates: boolean;
  mentionNotifications: boolean;
}

interface InterfaceSettings {
  theme: 'dark' | 'light';
  language: 'zh' | 'en';
}

const timezones = [
  { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)' },
  { value: 'Asia/Tokyo', label: '日本标准时间 (UTC+9)' },
  { value: 'America/New_York', label: '美国东部时间 (UTC-5)' },
  { value: 'America/Los_Angeles', label: '美国西部时间 (UTC-8)' },
  { value: 'Europe/London', label: '伦敦时间 (UTC+0)' },
];

const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [avatar, setAvatar] = useState<string | null | undefined>(user?.avatarUrl);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [notifications] = useState<NotificationSettings>({
    emailNotifications: true,
    taskUpdates: true,
    mentionNotifications: true,
  });

  const [interfaceSettings, setInterfaceSettings] = useState<InterfaceSettings>({
    theme: 'dark',
    language: 'zh',
  });

  const [comingSoonToast, setComingSoonToast] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const response = await userApi.updateMe({ name });
      const updatedUser = response.data.data;
      if (updatedUser) {
        updateUser(updatedUser);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setSaveError(error.response?.data?.message || '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (newAvatarUrl: string | null) => {
    setAvatar(newAvatarUrl);
    if (user && newAvatarUrl !== undefined) {
      updateUser({ ...user, avatarUrl: newAvatarUrl || undefined });
    }
  };

  const showComingSoon = () => {
    setComingSoonToast(true);
    setTimeout(() => setComingSoonToast(false), 2000);
  };

  const toggleNotification = (_key: keyof NotificationSettings) => {
    void _key;
    showComingSoon();
  };

  const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background',
        checked ? 'bg-primary-500' : 'bg-border'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );

  const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    </div>
  );

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">个人设置</h1>
          <p className="text-muted mt-1">管理您的个人资料和偏好设置</p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 text-success bg-success/10 px-4 py-2 rounded-lg animate-slide-down">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">保存成功</span>
          </div>
        )}
        {saveError && (
          <div className="flex items-center gap-2 text-error bg-error/10 px-4 py-2 rounded-lg">
            <Info className="w-5 h-5" />
            <span className="font-medium">{saveError}</span>
          </div>
        )}
        {comingSoonToast && (
          <div className="flex items-center gap-2 text-primary-400 bg-primary-500/10 px-4 py-2 rounded-lg animate-slide-down">
            <Info className="w-5 h-5" />
            <span className="font-medium">即将推出</span>
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <SectionHeader icon={<User className="w-5 h-5" />} title="个人资料" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 flex flex-col items-center">
            <AvatarUpload avatarUrl={avatar} onAvatarChange={handleAvatarChange} />
          </div>

          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                姓名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="请输入您的姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                邮箱
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="input-field pl-12 bg-card/50 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted mt-1">邮箱地址不可修改</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                个人简介
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="input-field resize-none"
                placeholder="介绍一下自己..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                时区
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="input-field appearance-none cursor-pointer"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">通知设置</h3>
            <span className="inline-flex items-center gap-1 text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">
              <Info className="w-3 h-3" />
              即将推出
            </span>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-card/50 rounded-xl hover:bg-card/70 transition-colors duration-200">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">邮件通知</p>
                <p className="text-sm text-muted">接收重要更新的邮件提醒</p>
              </div>
            </div>
            <Toggle
              checked={notifications.emailNotifications}
              onChange={() => toggleNotification('emailNotifications')}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-card/50 rounded-xl hover:bg-card/70 transition-colors duration-200">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent-500/20 text-accent-400 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">任务更新通知</p>
                <p className="text-sm text-muted">当您负责的任务状态变更时通知</p>
              </div>
            </div>
            <Toggle
              checked={notifications.taskUpdates}
              onChange={() => toggleNotification('taskUpdates')}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-card/50 rounded-xl hover:bg-card/70 transition-colors duration-200">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-success/20 text-success flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">标注提及通知</p>
                <p className="text-sm text-muted">当您在标注中被提及时通知</p>
              </div>
            </div>
            <Toggle
              checked={notifications.mentionNotifications}
              onChange={() => toggleNotification('mentionNotifications')}
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">界面设置</h3>
            <span className="inline-flex items-center gap-1 text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">
              <Info className="w-3 h-3" />
              即将推出
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              <Palette className="w-4 h-4 inline mr-2" />
              主题
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setInterfaceSettings((prev) => ({ ...prev, theme: 'dark' }));
                  showComingSoon();
                }}
                className={cn(
                  'flex-1 p-4 rounded-xl border-2 transition-all duration-200',
                  interfaceSettings.theme === 'dark'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-border bg-card/50 hover:border-muted'
                )}
              >
                <Moon className={cn(
                  'w-6 h-6 mx-auto mb-2',
                  interfaceSettings.theme === 'dark' ? 'text-primary-400' : 'text-muted'
                )} />
                <p className={cn(
                  'font-medium',
                  interfaceSettings.theme === 'dark' ? 'text-primary-400' : 'text-foreground'
                )}>深色模式</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInterfaceSettings((prev) => ({ ...prev, theme: 'light' }));
                  showComingSoon();
                }}
                className={cn(
                  'flex-1 p-4 rounded-xl border-2 transition-all duration-200',
                  interfaceSettings.theme === 'light'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-border bg-card/50 hover:border-muted'
                )}
              >
                <Sun className={cn(
                  'w-6 h-6 mx-auto mb-2',
                  interfaceSettings.theme === 'light' ? 'text-primary-400' : 'text-muted'
                )} />
                <p className={cn(
                  'font-medium',
                  interfaceSettings.theme === 'light' ? 'text-primary-400' : 'text-foreground'
                )}>浅色模式</p>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              <Languages className="w-4 h-4 inline mr-2" />
              语言
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setInterfaceSettings((prev) => ({ ...prev, language: 'zh' }));
                  showComingSoon();
                }}
                className={cn(
                  'flex-1 p-4 rounded-xl border-2 transition-all duration-200',
                  interfaceSettings.language === 'zh'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-border bg-card/50 hover:border-muted'
                )}
              >
                <span className={cn(
                  'text-2xl block mb-2',
                  interfaceSettings.language === 'zh' ? 'text-primary-400' : 'text-muted'
                )}>🇨🇳</span>
                <p className={cn(
                  'font-medium',
                  interfaceSettings.language === 'zh' ? 'text-primary-400' : 'text-foreground'
                )}>中文</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInterfaceSettings((prev) => ({ ...prev, language: 'en' }));
                  showComingSoon();
                }}
                className={cn(
                  'flex-1 p-4 rounded-xl border-2 transition-all duration-200',
                  interfaceSettings.language === 'en'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-border bg-card/50 hover:border-muted'
                )}
              >
                <span className={cn(
                  'text-2xl block mb-2',
                  interfaceSettings.language === 'en' ? 'text-primary-400' : 'text-muted'
                )}>🇺🇸</span>
                <p className={cn(
                  'font-medium',
                  interfaceSettings.language === 'en' ? 'text-primary-400' : 'text-foreground'
                )}>English</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'btn-primary flex items-center gap-2',
            saving && 'opacity-70 cursor-not-allowed'
          )}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
};

export { ProfileSettings };
