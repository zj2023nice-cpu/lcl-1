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

import { User, Session, ApiResponse, DistributionRecord, DistributionPlatform, Notification, EpisodeSortRequest, EpisodeSortUndoRequest, EpisodeSortResult, EmailTemplate, EmailLog, EmailPreviewRequest, EmailPreviewResponse, TestEmailRequest, EmailStats, Subtitle, SubtitleCue, SubtitleGenerateRequest, SubtitleCueUpdateRequest, SubtitleBatchUpdateRequest, AudioEnhancementTask, AudioEnhancementItem, AudioEnhancementRequest, ScheduleItem, ScheduleConflict, Episode, Guest, GuestCollaborationHistory, CreateGuestRequest, UpdateGuestRequest, CreateCollaborationHistoryRequest, SendGuestEmailRequest, GuestEmailResponse, GuestStats, ShareComment, PaginatedComments, CreateShareCommentRequest, UpdateShareCommentRequest, ReportCommentRequest, ListShareCommentsParams, ReportRecord } from '@/types';
import {
  mockShareComments,
  mockReportRecords,
  filterAndSortComments,
  paginateComments,
} from '@/mock/data';

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
  updateMe: (data: { name?: string; avatarUrl?: string }) => api.put<ApiResponse<User>>('/api/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<ApiResponse<null>>('/api/users/me/password', data),
  uploadAvatar: (
    file: Blob,
    filename: string,
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file, filename);
    return api.post<ApiResponse<User>>('/api/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },
  deleteAvatar: () => api.delete<ApiResponse<User>>('/api/users/me/avatar'),
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
  getAll: () => api.get<ApiResponse<Episode[]>>('/api/episodes/all'),
  create: (programId: string, data: { title: string; description?: string }) => api.post(`/api/programs/${programId}/episodes`, data),
  getById: (id: string) => api.get(`/api/episodes/${id}`),
  update: (id: string, data: { title?: string; description?: string; status?: string; publishDate?: string | null }) => api.put(`/api/episodes/${id}`, data),
  delete: (id: string) => api.delete(`/api/episodes/${id}`),
  updateSort: (programId: string, data: EpisodeSortRequest) => 
    api.put<ApiResponse<EpisodeSortResult>>(`/api/programs/${programId}/episodes/sort`, data),
  undoSort: (programId: string, data: EpisodeSortUndoRequest) => 
    api.post<ApiResponse<EpisodeSortResult>>(`/api/programs/${programId}/episodes/sort/undo`, data),
  canUndoSort: (programId: string) => 
    api.get<ApiResponse<boolean>>(`/api/programs/${programId}/episodes/sort/can-undo`),
};

export const annotationReplyApi = {
  getReplies: (annotationId: string, params: { teamId: string; page?: number; size?: number; sort?: 'asc' | 'desc' }) => {
    const query = new URLSearchParams();
    query.set('teamId', params.teamId);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);
    const qs = query.toString();
    return api.get(`/api/annotations/${annotationId}/replies?${qs}`);
  },
  createReply: (annotationId: string, teamId: string, data: { content: string; parentId?: string; quotedReplyId?: string }) => {
    return api.post(`/api/annotations/${annotationId}/replies?teamId=${teamId}`, data);
  },
  getChildReplies: (annotationId: string, parentId: string, params: { teamId: string; page?: number; size?: number; sort?: 'asc' | 'desc' }) => {
    const query = new URLSearchParams();
    query.set('teamId', params.teamId);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sort) query.set('sort', params.sort);
    const qs = query.toString();
    return api.get(`/api/annotations/${annotationId}/replies/${parentId}/children?${qs}`);
  },
};

export const audioVersionApi = {
  getByEpisode: (episodeId: string) => api.get(`/api/episodes/${episodeId}/versions`),
  getById: (versionId: string) => api.get(`/api/audio-versions/${versionId}`),
  rollback: (episodeId: string, data: { targetVersionId: string; reason?: string }) =>
    api.post(`/api/episodes/${episodeId}/rollback`, data),
  markCorrupted: (versionId: string, data: { reason: string }) =>
    api.post(`/api/audio-versions/${versionId}/mark-corrupted`, data),
  getRollbackLogs: (episodeId: string) => api.get(`/api/episodes/${episodeId}/rollback-logs`),
};

