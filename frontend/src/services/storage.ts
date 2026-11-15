import type { User } from '../types/api';
type Preferences = { language?: 'de' | 'en'; privateProfile?: boolean; notifications?: { messages: boolean; matches: boolean; events: boolean; likes: boolean } };
// === Storage Service ===
// Local Storage Management für Auth Token, User Data, etc.

const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user_data',
  PREFERENCES: 'user_preferences',
  LAST_LOGIN: 'last_login',
  THEME: 'theme_preference',
} as const;

class StorageService {
  // === Auth Token ===
  clearAuthToken() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  // === User Data ===
  setUser(user: User) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  getUser(): User | null {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    if (!user) return null;
    try {
      const parsed: unknown = JSON.parse(user);
      if (!parsed || typeof parsed !== "object" || !("id" in parsed) || typeof parsed.id !== "string") return null;
      return parsed as User;
    } catch {
      this.clearUser();
      return null;
    }
  }

  clearUser() {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  // === Preferences ===
  setPreferences(preferences: Preferences) {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
  }

  getPreferences(): Preferences {
    const prefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    try { return prefs ? JSON.parse(prefs) as Preferences : {}; } catch { return {}; }
  }

  // === Theme ===
  setTheme(theme: 'light' | 'dark') {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  getTheme(): 'light' | 'dark' {
    return localStorage.getItem(STORAGE_KEYS.THEME) === 'dark' ? 'dark' : 'light';
  }

  // === Session ===
  setLastLogin(timestamp: number) {
    localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, timestamp.toString());
  }

  getLastLogin(): number | null {
    const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN);
    return timestamp ? parseInt(timestamp) : null;
  }

  // === Clear All ===
  clearAll() {
    localStorage.clear();
  }

  clearChatCache() {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('chat_cache_'))
      .forEach((key) => localStorage.removeItem(key));
  }

  // === Debug ===
  getAll() {
    const data: Record<string, unknown> = {};
    Object.values(STORAGE_KEYS).forEach((key) => {
      const value = localStorage.getItem(key);
      data[key] = value ? (value.startsWith('{') ? JSON.parse(value) : value) : null;
    });
    return data;
  }
}

export const storageService = new StorageService();
