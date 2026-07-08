import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isAdmin: false,
  error: null,

  fetchMe: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const user: User = await res.json();
        set({
          user,
          isAuthenticated: true,
          isAdmin: user.role === 'SUPER_ADMIN' || user.role === 'ADMIN',
          error: null,
        });
      } else {
        // Token might be invalid or expired
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, isAdmin: false });
      }
    } catch (err: any) {
      console.error('fetchMe error', err);
    }
  },

  login: async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Login failed' });
        return;
      }

      localStorage.setItem('token', data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isAdmin: data.user.role === 'SUPER_ADMIN' || data.user.role === 'ADMIN',
        error: null,
      });
    } catch (err: any) {
      set({ error: err.message || 'Network error' });
    }
  },

  register: async (email: string, password: string, referralCode?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, referralCode })
      });

      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Registration failed' });
        return;
      }

      localStorage.setItem('token', data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isAdmin: data.user.role === 'SUPER_ADMIN' || data.user.role === 'ADMIN',
        error: null,
      });
    } catch (err: any) {
      set({ error: err.message || 'Network error' });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      error: null,
    });
  },
}));
