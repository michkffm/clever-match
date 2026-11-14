import React, { useEffect, useState } from 'react';
import { MapPin, List, Filter } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import EventCard from '../components/EventCard';
import type { EventCardData } from '../components/EventCard';
import { apiClient } from '../services/api';
import type { Event } from '../types/api';
import './Events.css';

function mapEventToCard(event: Event): EventCardData {
  return {
    id: event.id,
    title: event.title,
    style: event.danceStyle ? event.danceStyle.toUpperCase() : 'MIXED',
    date: new Date(event.date),
    time: event.time || '20:00',
    location: event.location,
    coords: { lat: 52.52, lng: 13.405 },
    description: event.description || 'Tanzevent in deiner Nähe',
    capacity: 150,
    registered: event.attendees || 0,
    price: 0,
  };
}

export const Events: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      const response = await apiClient.getEvents();
      const payload = response.data as { data?: Event[] } | undefined;
      setEvents((payload?.data || []).map(mapEventToCard));
    }

    void loadEvents();
  }, []);

  useEffect(() => {
    const state = location.state as { highlightEventId?: string } | null;
    if (state?.highlightEventId) {
      setHighlightId(state.highlightEventId);
      if (activeTab !== 'list') {
        setActiveTab('list');
      }
    }
  }, [location.state, activeTab]);

  useEffect(() => {
    if (!highlightId || activeTab !== 'list') return;
    const target = document.querySelector(`[data-event-id="${highlightId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timeout = window.setTimeout(() => setHighlightId(null), 3000);
      return () => window.clearTimeout(timeout);
    }
  }, [highlightId, activeTab, events]);

  const handleRegister = async (eventId: string) => {
    const response = await apiClient.registerEvent(eventId);
    const updatedEvent = response.data as Event | undefined;

    if (!updatedEvent) {
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === eventId ? mapEventToCard(updatedEvent) : event
      )
    );
  };

  const handleViewDetails = (eventId: string) => {
    console.log('View details for event:', eventId);
  };

  const mapCenter = events[0]?.coords || { lat: 52.52, lng: 13.405 };
  const delta = 0.06;
  const bbox = [
    mapCenter.lng - delta,
    mapCenter.lat - delta,
    mapCenter.lng + delta,
    mapCenter.lat + delta,
  ].join(',');
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${encodeURIComponent(`${mapCenter.lat},${mapCenter.lng}`)}`;

  return (
    <MainLayout>
      <div className="events-container">
        <div className="events-header">
          <h1>Tanzevents</h1>
          {highlightId && (
            <span className="events-highlight-badge">Treffer</span>
          )}
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="events-filter-btn"
            aria-label="Filter"
          >
            <Filter size={20} />
          </button>
        </div>

        <div className="events-tabs">
          <button
            className={`events-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <List size={18} />
            Liste
          </button>
          <button
            className={`events-tab ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <MapPin size={18} />
            Karte
          </button>
        </div>

        {activeTab === 'list' ? (
          <div className="events-list">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                highlight={highlightId === event.id}
                onRegister={handleRegister}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="events-map">
            {events.length === 0 ? (
              <div className="events-map-placeholder">
                <MapPin size={48} />
                <h2>Keine Events verfügbar</h2>
                <p>Sobald Events verfügbar sind, wird die Karte angezeigt.</p>
              </div>
            ) : (
              <div className="events-map-frame">
                <iframe
                  title="Events Map"
                  src={mapUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Events;
