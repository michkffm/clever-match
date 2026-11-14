import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TanzMatchLogo from '../components/TanzMatchLogo';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../utils/auth';
import { apiClient } from '../services/api';
import './Auth.css';

interface AuthPageProps {
  mode?: 'login' | 'register';
  onLoginSuccess?: () => void;
}

export const Auth: React.FC<AuthPageProps> = ({ mode = 'login', onLoginSuccess }) => {
  const navigate = useNavigate();
  const { login, loginAsGuest, register, error: authError, clearError } = useAuth();

  const [isRegister, setIsRegister] = useState(mode === 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const validateEmail = (email: string) => {
    return authService.validateEmail(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    // Validation
    if (!validateEmail(email)) {
      setLocalError('Bitte gib eine gültige E-Mail ein');
      return;
    }

    if (isRegister) {
      const passwordValidation = authService.validatePassword(password);
      if (!passwordValidation.valid) {
        setLocalError(passwordValidation.errors[0]);
        return;
      }

      if (!firstName.trim() || !lastName.trim()) {
        setLocalError('Vor- und Nachname sind erforderlich');
        return;
      }
      if (!zipCode.trim()) {
        setLocalError('Postleitzahl ist erforderlich');
        return;
      }

      const success = await register(email, password, firstName, lastName, zipCode);
      if (success) {
        onLoginSuccess?.();
        navigate('/');
      }
    } else {
      const success = await login(email, password);
      if (success) {
        onLoginSuccess?.();
        navigate('/');
      }
    }
  };

  const handleGoogleSignIn = () => {
    console.log('Google Sign-In');
    // TODO: Implement OAuth
  };

  const handleGuestContinue = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    const success = await loginAsGuest();
    if (success) {
      onLoginSuccess?.();
      navigate('/');
      return;
    }

    setLocalError('Gastzugang konnte nicht gestartet werden. Bitte erneut versuchen.');
  };

  const handleForgotPassword = async () => {
    clearError();
    setLocalError('');
    if (!validateEmail(email)) {
      setLocalError('Bitte gib zuerst deine gültige E-Mail-Adresse ein.');
      return;
    }

    const response = await apiClient.requestPasswordReset(email);
    setLocalError(response.error
      ? 'Passwort-Zurücksetzen ist derzeit nicht verfügbar.'
      : 'Wenn ein Konto existiert, erhältst du eine E-Mail zum Zurücksetzen.');
  };

  const displayError = localError || authError;

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-header">
          <div style={{ marginBottom: '16px' }}>
            <TanzMatchLogo size="medium" showText={true} />
          </div>
          <p className="auth-subtitle">
            {isRegister ? 'Profil erstellen' : 'Willkommen zurück'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              E-Mail Adresse
            </label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                className={`form-input ${displayError && !validateEmail(email) ? 'error' : ''}`}
                placeholder="deine@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Register: First Name */}
          {isRegister && (
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">
                Vorname
              </label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="firstName"
                  type="text"
                  className="form-input"
                  placeholder="Max"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Register: Last Name */}
          {isRegister && (
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">
                Nachname
              </label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="lastName"
                  type="text"
                  className="form-input"
                  placeholder="Mustermann"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Register: Zip Code */}
          {isRegister && (
            <div className="form-group">
              <label htmlFor="zipCode" className="form-label">
                Postleitzahl
              </label>
              <div className="input-wrapper">
                <MapPin size={18} className="input-icon" />
                <input
                  id="zipCode"
                  type="text"
                  className="form-input"
                  placeholder="10115"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Passwort
            </label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${displayError && password.length < 8 ? 'error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="input-icon-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isRegister && (
              <p className="form-hint">Mindestens 8 Zeichen, Großbuchstabe, Zahl</p>
            )}
          </div>

          {/* Error Message */}
          {displayError && <div className="form-error">{displayError}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            className={`btn-submit`}
            disabled={false}
          >
            {isRegister ? (
              'Konto erstellen'
            ) : (
              'Anmelden'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>oder</span>
        </div>

        {/* Google Sign-In */}
        <button className="btn-google" onClick={handleGoogleSignIn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Mit Google anmelden
        </button>

        {/* Toggle & Links */}
        <div className="auth-footer">
          <p>
            {isRegister ? 'Bereits ein Konto? ' : 'Noch kein Konto? '}
            <button
              type="button"
              className="auth-toggle"
              onClick={() => {
                setIsRegister(!isRegister);
                setLocalError('');
                const newPath = !isRegister ? '/register' : '/login';
                navigate(newPath);
              }}
            >
              {isRegister ? 'Anmelden' : 'Registrieren'}
            </button>
          </p>

          {!isRegister && (
            <ul className="auth-links">
              <li>
                <button type="button" className="auth-toggle" onClick={() => void handleForgotPassword()}>
                  Passwort vergessen?
                </button>
              </li>
              <li>
                <a href="#guest" onClick={handleGuestContinue}>Als Gast fortfahren</a>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
