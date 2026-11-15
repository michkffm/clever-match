import { useTranslation } from "../utils/translations";
import React from 'react';
import { MapPin, Calendar, Users } from 'lucide-react';
import './EventCard.css';

export interface EventCardData {
  id: string;
  title: string;
  style: string;
  date: Date;
  time: string;
  location: string;
  coords: { lat: number; lng: number };
  description: string;
  image?: string;
  capacity: number;
  registered: number;
  price?: number;
}

interface EventCardProps {
  event: EventCardData;
  onRegister: (eventId: string) => void;
  onViewDetails: (eventId: string) => void;
  highlight?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onRegister,
  onViewDetails,
  highlight = false,
}) => {
  const t = useTranslation();
  const isFullyBooked = event.registered >= event.capacity;
  const dateStr = new Date(event.date).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  return (
    <div
      className={`event-card${highlight ? ' highlight' : ''}`}
      data-event-id={event.id}
    >
      {/* Image */}
      <div className="event-card-image">
        {event.image ? (
          <img src={event.image} alt={event.title} />
        ) : (
          <div className="event-card-image-placeholder">
            {event.style}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="event-card-content">
        {/* Header */}
        <div className="event-card-header">
          <div>
            <h3 className="event-card-title">{event.title}</h3>
            <span className="event-card-style">{event.style}</span>
          </div>
          {isFullyBooked && <div className="event-card-badge">{t("Ausgebucht")}</div>}
        </div>

        {/* Info Grid */}
        <div className="event-card-info-grid">
          {/* Date & Time */}
          <div className="event-card-info-item">
            <Calendar size={16} />
            <div>
              <span className="info-label">{t("Datum")}</span>
              <span className="info-value">{dateStr} • {event.time} Uhr</span>
            </div>
          </div>

          {/* Location */}
          <div className="event-card-info-item">
            <MapPin size={16} />
            <div>
              <span className="info-label">{t("Ort")}</span>
              <span className="info-value">{event.location}</span>
            </div>
          </div>

          {/* Capacity */}
          <div className="event-card-info-item">
            <Users size={16} />
            <div>
              <span className="info-label">{t("Plätze")}</span>
              <span className="info-value">
                {event.registered}/{event.capacity}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="event-card-description">{event.description}</p>

        {/* Footer */}
        <div className="event-card-footer">
          {event.price && (
            <span className="event-card-price">{event.price}€</span>
          )}
          <div className="event-card-buttons">
            <button
              onClick={() => onViewDetails(event.id)}
              className="btn-secondary event-btn"
            >
              Details
            </button>
            <button
              onClick={() => onRegister(event.id)}
              className="btn-primary event-btn"
              disabled={isFullyBooked}
            >
              {isFullyBooked ? t("Ausgebucht") : t("Anmelden")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
