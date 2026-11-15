import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { apiClient } from '../services/api';
import { useLanguage } from '../utils/i18n';
import './Notifications.css';

type Item = { id: string; type: 'message' | 'match' | 'like' | 'event'; createdAt: string; path: string };
export default function Notifications() {
  const en = useLanguage() === 'en';
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await apiClient.getNotifications();
      if (!active) return;
      setFailed(Boolean(response.error));
      if (response.data) setItems(response.data.data);
      setLoading(false);
    };
    void load();
    const interval = window.setInterval(() => { if (!document.hidden) void load(); }, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);
  const labels = en ? { message: 'Unread message', match: 'New match', like: 'New like', event: 'Upcoming registered event' }
    : { message: 'Ungelesene Nachricht', match: 'Neues Match', like: 'Neuer Like', event: 'Bevorstehendes angemeldetes Event' };
  return <MainLayout><section className="notifications-container">
    <h1>{en ? 'Notifications' : 'Benachrichtigungen'}</h1>
    <p role="status">{loading ? (en ? 'Loading…' : 'Wird geladen…') : failed ? (en ? 'Notifications could not be loaded.' : 'Benachrichtigungen konnten nicht geladen werden.') : !items.length ? (en ? 'No notifications' : 'Keine Benachrichtigungen') : ''}</p>
    <div className="notifications-list">{items.map(item => <Link className="notification-card" key={item.id} to={item.path}>
      <span>{labels[item.type]}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(en ? 'en-GB' : 'de-DE')}</time>
    </Link>)}</div>
  </section></MainLayout>;
}
