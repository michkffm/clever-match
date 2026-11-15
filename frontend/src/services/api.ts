import { storageService } from './storage';
import type { AuthResponse, UpdateProfileRequest } from '../types/api';

// === API Service ===

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_API_HOST
    ? `https://${import.meta.env.VITE_API_HOST}/api`
    : 'http://localhost:5000/api');

export function createWebSocketUrl(path: string, token: string): string {
  const url = new URL(path, BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  return url.toString();
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  _retry?: boolean;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private token: string | null = null;
  private refreshInFlight: Promise<boolean> | null = null;
  private onTokenRefreshed?: (token: string) => void;
  private onSessionExpired?: () => void;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  setOnTokenRefreshed(handler: (token: string) => void) {
    this.onTokenRefreshed = handler;
  }

  setOnSessionExpired(handler: () => void) {
    this.onSessionExpired = handler;
  }

  private getHeaders(body?: unknown): Record<string, string> {
    const headers: Record<string, string> = {};

    if (!(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async refreshSession(): Promise<boolean> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = (async () => {
      try {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          return false;
        }

        const data = (await response.json()) as AuthResponse;
        if (!data?.token) {
          return false;
        }

        this.setToken(data.token);
        if (data.user) {
          storageService.setUser(data.user);
        }
        storageService.setLastLogin(Date.now());
        this.onTokenRefreshed?.(data.token);
        return true;
      } catch {
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint}`;
    const method = options.method || 'GET';
    const headers = { ...this.getHeaders(options.body), ...options.headers };

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    if (options.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = options.body instanceof FormData ? options.body : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get('content-type') || '';
      const responseBody = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (response.status === 401 && !options._retry && !endpoint.startsWith('/auth/')) {
        const refreshed = await this.refreshSession();
        if (refreshed) {
          return this.request<T>(endpoint, { ...options, _retry: true });
        }
        storageService.clearUser();
        this.clearToken();
        this.onSessionExpired?.();
      }

      if (!response.ok) {
        return {
          error:
            typeof responseBody === 'object' && responseBody && 'error' in responseBody
              ? String(responseBody.error)
          : response.statusText,
          status: response.status,
        };
      }

      return {
        data: responseBody as T,
        status: response.status,
      };
    } catch (error) {
      console.error(`[API ERROR] ${endpoint}`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }

  // === Auth Endpoints ===
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async guestLogin() {
    return this.request('/auth/guest', {
      method: 'POST',
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request('/auth/reset-password', { method: 'POST', body: { token, password } });
  }

  async requestPasswordReset(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: { email, language: document.documentElement.lang },
    });
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    zipCode: string
  ) {
    return this.request('/auth/register', {
      method: 'POST',
      body: { email, password, firstName, lastName, zipCode },
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // === Profile Endpoints ===
  async getProfile() {
    return this.request('/profile');
  }

  async updateProfile(data: UpdateProfileRequest) {
    return this.request('/profile', {
      method: 'PUT',
      body: data,
    });
  }

  async uploadProfilePhotos(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    return this.request('/profile/photos', {
      method: 'POST',
      body: formData,
      headers: {}, // Remove Content-Type für FormData
    });
  }

  // === Profiles Endpoints ===
  async getProfiles(filters?: Record<string, string>) {
    const query = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return this.request(`/profiles${query}`);
  }

  async getProfileById(id: string) {
    return this.request(`/profiles/${id}`);
  }

  // === Matches Endpoints ===
  async getNotifications() {
    return this.request<{ data: { id: string; type: 'message' | 'match' | 'like' | 'event'; createdAt: string; path: string }[]; unreadMessages: number }>('/notifications');
  }

  async getMatches() {
    return this.request('/matches');
  }

  async createMatch(userId: string, type: 'like' | 'superlike' | 'pass') {
    return this.request('/matches', {
      method: 'POST',
      body: { userId, type },
    });
  }

  // === Messages Endpoints ===
  async getMessages(matchId: string) {
    return this.request(`/messages/${matchId}`);
  }

  async markMessagesRead(matchId: string) {
    return this.request(`/messages/${matchId}/read`, {
      method: 'POST',
    });
  }

  async deleteMessage(messageId: string) {
    return this.request(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async sendMessage(matchId: string, text: string) {
    return this.request('/messages', {
      method: 'POST',
      body: { matchId, text },
    });
  }

  async blockUser(userId: string) {
    return this.request(`/blocks/${userId}`, { method: 'POST' });
  }

  async unblockUser(userId: string) {
    return this.request(`/blocks/${userId}`, { method: 'DELETE' });
  }

  async getBlockedUsers() {
    return this.request('/blocks');
  }

  // === Events Endpoints ===
  async getEvents(filters?: Record<string, string>) {
    const query = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return this.request(`/events${query}`);
  }

  async getEventById(id: string) {
    return this.request(`/events/${id}`);
  }

  async registerEvent(eventId: string) {
    return this.request(`/events/${eventId}/register`, {
      method: 'POST',
    });
  }

  async unregisterEvent(eventId: string) {
    return this.request(`/events/${eventId}/register`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
