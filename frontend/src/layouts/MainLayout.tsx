import React, { useState } from 'react';
import TopBar from './TopBar';
import BottomTabs from './BottomTabs';
import SearchOverlay from '../components/SearchOverlay';
import { apiClient } from '../services/api';
import './MainLayout.css';

interface MainLayoutProps {
  children: React.ReactNode;
  showTopBar?: boolean;
  showBottomTabs?: boolean;
  onSearchClick?: () => void;
  notificationCount?: number;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showTopBar = true,
  showBottomTabs = true,
  onSearchClick,
  notificationCount,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  React.useEffect(() => {
    let active = true;
    const loadUnread = async () => {
      const response = await apiClient.getNotifications();
      if (active && response.data) setUnreadNotifications(response.data.unreadMessages);
    };
    void loadUnread();
    const interval = window.setInterval(() => { if (!document.hidden) void loadUnread(); }, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const handleSearchClick = () => {
    if (onSearchClick) {
      onSearchClick();
      return;
    }
    setSearchOpen(true);
  };

  return (
    <div className="main-layout">
      {showTopBar && (
        <TopBar
          onSearchClick={handleSearchClick}
          notificationCount={notificationCount ?? unreadNotifications}
        />
      )}
      <main id="main-content" tabIndex={-1} className="main-content">{children}</main>
      {showBottomTabs && <BottomTabs />}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default MainLayout;
