import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

const api: AxiosInstance = axios.create({
  baseURL: '/',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers && token) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await useAuthStore.getState().refreshAccessToken();
        const newToken = useAuthStore.getState().accessToken;
        processQueue(null, newToken);
        if (originalRequest.headers && newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

import { User, Session, ApiResponse } from '@/types';

export default api;
export { api };

export const taskApi = {
  getAll: (params?: { status?: string; priority?: string; assigneeId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.assigneeId) query.set('assigneeId', params.assigneeId);
    const qs = query.toString();
    return api.get(`/api/tasks${qs ? '?' + qs : ''}`);
  },
  create: (data: { title: string; description?: string; priority?: string; assigneeId?: string; dueDate?: string }) => api.post('/api/tasks', data),
  getById: (id: string) => api.get(`/api/tasks/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: Record<string, any>) => api.put(`/api/tasks/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/api/tasks/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
};

export const teamApi = {
  getMembers: (teamId: string) => api.get(`/api/teams/${teamId}/members`),
  inviteMember: (teamId: string, data: { email: string; role: string }) => api.post(`/api/teams/${teamId}/invite`, data),
  updateMemberRole: (teamId: string, userId: string, role: string) => api.put(`/api/teams/${teamId}/members/${userId}/role`, { role }),
  removeMember: (teamId: string, userId: string) => api.delete(`/api/teams/${teamId}/members/${userId}`),
};

export const auditApi = {
  getLogs: (params?: { action?: string; userId?: string; startTime?: string; endTime?: string }) => {
    const query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.userId) query.set('userId', params.userId);
    if (params?.startTime) query.set('startTime', params.startTime);
    if (params?.endTime) query.set('endTime', params.endTime);
    const qs = query.toString();
    return api.get(`/api/audit/logs${qs ? '?' + qs : ''}`);
  },
};

export const sessionApi = {
  getAll: () => api.get<ApiResponse<Session[]>>('/api/sessions'),
  revoke: (id: string) => api.delete<ApiResponse<null>>(`/api/sessions/${id}`),
};

export const userApi = {
  getMe: () => api.get<ApiResponse<User>>('/api/users/me'),
  updateMe: (data: { name?: string; avatar?: string }) => api.put<ApiResponse<User>>('/api/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<ApiResponse<null>>('/api/users/me/password', data),
};

export const dashboardApi = {
  getStats: () => api.get('/api/dashboard/stats'),
};

export const programApi = {
  getAll: () => api.get('/api/programs'),
  getById: (id: string) => api.get(`/api/programs/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/api/programs', data),
  update: (id: string, data: { name?: string; description?: string }) => api.put(`/api/programs/${id}`, data),
  delete: (id: string) => api.delete(`/api/programs/${id}`),
};

export const episodeApi = {
  getByProgram: (programId: string) => api.get(`/api/programs/${programId}/episodes`),
  create: (programId: string, data: { title: string; description?: string }) => api.post(`/api/programs/${programId}/episodes`, data),
  getById: (id: string) => api.get(`/api/episodes/${id}`),
  update: (id: string, data: { title?: string; description?: string; status?: string }) => api.put(`/api/episodes/${id}`, data),
  delete: (id: string) => api.delete(`/api/episodes/${id}`),
};
