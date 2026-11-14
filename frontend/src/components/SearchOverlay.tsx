import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import type { Event } from '../types/api';
import './SearchOverlay.css';

type PreviewProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  age?: number;
  distance?: number;
  danceStyles?: string[];
};

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ open, onClose }) => {
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const [profiles, setProfiles] = useState<PreviewProfile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [profilesResponse, eventsResponse] = await Promise.all([
          apiClient.getProfiles(),
          apiClient.getEvents(),
        ]);

        const profilePayload = profilesResponse.data as { data?: PreviewProfile[] } | undefined;
        const eventPayload = eventsResponse.data as { data?: Event[] } | undefined;

        if (!cancelled) {
          setProfiles(profilePayload?.data || []);
          setEvents(eventPayload?.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Suche fehlgeschlagen');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(inputValue.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [inputValue]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const normalizedQuery = query.trim().toLowerCase();

  const highlight = (text?: string) => {
    if (!text || !normalizedQuery) return text;
    const regex = new RegExp(`(${normalizedQuery.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'ig');
    return text.split(regex).map((part, index) =>
      part.toLowerCase() === normalizedQuery ? <mark key={index}>{part}</mark> : part
    );
  };

  const filteredProfiles = useMemo(() => {
    if (!normalizedQuery) return profiles;
    return profiles.filter((profile) => {
      const haystack = [
        profile.firstName,
        profile.lastName,
        profile.city,
        ...(profile.danceStyles || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [profiles, normalizedQuery]);

  const filteredEvents = useMemo(() => {
    if (!normalizedQuery) return events;
    return events.filter((event) => {
      const haystack = [event.title, event.location, event.danceStyle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [events, normalizedQuery]);

  if (!open) return null;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-panel" onClick={(event) => event.stopPropagation()}>
        <div className="search-header">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Suche nach Tänzen, Personen, Events..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
          </div>
          <button className="search-close" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </button>
        </div>

        <div className="search-results">
          {isLoading && <div className="search-state">Suche lädt…</div>}
          {error && <div className="search-state">{error}</div>}

          {!isLoading && !error && (
            <>
              <div className="search-section">
                <div className="search-section-title">
                  <Users size={16} />
                  <span>Profile</span>
                </div>
                {filteredProfiles.length === 0 ? (
                  <div className="search-empty">Keine Profile gefunden</div>
                ) : (
                  <ul className="search-list">
                    {filteredProfiles.slice(0, 6).map((profile) => (
                      <li
                        key={profile.id}
                        className="search-item"
                        onClick={() => {
                          onClose();
                          navigate(`/profile/${profile.id}`);
                        }}
                      >
                        <div>
                          <strong>{highlight(`${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim())}</strong>
                          {profile.city && <span> · {highlight(profile.city)}</span>}
                        </div>
                        <div className="search-meta">
                          {profile.age && <span>{profile.age} J.</span>}
                          {profile.distance != null && <span>{profile.distance} km</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="search-section">
                <div className="search-section-title">
                  <Calendar size={16} />
                  <span>Events</span>
                </div>
                {filteredEvents.length === 0 ? (
                  <div className="search-empty">Keine Events gefunden</div>
                ) : (
                  <ul className="search-list">
                    {filteredEvents.slice(0, 6).map((event) => (
                      <li
                        key={event.id}
                        className="search-item"
                        onClick={() => {
                          onClose();
                          navigate('/events', { state: { highlightEventId: event.id } });
                        }}
                      >
                        <div>
                          <strong>{highlight(event.title)}</strong>
                          {event.location && <span> · {highlight(event.location)}</span>}
                        </div>
                        <div className="search-meta">
                          {event.danceStyle && <span>{highlight(event.danceStyle)}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
