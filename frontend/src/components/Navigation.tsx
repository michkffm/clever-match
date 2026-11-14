// === Navigation Component ===
// Sidebar navigation with menu items

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TanzMatchLogo from './TanzMatchLogo';
import {
  Home,
  Heart,
  MessageCircle,
  Calendar,
  User,
  LogOut,
  Settings,
  Crown,
  Menu,
  X,
} from 'lucide-react';
import './Navigation.css';
import { useAppStore } from '../store/appStore';
import { useLanguage } from '../utils/i18n';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const language = useLanguage();
  const isGuestAccount = user?.email?.toLowerCase().endsWith('@tanzmatch.local') ?? false;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Discover', id: 'discover' },
    { path: '/matches', icon: Heart, label: 'Matches', id: 'matches' },
    { path: '/messages', icon: MessageCircle, label: 'Messages', id: 'messages' },
    { path: '/events', icon: Calendar, label: 'Events', id: 'events' },
    { path: '/profile', icon: User, label: 'Profile', id: 'profile' },
  ];

  const bottomItems = [
    { path: '/premium', icon: Crown, label: 'Premium', id: 'premium' },
    { path: '/settings', icon: Settings, label: 'Settings', id: 'settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button className="nav-toggle" onClick={toggleSidebar}>
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Navigation Container */}
      <nav className={`navigation ${sidebarOpen ? 'open' : 'closed'}`}>
        {/* Logo */}
        <div className="nav-header">
          <Link to="/" className="nav-logo">
            <TanzMatchLogo size="small" showText={false} />
          </Link>
        </div>

        {/* Main Menu */}
        <div className="nav-menu">
          {navItems.map(({ path, icon: Icon, label, id }) => (
            <Link
              key={id}
              to={path}
              className={`nav-item ${isActive(path) ? 'active' : ''}`}
              onClick={() => {
                // Close sidebar on mobile
                if (window.innerWidth < 1024) {
                  toggleSidebar();
                }
              }}
            >
              <Icon size={20} />
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </div>

        {/* Bottom Menu */}
        <div className="nav-bottom">
          {bottomItems.map(({ path, icon: Icon, label, id }) => (
            <Link
              key={id}
              to={path}
              className={`nav-item ${isActive(path) ? 'active' : ''}`}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  toggleSidebar();
                }
              }}
            >
              <Icon size={20} />
              <span className="nav-label">{label}</span>
            </Link>
          ))}

          {/* User Profile */}
          {user && (
            <div className="nav-user">
              <div className="nav-user-info">
                <div className="nav-user-avatar">
                  {user.firstName?.charAt(0)}
                </div>
                <div className="nav-user-details">
                  <p className="nav-user-name">{user.firstName} {user.lastName}</p>
                  <p className="nav-user-email">{user.email}</p>
                  {isGuestAccount && (
                    <span className="nav-user-badge">
                      {language === 'en' ? 'Guest' : 'Gastmodus'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button className="nav-item logout" onClick={handleLogout}>
            <LogOut size={20} />
            <span className="nav-label">
              {isGuestAccount ? (language === 'en' ? 'Exit guest' : 'Gastmodus beenden') : 'Logout'}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="nav-overlay" onClick={toggleSidebar} />
      )}
    </>
  );
};

export default Navigation;
