import { useTranslation } from "../utils/translations";
import React, { useMemo } from 'react';
import type { DanceCategory } from '../types';
import { DANCES } from '../types';
import './TanzCheckboxGrid.css';

interface TanzCheckboxGridProps {
  selectedDances: string[]; // Array of dance IDs
  onChange: (selectedDances: string[]) => void;
  showLevels?: boolean;
  levels?: { danceId: string; level: 1 | 2 | 3 | 4 | 5 }[];
  onLevelChange?: (danceId: string, level: 1 | 2 | 3 | 4 | 5) => void;
  customDances?: string[];
  onCustomDanceAdd?: (dance: string) => void;
  onCustomDancesChange?: (customDances: string[]) => void;
}

export const TanzCheckboxGrid: React.FC<TanzCheckboxGridProps> = ({
  selectedDances,
  onChange,
  showLevels = false,
  levels = [],
  onLevelChange,
  customDances = [],
  onCustomDancesChange,
}) => {
  const t = useTranslation();
  // Group dances by category
  const dancesByCategory = useMemo(() => {
    const grouped: Record<DanceCategory, typeof DANCES> = {
      standard: [],
      latin: [],
      disco: [],
      'latino-modern': [],
      other: [],
    };

    DANCES.forEach((dance) => {
      grouped[dance.category].push(dance);
    });

    return grouped;
  }, []);

  const categoryLabels: Record<DanceCategory, string> = {
    standard: 'Standardtänze',
    latin: 'Latein',
    disco: 'Disco/Folk',
    'latino-modern': 'Lateinamerikanisch-Modern',
    other: 'Andere',
  };

  const handleCheckChange = (danceId: string, checked: boolean) => {
    const updated = checked
      ? [...selectedDances, danceId]
      : selectedDances.filter(id => id !== danceId);
    onChange(updated);
  };

  const handleCustomDanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCustomDancesChange?.([e.target.value]);
  };

  const getLevelForDance = (danceId: string): 1 | 2 | 3 | 4 | 5 => {
    return levels.find(l => l.danceId === danceId)?.level || 1;
  };

  return (
    <div className="tanz-checkbox-grid">
      {Object.entries(dancesByCategory).map(([category, dances]) => (
        dances.length > 0 && (
          <div key={category} className="dance-category">
            <h3 className="category-title">{categoryLabels[category as DanceCategory]}</h3>
            <div className="dances-grid">
              {dances.map((dance) => {
                const isSelected = selectedDances.includes(dance.id);
                return (
                  <div key={dance.id} className="dance-item">
                    <label className="dance-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleCheckChange(dance.id, e.target.checked)}
                        className="dance-checkbox"
                      />
                      <span className="checkbox-custom"></span>
                      <span className="dance-name">{dance.name}</span>
                    </label>

                    {showLevels && isSelected && (
                      <div className="level-container">
                        <label className="level-label">Level:</label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={getLevelForDance(dance.id)}
                          onChange={(e) => {
                            const level = parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5;
                            onLevelChange?.(dance.id, level);
                          }}
                          className="level-slider"
                        />
                        <span className="level-value">
                          {['Anfänger', 'Anfänger+', 'Mittler', 'Fortgeschr.', 'Profi'][getLevelForDance(dance.id) - 1]}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      ))}

      {/* Custom Dance Input */}
      <div className="custom-dance-section">
        <h3 className="category-title">{t("Andere Tänze")}</h3>
        <div className="custom-dance-input-wrapper">
          <input
            type="text"
            placeholder={t("Zusätzlicher Tanz (z.B. Flamenco, Contemporary)")}
            value={customDances[0] || ''}
            onChange={handleCustomDanceChange}
            className="custom-dance-input"
          />
        </div>
      </div>
    </div>
  );
};

export default TanzCheckboxGrid;
