import React, { useState } from 'react';
import { X } from 'lucide-react';
import TanzCheckboxGrid from './TanzCheckboxGrid';
import './FilterModal.css';

interface FilterState {
  ageMin: number;
  ageMax: number;
  heightMin: number;
  heightMax: number;
  radiusMax: number;
  gender: string[];
  athleticism: string[];
  figure: string[];
  dances: string[];
  searchPurposes: string[];
  onlineOnly: boolean;
  verified: boolean;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterState) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    ageMin: 18,
    ageMax: 50,
    heightMin: 150,
    heightMax: 200,
    radiusMax: 50,
    gender: [],
    athleticism: [],
    figure: [],
    dances: [],
    searchPurposes: [],
    onlineOnly: false,
    verified: false,
  });

  const genders = ['Männlich', 'Weiblich', 'Divers'];
  const athleticism = ['Sehr sportlich', 'Sportlich', 'Moderat', 'Wenig', 'Keine Angabe'];
  const figures = ['Schlank', 'Normal', 'Kurvig', 'Muskulös', 'Kein Interesse'];

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const handleAgeMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (Number.isNaN(value)) return;
    setFilters({
      ...filters,
      ageMin: Math.min(clamp(value, 18, 70), filters.ageMax),
    });
  };

  const handleAgeMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (Number.isNaN(value)) return;
    setFilters({
      ...filters,
      ageMax: Math.max(clamp(value, 18, 70), filters.ageMin),
    });
  };

  const handleHeightMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (Number.isNaN(value)) return;
    setFilters({
      ...filters,
      heightMin: Math.min(clamp(value, 140, 220), filters.heightMax),
    });
  };

  const handleHeightMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (Number.isNaN(value)) return;
    setFilters({
      ...filters,
      heightMax: Math.max(clamp(value, 140, 220), filters.heightMin),
    });
  };

  const handleAgeMinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (Number.isNaN(value)) return;
    setFilters({
      ...filters,
      ageMin: Math.min(clamp(value, 18, 70), filters.ageMax),
    });
  };

  const handleAgeMaxInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (Number.isNaN(value)) return;
    setFilters({
      ...filters,
      ageMax: Math.max(clamp(value, 18, 70), filters.ageMin),
    });
  };

  const handleHeightMinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (Number.isNaN(value)) return;
    setFilters({
      ...filters,
      heightMin: Math.min(clamp(value, 140, 220), filters.heightMax),
    });
  };

  const handleHeightMaxInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (Number.isNaN(value)) return;
    setFilters({
      ...filters,
      heightMax: Math.max(clamp(value, 140, 220), filters.heightMin),
    });
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      radiusMax: parseInt(e.target.value),
    });
  };

  const toggleCheckbox = (
    category: 'gender' | 'athleticism' | 'figure' | 'searchPurposes',
    value: string
  ) => {
    setFilters({
      ...filters,
      [category]: filters[category].includes(value)
        ? filters[category].filter((item) => item !== value)
        : [...filters[category], value],
    });
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      ageMin: 18,
      ageMax: 50,
      heightMin: 150,
      heightMax: 200,
      radiusMax: 50,
      gender: [],
      athleticism: [],
      figure: [],
      dances: [],
      searchPurposes: [],
      onlineOnly: false,
      verified: false,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="filter-modal-overlay">
      <div className="filter-modal">
        {/* Header */}
        <div className="filter-modal-header">
          <button
            onClick={onClose}
            className="filter-modal-back"
            aria-label="Zurück"
          >
            Zurück
          </button>
          <h2>Filter</h2>
          <button
            onClick={onClose}
            className="filter-modal-close"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="filter-modal-content">
          {/* ENTFERNUNG / RADIUS */}
          <div className="filter-section">
            <h3 className="filter-section-title">Entfernung</h3>
            <div className="filter-slider-group">
              <label>Bis zu {filters.radiusMax} km</label>
              <input
                type="range"
                min="1"
                max="100"
                value={filters.radiusMax}
                onChange={handleRadiusChange}
                className="filter-slider"
              />
              <div className="slider-values-label">1 km – 100 km</div>
            </div>
          </div>

          {/* ALTER */}
          <div className="filter-section">
            <h3 className="filter-section-title">Alter</h3>
            <div className="filter-slider-group">
              <div className="range-inputs">
                <label className="range-field">
                  <span>Von</span>
                  <input
                    type="number"
                    min="18"
                    max="70"
                    value={filters.ageMin}
                    onChange={handleAgeMinInput}
                  />
                </label>
                <label className="range-field">
                  <span>Bis</span>
                  <input
                    type="number"
                    min="18"
                    max="70"
                    value={filters.ageMax}
                    onChange={handleAgeMaxInput}
                  />
                </label>
              </div>
              <div className="slider-range-labels">
                <span>{filters.ageMin}</span>
                <span>{filters.ageMax}</span>
              </div>
              <div
                className="range-slider"
                style={
                  {
                    '--min': 18,
                    '--max': 70,
                    '--lower': filters.ageMin,
                    '--upper': filters.ageMax,
                  } as React.CSSProperties
                }
              >
                <div className="range-track"></div>
                <input
                  type="range"
                  min="18"
                  max="70"
                  value={filters.ageMin}
                  onChange={handleAgeMinChange}
                  className="range-input range-input-min"
                />
                <input
                  type="range"
                  min="18"
                  max="70"
                  value={filters.ageMax}
                  onChange={handleAgeMaxChange}
                  className="range-input range-input-max"
                />
              </div>
              <div className="slider-values-label">18 – 70 Jahre</div>
            </div>
          </div>

          {/* KÖRPERGRÖSSE */}
          <div className="filter-section">
            <h3 className="filter-section-title">Körpergröße</h3>
            <div className="filter-slider-group">
              <div className="range-inputs">
                <label className="range-field">
                  <span>Von</span>
                  <input
                    type="number"
                    min="140"
                    max="220"
                    value={filters.heightMin}
                    onChange={handleHeightMinInput}
                  />
                </label>
                <label className="range-field">
                  <span>Bis</span>
                  <input
                    type="number"
                    min="140"
                    max="220"
                    value={filters.heightMax}
                    onChange={handleHeightMaxInput}
                  />
                </label>
              </div>
              <div className="slider-range-labels">
                <span>{filters.heightMin} cm</span>
                <span>{filters.heightMax} cm</span>
              </div>
              <div
                className="range-slider"
                style={
                  {
                    '--min': 140,
                    '--max': 220,
                    '--lower': filters.heightMin,
                    '--upper': filters.heightMax,
                  } as React.CSSProperties
                }
              >
                <div className="range-track"></div>
                <input
                  type="range"
                  min="140"
                  max="220"
                  value={filters.heightMin}
                  onChange={handleHeightMinChange}
                  className="range-input range-input-min"
                />
                <input
                  type="range"
                  min="140"
                  max="220"
                  value={filters.heightMax}
                  onChange={handleHeightMaxChange}
                  className="range-input range-input-max"
                />
              </div>
              <div className="slider-values-label">140 – 220 cm</div>
            </div>
          </div>

          {/* GESCHLECHT */}
          <div className="filter-section">
            <h3 className="filter-section-title">Geschlecht</h3>
            <div className="filter-checkboxes">
              {genders.map((gender) => (
                <label key={gender} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.gender.includes(gender)}
                    onChange={() => toggleCheckbox('gender', gender)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  {gender}
                </label>
              ))}
            </div>
          </div>

          {/* SPORTLICHKEIT */}
          <div className="filter-section">
            <h3 className="filter-section-title">Sportlichkeit</h3>
            <div className="filter-checkboxes">
              {athleticism.map((level) => (
                <label key={level} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.athleticism.includes(level)}
                    onChange={() => toggleCheckbox('athleticism', level)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  {level}
                </label>
              ))}
            </div>
          </div>

          {/* FIGUR */}
          <div className="filter-section">
            <h3 className="filter-section-title">Figur</h3>
            <div className="filter-checkboxes">
              {figures.map((figure) => (
                <label key={figure} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.figure.includes(figure)}
                    onChange={() => toggleCheckbox('figure', figure)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  {figure}
                </label>
              ))}
            </div>
          </div>

          {/* TÄNZE */}
          <div className="filter-section full-width">
            <h3 className="filter-section-title">Tänze</h3>
            <TanzCheckboxGrid
              selectedDances={filters.dances}
              onChange={(dances) => {
                setFilters({
                  ...filters,
                  dances,
                });
              }}
              showLevels={false}
            />
          </div>

          {/* TOGGLES */}
          <div className="filter-section full-width">
            <h3 className="filter-section-title">Weitere Filter</h3>
            <div className="filter-toggles">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={filters.onlineOnly}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      onlineOnly: e.target.checked,
                    })
                  }
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
                Nur online
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={filters.verified}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      verified: e.target.checked,
                    })
                  }
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
                Nur verifizierte Profile
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="filter-modal-footer">
          <button onClick={handleReset} className="btn-secondary filter-btn">
            Zurücksetzen
          </button>
          <button onClick={handleApply} className="btn-primary filter-btn">
            Suchen
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
