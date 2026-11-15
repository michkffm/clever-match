import VerifyEmail from './pages/VerifyEmail'
import Privacy from './pages/Privacy'
import ResetPassword from './pages/ResetPassword'
import { DisplayControls } from './components/DisplayControls'
import { useLanguage } from './utils/i18n'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import './styles/globals.css'
import './App.css'

// Providers & Context
import { AuthProvider } from './contexts/AuthContext'
import { NotificationContainer } from './components/NotificationContainer'
import { ProtectedRoute, PublicRoute, RouteLoadingFallback, UnauthorizedPage } from './components/ProtectedRoute'
import { useAppStore } from './store/appStore'

// Pages
import Splash from './pages/Splash'
import Auth from './pages/Auth'
import Home from './pages/Home'
import Matches from './pages/Matches'
import Events from './pages/Events'
import Profile from './pages/Profile'
import ProfileEdit from './pages/ProfileEdit'
import Settings from './pages/Settings'
import Premium from './pages/Premium'
import Chat from './pages/Chat'
import Notifications from './pages/Notifications'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Auth mode="login" />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Auth mode="register" />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/matches"
        element={
          <ProtectedRoute>
            <Matches />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:id"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Navigate to="/profile/edit" replace />
            </ProtectedRoute>
        }
      />
      <Route
        path="/profile/edit"
        element={
          <ProtectedRoute>
            <ProfileEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/premium"
        element={
          <ProtectedRoute>
            <Premium />
          </ProtectedRoute>
        }
      />

      {/* Special Routes */}
      <Route path="/splash" element={<Splash onComplete={() => {}} />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/loading" element={<RouteLoadingFallback />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  const language = useLanguage();
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => { document.documentElement.classList.toggle('large-text', localStorage.getItem('large_text') === 'true'); }, []);
  const { isDarkMode } = useAppStore();

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }, [isDarkMode]);

  return (
    <Router>
      <AuthProvider>
        <a className="skip-link" href="#main-content">{language === 'en' ? 'Skip to content' : 'Zum Inhalt springen'}</a>
        <DisplayControls />
        <NotificationContainer />
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App
