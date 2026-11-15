// === Protected Routes ===
// Route component with authentication guard

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

/**
 * Redirect unauthenticated users to login
 * Redirect authenticated users away from public pages (login, register)
 */
export function ProtectedRoute({ children, requiredRoles = [] }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Still loading auth state
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid rgba(255,255,255,0.25)',
              borderTopColor: '#ec4899',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 10px auto',
            }}
          />
          <p style={{ margin: 0 }}>Lade...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check roles if required
  const userRole = user && 'role' in user ? (user as { role?: unknown }).role : undefined;
  if (requiredRoles.length > 0 && typeof userRole === 'string' && !requiredRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Authenticated - render component
  return <>{children}</>;
}

/**
 * Only allow unauthenticated users (for login/register pages)
 */
export function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isGuestAccount = user?.email?.toLowerCase().endsWith('@tanzmatch.local') ?? false;

  // Still loading auth state
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid rgba(255,255,255,0.25)',
              borderTopColor: '#ec4899',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 10px auto',
            }}
          />
          <p style={{ margin: 0 }}>Lade...</p>
        </div>
      </div>
    );
  }

  // Already authenticated - redirect to home
  if (isAuthenticated && !isGuestAccount) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Loading fallback component
 */
export function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
        <p className="text-white text-lg">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Unauthorized page
 */
export function UnauthorizedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">403</h1>
        <p className="text-gray-300 text-lg mb-8">You do not have permission to access this page.</p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition"
        >
          Go to Home
        </a>
      </div>
    </div>
  );
}
