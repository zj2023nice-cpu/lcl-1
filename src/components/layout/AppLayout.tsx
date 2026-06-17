import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const isAuthPage = location.pathname.startsWith('/login') || 
                     location.pathname.startsWith('/forgot-password') || 
                     location.pathname.startsWith('/register') ||
                     location.pathname.startsWith('/invite/') ||
                     location.pathname.startsWith('/share/');

  if (isAuthPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm px-6 lg:px-8 py-4 flex items-center justify-between theme-transition">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground hidden sm:block">播客协作平台</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
