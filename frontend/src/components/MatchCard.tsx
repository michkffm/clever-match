import { useTranslation } from "../utils/translations";
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { handleImageError, normalizeImageUrl } from '../utils/imageFallback';
import './MatchCard.css';

export interface MatchCardData {
  id: string;
  firstName: string;
  lastMessage?: string;
  lastSeen?: Date;
  photo?: string;
  commonDances?: string[];
  unread?: number;
}

interface MatchCardProps {
  match: MatchCardData;
  onChatClick: (matchId: string) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onChatClick }) => {
  const t = useTranslation();
  return (
    <div className="match-card">
      {/* Photo */}
      <div className="match-photo">
        {match.photo ? (
          <img
            src={normalizeImageUrl(match.photo)}
            alt={match.firstName}
            onError={handleImageError}
          />
        ) : (
          <div className="match-photo-placeholder">
            {match.firstName.charAt(0).toUpperCase()}
          </div>
        )}
        {match.unread && match.unread > 0 && (
          <div className="match-unread-badge">{match.unread}</div>
        )}
      </div>

      {/* Info */}
      <div className="match-info">
        <div className="match-header">
          <h3 className="match-name">{match.firstName}</h3>
          <span className="match-status">{t("Neuer Match!")}</span>
        </div>

        {/* Common Dances */}
        {match.commonDances && match.commonDances.length > 0 && (
          <div className="match-dances">
            {match.commonDances.slice(0, 3).map((dance, idx) => (
              <span key={idx} className="dance-tag">
                {dance}
              </span>
            ))}
            {match.commonDances.length > 3 && (
              <span className="dance-tag-more">
                +{match.commonDances.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Last Message */}
        {match.lastMessage && (
          <p className="match-last-message">{match.lastMessage}</p>
        )}
      </div>

      {/* Chat Button */}
      <button
        onClick={() => onChatClick(match.id)}
        className="match-chat-btn"
        aria-label={`Chat with ${match.firstName}`}
      >
        <MessageCircle size={24} />
      </button>
    </div>
  );
};

export default MatchCard;