export const distributionApi = {
  getPlatforms: (teamId: string) => 
    api.get<ApiResponse<DistributionPlatform[]>>(`/api/distribution/platforms?teamId=${teamId}`),
  
  getRecords: (params: { teamId: string; episodeId?: string; platformId?: string; status?: string }) => {
    const query = new URLSearchParams();
    query.set('teamId', params.teamId);
    if (params.episodeId) query.set('episodeId', params.episodeId);
    if (params.platformId) query.set('platformId', params.platformId);
    if (params.status) query.set('status', params.status);
    return api.get<ApiResponse<DistributionRecord[]>>(`/api/distribution/records?${query.toString()}`);
  },
  
  getRecordById: (id: string, teamId: string) => 
    api.get<ApiResponse<DistributionRecord>>(`/api/distribution/records/${id}?teamId=${teamId}`),
  
  getProgress: (id: string, teamId: string) => 
    api.get<ApiResponse<DistributionRecord>>(`/api/distribution/records/${id}/progress?teamId=${teamId}`),
  
  getEpisodeStatus: (episodeId: string, teamId: string) => 
    api.get<ApiResponse<DistributionRecord[]>>(`/api/distribution/episode/${episodeId}/status?teamId=${teamId}`),
  
  createBatch: (data: { episodeId: string; platformIds: string[]; metadata?: Record<string, unknown> }, teamId: string) =>
    api.post<ApiResponse<DistributionRecord[]>>(`/api/distribution/batch?teamId=${teamId}`, data),
  
  retry: (id: string, teamId: string) =>
    api.post<ApiResponse<DistributionRecord>>(`/api/distribution/records/${id}/retry?teamId=${teamId}`),
  
  retryBatch: (recordIds: string[], teamId: string) =>
    api.post<ApiResponse<DistributionRecord[]>>(`/api/distribution/batch/retry?teamId=${teamId}`, { recordIds }),
  
  cancel: (id: string, teamId: string) =>
    api.post<ApiResponse<DistributionRecord>>(`/api/distribution/records/${id}/cancel?teamId=${teamId}`),
  
  cancelBatch: (recordIds: string[], teamId: string) =>
    api.post<ApiResponse<DistributionRecord[]>>(`/api/distribution/batch/cancel?teamId=${teamId}`, { recordIds }),
  
  updateStatus: (id: string, teamId: string, data: { status: string; publishUrl?: string; errorMessage?: string }) =>
    api.patch<ApiResponse<DistributionRecord>>(`/api/distribution/records/${id}/status?teamId=${teamId}`, data),
};

export const notificationApi = {
  getMyNotifications: (teamId: string) =>
    api.get<ApiResponse<Notification[]>>(`/api/notifications?teamId=${teamId}`),
  
  getUnreadCount: (teamId: string) =>
    api.get<ApiResponse<number>>(`/api/notifications/unread-count?teamId=${teamId}`),
  
  markAsRead: (id: string, teamId: string) =>
    api.patch<ApiResponse<null>>(`/api/notifications/${id}/read?teamId=${teamId}`),
  
  markAllAsRead: (teamId: string) =>
    api.patch<ApiResponse<null>>(`/api/notifications/read-all?teamId=${teamId}`),
};

export const emailTemplateApi = {
  getAll: () =>
    api.get<ApiResponse<EmailTemplate[]>>('/api/email/templates'),

  getById: (id: string) =>
    api.get<ApiResponse<EmailTemplate>>(`/api/email/templates/${id}`),

  create: (data: Partial<EmailTemplate>) =>
    api.post<ApiResponse<EmailTemplate>>('/api/email/templates', data),

  update: (id: string, data: Partial<EmailTemplate>) =>
    api.put<ApiResponse<EmailTemplate>>(`/api/email/templates/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/email/templates/${id}`),

  preview: (data: EmailPreviewRequest) =>
    api.post<ApiResponse<EmailPreviewResponse>>('/api/email/templates/preview', data),

  sendTest: (id: string, data: TestEmailRequest) =>
    api.post<ApiResponse<null>>(`/api/email/templates/${id}/test`, data),
};

