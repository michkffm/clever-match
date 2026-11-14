// === App Store (Zustand) ===
// Global application state

import { create } from 'zustand';
import { storageService } from '../services/storage';

interface AppStore {
  // State
  isDarkMode: boolean;
  sidebarOpen: boolean;
  activeTab: string;
  notifications: {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }[];

  // Actions
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const initialThemePreference = (() => {
  if (typeof window === 'undefined') {
    return 'light';
  }
  const stored = localStorage.getItem('theme_preference');
  return stored === 'dark' ? 'dark' : 'light';
})();

export const useAppStore = create<AppStore>((set) => ({
  // Initial state
  isDarkMode: initialThemePreference === 'dark',
  sidebarOpen: true,
  activeTab: 'discover',
  notifications: [],

  // Toggle dark mode
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.isDarkMode;
      storageService.setTheme(next ? 'dark' : 'light');
      return { isDarkMode: next };
    }),
  setDarkMode: (isDark: boolean) => {
    storageService.setTheme(isDark ? 'dark' : 'light');
    set({ isDarkMode: isDark });
  },

  // Toggle sidebar
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebar: (open: boolean) => set({ sidebarOpen: open }),

  // Set active tab
  setActiveTab: (tab: string) => set({ activeTab: tab }),

  // Notification
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((toast) => toast.id !== id),
      }));
    }, 4000);

    return id;
  },
  removeNotification: (id: string) =>
    set((state) => ({
      notifications: state.notifications.filter((toast) => toast.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));
