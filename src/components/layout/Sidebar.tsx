import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Radio, 
  ListTodo, 
  Share2, 
  Users, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Mic2,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useThemeContext } from '@/context/ThemeContext';
import { ThemeMode } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: '仪表盘', roles: ['ADMIN', 'PRODUCER', 'EDITOR', 'OPERATOR', 'HOST'] },
  { path: '/programs', icon: Radio, label: '节目管理', roles: ['ADMIN', 'PRODUCER', 'EDITOR', 'OPERATOR', 'HOST'] },
  { path: '/tasks', icon: ListTodo, label: '任务管理', roles: ['ADMIN', 'PRODUCER', 'EDITOR', 'OPERATOR', 'HOST'] },
  { path: '/distribution', icon: Share2, label: '分发管理', roles: ['ADMIN', 'OPERATOR'] },
  { path: '/team/members', icon: Users, label: '团队管理', roles: ['ADMIN'] },
  { path: '/settings/profile', icon: Settings, label: '个人设置', roles: ['ADMIN', 'PRODUCER', 'EDITOR', 'OPERATOR', 'HOST'] },
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, logout } = useAuthStore();
  const { themeMode, setTheme } = useThemeContext();
  const navigate = useNavigate();

  const hasAccess = (roles: string[]) => {
    return user?.role ? roles.includes(user.role) : false;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'auto'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setTheme(modes[nextIndex]);
  };

  const getThemeIcon = () => {
    if (themeMode === 'light') return <Sun className="w-5 h-5" />;
    if (themeMode === 'dark') return <Moon className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  const getThemeTooltip = () => {
    if (themeMode === 'light') return '浅色模式';
    if (themeMode === 'dark') return '深色模式';
    return '跟随系统';
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-40',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        <div className={cn(
          'flex items-center h-16 border-b border-border px-4',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Mic2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg">播客协作</h1>
                <p className="text-xs text-muted">Podcast Collab</p>
              </div>
            </div>
          )}
          
          {isCollapsed && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Mic2 className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.filter(item => hasAccess(item.roles)).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group',
                  isActive
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-muted hover:text-foreground hover:bg-foreground/5',
                  isCollapsed && 'justify-center'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-card border border-border rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          {!isCollapsed && user && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-foreground/5 mb-3">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                alt={user.name}
                className="w-10 h-10 rounded-full border-2 border-primary-500/50"
              />
              <div className="min-w-0">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted truncate">{user.email}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              className="flex-1 p-2 rounded-lg hover:bg-foreground/5 transition-colors flex items-center justify-center text-muted"
              title={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            <button
              onClick={cycleTheme}
              className="flex-1 p-2 rounded-lg hover:bg-foreground/5 transition-colors flex items-center justify-center text-muted hover:text-primary-400"
              title={getThemeTooltip()}
            >
              {getThemeIcon()}
            </button>
            
            {isCollapsed ? (
              <button
                onClick={handleLogout}
                className="flex-1 p-2 rounded-lg hover:bg-foreground/5 transition-colors flex items-center justify-center text-muted hover:text-error"
                title="退出登录"
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-error/10 transition-colors text-muted hover:text-error"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm">退出</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