export const emailLogApi = {
  getLogs: (params: { page?: number; size?: number; status?: string; templateKey?: string }) => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    if (params.status) query.set('status', params.status);
    if (params.templateKey) query.set('templateKey', params.templateKey);
    const qs = query.toString();
    return api.get<ApiResponse<{ content: EmailLog[]; totalElements: number; totalPages: number }>>(
      `/api/email/logs${qs ? '?' + qs : ''}`
    );
  },

  getById: (id: string) =>
    api.get<ApiResponse<EmailLog>>(`/api/email/logs/${id}`),

  retry: (id: string) =>
    api.post<ApiResponse<null>>(`/api/email/logs/${id}/retry`),

  getStats: () =>
    api.get<ApiResponse<EmailStats>>('/api/email/logs/stats'),
};

export const subtitleApi = {
  generate: (data: SubtitleGenerateRequest) =>
    api.post<ApiResponse<Subtitle>>('/api/subtitles/generate', data),

  getByAudioVersion: (audioVersionId: string, teamId: string) =>
    api.get<ApiResponse<Subtitle[]>>(`/api/subtitles/audio-version/${audioVersionId}?teamId=${teamId}`),

  getByEpisode: (episodeId: string, teamId: string) =>
    api.get<ApiResponse<Subtitle[]>>(`/api/subtitles/episode/${episodeId}?teamId=${teamId}`),

  getById: (id: string, teamId: string, includeCues = true) =>
    api.get<ApiResponse<Subtitle>>(`/api/subtitles/${id}?teamId=${teamId}&includeCues=${includeCues}`),

  updateStatus: (id: string, teamId: string, status: string) =>
    api.put<ApiResponse<Subtitle>>(`/api/subtitles/${id}/status?teamId=${teamId}&status=${status}`),

  updateCue: (cueId: string, teamId: string, data: SubtitleCueUpdateRequest) =>
    api.put<ApiResponse<SubtitleCue>>(`/api/subtitles/cues/${cueId}?teamId=${teamId}`, data),

  batchUpdateCues: (subtitleId: string, teamId: string, data: SubtitleBatchUpdateRequest) =>
    api.put<ApiResponse<SubtitleCue[]>>(`/api/subtitles/${subtitleId}/cues/batch?teamId=${teamId}`, data),

  addCue: (subtitleId: string, teamId: string, data: SubtitleCueUpdateRequest) =>
    api.post<ApiResponse<SubtitleCue>>(`/api/subtitles/${subtitleId}/cues?teamId=${teamId}`, data),

  deleteCue: (cueId: string, teamId: string) =>
    api.delete<ApiResponse<null>>(`/api/subtitles/cues/${cueId}?teamId=${teamId}`),

  mergeCues: (teamId: string, cueIds: string[]) =>
    api.post<ApiResponse<SubtitleCue[]>>(`/api/subtitles/cues/merge?teamId=${teamId}`, cueIds),

  splitCue: (cueId: string, teamId: string, splitTime: number) =>
    api.post<ApiResponse<SubtitleCue[]>>(`/api/subtitles/cues/${cueId}/split?teamId=${teamId}&splitTime=${splitTime}`),

  export: (id: string, teamId: string, format: 'SRT' | 'VTT' = 'SRT', includeSpeaker = true, speakerSeparator = ': ') =>
    api.get(`/api/subtitles/${id}/export?teamId=${teamId}&format=${format}&includeSpeaker=${includeSpeaker}&speakerSeparator=${encodeURIComponent(speakerSeparator)}`, {
      responseType: 'blob',
    }),

  getSupportedLanguages: () =>
    api.get<ApiResponse<string[]>>('/api/subtitles/languages'),

  delete: (id: string, teamId: string) =>
    api.delete<ApiResponse<null>>(`/api/subtitles/${id}?teamId=${teamId}`),

  getCuesByTime: (id: string, teamId: string, time: number) =>
    api.get<ApiResponse<SubtitleCue[]>>(`/api/subtitles/${id}/cues/by-time?teamId=${teamId}&time=${time}`),
};

