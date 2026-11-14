import React, { useState } from 'react';
import TopBar from './TopBar';
import BottomTabs from './BottomTabs';
import SearchOverlay from '../components/SearchOverlay';
import { apiClient } from '../services/api';
import { storageService } from '../services/storage';
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
    const loadUnread = async () => {
      try {
        const matchesResponse = await apiClient.getMatches();
        const matchPayload = matchesResponse.data as { data?: { id: string; userId: string; createdAt: string }[] } | undefined;
        const matches = matchPayload?.data || [];

        const messageCounts = await Promise.all(
          matches.map(async (match) => {
            const messagesResponse = await apiClient.getMessages(match.id);
            const messagePayload = messagesResponse.data as { data?: { senderId: string; read: boolean }[] } | undefined;
            const messages = messagePayload?.data || [];
            const currentUserId = storageService.getUser()?.id;
            return messages.filter(
              (message) => !message.read && message.senderId !== currentUserId
            ).length;
          })
        );

        const unread = messageCounts.reduce((sum, count) => sum + count, 0);
        setUnreadNotifications(unread);
      } catch {
        setUnreadNotifications(0);
      }
    };

    void loadUnread();
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
