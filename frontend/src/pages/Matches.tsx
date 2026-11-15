import { useTranslation } from "../utils/translations";
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import MatchCard from '../components/MatchCard';
import type { MatchCardData } from '../components/MatchCard';
import { apiClient } from '../services/api';
import { storageService } from '../services/storage';
import type { Match, Profile, Message } from '../types/api';
import './Matches.css';

export const Matches: React.FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchCardData[]>([]);

  useEffect(() => {
    async function loadMatches() {
      const currentUserId = storageService.getUser()?.id;
      const matchesResponse = await apiClient.getMatches();
      const payload = matchesResponse.data as { data?: Match[] } | undefined;
      const items = payload?.data || [];

      const cards = await Promise.all(
        items.map(async (match) => {
          const [profileResponse, messagesResponse] = await Promise.all([
            apiClient.getProfileById(match.userId),
            apiClient.getMessages(match.id),
          ]);

          const profile = profileResponse.data as Profile | undefined;
          const messagePayload = messagesResponse.data as { data?: Message[] } | undefined;
          const messages = messagePayload?.data || [];
          const lastMessage = messages.at(-1);
          const unreadCount = currentUserId
            ? messages.filter(
                (message) => !message.read && message.senderId !== currentUserId
              ).length
            : 0;

          return {
            id: match.id,
            firstName: profile?.firstName || 'Match',
            lastMessage: lastMessage?.text,
            photo: profile?.profilePhotos?.[0],
            commonDances: profile?.danceStyles || [],
            unread: unreadCount,
          } satisfies MatchCardData;
        })
      );

      setMatches(cards);
    }

    void loadMatches();
  }, []);

  const handleChatClick = (matchId: string) => {
    navigate(`/chat/${matchId}`);
  };

  const totalUnread = matches.reduce((sum, match) => sum + (match.unread || 0), 0);

  return (
    <MainLayout>
      <div className="matches-container">
        <div className="matches-header">
          <span className="matches-unread-count matches-unread-spacer" aria-hidden="true">
            <MessageCircle size={16} />
          </span>
          <h1>{t("Meine Matches")}</h1>
          {totalUnread > 0 && (
            <div className="matches-unread-count">
              {totalUnread} neue Nachrichten
            </div>
          )}
        </div>

        {matches.length > 0 ? (
          <div className="matches-list">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onChatClick={handleChatClick}
              />
            ))}
          </div>
        ) : (
          <div className="matches-empty">
            <div className="matches-empty-icon">💔</div>
            <h2>{t("Noch keine Matches")}</h2>
            <p>{t("Entdecke neue Menschen und finde dein Match!")}</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Matches;
