import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useLanguage } from '../utils/i18n';
import './Auth.css';

export default function VerifyEmail() {
  const en = useLanguage() === 'en';
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') ?? '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  return <main id="main-content" tabIndex={-1} className="auth-container"><div className="auth-wrapper">
    <h1>{en ? 'Confirm email address' : 'E-Mail-Adresse bestätigen'}</h1>
    <p role="status">{done ? (en ? 'Email confirmed. You can now sign in.' : 'E-Mail bestätigt. Du kannst dich jetzt anmelden.')
      : error ? (en ? 'The link is invalid or expired. Request a new link on the sign-in page.' : 'Der Link ist ungültig oder abgelaufen. Fordere auf der Anmeldeseite einen neuen Link an.')
      : (en ? 'Confirm your email address to activate your account.' : 'Bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.')}</p>
    {!done && <button type="button" className="btn-submit" disabled={busy || !token} onClick={async () => {
      setBusy(true); const result = await apiClient.verifyEmail(token); setBusy(false);
      if (result.error) { setError(true); return; }
      history.replaceState(null, '', location.pathname); setDone(true); setError(false);
    }}>{busy ? (en ? 'Confirming…' : 'Wird bestätigt…') : (en ? 'Confirm email' : 'E-Mail bestätigen')}</button>}
    <Link to="/login">{en ? 'Go to sign-in' : 'Zur Anmeldung'}</Link>
  </div></main>;
}
