import { create } from 'zustand';
import type { User } from '../types';
import { mockCurrentUser } from '../services/mockData';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isAdmin: false,
  error: null,

  login: async (email: string, _password: string) => {
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 400));

    if (!email.includes('@')) {
      set({ error: 'Invalid email address' });
      return;
    }

    const user: User = {
      ...mockCurrentUser,
      email,
    };

    set({
      user,
      token: 'mock_jwt_token_' + Date.now(),
      isAuthenticated: true,
      isAdmin: user.role === 'SUPER_ADMIN',
      error: null,
    });
  },

  register: async (email: string, password: string, _referralCode?: string) => {
    await new Promise((r) => setTimeout(r, 600));

    if (!email.includes('@')) {
      set({ error: 'Invalid email address' });
      return;
    }

    if (password.length < 6) {
      set({ error: 'Password must be at least 6 characters' });
      return;
    }

    const user: User = {
      id: 'usr_' + Math.random().toString(36).slice(2, 18),
      email,
      role: 'USER',
      tier: 1,
      tierLabel: 'NOVICE',
      multiplier: 1.0,
      status: 'ACTIVE',
      referralCode: 'ATTN-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      referredBy: _referralCode || null,
      createdAt: new Date().toISOString(),
    };

    set({
      user,
      token: 'mock_jwt_token_' + Date.now(),
      isAuthenticated: true,
      isAdmin: false,
      error: null,
    });
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      error: null,
    });
  },
}));
