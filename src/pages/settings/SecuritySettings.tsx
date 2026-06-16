import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  Lock,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Clock,
  LogOut,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Settings,
  Loader2,
  Info,
  RefreshCw,
} from 'lucide-react';
import { Session } from '@/types';
import { userApi, sessionApi } from '@/services/api';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/time';

const parseUserAgent = (userAgent?: string) => {
  if (!userAgent) return { device: '未知设备', os: '未知系统', browser: '未知浏览器' };

  let device = '桌面设备';
  let os = '未知系统';
  let browser = '未知浏览器';

  if (userAgent.includes('iPhone') || userAgent.includes('Android') && userAgent.includes('Mobile')) {
    device = '移动设备';
  } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
    device = '平板设备';
  }

  if (userAgent.includes('Mac OS X')) os = 'macOS';
  else if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  else if (userAgent.includes('Android')) os = 'Android';

  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  return { device, os, browser };
};

const getDeviceIcon = (device: string) => {
  switch (device) {
    case '移动设备':
      return <Smartphone className="w-5 h-5" />;
    case '平板设备':
      return <Tablet className="w-5 h-5" />;
    default:
      return <Monitor className="w-5 h-5" />;
  }
};

const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: '弱', color: 'bg-error' };
  if (score <= 2) return { score, label: '一般', color: 'bg-warning' };
  if (score <= 3) return { score, label: '中等', color: 'bg-primary-500' };
  if (score <= 4) return { score, label: '强', color: 'bg-success' };
  return { score, label: '非常强', color: 'bg-success' };
};

