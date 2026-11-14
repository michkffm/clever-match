import { useTranslation } from "../utils/translations";
import React from 'react';
import { Home, Heart, Calendar, User, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomTabs.css';

export type TabId = 'home' | 'matches' | 'events' | 'profile' | 'settings';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  path: string;
}

export const BottomTabs: React.FC = () => {
  const t = useTranslation();
const tabs: TabConfig[] = [
  { id: 'home', label: 'Home', icon: <Home size={24} />, path: '/' },
  { id: 'matches', label: 'Matches', icon: <Heart size={24} />, path: '/matches' },
  { id: 'events', label: 'Events', icon: <Calendar size={24} />, path: '/events' },
  { id: 'profile', label: t("Profil"), icon: <User size={24} />, path: '/profile/edit' },
  { id: 'settings', label: 'Settings', icon: <Settings size={24} />, path: '/settings' },
];


  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const activeTab = tabs.find((t) => {
    if (t.id === 'profile') {
      return currentPath.startsWith('/profile');
    }
    return t.path === currentPath;
  })?.id || 'home';

  const handleTabClick = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="bottom-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => handleTabClick(tab.path)}
          aria-label={tab.label}
          aria-current={activeTab === tab.id ? "page" : undefined}
          title={tab.label}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomTabs;
