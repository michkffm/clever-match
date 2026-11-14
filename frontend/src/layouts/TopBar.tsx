import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TanzMatchLogo from '../components/TanzMatchLogo';
import { useAuth } from '../contexts/AuthContext';
import { handleImageError, normalizeImageUrl } from '../utils/imageFallback';
import { useLanguage } from '../utils/i18n';
import './TopBar.css';

interface TopBarProps {
  onSearchClick?: () => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onAvatarClick?: () => void;
  avatarUrl?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  onSearchClick,
  notificationCount = 0,
  onNotificationClick,
  onAvatarClick,
  avatarUrl,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const language = useLanguage();
  const isGuestAccount = user?.email?.toLowerCase().endsWith('@tanzmatch.local') ?? false;

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleNotificationClick = () => {
    if (onNotificationClick) {
      onNotificationClick();
      return;
    }
    navigate('/notifications');
  };

  const handleAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick();
      return;
    }
    if (user?.id) {
      navigate(`/profile/${user.id}`);
      return;
    }
    navigate('/profile/edit');
  };

  const handleGuestLogin = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { state: { fromGuest: true } });
    }
  };

  return (
    <div className="topbar">
      {/* Logo & Brand */}
      <div className="topbar-logo">
        <button
          type="button"
          className="topbar-logo-btn"
          onClick={handleLogoClick}
          aria-label="Zur Startseite"
        >
          <TanzMatchLogo size="small" showText={true} />
        </button>
      </div>

      {/* Search Icon (center) */}
      <button className="topbar-search-btn" onClick={onSearchClick} aria-label="Search">
        <Search size={20} />
      </button>

      {/* Right Icons: Notification + Avatar */}
      <div className="topbar-right">
        {isGuestAccount && (
          <>
            <span className="topbar-guest-badge">
              {language === 'en' ? 'Guest' : 'Gastmodus'}
            </span>
            <button
              type="button"
              className="topbar-login-btn"
              onClick={handleGuestLogin}
            >
              {language === 'en' ? 'Log in' : 'Einloggen'}
            </button>
          </>
        )}

        <div className="notification-container">
          <button
            className="topbar-icon-btn"
            onClick={handleNotificationClick}
            aria-label="Notifications"
          >
            <Bell size={20} />
          </button>
          {notificationCount > 0 && (
            <span className="notification-badge">{notificationCount}</span>
          )}
        </div>

        <button
          className="topbar-avatar-btn"
          onClick={handleAvatarClick}
          aria-label="Profile"
        >
          {avatarUrl ? (
            <img
              src={normalizeImageUrl(avatarUrl)}
              alt="Avatar"
              className="avatar-image"
              onError={handleImageError}
            />
          ) : (
            <User size={20} />
          )}
        </button>
      </div>
    </div>
  );
};

export default TopBar;
