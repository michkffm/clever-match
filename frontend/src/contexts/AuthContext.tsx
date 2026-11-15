// === Auth Provider ===
// React Context for authentication state

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import { AuthContext } from './authContextValue';
import type { AuthContextType } from './authContextValue';

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    initialize,
    login,
    loginAsGuest,
    register,
    logout,
    clearError,
  } = useAuthStore();

  // Initialize auth on app load
  useEffect(() => {
    void initialize();
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    loginAsGuest,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