const SecuritySettings: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const passwordStrength = useMemo(() => calculatePasswordStrength(newPassword), [newPassword]);

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch = newPassword && confirmPassword && newPassword !== confirmPassword;

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const response = await sessionApi.getAll();
      setSessions(response.data.data || []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) return;
    setPasswordChanging(true);
    setPasswordError('');
    try {
      await userApi.changePassword({ currentPassword, newPassword });
      setPasswordChanged(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordChanged(false), 3000);
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || '密码修改失败，请检查当前密码是否正确');
    } finally {
      setPasswordChanging(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await sessionApi.revoke(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
    } finally {
      setRevokingSessionId(null);
    }
  };

  const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({
    icon,
    title,
    subtitle,
  }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
    </div>
  );

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

  const PasswordInput: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    show: boolean;
    onToggleShow: () => void;
    placeholder?: string;
  }> = ({ label, value, onChange, show, onToggleShow, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field pl-12 pr-12"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors duration-200"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">安全设置</h1>
        <p className="text-muted mt-1">保护您的账户安全和隐私</p>
      </div>

      <div className="glass-card p-6">
        <SectionHeader
          icon={<Lock className="w-5 h-5" />}
          title="修改密码"
          subtitle="定期更换密码可以提高账户安全性"
        />
        {passwordChanged && (
          <div className="mb-4 flex items-center gap-2 text-success bg-success/10 px-4 py-2 rounded-lg">
            <Check className="w-5 h-5" />
            <span className="font-medium">密码修改成功</span>
          </div>
        )}
        {passwordError && (
          <div className="mb-4 flex items-center gap-2 text-error bg-error/10 px-4 py-2 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">{passwordError}</span>
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PasswordInput
              label="当前密码"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrentPassword}
              onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
              placeholder="请输入当前密码"
            />
            <div />
            <PasswordInput
              label="新密码"
              value={newPassword}
              onChange={setNewPassword}
              show={showNewPassword}
              onToggleShow={() => setShowNewPassword(!showNewPassword)}
              placeholder="请输入新密码"
            />
            <PasswordInput
              label="确认新密码"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
              placeholder="请再次输入新密码"
            />
          </div>

          {newPassword && (
            <div className="bg-card/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">密码强度</span>
                <span
                  className={cn(
                    'text-sm font-medium',
                    passwordStrength.label === '弱' && 'text-error',
                    passwordStrength.label === '一般' && 'text-warning',
                    passwordStrength.label === '中等' && 'text-primary-400',
                    passwordStrength.label === '强' && 'text-success',
                    passwordStrength.label === '非常强' && 'text-success'
                  )}
                >
                  {passwordStrength.label}
                </span>
              </div>
              <div className="flex gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-2 flex-1 rounded-full transition-all duration-300',
                      i < passwordStrength.score ? passwordStrength.color : 'bg-border'
                    )}
                  />
                ))}
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted flex items-center gap-2">
                  {newPassword.length >= 8 ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-muted" />
                  )}
                  至少 8 个字符
                </p>
                <p className="text-xs text-muted flex items-center gap-2">
                  {/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-muted" />
                  )}
                  包含大小写字母
                </p>
                <p className="text-xs text-muted flex items-center gap-2">
                  {/\d/.test(newPassword) ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-muted" />
                  )}
                  包含数字
                </p>
                <p className="text-xs text-muted flex items-center gap-2">
                  {/[^a-zA-Z0-9]/.test(newPassword) ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-muted" />
                  )}
                  包含特殊字符
                </p>
              </div>
            </div>
          )}

          {passwordsMismatch && (
            <div className="flex items-center gap-2 text-error bg-error/10 px-4 py-2 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">两次输入的密码不一致</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!currentPassword || !newPassword || !confirmPassword || !passwordsMatch || passwordChanging}
              className={cn(
                'btn-primary flex items-center gap-2',
                passwordChanging && 'opacity-70 cursor-not-allowed'
              )}
            >
              {passwordChanging ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
              {passwordChanging ? '更新中...' : '更新密码'}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">两步验证</h3>
            <span className="inline-flex items-center gap-1 text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">
              <Info className="w-3 h-3" />
              即将推出
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-card/50 rounded-xl">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                twoFactorEnabled
                  ? 'bg-success/20 text-success'
                  : 'bg-muted/20 text-muted'
              )}
            >
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {twoFactorEnabled ? '两步验证已启用' : '两步验证未启用'}
              </p>
              <p className="text-sm text-muted">
                {twoFactorEnabled
                  ? '您的账户受到双重保护'
                  : '启用后，登录时需要输入验证码'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Toggle
              checked={twoFactorEnabled}
              onChange={() => {}}
            />
            <button
              type="button"
              className="btn-secondary flex items-center gap-2 opacity-50 cursor-not-allowed"
              disabled
            >
              <Settings className="w-4 h-4" />
              设置
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <SectionHeader
            icon={<Globe className="w-5 h-5" />}
            title="活跃会话"
            subtitle={`当前有 ${sessions.length} 个活跃会话`}
          />
          <button
            type="button"
            onClick={fetchSessions}
            disabled={sessionsLoading}
            className="btn-ghost flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', sessionsLoading && 'animate-spin')} />
            刷新
          </button>
        </div>
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无活跃会话</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, index) => {
              const { device, os, browser } = parseUserAgent(session.userAgent);
              const isCurrent = index === 0;
              return (
                <div
                  key={session.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl transition-all duration-200',
                    isCurrent ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-card/50 hover:bg-card/70'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center',
                        isCurrent
                          ? 'bg-primary-500/20 text-primary-400'
                          : 'bg-muted/20 text-muted'
                      )}
                    >
                      {getDeviceIcon(device)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {os} · {browser}
                        </p>
                        {isCurrent && (
                          <span className="badge badge-success">当前设备</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {session.ipAddress || '未知 IP'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(session.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revokingSessionId === session.id}
                      className={cn(
                        'btn-ghost text-error hover:bg-error/10 hover:text-error flex items-center gap-2',
                        revokingSessionId === session.id && 'opacity-70 cursor-not-allowed'
                      )}
                    >
                      {revokingSessionId === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      强制下线
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">API 密钥管理</h3>
            <span className="inline-flex items-center gap-1 text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">
              <Info className="w-3 h-3" />
              即将推出
            </span>
          </div>
        </div>
        <div className="p-8 text-center">
          <Key className="w-12 h-12 mx-auto mb-3 text-muted opacity-50" />
          <p className="text-foreground font-medium">API 密钥管理功能即将推出</p>
          <p className="text-sm text-muted mt-1">您将可以在此创建和管理 API 访问密钥</p>
        </div>
      </div>
    </div>
  );
};

export { SecuritySettings };
