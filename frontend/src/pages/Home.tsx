import React, { useState, useEffect } from 'react';
import type { PreviewProfile } from '../types';
import MainLayout from '../layouts/MainLayout';
import SwipeContainer from '../components/SwipeContainer';
import FilterModal from '../components/FilterModal';
import TanzMatchLogo from '../components/TanzMatchLogo';
import { apiClient } from '../services/api';
import './Home.css';

// Mock-Daten für Fallback
const MOCK_PROFILES: PreviewProfile[] = [];

export const Home: React.FC = () => {
  const [profiles, setProfiles] = useState<PreviewProfile[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfiles() {
      try {
        const response = await apiClient.getProfiles();
        const data = response.data as { data?: any[] } | undefined;
        setProfiles((data?.data || []) as PreviewProfile[]);
      } catch (error) {
        console.error('Failed to load profiles:', error);
        setProfiles(MOCK_PROFILES);
      } finally {
        setLoading(false);
      }
    }
    void loadProfiles();
  }, []);

  const handleMatch = async (profileId: string) => {
    try {
      await apiClient.createMatch(profileId, 'like');
      console.log('Matched with:', profileId);
      // Remove matched profile from list
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    } catch (error) {
      console.error('Failed to create match:', error);
    }
  };

  const handlePass = async (profileId: string) => {
    try {
      await apiClient.createMatch(profileId, 'pass');
      console.log('Passed on:', profileId);
      // Remove passed profile from list
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    } catch (error) {
      console.error('Failed to pass:', error);
    }
  };

  const handleSuperlike = async (profileId: string) => {
    try {
      await apiClient.createMatch(profileId, 'superlike');
      console.log('Superliked:', profileId);
      // Remove superliked profile from list
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    } catch (error) {
      console.error('Failed to superlike:', error);
    }
  };

  const handleFilterClick = () => {
    setShowFilter(!showFilter);
  };

  const handleApplyFilters = (filters: any) => {
    console.log('Filters applied:', filters);
    // TODO: Implement filter logic with API
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="home-container">
          <header className="home-hero">
            <div className="home-logo-wrap">
              <TanzMatchLogo size="large" showText={false} />
            </div>
            <h1 className="home-brand-title">TanzMatch</h1>
          </header>

          <div style={{ textAlign: 'center', padding: '1rem 2rem 2rem' }}>Loading profiles...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="home-container">
        <header className="home-hero">
          <div className="home-logo-wrap">
            <TanzMatchLogo size="large" showText={false} />
          </div>
          <h1 className="home-brand-title">TanzMatch</h1>
        </header>

        <div className="home-swipe-area">
          <SwipeContainer
            profiles={profiles}
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