export const audioEnhancementApi = {
  createTask: (data: AudioEnhancementRequest) =>
    api.post<ApiResponse<AudioEnhancementTask>>('/api/audio/enhance', data),

  getTask: (taskId: string, teamId: string) =>
    api.get<ApiResponse<AudioEnhancementTask>>(`/api/audio/enhance/${taskId}?teamId=${teamId}`),

  getTaskItems: (taskId: string, teamId: string) =>
    api.get<ApiResponse<AudioEnhancementItem[]>>(`/api/audio/enhance/${taskId}/items?teamId=${teamId}`),

  getTasksByEpisode: (episodeId: string, teamId: string) =>
    api.get<ApiResponse<AudioEnhancementTask[]>>(`/api/audio/episode/${episodeId}/enhance?teamId=${teamId}`),

  getTasksByTeam: (teamId: string) =>
    api.get<ApiResponse<AudioEnhancementTask[]>>(`/api/audio/enhance/team?teamId=${teamId}`),
};

export const scheduleApi = {
  getSchedule: (startDate: string, endDate: string, includeEpisodes = true, includeTasks = true) =>
    api.get<ApiResponse<ScheduleItem[]>>(`/api/schedule?startDate=${startDate}&endDate=${endDate}&includeEpisodes=${includeEpisodes}&includeTasks=${includeTasks}`),

  getAllScheduled: () =>
    api.get<ApiResponse<ScheduleItem[]>>('/api/schedule/all'),

  getConflicts: (startDate: string, endDate: string) =>
    api.get<ApiResponse<ScheduleConflict[]>>(`/api/schedule/conflicts?startDate=${startDate}&endDate=${endDate}`),

  checkDateConflict: (date: string, excludeEpisodeId?: string) => {
    let url = `/api/schedule/conflicts/check?date=${date}`;
    if (excludeEpisodeId) url += `&excludeEpisodeId=${excludeEpisodeId}`;
    return api.get<ApiResponse<ScheduleConflict>>(url);
  },

  updateEpisodePublishDate: (episodeId: string, publishDate?: string) =>
    api.put<ApiResponse<Episode>>(`/api/schedule/episodes/${episodeId}/publish-date`, { publishDate }),

  updateTaskDueDate: (taskId: string, dueDate?: string) =>
    api.patch<ApiResponse<ScheduleItem>>(`/api/schedule/tasks/${taskId}/due-date`, { dueDate }),

  getUpcomingReminders: (daysAhead = 7) =>
    api.get<ApiResponse<ScheduleItem[]>>(`/api/schedule/upcoming?daysAhead=${daysAhead}`),
};

export const guestApi = {
  getAll: (params?: { keyword?: string; page?: number; size?: number; sortBy?: string; sortDir?: string }) => {
    const query = new URLSearchParams();
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortDir) query.set('sortDir', params.sortDir);
    const qs = query.toString();
    return api.get<ApiResponse<{ content: Guest[]; totalElements: number; totalPages: number; currentPage: number; pageSize: number }>>(
      `/api/guests${qs ? '?' + qs : ''}`
    );
  },

  getActive: () =>
    api.get<ApiResponse<Guest[]>>('/api/guests/active'),

  getStats: () =>
    api.get<ApiResponse<GuestStats>>('/api/guests/stats'),

  getById: (id: string) =>
    api.get<ApiResponse<Guest>>(`/api/guests/${id}`),

  create: (data: CreateGuestRequest) =>
    api.post<ApiResponse<Guest>>('/api/guests', data),

  update: (id: string, data: UpdateGuestRequest) =>
    api.put<ApiResponse<Guest>>(`/api/guests/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/guests/${id}`),

  uploadAvatar: (
    id: string,
    file: Blob,
    filename: string,
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file, filename);
    return api.post<ApiResponse<{ avatarUrl: string }>>(`/api/guests/${id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },

  deleteAvatar: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/guests/${id}/avatar`),

  sendEmail: (id: string, data: SendGuestEmailRequest) =>
    api.post<ApiResponse<GuestEmailResponse>>(`/api/guests/${id}/send-email`, data),

  getHistory: (guestId: string) =>
    api.get<ApiResponse<GuestCollaborationHistory[]>>(`/api/guests/${guestId}/history`),

  addHistory: (guestId: string, data: CreateCollaborationHistoryRequest) =>
    api.post<ApiResponse<GuestCollaborationHistory>>(`/api/guests/${guestId}/history`, data),

  deleteHistory: (historyId: string) =>
    api.delete<ApiResponse<null>>(`/api/guests/history/${historyId}`),
};

