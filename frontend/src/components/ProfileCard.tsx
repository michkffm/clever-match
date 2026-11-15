import React from 'react';
import { MapPin, Heart, Zap, X } from 'lucide-react';
import type { PreviewProfile } from '../types';
import { handleImageError, normalizeImageUrl } from '../utils/imageFallback';
import './ProfileCard.css';

interface ProfileCardProps {
  profile: PreviewProfile;
  onLike?: () => void;
  onNope?: () => void;
  onSuperlike?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onLike,
  onNope,
  onSuperlike,
}) => {
  const primaryPhoto = profile.photos?.find(
    (photo) => typeof photo === 'string' && photo.trim().length > 0
  );
  const selectedDances = profile.dances
    .filter((d) => d)
    .slice(0, 3)
    .map((d) => {
      // Just show dance IDs as shorthand
      const danceMap: Record<string, string> = {
        'waltz': 'Walzer',
        'salsa': 'Salsa',
        'tango': 'Tango',
        'bachata': 'Bachata',
        'cha-cha-cha': 'Cha-Cha',
        'quickstep': 'Quickstep',
      };
      return danceMap[d.danceId] || d.danceId.split('-')[0];
    });

  return (
    <div className="profile-card">
      {/* Photo Slider */}
      <div className="card-photo">
        {primaryPhoto ? (
          <img
            src={normalizeImageUrl(primaryPhoto)}
            alt={profile.firstName}
            className="photo-image"
            onError={handleImageError}
          />
        ) : (
          <div className="photo-placeholder">📸</div>
        )}

        {/* Online Indicator */}
        {profile.online && <div className="online-badge">Online</div>}

        {/* Compatibility Badge */}
        {profile.compatibility && (
          <div className="compatibility-badge">{profile.compatibility}% Match</div>
        )}
      </div>

      {/* Info Section */}
      <div className="card-info">
        {/* Name, Age, Height */}
        <div className="name-section">
          <h2 className="profile-name">
            {profile.firstName}, {profile.age}
          </h2>
          <p className="profile-meta">
            {profile.height ? `${profile.height} cm · ` : ''}{profile.city}
          </p>
        </div>

        {/* Distance */}
        {profile.distance && (
          <div className="distance-row">
            <MapPin size={16} />
            <span>{profile.distance}km entfernt</span>
          </div>
        )}

        {/* Dances */}
        {selectedDances.length > 0 && (
          <div className="dances-row">
            {selectedDances.map((dance, idx) => (
              <span key={idx} className="dance-tag">
                {dance}
              </span>
            ))}
            {profile.dances.length > 3 && (
              <span className="dance-tag more">+{profile.dances.length - 3}</span>
            )}
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="profile-bio">
            {profile.bio.length > 160 ? `${profile.bio.substring(0, 160)}...` : profile.bio}
          </p>
        )}

        {/* Action Buttons */}
        <div className="card-buttons">
          <button className="btn-nope" onClick={onNope} aria-label="Pass">
            <X size={24} />
          </button>
          <button className="btn-like" onClick={onLike} aria-label="Like">
            <Heart size={24} />
          </button>
          <button className="btn-superlike" onClick={onSuperlike} aria-label="Superlike">
            <Zap size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
