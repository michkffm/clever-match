// === Auth Store (Zustand) ===
// Global authentication state management

import { create } from 'zustand';
import { authService } from '../utils/auth';
import type { User } from '../types/api';

interface AuthStore {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  loginAsGuest: () => Promise<boolean>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    zipCode: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Initialize from storage
  initialize: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.initialize();
      set({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Initialization failed';
      set({
        error: message,
        isLoading: false,
      });
    }
  },

  // Login
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.login(email, password);

      if (result) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } else {
        set({
          error: 'Login failed. Please check your credentials.',
          isLoading: false,
        });
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({
        error: message,
        isLoading: false,
      });
      return false;
    }
  },

  // Guest login
  loginAsGuest: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.loginAsGuest();

      if (result) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }

      set({
        error: 'Gastzugang konnte nicht gestartet werden.',
        isLoading: false,
      });
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gastzugang fehlgeschlagen';
      set({
        error: message,
        isLoading: false,
      });
      return false;
    }
  },

  // Register
  register: async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    zipCode: string
  ) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.register(
        email,
        password,
        firstName,
        lastName,
        zipCode
      );

      if (result) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } else {
        set({
          error: 'Registration failed. Please try again.',
          isLoading: false,
        });
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      set({
        error: message,
        isLoading: false,
      });
      return false;
    }
  },

  // Logout
  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      set({
        user: null,
        isAuthenticated: false,
        error: null,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      set({
        error: message,
        isLoading: false,
      });
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Set user (for profile updates)
  setUser: (user: User) => set({ user }),
}));
