import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Copy,
  RefreshCw,
  MoreHorizontal,
  Edit,
  UserMinus,
  X,
  Check,
  Search,
  Shield,
  Crown,
  Film,
  Radio,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { teamApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { User, UserRole } from '@/types';
import { formatDate } from '@/utils/time';
import { cn } from '@/lib/utils';

const roleConfig: Record<UserRole, { label: string; className: string; icon: React.ElementType }> = {
  ADMIN: { label: '管理员', className: 'badge-error', icon: Crown },
  PRODUCER: { label: '制作人', className: 'badge-primary', icon: Shield },
  EDITOR: { label: '剪辑师', className: 'badge-warning', icon: Film },
  OPERATOR: { label: '运营', className: 'badge-success', icon: TrendingUp },
  HOST: { label: '主播', className: 'badge-muted', icon: Radio },
  GUEST: { label: '访客', className: 'badge-muted', icon: Users },
};

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: UserRole) => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, onInvite }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('EDITOR');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onInvite(email.trim(), role);
    setEmail('');
    setRole('EDITOR');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md mx-4 animate-bounce-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary-400" />
            邀请新成员
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
            <label className="block text-sm font-medium text-foreground mb-1">邮箱地址 *</label>
            <input
              type="email"
              className="input-field"
              placeholder="输入成员邮箱..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">角色</label>
            <select
              className="input-field"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="ADMIN">管理员</option>
              <option value="PRODUCER">制作人</option>
              <option value="EDITOR">剪辑师</option>
              <option value="OPERATOR">运营</option>
              <option value="HOST">主播</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!email.trim()}
            >
              发送邀请
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface RoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: User | null;
  onConfirm: (role: UserRole) => void;
}

const RoleChangeModal: React.FC<RoleChangeModalProps> = ({ isOpen, onClose, member, onConfirm }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('EDITOR');

  React.useEffect(() => {
    if (member) {
      setSelectedRole(member.role);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md mx-4 animate-bounce-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary-400" />
            更改成员角色
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-lg">
            <img
              src={member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`}
              alt={member.name}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <p className="font-medium text-foreground">{member.name}</p>
              <p className="text-sm text-muted">{member.email}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">选择新角色</label>
            <div className="grid grid-cols-1 gap-2">
              {(['ADMIN', 'PRODUCER', 'EDITOR', 'OPERATOR', 'HOST'] as UserRole[]).map((r) => {
                const config = roleConfig[r];
                const Icon = config.icon;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                      selectedRole === r
                        ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                        : 'border-border hover:bg-foreground/5 text-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{config.label}</span>
                    {selectedRole === r && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(selectedRole);
                onClose();
              }}
              className="btn-primary"
              disabled={selectedRole === member.role}
            >
              确认更改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: User | null;
  onConfirm: () => void;
}

const RemoveMemberModal: React.FC<RemoveMemberModalProps> = ({ isOpen, onClose, member, onConfirm }) => {
  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md mx-4 animate-bounce-in">
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-error" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">确认移除成员</h2>
          <p className="text-muted mb-4">
            您确定要移除 <span className="text-foreground font-medium">{member.name}</span> 吗？
            此操作不可撤销。
          </p>

          <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-lg mb-6">
            <img
              src={member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`}
              alt={member.name}
              className="w-10 h-10 rounded-full"
            />
            <div className="text-left">
              <p className="font-medium text-foreground">{member.name}</p>
              <p className="text-sm text-muted">{member.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="btn-primary bg-gradient-to-r from-error to-error/80 hover:from-error/90 hover:to-error/70"
            >
              确认移除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TeamMembers: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [inviteLink, setInviteLink] = useState('https://podcast-collab.app/invite/abc123xyz');
  const [copied, setCopied] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const fetchMembers = useCallback(async () => {
    if (!user?.teamId) return;
    try {
      setLoading(true);
      const res = await teamApi.getMembers(user.teamId);
      setMembers(res.data.data || []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.teamId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        roleConfig[member.role]?.label.toLowerCase().includes(query)
      );
    });
  }, [members, searchQuery]);

  const handleInvite = async (email: string, role: UserRole) => {
    if (!user?.teamId) return;
    try {
      await teamApi.inviteMember(user.teamId, { email, role });
      fetchMembers();
    } catch {
      // error handled silently
    }
  };

  const handleRoleChange = async (role: UserRole) => {
    if (!selectedMember || !user?.teamId) return;
    try {
      await teamApi.updateMemberRole(user.teamId, selectedMember.id, role);
      setMembers(members.map((m) =>
        m.id === selectedMember.id ? { ...m, role } : m
      ));
    } catch {
      // error handled silently
    }
  };

  const handleRemove = async () => {
    if (!selectedMember || !user?.teamId) return;
    try {
      await teamApi.removeMember(user.teamId, selectedMember.id);
      setMembers(members.filter((m) => m.id !== selectedMember.id));
    } catch {
      // error handled silently
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateLink = () => {
    const random = Math.random().toString(36).substring(2, 15);
    setInviteLink(`https://podcast-collab.app/invite/${random}`);
  };

  const openRoleModal = (member: User) => {
    setSelectedMember(member);
    setShowRoleModal(true);
  };

  const openRemoveModal = (member: User) => {
    setSelectedMember(member);
    setShowRemoveModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="glass-card p-12 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2">无权限访问</h3>
        <p className="text-muted">此页面仅管理员可访问</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">团队成员</h1>
          <p className="text-muted mt-1">管理团队成员和权限</p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowInviteModal(true)}
        >
          <UserPlus className="w-4 h-4" />
          邀请成员
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="搜索成员姓名、邮箱或角色..."
              className="input-field pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-400" />
            邀请链接
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 p-3 bg-foreground/5 rounded-lg border border-border">
            <span className="text-muted text-sm truncate flex-1">{inviteLink}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="btn-secondary flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制链接'}
            </button>
            <button
              onClick={handleRegenerateLink}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              重新生成
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-sm font-medium text-muted">成员</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted">角色</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted">加入时间</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted">状态</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => {
                  const role = roleConfig[member.role];
                  const RoleIcon = role.icon;
                  return (
                    <tr
                      key={member.id}
                      className="border-b border-border/50 hover:bg-foreground/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`}
                            alt={member.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-sm text-muted">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', role.className)}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {role.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {formatDate(member.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', member.isActive ? 'badge-success' : 'badge-muted')}>
                          {member.isActive ? '活跃' : '未激活'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                const menu = e.currentTarget.nextElementSibling;
                                menu?.classList.toggle('hidden');
                              }}
                              className="p-2 rounded-lg hover:bg-foreground/10 text-muted hover:text-foreground transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            <div className="hidden absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRoleModal(member);
                                  e.currentTarget.parentElement?.classList.add('hidden');
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-foreground/10 flex items-center gap-2 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                                更改角色
                              </button>
                              {member.id !== user?.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRemoveModal(member);
                                    e.currentTarget.parentElement?.classList.add('hidden');
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-foreground/10 flex items-center gap-2 transition-colors text-error"
                                >
                                  <UserMinus className="w-4 h-4" />
                                  移除成员
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-muted opacity-50" />
                    <p className="text-muted">
                      {searchQuery ? '未找到匹配的成员' : '暂无成员'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />

      <RoleChangeModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        member={selectedMember}
        onConfirm={handleRoleChange}
      />

      <RemoveMemberModal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        member={selectedMember}
        onConfirm={handleRemove}
      />
    </div>
  );
};

export { TeamMembers };
