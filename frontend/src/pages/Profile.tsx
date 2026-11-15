import { useTranslation } from "../utils/translations";
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heart, Share2, Flag, X, ChevronLeft, ChevronRight } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { apiClient } from '../services/api';
import { handleImageError, normalizeImageUrl } from '../utils/imageFallback';
import type { PublicProfile as ApiProfile } from '../types/api';
import './Profile.css';

interface UserProfile {
  id: string;
  firstName: string;
  age: number;
  height?: number;
  city: string;
  distance: number;
  bio: string;
  dances: string[];
  photos: string[];
  compatibility: number;
  verified: boolean;
  online: boolean;
}

export const Profile: React.FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const validPhotos = (profile?.photos ?? []).filter(
    (photo) => typeof photo === 'string' && photo.trim().length > 0
  );

  useEffect(() => {
    if (!id) {
      setLoadError('Profil nicht gefunden.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadProfile = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await apiClient.getProfileById(id);
        const data = response.data as ApiProfile | undefined;
        if (!data) {
          throw new Error(response.error || 'Profil konnte nicht geladen werden.');
        }

        if (!cancelled) {
          const photos = data.profilePhotos?.length
            ? data.profilePhotos
            : data.profilePhoto
              ? [data.profilePhoto]
              : [];

          setProfile({
            id: data.id,
            firstName: data.firstName,
            age: data.age ?? 0,
            height: undefined,
            city: data.location?.city || 'Unbekannt',
            distance: data.location?.distance ?? 0,
            bio: data.bio || 'Noch keine Beschreibung',
            dances: data.danceStyles || [],
            photos,
            compatibility: 0,
            verified: false,
            online: false,
          });
          setCurrentPhotoIndex(0);
        }
      } catch {
        if (!cancelled) setLoadError('Profil konnte nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePrevPhoto = () => {
    if (validPhotos.length === 0) {
      return;
    }
    setCurrentPhotoIndex(
      (prev) =>
        (prev - 1 + validPhotos.length) %
        validPhotos.length
    );
  };

  const handleNextPhoto = () => {
    if (validPhotos.length === 0) {
      return;
    }
    setCurrentPhotoIndex(
      (prev) => (prev + 1) % validPhotos.length
    );
  };

  const handleLike = () => {
    if (!profile) return;
    setActionError(null);
    void apiClient.createMatch(profile.id, 'like').then((response) => {
      if (response.error) {
        setActionError(response.error);
        return;
      }
      setLiked(true);
    });
  };

  const handleReport = (reason: string) => {
    setActionError(`${reason}: Meldungen können derzeit nicht übermittelt werden.`);
    setShowReportModal(false);
  };

  if (loading) {
    return <MainLayout><div className="profile-view-container" role="status">{t("Profil wird geladen …")}</div></MainLayout>;
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="profile-view-container" role="alert">
          <p>{loadError || 'Profil nicht gefunden.'}</p>
          <button type="button" onClick={() => navigate('/')}>{t("Zurück")}</button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="profile-view-container">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="profile-back-btn"
          aria-label="Back"
        >
          <X size={24} />
        </button>

        {/* Photos Carousel */}
        <div className="profile-photos-carousel">
          <div className="carousel-image">
            {validPhotos.length > 0 ? (
              <img
                src={normalizeImageUrl(validPhotos[currentPhotoIndex])}
                alt={`${profile.firstName} ${currentPhotoIndex + 1}`}
                onError={handleImageError}
              />
            ) : (
              <img
                src="/user-placeholder.svg"
                alt="Platzhalter"
                className="image-fallback"
              />
            )}
          </div>

          {/* Photo Nav */}
          <button
            onClick={handlePrevPhoto}
            className="carousel-btn prev"
            aria-label="Previous photo"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={handleNextPhoto}
            className="carousel-btn next"
            aria-label="Next photo"
          >
            <ChevronRight size={24} />
          </button>

          {/* Photo Indicators */}
          <div className="carousel-indicators">
            {validPhotos.map((_, idx) => (
              <div
                key={idx}
                className={`indicator ${
                  idx === currentPhotoIndex ? 'active' : ''
                }`}
                onClick={() => setCurrentPhotoIndex(idx)}
              />
            ))}
          </div>

          {/* Badges */}
          <div className="profile-badges">
            {profile.verified && (
              <div className="badge verified">✓ Verifiziert</div>
            )}
            {profile.online && (
              <div className="badge online">● Online</div>
            )}
            <div className="badge compatibility">
              {profile.compatibility}% Match
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="profile-view-content">
          {/* Header */}
          <div className="profile-view-header">
            <div>
              <h1>
                {profile.firstName}, {profile.age || '—'}
              </h1>
              <p className="profile-meta">
                {profile.height ? `${profile.height}cm • ` : ''}{profile.distance ? `${profile.distance} km entfernt` : 'Entfernung n/a'}
              </p>
            </div>
            <button
              type="button"
              className="btn-edit-profile"
              onClick={() => navigate('/profile/edit')}
            >
              {t("Profil erstellen")}
            </button>
          </div>

          {/* Bio */}
          <div className="profile-view-section">
            <h3>{t("Über mich")}</h3>
            <p>{profile.bio}</p>
          </div>

          {/* Dances */}
          <div className="profile-view-section">
            <h3>{t("Liebliche Tänze")}</h3>
            <div className="dance-tags">
              {profile.dances.map((dance, idx) => (
                <span key={idx} className="tag">
                  {dance}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="profile-view-actions">
            {actionError && <p role="alert">{actionError}</p>}
            <button
              onClick={handleLike}
              className={`action-btn like ${liked ? 'liked' : ''}`}
              title="Gefällt mir"
            >
              <Heart size={24} fill={liked ? '#f44336' : 'none'} />
            </button>
            <button
              onClick={() => navigate('/matches')}
              className="action-btn message"
              title="Matches"
            >
              💬
            </button>
            <button
              onClick={() => {
                /* Share */
              }}
              className="action-btn share"
              title="Teilen"
            >
              <Share2 size={24} />
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="action-btn report"
              title="Melden"
            >
              <Flag size={24} />
            </button>
          </div>

          {/* Report Modal */}
          {showReportModal && (
            <div className="report-modal-overlay">
              <div className="report-modal">
                <h2>{t("Profil melden")}</h2>
                <p>{t("Warum möchtest du dieses Profil melden?")}</p>

                <div className="report-options">
                  <button
                    onClick={() => handleReport('inappropriate')}
                    className="report-option"
                  >
                    Unangemessener Inhalt
                  </button>
                  <button
                    onClick={() => handleReport('fake')}
                    className="report-option"
                  >
                    Fake-Profil
                  </button>
                  <button
                    onClick={() => handleReport('harassment')}
                    className="report-option"
                  >
                    Belästigung/Missbrauch
                  </button>
                  <button
                    onClick={() => handleReport('other')}
                    className="report-option"
                  >
                    {t("Sonstiges")}
                  </button>
                </div>

                <button
                  onClick={() => setShowReportModal(false)}
                  className="btn-secondary report-cancel"
                >
                  {t("Abbrechen")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