let localComments = [...mockShareComments];
let localReports = [...mockReportRecords];
let localNotifications: Array<{ id: string; type: string; message: string; timestamp: string; read: boolean }> = [];

const generateId = () => Math.random().toString(36).substr(2, 9);

export const shareCommentApi = {
  listComments: async (shareId: string, params: ListShareCommentsParams = {}): Promise<ApiResponse<PaginatedComments>> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const page = params.page || 1;
    const pageSize = params.pageSize || 5;
    const sort = params.sort || 'PINNED_FIRST';
    const includeReplies = params.includeReplies !== false;

    const allForShare = localComments.filter(c => c.shareId === shareId);

    const filtered = filterAndSortComments(allForShare, {
      sort,
      status: params.status,
      includeReplies: false,
      searchQuery: params.searchQuery,
    });

    const parentComments = filtered.filter(c => !c.parentId);
    const total = parentComments.length;
    const totalPages = Math.ceil(total / pageSize);
    const items = paginateComments(parentComments, page, pageSize);

    const itemsWithReplies = items.map(comment => {
      if (includeReplies) {
        const replies = allForShare
          .filter(c => c.parentId === comment.id && c.status === 'APPROVED')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return { ...comment, replies };
      }
      return comment;
    });

    const pinnedComments = allForShare.filter(c => c.isPinned && !c.parentId && c.status === 'APPROVED');

    return {
      success: true,
      data: {
        items: itemsWithReplies,
        page,
        pageSize,
        total,
        totalPages,
        pinnedComments,
        stats: {
          totalCount: allForShare.filter(c => !c.parentId).length,
          pendingCount: allForShare.filter(c => c.status === 'PENDING' && !c.parentId).length,
          approvedCount: allForShare.filter(c => c.status === 'APPROVED' && !c.parentId).length,
          rejectedCount: allForShare.filter(c => c.status === 'REJECTED' && !c.parentId).length,
          reportedCount: allForShare.filter(c => c.reportCount > 0 && !c.parentId).length,
        },
      },
    };
  },

  createComment: async (data: CreateShareCommentRequest): Promise<ApiResponse<ShareComment>> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newComment: ShareComment = {
      id: generateId(),
      shareId: data.shareId,
      episodeId: data.episodeId,
      parentId: data.parentId,
      content: data.content,
      status: 'PENDING',
      isPinned: false,
      likeCount: 0,
      replyCount: 0,
      reportCount: 0,
      createdByName: data.guestNickname || '匿名听众',
      createdByAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${generateId()}`,
      isGuest: true,
      guestNickname: data.guestNickname,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likedByMe: false,
      replies: [],
    };

    localComments.unshift(newComment);

    if (data.parentId) {
      const parent = localComments.find(c => c.id === data.parentId);
      if (parent) {
        parent.replyCount = (parent.replyCount || 0) + 1;
      }
    }

    localNotifications.push({
      id: generateId(),
      type: 'NEW_COMMENT',
      message: `收到新评论：${data.content.substring(0, 30)}...`,
      timestamp: new Date().toISOString(),
      read: false,
    });

    return {
      success: true,
      data: newComment,
    };
  },

  getCommentById: async (id: string): Promise<ApiResponse<ShareComment>> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const comment = localComments.find(c => c.id === id);
    if (!comment) {
      return { success: false, message: '评论不存在', code: 404 };
    }
    return { success: true, data: comment };
  },

  updateComment: async (id: string, data: UpdateShareCommentRequest): Promise<ApiResponse<ShareComment>> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const idx = localComments.findIndex(c => c.id === id);
    if (idx === -1) {
      return { success: false, message: '评论不存在', code: 404 };
    }

    const old = localComments[idx];
    localComments[idx] = {
      ...old,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    if (data.status === 'APPROVED' && old.status !== 'APPROVED') {
      localNotifications.push({
        id: generateId(),
        type: 'COMMENT_APPROVED',
        message: `您的评论已通过审核`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    if (data.adminReply && !old.adminReply) {
      localComments[idx].adminRepliedBy = '管理员';
      localComments[idx].adminRepliedAt = new Date().toISOString();
      localNotifications.push({
        id: generateId(),
        type: 'ADMIN_REPLY',
        message: '管理员回复了您的评论',
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    return { success: true, data: localComments[idx] };
  },

  deleteComment: async (id: string): Promise<ApiResponse<null>> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const idx = localComments.findIndex(c => c.id === id);
    if (idx === -1) {
      return { success: false, message: '评论不存在', code: 404 };
    }
    const parentId = localComments[idx].parentId;
    localComments.splice(idx, 1);

    if (parentId) {
      const parent = localComments.find(c => c.id === parentId);
      if (parent && parent.replyCount > 0) {
        parent.replyCount -= 1;
      }
    }

    return { success: true, data: null };
  },

  toggleLike: async (id: string): Promise<ApiResponse<{ liked: boolean; likeCount: number }>> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const comment = localComments.find(c => c.id === id);
    if (!comment) {
      return { success: false, message: '评论不存在', code: 404 };
    }
    const wasLiked = comment.likedByMe;
    comment.likedByMe = !wasLiked;
    comment.likeCount += wasLiked ? -1 : 1;
    return {
      success: true,
      data: { liked: comment.likedByMe!, likeCount: comment.likeCount },
    };
  },

  reportComment: async (id: string, data: ReportCommentRequest): Promise<ApiResponse<ReportRecord>> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const comment = localComments.find(c => c.id === id);
    if (!comment) {
      return { success: false, message: '评论不存在', code: 404 };
    }

    const record: ReportRecord = {
      id: generateId(),
      commentId: id,
      reporterName: data.reporterName || '匿名',
      reason: data.reason,
      description: data.description,
      createdAt: new Date().toISOString(),
      resolved: false,
    };

    localReports.push(record);
    comment.reportCount += 1;
    comment.reportedByMe = true;

    localNotifications.push({
      id: generateId(),
      type: 'NEW_REPORT',
      message: `评论（${data.reason}）被举报，需要审核`,
      timestamp: new Date().toISOString(),
      read: false,
    });

    return { success: true, data: record };
  },

  getReports: async (commentId?: string): Promise<ApiResponse<ReportRecord[]>> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    let reports = localReports;
    if (commentId) {
      reports = reports.filter(r => r.commentId === commentId);
    }
    return { success: true, data: reports };
  },

  resolveReport: async (reportId: string): Promise<ApiResponse<ReportRecord>> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const idx = localReports.findIndex(r => r.id === reportId);
    if (idx === -1) {
      return { success: false, message: '举报不存在', code: 404 };
    }
    localReports[idx] = {
      ...localReports[idx],
      resolved: true,
      resolvedBy: '管理员',
      resolvedAt: new Date().toISOString(),
    };
    return { success: true, data: localReports[idx] };
  },

  getNotifications: async (): Promise<ApiResponse<Array<{ id: string; type: string; message: string; timestamp: string; read: boolean }>>> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true, data: [...localNotifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) };
  },

  markNotificationRead: async (id: string): Promise<ApiResponse<null>> => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const notif = localNotifications.find(n => n.id === id);
    if (notif) notif.read = true;
    return { success: true, data: null };
  },

  markAllNotificationsRead: async (): Promise<ApiResponse<null>> => {
    await new Promise(resolve => setTimeout(resolve, 50));
    localNotifications.forEach(n => n.read = true);
    return { success: true, data: null };
  },

  getUnreadNotificationCount: async (): Promise<ApiResponse<number>> => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return { success: true, data: localNotifications.filter(n => !n.read).length };
  },

  batchUpdateComments: async (ids: string[], data: UpdateShareCommentRequest): Promise<ApiResponse<ShareComment[]>> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const updated: ShareComment[] = [];
    for (const id of ids) {
      const idx = localComments.findIndex(c => c.id === id);
      if (idx !== -1) {
        localComments[idx] = {
          ...localComments[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        updated.push(localComments[idx]);
      }
    }
    return { success: true, data: updated };
  },

  exportComments: async (shareId: string): Promise<ApiResponse<{ count: number; data: ShareComment[] }>> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const data = localComments.filter(c => c.shareId === shareId);
    return { success: true, data: { count: data.length, data } };
  },
};
