import { useTranslation } from "../utils/translations";
import React, { useEffect, useState } from 'react';
import { Save, Upload, Trash2 } from 'lucide-react';
import { TanzCheckboxGrid } from '../components/TanzCheckboxGrid';
import { useNotification } from '../components/NotificationContainer';
import { apiClient } from '../services/api';
import { storageService } from '../services/storage';
import { useAuthStore } from '../store/authStore';
import { handleImageError, normalizeImageUrl } from '../utils/imageFallback';
import MainLayout from '../layouts/MainLayout';
import './ProfileEdit.css';

interface ProfileEditState {
  firstName: string;
  lastName: string;
  age: number;
  gender: 'M' | 'W' | 'D' | 'other';
  height: number;
  athleticism: 'very-sporty' | 'sporty' | 'normal' | 'not-sporty';
  figure: 'slim' | 'normal' | 'curvy' | 'muscular';
  bio: string;
  selectedDances: string[];
  danceLevels: { danceId: string; level: 1 | 2 | 3 | 4 | 5 }[];
  customDances: string[];
  searchPurposes: ('hobby' | 'dance-circle' | 'free-time' | 'professional' | 'balls' | 'events' | 'relocation')[];
  photos: string[];
  calendar: boolean[];
}

const initialState: ProfileEditState = {
  firstName: 'Max',
  lastName: 'Mustermann',
  age: 28,
  gender: 'M',
  height: 180,
  athleticism: 'sporty',
  figure: 'normal',
  bio: 'Leidenschaftlicher Tänzer auf der Suche nach meinem perfekten Partner!',
  selectedDances: ['salsa', 'bachata', 'tango'],
  danceLevels: [
    { danceId: 'salsa', level: 3 },
    { danceId: 'bachata', level: 2 },
    { danceId: 'tango', level: 2 },
  ],
  customDances: [],
  searchPurposes: ['hobby', 'events'],
  photos: ['https://via.placeholder.com/200x200?text=Foto+1'],
  calendar: [true, true, false, true, true, false, true],
};

type TabType = 'info' | 'dances' | 'calendar' | 'photos';

