'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface AuthStore {
  token: string | null;
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: async (email, password) => {
        const data = await authApi.login(email, password);
        set({ token: data.accessToken, user: data.user });
        if (typeof window !== 'undefined') {
          localStorage.setItem('opswatch_token', data.accessToken);
        }
      },
      register: async (name, email, password) => {
        const data = await authApi.register(name, email, password);
        set({ token: data.accessToken, user: data.user });
        if (typeof window !== 'undefined') {
          localStorage.setItem('opswatch_token', data.accessToken);
        }
      },
      logout: () => {
        set({ token: null, user: null });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('opswatch_token');
          window.location.href = '/login';
        }
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: 'opswatch-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);
