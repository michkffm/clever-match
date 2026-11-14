// === Auth Utilities ===
// Helper Funktionen für Authentication & Authorization

import { apiClient } from '../services/api';
import { storageService } from '../services/storage';
import type { User, AuthResponse } from '../types/api';

class AuthService {
  private isInitialized = false;
  private accessToken: string | null = null;
  private refreshTimeoutId: number | null = null;
  private refreshFailureCount = 0;

  private scheduleRefresh(token: string) {
    if (!token) {
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expMs = typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
      const now = Date.now();
      const refreshAt = expMs - 2 * 60 * 1000; // 2 minutes before expiry
      const baseDelay = Math.max(refreshAt - now, 10 * 1000);
      const jitter = Math.floor(Math.random() * 30_000) - 15_000; // +/- 15s
      const backoffDelay = Math.min(
        2 ** this.refreshFailureCount * 30 * 1000,
        10 * 60 * 1000
      );
      const delay = Math.max(baseDelay + jitter, backoffDelay, 10 * 1000);

      if (this.refreshTimeoutId) {
        window.clearTimeout(this.refreshTimeoutId);
      }

      this.refreshTimeoutId = window.setTimeout(async () => {
        try {
          const response = await apiClient.request('/auth/refresh', { method: 'POST' });
          if (response.data) {
            const { token: newToken, user } = response.data as AuthResponse;
            this.accessToken = newToken;
            storageService.setUser(user);
            storageService.setLastLogin(Date.now());
            apiClient.setToken(newToken);
            this.refreshFailureCount = 0;
            this.scheduleRefresh(newToken);
            return;
          }
        } catch {
          // ignore
        }

        this.refreshFailureCount += 1;
        if (this.refreshFailureCount <= 5) {
          this.scheduleRefresh(token);
          return;
        }

        this.accessToken = null;
        storageService.clearUser();
        apiClient.clearToken();
      }, delay);
    } catch {
      // invalid token format
    }
  }

  /**
   * Initialize Auth Service
   * Check if user is already logged in from localStorage
   */
  async initialize(): Promise<User | null> {
    if (this.isInitialized) return this.getCurrentUser();

    apiClient.setOnTokenRefreshed((token) => {
      this.accessToken = token;
      this.scheduleRefresh(token);
    });
    apiClient.setOnSessionExpired(() => {
      this.accessToken = null;
      this.refreshFailureCount = 0;
      storageService.clearChatCache();
    });

    // Older app versions stored access tokens in localStorage. Discard them and
    // restore the session only through the HttpOnly refresh cookie.
    storageService.clearAuthToken();

    // Try to restore session via refresh cookie
    try {
      const response = await apiClient.request('/auth/refresh', { method: 'POST' });
      if (response.data) {
        const { token: newToken, user } = response.data as AuthResponse;
        this.accessToken = newToken;
        storageService.setUser(user);
        storageService.setLastLogin(Date.now());
        apiClient.setToken(newToken);
        this.scheduleRefresh(newToken);
        this.isInitialized = true;
        return user;
      }
    } catch {
      // Ignore refresh errors
    }

    this.isInitialized = true;
    return null;
  }

  /**
   * Login
   */
  async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
    try {
      const response = await apiClient.login(email, password);

      if (response.data) {
        const { token, user } = response.data as AuthResponse;

        // Store token & user
        storageService.setUser(user);
        storageService.setLastLogin(Date.now());
        this.accessToken = token;
        apiClient.setToken(token);
        this.scheduleRefresh(token);
        return { user, token };
      }

      return null;
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      return null;
    }
  }

  /**
   * Continue as guest
   */
  async loginAsGuest(): Promise<{ user: User; token: string } | null> {
    try {
      const response = await apiClient.guestLogin();

      if (response.data) {
        const { token, user } = response.data as AuthResponse;

        storageService.setUser(user);
        storageService.setLastLogin(Date.now());
        this.accessToken = token;
        apiClient.setToken(token);
        this.scheduleRefresh(token);
        return { user, token };
      }
      return null;
    } catch (error) {
      console.error('[Auth] Guest login failed:', error);
      return null;
    }
  }

  /**
   * Register
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    zipCode: string
  ): Promise<{ user: User; token: string } | null> {
    try {
      const response = await apiClient.register(email, password, firstName, lastName, zipCode);

      if (response.data) {
        const { token, user } = response.data as AuthResponse;

        // Store token & user
        storageService.setUser(user);
        storageService.setLastLogin(Date.now());
        this.accessToken = token;
        apiClient.setToken(token);
        this.scheduleRefresh(token);
        return { user, token };
      }

      return null;
    } catch (error) {
      console.error('[Auth] Registration failed:', error);
      return null;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      storageService.clearAuthToken();
      storageService.clearUser();
      storageService.clearChatCache();
      this.accessToken = null;
      apiClient.clearToken();
      this.refreshFailureCount = 0;
      if (this.refreshTimeoutId) {
        window.clearTimeout(this.refreshTimeoutId);
        this.refreshTimeoutId = null;
      }
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return storageService.getUser();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getCurrentUser() && !!this.accessToken;
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return this.accessToken;
  }

  /**
   * Validate password
   */
  validatePassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(): boolean {
    const lastLogin = storageService.getLastLogin();
    if (!lastLogin) return true;

    // Session expires nach 24 Stunden
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in ms
    return Date.now() - lastLogin > sessionDuration;
  }

  /**
   * Refresh session
   */
  refreshSession(): void {
    if (this.isAuthenticated()) {
      storageService.setLastLogin(Date.now());
    }
  }
}

export const authService = new AuthService();
