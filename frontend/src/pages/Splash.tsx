import React, { useState } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import CleverMatchLogo from '../components/CleverMatchLogo';
import './Splash.css';

interface SplashProps {
  onComplete: () => void;
}

export const Splash: React.FC<SplashProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const slides = [
    {
      id: 0,
      backgroundColor: 'linear-gradient(135deg, #4CAF50 0%, #2196F3 100%)',
      title: 'Willkommen bei Clever Match!',
      subtitle: 'Lerne neue Menschen kennen und finde dein Match',
      showLogo: true,
    },
    {
      id: 1,
      backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: '✨',
      title: 'Modern & sicher',
      subtitle: 'Entdecken, matchen, chatten – alles an einem Ort',
      points: [
        'Einfaches Matching',
        'Sichere Kommunikation',
        'Event-Discovery',
      ],
    },
    {
      id: 2,
      backgroundColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      title: 'Bereit zu starten?',
      subtitle: 'Akzeptiere unsere Datenschutzerklärung & Nutzungsbedingungen',
      showCheckbox: true,
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
      setAgreeTerms(false);
    } else if (agreeTerms) {
      onComplete();
    }
  };

  const handleSkip = () => {
    setCurrentSlide(slides.length - 1);
    setAgreeTerms(false);
  };

  const handleStart = () => {
    if (agreeTerms) {
      onComplete();
    }
  };

  const isLastSlide = currentSlide === slides.length - 1;
  const canProceed = isLastSlide ? agreeTerms : true;

  return (
    <div className="splash-container">
      {/* Slides */}
      <div className="splash-slides">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`splash-slide ${idx === currentSlide ? 'active' : ''}`}
            style={{
              background: slide.backgroundColor,
            }}
          >
            {/* Content */}
            <div className="slide-content">
              {slide.showLogo && (
                <div className="slide-logo-large">
                  <CleverMatchLogo size="large" showText={true} />
                </div>
              )}

              {slide.icon && (
                <div className="slide-icon">{slide.icon}</div>
              )}

              <h1 className="splash-title">{slide.title}</h1>
              <p className="splash-subtitle">{slide.subtitle}</p>

              {slide.points && (
                <ul className="splash-points">
                  {slide.points.map((point, i) => (
                    <li key={i}>
                      <Check size={20} className="check-icon" />
                      {point}
                    </li>
                  ))}
                </ul>
              )}

              {slide.showCheckbox && (
                <label className="splash-checkbox-label">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="splash-checkbox"
                  />
                  <span className="checkbox-custom-splash"></span>
                  <span className="checkbox-text">
                    Ich akzeptiere die{' '}
                    <a href="#" className="splash-link">
                      Datenschutz
                    </a>{' '}
                    &{' '}
                    <a href="#" className="splash-link">
                      AGB
                    </a>
                  </span>
                </label>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dots Indicator */}
      <div className="splash-dots">
        {slides.map((_, idx) => (
          <button
            key={idx}
            className={`dot ${idx === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Skip Button */}
      {currentSlide < slides.length - 1 && (
        <button className="splash-skip" onClick={handleSkip}>
          <X size={16} /> Skip
        </button>
      )}

      {/* Navigation Button */}
      <button
        className={`splash-button ${canProceed ? '' : 'disabled'}`}
        onClick={isLastSlide ? handleStart : handleNext}
        disabled={!canProceed}
      >
        {isLastSlide ? 'Loslegen' : 'Weiter'}
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default Splash;
