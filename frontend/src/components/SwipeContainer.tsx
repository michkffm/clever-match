import React, { useState, useRef } from 'react';
import type { PreviewProfile } from '../types';
import ProfileCard from './ProfileCard';
import './SwipeContainer.css';

interface SwipeContainerProps {
  profiles: PreviewProfile[];
  onMatch?: (profileId: string) => void;
  onPass?: (profileId: string) => void;
  onSuperlike?: (profileId: string) => void;
  onFilterClick?: () => void;
}

export const SwipeContainer: React.FC<SwipeContainerProps> = ({
  profiles,
  onMatch,
  onPass,
  onSuperlike,
  onFilterClick,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSwipeLeft = () => {
    onPass?.(profiles[currentIndex].id);
    handleNext();
  };

  const handleSwipeRight = () => {
    onMatch?.(profiles[currentIndex].id);
    handleNext();
  };

  const handleSuperlike = () => {
    onSuperlike?.(profiles[currentIndex].id);
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Reset or show "no more profiles" message
      setCurrentIndex(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleSwipeLeft();
    } else if (isRightSwipe) {
      handleSwipeRight();
    }
  };

  if (profiles.length === 0) {
    return (
      <div className="swipe-container-empty">
        <div className="empty-state">
          <h2>Keine Profile gefunden 🤔</h2>
          <p>Versuche, deine Filter anzupassen</p>
          <button className="btn-primary" onClick={onFilterClick}>
            Filter ändern
          </button>
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div
      className="swipe-container"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Carousel overlay info */}
      <div className="carousel-position">
        {currentIndex + 1} / {profiles.length}
      </div>

      {/* Filter button */}
      <button className="filter-button" onClick={onFilterClick} aria-label="Filter">
        🔍 Filter
      </button>

      {/* Main card */}
      <div className="card-container">
        <ProfileCard
          profile={currentProfile}
          onNope={handleSwipeLeft}
          onLike={handleSwipeRight}
          onSuperlike={handleSuperlike}
        />
      </div>

      {/* Pull-to-refresh hint */}
      <div className="pull-refresh-hint">⬆ Pull to refresh</div>
    </div>
  );
};

export default SwipeContainer;
