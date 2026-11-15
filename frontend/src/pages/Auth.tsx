import { useTranslation } from "../utils/translations";
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CleverMatchLogo from '../components/CleverMatchLogo';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../utils/auth';
import { apiClient } from '../services/api';
import './Auth.css';

interface AuthPageProps {
  mode?: 'login' | 'register';
  onLoginSuccess?: () => void;
}

export const Auth: React.FC<AuthPageProps> = ({ mode = 'login', onLoginSuccess }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { login, loginAsGuest, error: authError, clearError } = useAuth();

  const [isRegister, setIsRegister] = useState(mode === 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
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
    setNotice('');

    // Validation
    if (!validateEmail(email)) {
      setLocalError(t("Bitte gib eine gültige E-Mail ein"));
      return;
    }

    if (isRegister) {
      const passwordValidation = authService.validatePassword(password);
      if (!passwordValidation.valid) {
        setLocalError(passwordValidation.errors[0]);
        return;
      }

      if (!firstName.trim() || !lastName.trim()) {
        setLocalError(t("Vor- und Nachname sind erforderlich"));
        return;
      }
      if (!zipCode.trim()) {
        setLocalError(t("Postleitzahl ist erforderlich"));
        return;
      }

      setBusy(true);
      const response = await apiClient.register(email, password, firstName, lastName, zipCode);
      setBusy(false);
      if (response.error) { setLocalError(t(response.error)); return; }
      setPassword('');
      setNotice(response.data?.verificationSent
        ? t("Bitte bestätige deine E-Mail-Adresse über den Link in deinem Postfach. Erst danach kannst du dich anmelden.")
        : t("Dein Konto wartet auf Bestätigung. Der Versand ist fehlgeschlagen. Fordere den Link bitte erneut an."));
      setIsRegister(false);
    } else {
      const success = await login(email, password);
      if (success) {
        onLoginSuccess?.();
        navigate('/');
      }
    }
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

    setLocalError(t("Gastzugang konnte nicht gestartet werden. Bitte erneut versuchen."));
  };

  const handleForgotPassword = async () => {
    clearError();
    setLocalError('');
    if (!validateEmail(email)) {
      setLocalError(t("Bitte gib zuerst deine gültige E-Mail-Adresse ein."));
      return;
    }

    const response = await apiClient.requestPasswordReset(email);
    setLocalError(response.error
      ? t("Passwort-Zurücksetzen ist derzeit nicht verfügbar.")
      : t("Wenn ein Konto existiert, erhältst du eine E-Mail zum Zurücksetzen."));
  };

  const displayError = localError || (authError === 'Please verify your email address before signing in.' ? t("Bitte bestätige zuerst deine E-Mail-Adresse.") : authError);

  return (
    <main id="main-content" tabIndex={-1} className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-header">
          <div style={{ marginBottom: '16px' }}>
            <CleverMatchLogo size="medium" showText={true} />
            <p>{t("Deine Dating-App zum Kennenlernen, Matchen und Chatten.")}</p>
          </div>
          <p className="auth-subtitle">
            {isRegister ? t("Profil erstellen") : t("Willkommen zurück")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              {t("E-Mail Adresse")}
            </label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email" autoComplete="email" required
                className={`form-input ${displayError && !validateEmail(email) ? 'error' : ''}`}
                placeholder={document.documentElement.lang === 'en' ? 'you@example.com' : 'deine@email.de'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Register: First Name */}
          {isRegister && (
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">
                {t("Vorname")}
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
                {t("Nachname")}
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
                {t("Postleitzahl")}
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
              {t("Passwort")}
            </label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password" required autoComplete={isRegister ? "new-password" : "current-password"}
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${displayError && password.length < 8 ? 'error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="input-icon-button" aria-label={showPassword ? t("Passwort verbergen") : t("Passwort anzeigen")} aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isRegister && (
              <p className="form-hint">{t("Mindestens 8 Zeichen, Großbuchstabe, Zahl")}</p>
            )}
          </div>

          {notice && <p role="status">{notice}</p>}

          {/* Error Message */}
          {displayError && <div className="form-error" role="alert">{displayError}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            className={`btn-submit`}
            disabled={busy}
          >
            {isRegister ? (
              t("Konto erstellen")
            ) : (
              t("Anmelden")
            )}
          </button>
        </form>
        <button type="button" className="auth-toggle" disabled={busy} onClick={async () => {
          if (!validateEmail(email)) { setLocalError(t("Bitte gib zuerst deine gültige E-Mail-Adresse ein.")); return; }
          setBusy(true); const result = await apiClient.resendVerification(email); setBusy(false);
          setNotice(result.error ? t("Der Bestätigungslink konnte nicht angefordert werden.") : t("Falls dein Konto noch unbestätigt ist, erhältst du einen neuen Bestätigungslink."));
        }}>{t("Bestätigungslink erneut senden")}</button>

        {/* Toggle & Links */}
        <div className="auth-footer">
          <p>
            {isRegister ? t("Bereits ein Konto? ") : t("Noch kein Konto? ")}
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
              {isRegister ? t("Anmelden") : t("Registrieren")}
            </button>
          </p>

          {!isRegister && (
            <ul className="auth-links">
              <li>
                <button type="button" className="auth-toggle" onClick={() => void handleForgotPassword()}>
                  {t("Passwort vergessen?")}
                </button>
              </li>
              <li>
                <a href="#guest" onClick={handleGuestContinue}>{t("Als Gast fortfahren")}</a>
              </li>
            </ul>
          )}
        </div>
      </div>
    </main>
  );
};

export default Auth;
