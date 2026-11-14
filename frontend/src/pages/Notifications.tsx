import React, { useEffect, useState } from 'react';
import { Bell, MessageCircle, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { apiClient } from '../services/api';
import { storageService } from '../services/storage';
import type { Match, Message, Profile } from '../types/api';
import './Notifications.css';

type NotificationItem = {
  id: string;
  icon: typeof MessageCircle;
  title: string;
  text: string;
  time: string;
  action: () => void;
};

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const currentUserId = storageService.getUser()?.id;

    const loadNotifications = async () => {
      const matchesResponse = await apiClient.getMatches();
      const matchPayload = matchesResponse.data as { data?: Match[] } | undefined;
      const matches = matchPayload?.data || [];

      const notifications: NotificationItem[] = [];

      await Promise.all(
        matches.map(async (match) => {
          const [profileResponse, messagesResponse] = await Promise.all([
            apiClient.getProfileById(match.userId),
            apiClient.getMessages(match.id),
          ]);

          const profile = profileResponse.data as Profile | undefined;
          const messagePayload = messagesResponse.data as { data?: Message[] } | undefined;
          const messages = messagePayload?.data || [];
          const lastMessage = messages.at(-1);

          if (lastMessage) {
            const isUnread = lastMessage.senderId !== currentUserId && !lastMessage.read;
            if (isUnread) {
              notifications.push({
                id: `msg-${lastMessage.id}`,
                icon: MessageCircle,
                title: 'Neue Nachricht',
                text: `${profile?.firstName || 'Match'}: ${lastMessage.text}`,
                time: new Date(lastMessage.createdAt).toLocaleString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                action: async () => {
                  await apiClient.markMessagesRead(match.id);
                  navigate(`/chat/${match.id}`);
                },
              });
            }
          } else {
            notifications.push({
              id: `match-${match.id}`,
              icon: Heart,
              title: 'Neues Match',
              text: `${profile?.firstName || 'Ein Match'} möchte mit dir tanzen.`,
              time: new Date(match.createdAt).toLocaleDateString('de-DE'),
              action: () => navigate(`/chat/${match.id}`),
            });
          }
        })
      );

      notifications.sort((a, b) => b.time.localeCompare(a.time));
      setItems(notifications);
    };

    void loadNotifications();
  }, [navigate]);

  return (
    <MainLayout>
      <div className="notifications-container">
        <div className="notifications-header">
          <Bell size={22} />
          <h1>Benachrichtigungen</h1>
        </div>

        <div className="notifications-list">
          {items.length === 0 && (
            <div className="notifications-empty">Keine Benachrichtigungen</div>
          )}
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="notification-card"
                type="button"
                onClick={item.action}
              >
                <div className="notification-icon">
                  <Icon size={18} />
                </div>
                <div className="notification-content">
                  <div className="notification-title">{item.title}</div>
                  <div className="notification-text">{item.text}</div>
                </div>
                <div className="notification-time">{item.time}</div>
              </button>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Notifications;