export const ProfileEdit: React.FC = () => {
  const t = useTranslation();
  const { user, setUser } = useAuthStore();
  const notify = useNotification();
  const [profile, setProfile] = useState<ProfileEditState>(initialState);
  const [currentTab, setCurrentTab] = useState<TabType>('info');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: string, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleDancesChange = (selectedDances: string[]) => {
    handleChange('selectedDances', selectedDances);
  };

  const handleDanceLevelChange = (danceId: string, level: 1 | 2 | 3 | 4 | 5) => {
    const updated = profile.danceLevels.filter((d) => d.danceId !== danceId);
    updated.push({ danceId, level });
    handleChange('danceLevels', updated);
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfile((prev) => ({
      ...prev,
      firstName: user.firstName || prev.firstName,
      lastName: user.lastName || prev.lastName,
      age: user.age ?? prev.age,
    }));
  }, [user?.id]);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      const response = await apiClient.getProfile();
      if (!isActive) {
        return;
      }

      if (response.data) {
        const data = response.data as any;
        setProfile((prev) => ({
          ...prev,
          firstName: data.firstName ?? prev.firstName,
          lastName: data.lastName ?? prev.lastName,
          age: data.age ?? prev.age,
          bio: data.bio ?? prev.bio,
          selectedDances: Array.isArray(data.danceStyles) ? data.danceStyles : prev.selectedDances,
          searchPurposes: Array.isArray(data.interests) ? data.interests : prev.searchPurposes,
          photos: Array.isArray(data.profilePhotos) ? data.profilePhotos : prev.photos,
        }));
        setHasChanges(false);
      } else if (response.error) {
        console.error('Failed to load profile:', response.error);
      }
    };

    loadProfile();
    return () => {
      isActive = false;
    };
  }, []);

  const handleSave = async () => {
    if (!hasChanges || isSaving) {
      if (!isSaving) {
        notify.info('Keine Änderungen zum Speichern.');
      }
      return;
    }

    try {
      setIsSaving(true);
      const sanitizedPhotos = profile.photos.filter(
        (url) => typeof url === 'string' && /^https?:\/\//.test(url)
      );
      const hasLocalPhotos = sanitizedPhotos.length !== profile.photos.length;

      // Prepare profile update data
      const updateData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        age: profile.age,
        bio: profile.bio,
        danceStyles: profile.selectedDances,
        interests: profile.searchPurposes,
        profilePhotos: sanitizedPhotos,
      };

      const response = await apiClient.updateProfile(updateData);
      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        const updatedProfile = response.data as any;
        setProfile((prev) => ({
          ...prev,
          firstName: updatedProfile.firstName ?? prev.firstName,
          lastName: updatedProfile.lastName ?? prev.lastName,
          age: updatedProfile.age ?? prev.age,
          bio: updatedProfile.bio ?? prev.bio,
          selectedDances: Array.isArray(updatedProfile.danceStyles)
            ? updatedProfile.danceStyles
            : prev.selectedDances,
          searchPurposes: Array.isArray(updatedProfile.interests)
            ? updatedProfile.interests
            : prev.searchPurposes,
          photos: Array.isArray(updatedProfile.profilePhotos)
            ? updatedProfile.profilePhotos
            : prev.photos,
        }));

        const nextUser = {
          ...(user || {}),
          id: updatedProfile.id ?? user?.id,
          email: updatedProfile.email ?? user?.email,
          firstName: updatedProfile.firstName ?? user?.firstName,
          lastName: updatedProfile.lastName ?? user?.lastName,
          age: updatedProfile.age ?? user?.age,
          zipCode: updatedProfile.zipCode ?? user?.zipCode,
          createdAt: updatedProfile.createdAt ?? user?.createdAt,
          role: updatedProfile.role ?? user?.role,
        };

        if (nextUser.id) {
          setUser(nextUser);
          storageService.setUser(nextUser);
        }
      }

      setHasChanges(false);
      notify.success('Profil gespeichert.');
      if (hasLocalPhotos) {
        notify.warning('Einige lokale Fotos wurden nicht gespeichert. Bitte erneut hochladen.');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      notify.error('Speichern fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && profile.photos.length < 5) {
      try {
        // Upload to API
        const response = await apiClient.uploadProfilePhotos(Array.from(files));
        const data = response.data as { data?: string[] } | undefined;
        const uploadedUrls = (data?.data || []) as string[];

        // Add uploaded URLs to profile photos
        const newPhotos = [...profile.photos, ...uploadedUrls];
        if (newPhotos.length <= 5) {
          handleChange('photos', newPhotos);
        }
    } catch (error) {
      console.error('Failed to upload photos:', error);
      notify.warning('Upload fehlgeschlagen. Foto ist nur lokal sichtbar.');
      // Fallback to local preview
      const newPhotos = [...profile.photos, URL.createObjectURL(files[0])];
      if (newPhotos.length <= 5) {
        handleChange('photos', newPhotos);
      }
      }
    }
  };

  const handlePhotoDelete = (index: number) => {
    const newPhotos = profile.photos.filter((_, i) => i !== index);
    handleChange('photos', newPhotos);
  };

  const togglePurpose = (purpose: typeof profile.searchPurposes[0]) => {
    const updated = profile.searchPurposes.includes(purpose)
      ? profile.searchPurposes.filter((p) => p !== purpose)
      : [...profile.searchPurposes, purpose];
    handleChange('searchPurposes', updated);
  };

  const toggleCalendarDay = (dayIndex: number) => {
    const newCalendar = [...profile.calendar];
    newCalendar[dayIndex] = !newCalendar[dayIndex];
    handleChange('calendar', newCalendar);
  };

  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <MainLayout>
      <div className="profile-edit-container">
        {/* Header */}
        <div className="profile-edit-header">
          <h1>{t("Mein Profil bearbeiten")}</h1>
          <div className="profile-edit-actions">
            <button
              className={`btn-save ${isSaving ? 'disabled' : ''}`}
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save size={18} /> {isSaving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`tab-btn ${currentTab === 'info' ? 'active' : ''}`}
            onClick={() => setCurrentTab('info')}
          >
            Info
          </button>
          <button
            className={`tab-btn ${currentTab === 'dances' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dances')}
          >
            Tänze
          </button>
          <button
            className={`tab-btn ${currentTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setCurrentTab('calendar')}
          >
            Kalender
          </button>
          <button
            className={`tab-btn ${currentTab === 'photos' ? 'active' : ''}`}
            onClick={() => setCurrentTab('photos')}
          >
            Fotos
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Info Tab */}
          {currentTab === 'info' && (
            <div className="info-tab">
              <div className="form-section">
                <h2>{t("Grundinfos")}</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("Vorname")}</label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      className="form-input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("Nachname")}</label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      className="form-input-field"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("Alter (Jahre)")}</label>
                    <input
                      type="number"
                      min="18"
                      max="70"
                      value={profile.age}
                      onChange={(e) => handleChange('age', parseInt(e.target.value))}
                      className="form-input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("Größe (cm)")}</label>
                    <input
                      type="number"
                      min="150"
                      max="210"
                      value={profile.height}
                      onChange={(e) => handleChange('height', parseInt(e.target.value))}
                      className="form-input-field"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("Geschlecht")}</label>
                    <select
                      value={profile.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      className="form-input-field"
                    >
                      <option value="M">{t("Männlich")}</option>
                      <option value="W">{t("Weiblich")}</option>
                      <option value="D">{t("Divers")}</option>
                      <option value="other">{t("Sonstiges")}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h2>{t("Körperbau")}</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("Sportlichkeit")}</label>
                    <select
                      value={profile.athleticism}
                      onChange={(e) => handleChange('athleticism', e.target.value)}
                      className="form-input-field"
                    >
                      <option value="very-sporty">{t("Sehr sportlich")}</option>
                      <option value="sporty">{t("Sportlich")}</option>
                      <option value="normal">Normal</option>
                      <option value="not-sporty">{t("Wenig sportlich")}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t("Figur")}</label>
                    <select
                      value={profile.figure}
                      onChange={(e) => handleChange('figure', e.target.value)}
                      className="form-input-field"
                    >
                      <option value="slim">{t("Schlank")}</option>
                      <option value="normal">Normal</option>
                      <option value="curvy">{t("Kurvig")}</option>
                      <option value="muscular">{t("Muskulös")}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h2>{t("Über mich")}</h2>

                <div className="form-group">
                  <label>Bio ({profile.bio.length}/200 Zeichen)</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => handleChange('bio', e.target.value.substring(0, 200))}
                    className="form-input-field textarea"
                    placeholder={t("Erzähle etwas über dich...")}
                    rows={4}
                  />
                </div>
              </div>

              {/* Search Purposes */}
              <div className="form-section">
                <h2>{t("Suchzweck")}</h2>
                <div className="checkbox-group">
                  {[
                    { id: 'hobby', label: 'Hobby' },
                    { id: 'dance-circle', label: 'Tanzkreis' },
                    { id: 'free-time', label: 'Freizeit' },
                    { id: 'professional', label: 'Beruflich' },
                    { id: 'balls', label: 'Bälle/Turniere' },
                    { id: 'events', label: 'Events' },
                    { id: 'relocation', label: 'Umzug' },
                  ].map((purpose: any) => (
                    <label key={purpose.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={profile.searchPurposes.includes(purpose.id)}
                        onChange={() => togglePurpose(purpose.id)}
                        className="checkbox-input"
                      />
                      <span className="checkbox-custom"></span>
                      {purpose.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dances Tab */}
          {currentTab === 'dances' && (
            <div className="dances-tab">
              <h2>{t("Meine Tänze")}</h2>
              <TanzCheckboxGrid
                selectedDances={profile.selectedDances}
                onChange={handleDancesChange}
                showLevels={true}
                levels={profile.danceLevels}
                onLevelChange={handleDanceLevelChange}
                customDances={profile.customDances}
                onCustomDancesChange={(customs) => handleChange('customDances', customs)}
              />
            </div>
          )}

          {/* Calendar Tab */}
          {currentTab === 'calendar' && (
            <div className="calendar-tab">
              <h2>{t("Verfügbarkeit (Diese Woche)")}</h2>
              <div className="calendar-grid">
                {days.map((day, idx) => (
                  <button
                    key={idx}
                    className={`calendar-day ${profile.calendar[idx] ? 'available' : 'busy'}`}
                    onClick={() => toggleCalendarDay(idx)}
                  >
                    <span className="day-label">{day}</span>
                    <span className="day-status">
                      {profile.calendar[idx] ? '✓ Frei' : '✗ Besetzt'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photos Tab */}
          {currentTab === 'photos' && (
            <div className="photos-tab">
              <h2>{t("Meine Fotos (max. 5)")}</h2>
              <div className="photos-grid">
                {profile.photos.map((photo, idx) => (
                  <div key={idx} className="photo-item">
                    <img
                      src={normalizeImageUrl(photo)}
                      alt={`Foto ${idx + 1}`}
                      onError={handleImageError}
                    />
                    <button
                      className="btn-delete-photo"
                      onClick={() => handlePhotoDelete(idx)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {profile.photos.length < 5 && (
                  <label className="photo-upload">
                    <Upload size={28} />
                    <span>{t("Foto hinzufügen")}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
              <p className="photos-hint">{t("Hochwertige Fotos erhalten mehr Matches!")}</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfileEdit;
