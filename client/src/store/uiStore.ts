import { create } from 'zustand';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
  createdAt: number;
}

interface UIState {
  sidebarOpen: boolean;
  notifications: Notification[];
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (message: string, type?: Notification['type']) => void;
  dismissNotification: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  notifications: [],

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  addNotification: (message: string, type: Notification['type'] = 'info') => {
    const id = 'notif_' + Date.now();
    set((s) => ({
      notifications: [...s.notifications, { id, message, type, createdAt: Date.now() }],
    }));
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
      }));
    }, 4000);
  },

  dismissNotification: (id: string) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),
}));
