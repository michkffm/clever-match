import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './EventsCalendar.css';

export interface CalendarEvent {
  date: Date;
  title: string;
  style: string;
  location: string;
  attendees: number;
}

interface EventsCalendarProps {
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export const EventsCalendar: React.FC<EventsCalendarProps> = ({
  events = [],
  onEventClick,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const hasEventOnDate = (day: number) => {
    return events.some((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const getEventsForDate = (day: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  });

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="events-calendar">
      {/* Header */}
      <div className="calendar-header">
        <button onClick={goToPreviousMonth} className="calendar-nav-btn">
          <ChevronLeft size={20} />
        </button>
        <h3 className="calendar-month">
          {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        </h3>
        <button onClick={goToNextMonth} className="calendar-nav-btn">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekdays */}
      <div className="calendar-weekdays">
        <div className="weekday">Mo</div>
        <div className="weekday">Di</div>
        <div className="weekday">Mi</div>
        <div className="weekday">Do</div>
        <div className="weekday">Fr</div>
        <div className="weekday">Sa</div>
        <div className="weekday">So</div>
      </div>

      {/* Days */}
      <div className="calendar-days">
        {calendarDays.map((day, idx) => {
          const hasEvent = day ? hasEventOnDate(day) : false;
          const dayEvents = day ? getEventsForDate(day) : [];

          return (
            <div key={idx} className={`calendar-day ${hasEvent ? 'has-event' : ''}`}>
              {day ? (
                <>
                  <div className="day-number">{day}</div>
                  {hasEvent && (
                    <div className="day-event-indicator">
                      {dayEvents.map((evt, i) => (
                        <div
                          key={i}
                          className="event-marker"
                          onClick={() => onEventClick?.(evt)}
                          title={evt.title}
                        >
                          {evt.style.charAt(0)}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <p className="legend-text">Klick auf die Events um Details zu sehen</p>
      </div>
    </div>
  );
};

export default EventsCalendar;
