import React, { useEffect, useState } from 'react';
import {
  Bell,
  Lock,
  Globe,
  LogOut,
  ChevronRight,
  Shield,
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { apiClient } from '../services/api';
import { storageService } from '../services/storage';
import { setStoredLanguage, useLanguage } from '../utils/i18n';
import './Settings.css';

type NotificationKey = 'messages' | 'matches' | 'events' | 'likes';

export const Settings: React.FC = () => {
  const { logout, user } = useAuth();
  const { isDarkMode, setDarkMode } = useAppStore();
  const navigate = useNavigate();
  const isGuestAccount = user?.email?.toLowerCase().endsWith('@tanzmatch.local') ?? false;
  const language = useLanguage();
  const [notifications, setNotifications] = useState({
    messages: true,
    matches: true,
    events: true,
    likes: false,
  });

  const [preferences, setPreferences] = useState({
    privateProfile: false,
  });
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiClient.getProfile().then((response) => {
      const profile = response.data as { privateProfile?: boolean } | undefined;
      if (!cancelled && response.error) {
        setPrivacyError('Die Datenschutzeinstellung konnte nicht geladen werden.');
        return;
      }
      if (!cancelled && profile) {
        setPreferences((current) => ({
          ...current,
          privateProfile: profile.privateProfile ?? false,
        }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (
    category: 'notifications' | 'preferences',
    key: NotificationKey | 'privateProfile'
  ) => {
    if (category === 'notifications') {
      if (key === 'privateProfile') return;
      setNotifications((current) => ({ ...current, [key]: !current[key] }));
    } else {
      if (key !== 'privateProfile') return;
      const privateProfile = !preferences.privateProfile;
      const response = await apiClient.updateProfile({ privateProfile });
      if (response.error) {
        setPrivacyError('Die Datenschutzeinstellung konnte nicht gespeichert werden.');
        return;
      }
      const next = { ...preferences, privateProfile };
      setPreferences(next);
      storageService.setPreferences({ ...storageService.getPreferences(), ...next });
      setPrivacyError(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleGuestLogin = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { state: { fromGuest: true } });
    }
  };

  const handleLanguageToggle = () => {
    const nextLanguage = language === 'de' ? 'en' : 'de';
    setStoredLanguage(nextLanguage);
  };

  const text = language === 'en'
    ? {
        notifications: {
          title: 'Notifications',
          messages: 'Messages',
          messagesSubtitle: 'Alerts for new messages',
          matches: 'New matches',
          matchesSubtitle: 'Get notified about matches',
          events: 'Events',
          eventsSubtitle: 'Event recommendations near you',
          likes: 'New likes',
          likesSubtitle: 'Alerts when someone likes you',
        },
        privacy: {
          title: 'Privacy & Security',
          privateProfile: 'Private profile',
          privateProfileSubtitle: 'Your profile is only visible to matches',
          onlineStatus: 'Show online status',
          onlineStatusSubtitle: 'Others can see when you are online',
          changePassword: 'Change password',
          changePasswordSubtitle: 'Update your password',
          privacyPolicy: 'Privacy policy',
          privacyPolicySubtitle: 'Read our privacy policy',
        },
        preferences: {
          title: 'Preferences',
          language: 'Language',
          languageValue: 'English',
          darkMode: 'Dark mode',
          darkModeSubtitle: isDarkMode ? 'Dark theme active' : 'Light theme active',
        },
        account: {
          title: 'Account',
          delete: 'Delete account',
          deleteSubtitle: 'Permanent deletion of all data',
          loginNow: 'Log in now',
          logout: 'Log out',
          guestLogout: 'Exit guest mode',
        },
        footer: {
          version: 'TanzMatch v1.0.0',
          copyright: '© 2026 TanzMatch. All rights reserved.',
        },
      }
    : {
        notifications: {
          title: 'Benachrichtigungen',
          messages: 'Nachrichten',
          messagesSubtitle: 'Benachrichtigungen für neue Nachrichten',
          matches: 'Neue Matches',
          matchesSubtitle: 'Benachrichtigungen bei Matches',
          events: 'Events',
          eventsSubtitle: 'Event-Empfehlungen in deiner Nähe',
          likes: 'Likes erhalten',
          likesSubtitle: 'Benachrichtigungen wenn dir jemand gefällt',
        },
        privacy: {
          title: 'Datenschutz & Sicherheit',
          privateProfile: 'Privates Profil',
          privateProfileSubtitle: 'Dein Profil ist nur für Matches sichtbar',
          onlineStatus: 'Online-Status anzeigen',
          onlineStatusSubtitle: 'Andere können sehen, wenn du online bist',
          changePassword: 'Passwort ändern',
          changePasswordSubtitle: 'Dein Passwort aktualisieren',
          privacyPolicy: 'Datenschutzerklärung',
          privacyPolicySubtitle: 'Lese unsere Datenschutzerklärung',
        },
        preferences: {
          title: 'Präferenzen',
          language: 'Sprache',
          languageValue: 'Deutsch',
          darkMode: 'Dark Mode',
          darkModeSubtitle: isDarkMode ? 'Dunkles Design aktiv' : 'Helles Design aktiv',
        },
        account: {
          title: 'Account',
          delete: 'Account löschen',
          deleteSubtitle: 'Permanente Löschung aller Daten',
          loginNow: 'Jetzt einloggen',
          logout: 'Abmelden',
          guestLogout: 'Gastmodus beenden',
        },
        footer: {
          version: 'TanzMatch v1.0.0',
          copyright: '© 2026 TanzMatch. Alle Rechte vorbehalten.',
        },
      };

  return (
    <MainLayout>
      <div className="settings-container">
        {/* BENACHRICHTIGUNGEN */}
        <div className="settings-section">
          <h2 className="settings-section-title">
            <Bell size={20} />
            {text.notifications.title}
          </h2>
          <div className="settings-items">
            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">{text.notifications.messages}</span>
                <span className="settings-item-subtitle">
                  {text.notifications.messagesSubtitle}
                </span>
              </div>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={notifications.messages}
                  onChange={() => handleToggle('notifications', 'messages')}
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">{text.notifications.matches}</span>
                <span className="settings-item-subtitle">
                  {text.notifications.matchesSubtitle}
                </span>
              </div>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={notifications.matches}
                  onChange={() => handleToggle('notifications', 'matches')}
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">{text.notifications.events}</span>
                <span className="settings-item-subtitle">
                  {text.notifications.eventsSubtitle}
                </span>
              </div>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={notifications.events}
                  onChange={() => handleToggle('notifications', 'events')}
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">{text.notifications.likes}</span>
                <span className="settings-item-subtitle">
                  {text.notifications.likesSubtitle}
                </span>
              </div>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={notifications.likes}
                  onChange={() => handleToggle('notifications', 'likes')}
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* DATENSCHUTZ & SICHERHEIT */}
        <div className="settings-section">
          <h2 className="settings-section-title">
            <Shield size={20} />
            {text.privacy.title}
          </h2>
          {privacyError && <p role="alert">{privacyError}</p>}
          <div className="settings-items">
            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">{text.privacy.privateProfile}</span>
                <span className="settings-item-subtitle">
                  {text.privacy.privateProfileSubtitle}
                </span>
              </div>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={preferences.privateProfile}
                  onChange={() => handleToggle('preferences', 'privateProfile')}
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <button className="settings-item-btn">
              <div className="settings-item-info">
                <span className="settings-item-label">{text.privacy.changePassword}</span>
                <span className="settings-item-subtitle">
                  {text.privacy.changePasswordSubtitle}
                </span>
              </div>
              <ChevronRight size={20} />
            </button>

            <button className="settings-item-btn">
              <div className="settings-item-info">
                <span className="settings-item-label">{text.privacy.privacyPolicy}</span>
                <span className="settings-item-subtitle">
                  {text.privacy.privacyPolicySubtitle}
                </span>
              </div>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* PRÄFERENZEN */}
        <div className="settings-section">
          <h2 className="settings-section-title">
            <Globe size={20} />
            {text.preferences.title}
          </h2>
          <div className="settings-items">
            <button className="settings-item-btn" onClick={handleLanguageToggle}>
              <div className="settings-item-info">
                <span className="settings-item-label">{text.preferences.language}</span>
                <span className="settings-item-subtitle">
                  {text.preferences.languageValue}
                </span>
              </div>
              <ChevronRight size={20} />
            </button>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">{text.preferences.darkMode}</span>
                <span className="settings-item-subtitle">
                  {text.preferences.darkModeSubtitle}
                </span>
              </div>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={() => setDarkMode(!isDarkMode)}
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* ACCOUNT */}
        <div className="settings-section">
          <h2 className="settings-section-title">
            <Lock size={20} />
            {text.account.title}
          </h2>
          <div className="settings-items">
            {isGuestAccount && (
              <button
                onClick={handleGuestLogin}
                className="settings-login-btn"
              >
                {text.account.loginNow}
              </button>
            )}
            <button className="settings-item-btn danger">
              <div className="settings-item-info">
                <span className="settings-item-label">{text.account.delete}</span>
                <span className="settings-item-subtitle">
                  {text.account.deleteSubtitle}
                </span>
              </div>
              <ChevronRight size={20} />
            </button>

            <button
              onClick={handleLogout}
              className="settings-logout-btn"
            >
              <LogOut size={20} />
              {isGuestAccount ? text.account.guestLogout : text.account.logout}
            </button>
          </div>
        </div>

        {/* VERSION */}
        <div className="settings-footer">
          <p>{text.footer.version}</p>
          <p>{text.footer.copyright}</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
