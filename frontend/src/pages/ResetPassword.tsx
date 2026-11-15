import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useLanguage } from '../utils/i18n';
import { authService } from '../utils/auth';
import './Auth.css';

export default function ResetPassword() {
  const en = useLanguage() === 'en';
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  return <main id="main-content" tabIndex={-1} className="auth-container"><div className="auth-wrapper">
    <h1>{en ? 'Reset password' : 'Passwort zurücksetzen'}</h1>
    {!done && <form className="auth-form" onSubmit={async event => {
      event.preventDefault();
      const validation = authService.validatePassword(password);
      if (!validation.valid || password !== confirmation) {
        setMessage(en ? 'Use at least 8 characters, an uppercase letter and a number. Both passwords must match.' : 'Mindestens 8 Zeichen, Großbuchstabe und Zahl. Beide Passwörter müssen übereinstimmen.');
        return;
      }
      setBusy(true);
      const result = await apiClient.resetPassword(token, password);
      setBusy(false);
      if (result.error) { setMessage(en ? 'The link is invalid, expired, or the service is unavailable.' : 'Der Link ist ungültig, abgelaufen oder der Dienst ist nicht erreichbar.'); return; }
      history.replaceState(null, '', location.pathname);
      setPassword(''); setConfirmation(''); setDone(true);
      setMessage(en ? 'Password updated. Please sign in.' : 'Passwort geändert. Bitte melde dich an.');
    }}>
      <label htmlFor="new-password">{en ? 'New password' : 'Neues Passwort'}</label>
      <input id="new-password" className="form-input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
      <label htmlFor="confirm-password">{en ? 'Confirm password' : 'Passwort bestätigen'}</label>
      <input id="confirm-password" className="form-input" type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} />
      <button className="btn-submit" disabled={busy || !token}>{busy ? (en ? 'Saving…' : 'Wird gespeichert…') : (en ? 'Save password' : 'Passwort speichern')}</button>
    </form>}
    <p role="status">{message || (!token ? (en ? 'Open the link from your reset email.' : 'Öffne den Link aus deiner Reset-E-Mail.') : '')}</p>
    <Link to="/login">{en ? 'Back to sign-in' : 'Zur Anmeldung'}</Link>
  </div></main>;
}
