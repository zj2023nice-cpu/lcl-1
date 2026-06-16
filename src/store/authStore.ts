import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, LoginRequest, LoginResponse, ApiResponse } from '@/types';
import { api } from '@/services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: { email: string; password: string; name: string; teamName?: string }) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<ApiResponse<LoginResponse>>('/api/auth/login', credentials);
          const { accessToken, refreshToken, user } = response.data.data!;
          set({ user, accessToken, refreshToken, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || '登录失败，请检查邮箱和密码', 
            isLoading: false 
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<ApiResponse<LoginResponse>>('/api/auth/register', data);
          const { accessToken, refreshToken, user } = response.data.data!;
          set({ user, accessToken, refreshToken, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || '注册失败，请稍后重试', 
            isLoading: false 
          });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, error: null });
        localStorage.removeItem('auth-storage');
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          return;
        }
        try {
          const response = await api.post<ApiResponse<{ accessToken: string }>>(
            '/api/auth/refresh',
            { refreshToken }
          );
          set({ accessToken: response.data.data!.accessToken });
        } catch {
          get().logout();
        }
      },

      clearError: () => set({ error: null }),

      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
