import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { Dashboard } from '@/pages/dashboard/Dashboard';
import { Programs } from '@/pages/programs/Programs';
import { ProgramDetail } from '@/pages/programs/ProgramDetail';
import { Editor } from '@/pages/editor/Editor';
import { Tasks } from '@/pages/tasks/Tasks';
import { Distribution } from '@/pages/distribution/Distribution';
import { TeamMembers } from '@/pages/team/TeamMembers';
import { TeamAudit } from '@/pages/team/TeamAudit';
import { ProfileSettings } from '@/pages/settings/ProfileSettings';
import { SecuritySettings } from '@/pages/settings/SecuritySettings';
import { EmailTemplates } from '@/pages/settings/EmailTemplates';
import { EmailLogs } from '@/pages/settings/EmailLogs';
import { ShareViewer } from '@/pages/share/ShareViewer';
import { ScheduleCalendar } from '@/pages/schedule/ScheduleCalendar';
import { useAuthStore } from '@/store/authStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, user } = useAuthStore();
  
  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const RoleProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user } = useAuthStore();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'programs',
        element: (
          <ProtectedRoute>
            <Programs />
          </ProtectedRoute>
        ),
      },
      {
        path: 'programs/:programId',
        element: (
          <ProtectedRoute>
            <ProgramDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: 'editor/:episodeId',
        element: (
          <ProtectedRoute>
            <Editor />
          </ProtectedRoute>
        ),
      },
      {
        path: 'tasks',
        element: (
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        ),
      },
      {
        path: 'schedule',
        element: (
          <ProtectedRoute>
            <ScheduleCalendar />
          </ProtectedRoute>
        ),
      },
      {
        path: 'distribution',
        element: (
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={['ADMIN', 'OPERATOR']}>
              <Distribution />
            </RoleProtectedRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: 'team/members',
        element: (
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={['ADMIN']}>
              <TeamMembers />
            </RoleProtectedRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: 'team/audit',
        element: (
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={['ADMIN']}>
              <TeamAudit />
            </RoleProtectedRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/profile',
        element: (
          <ProtectedRoute>
            <ProfileSettings />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/security',
        element: (
          <ProtectedRoute>
            <SecuritySettings />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/email-templates',
        element: (
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={['ADMIN']}>
              <EmailTemplates />
            </RoleProtectedRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/email-logs',
        element: (
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={['ADMIN']}>
              <EmailLogs />
            </RoleProtectedRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: 'share/:token',
        element: <ShareViewer />,
      },
    ],
  },
]);
