import { useLanguage } from '../utils/i18n';
import React, { useState, useEffect } from 'react';
import type { PreviewProfile } from '../types';
import MainLayout from '../layouts/MainLayout';
import SwipeContainer from '../components/SwipeContainer';
import FilterModal from '../components/FilterModal';
import CleverMatchLogo from '../components/CleverMatchLogo';
import { apiClient } from '../services/api';
import './Home.css';


export const Home: React.FC = () => {
  const en = useLanguage() === 'en';
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<import('../components/FilterModal').FilterState>({ ageMin: 18, ageMax: 99, radiusMax: 500 });
  const [profiles, setProfiles] = useState<PreviewProfile[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfiles() {
      try {
        const response = await apiClient.getProfiles();
        if (response.error) { setError(en ? 'Profiles could not be loaded.' : 'Profile konnten nicht geladen werden.'); return; }
        const data = response.data as { data?: PreviewProfile[] } | undefined;
        setProfiles((data?.data || []) as PreviewProfile[]);
      } catch (error) {
        console.error('Failed to load profiles:', error);
        setError(en ? 'Profiles could not be loaded.' : 'Profile konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    }
    void loadProfiles();
  }, [en]);

  const handleMatch = async (profileId: string) => {
    const response = await apiClient.createMatch(profileId, 'like');
    if (response.error) { setError(en ? 'Action failed. Please try again.' : 'Aktion fehlgeschlagen. Bitte versuche es erneut.'); return; }
    setProfiles(current => current.filter(profile => profile.id !== profileId));
    setError('');
  };

  const handlePass = async (profileId: string) => {
    const response = await apiClient.createMatch(profileId, 'pass');
    if (response.error) { setError(en ? 'Action failed. Please try again.' : 'Aktion fehlgeschlagen. Bitte versuche es erneut.'); return; }
    setProfiles(current => current.filter(profile => profile.id !== profileId));
    setError('');
  };

  const handleSuperlike = async (profileId: string) => {
    const response = await apiClient.createMatch(profileId, 'superlike');
    if (response.error) { setError(en ? 'Action failed. Please try again.' : 'Aktion fehlgeschlagen. Bitte versuche es erneut.'); return; }
    setProfiles(current => current.filter(profile => profile.id !== profileId));
    setError('');
  };

  const handleFilterClick = () => {
    setShowFilter(!showFilter);
  };

  const handleApplyFilters = (filters: import("../components/FilterModal").FilterState) => {
    setFilters(filters);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="home-container">
          <header className="home-hero">
            <div className="home-logo-wrap">
              <CleverMatchLogo size="large" showText={false} />
            </div>
            <h1 className="home-brand-title">Clever Match</h1>
          </header>

          <div style={{ textAlign: 'center', padding: '1rem 2rem 2rem' }}>{en ? 'Loading profiles…' : 'Profile werden geladen…'}</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="home-container">
        <header className="home-hero">
          <div className="home-logo-wrap">
            <CleverMatchLogo size="large" showText={false} />
          </div>
          <h1 className="home-brand-title">Clever Match</h1>
        </header>

        {error && <p role="alert">{error}</p>}
        <div className="home-swipe-area">
          <SwipeContainer
            profiles={profiles.filter(profile => (!profile.age || (profile.age >= filters.ageMin && profile.age <= filters.ageMax)) && (profile.distance == null || profile.distance <= filters.radiusMax))}
            onMatch={handleMatch}
            onPass={handlePass}
            onSuperlike={handleSuperlike}
            onFilterClick={handleFilterClick}
          />
        </div>

        <FilterModal
          isOpen={showFilter}
          onClose={() => setShowFilter(false)}
          onApplyFilters={handleApplyFilters}
        />
      </div>
    </MainLayout>
  );
};

export default Home;
