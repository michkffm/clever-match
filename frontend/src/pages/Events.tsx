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
   if (response.error) setError(en ? 'Events could not be loaded.' : 'Events konnten nicht geladen werden.');
   else setEvents((response.data as { data?: Event[] } | undefined)?.data ?? []);
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
 return <MainLayout><section className="events-container">
  <h1>{en ? 'Dance events' : 'Tanzevents'}</h1>
  <label htmlFor="event-search">{en ? 'Search events' : 'Events suchen'}</label>
  <input id="event-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} />
  {loading && <p role="status">{en ? 'Loading…' : 'Wird geladen…'}</p>}
  {error && <p role="alert">{error}</p>}
  {!loading && !events.length && <p>{en ? 'No events available.' : 'Keine Events verfügbar.'}</p>}
  <div className="events-list">{events.filter(event=>(event.title+' '+event.location+' '+(event.danceStyle??'')).toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(event=><article className="event-card" key={event.id}>
   <div className="event-card-content"><h2>{event.title}</h2><p>{event.location}</p><time dateTime={event.date}>{new Date(event.date).toLocaleDateString(en ? 'en-GB' : 'de-DE')}{event.time ? ` · ${event.time}` : ''}</time>
   <p>{event.description}</p><div className="event-card-buttons"><button onClick={()=>setSelected(event)}>{en ? 'Details' : 'Details'}</button><button disabled={busy===event.id} onClick={()=>void register(event)}>{event.registered ? (en ? 'Cancel registration' : 'Anmeldung zurücknehmen') : (en ? 'Register for event' : 'Zum Event anmelden')}</button></div></div>
  </article>)}</div>
  <dialog ref={dialog} onClose={()=>setSelected(null)} onCancel={()=>setSelected(null)} aria-labelledby="event-title">
   <h2 id="event-title">{selected?.title}</h2><p>{selected?.description}</p><p>{selected?.location}</p><p>{selected?.danceStyle}</p><p>{en ? 'Organizer' : 'Veranstalter'}: {selected?.organizer.name}</p>
   <button onClick={()=>setSelected(null)}>{en ? 'Close' : 'Schließen'}</button>
  </dialog>
 </section></MainLayout>;
}
