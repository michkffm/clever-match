import { useEffect, useRef, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { apiClient } from '../services/api';
import type { Event } from '../types/api';
import { useLanguage } from '../utils/i18n';
import './Events.css';

export default function Events() {
 const en = useLanguage() === 'en';
 const [events, setEvents] = useState<Event[]>([]);
 const [query, setQuery] = useState('');
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [selected, setSelected] = useState<Event | null>(null);
 const [busy, setBusy] = useState<string | null>(null);
 const dialog = useRef<HTMLDialogElement>(null);
 useEffect(() => {
  let active = true;
  void apiClient.getEvents().then(response => {
   if (!active) return;
   setError('');
   if (response.error) setError(en ? 'Events could not be loaded.' : 'Events konnten nicht geladen werden.');
   else setEvents(((response.data as { data?: Event[] } | undefined)?.data ?? []).filter(event => event.category === 'singles'));
   setLoading(false);
  });
  return () => { active = false; };
 }, [en]);
 useEffect(() => {
  if (selected && !dialog.current?.open) dialog.current?.showModal();
  if (!selected && dialog.current?.open) dialog.current.close();
 }, [selected]);
 const register = async (event: Event) => {
  setBusy(event.id);
  const response = await (event.registered ? apiClient.unregisterEvent(event.id) : apiClient.registerEvent(event.id));
  setBusy(null);
  if (response.error) { setError(en ? 'Registration could not be updated.' : 'Anmeldung konnte nicht aktualisiert werden.'); return; }
  const updated = response.data as Event;
  setEvents(current => current.map(item => item.id === event.id ? updated : item));
  setError('');
 };
 const visibleEvents = events.filter(event => [event.title, event.location, event.description ?? '', event.organizer.name].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <MainLayout><section className="events-container">
  <h1>{en ? 'Singles events' : 'Single-Events'}</h1>
  <p className="events-intro">{en ? 'Meet new people and make connections in person.' : 'Lerne neue Menschen kennen und knüpfe Kontakte vor Ort.'}</p>
  <label htmlFor="event-search">{en ? 'Search singles events' : 'Single-Events suchen'}</label>
  <input id="event-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} />
  {loading && <p role="status">{en ? 'Loading…' : 'Wird geladen…'}</p>}
  {error && <p role="alert">{error}</p>}
  {!loading && !error && !events.length && <p className="events-empty" role="status">{en ? 'No singles events are currently published. New dates will appear here once confirmed.' : 'Aktuell sind keine Single-Events veröffentlicht. Sobald neue Termine feststehen, findest du sie hier.'}</p>}
  {!loading && !error && events.length > 0 && !visibleEvents.length && <p role="status">{en ? 'No singles events match your search.' : 'Keine Single-Events passen zu deiner Suche.'}</p>}
  <div className="events-list">{visibleEvents.map(event=><article className="event-card" key={event.id}>
   <div className="event-card-content"><h2>{event.title}</h2><p>{event.location}</p><time dateTime={event.date}>{new Date(event.date).toLocaleDateString(en ? 'en-GB' : 'de-DE')}{event.time ? ` · ${event.time}` : ''}</time>
   <p>{event.description}</p><div className="event-card-buttons"><button onClick={()=>setSelected(event)}>{en ? 'Details' : 'Details'}</button><button disabled={busy===event.id} onClick={()=>void register(event)}>{event.registered ? (en ? 'Cancel registration' : 'Anmeldung zurücknehmen') : (en ? 'Register for event' : 'Zum Event anmelden')}</button></div></div>
  </article>)}</div>
  <dialog className="event-details" ref={dialog} onClose={()=>setSelected(null)} onCancel={()=>setSelected(null)} aria-labelledby="event-title">
   <h2 id="event-title">{selected?.title}</h2><p>{selected?.description}</p><p>{selected?.location}</p><p>{en ? 'Organizer' : 'Veranstalter'}: {selected?.organizer.name}</p>
   <button onClick={()=>setSelected(null)}>{en ? 'Close' : 'Schließen'}</button>
  </dialog>
 </section></MainLayout>;
}
