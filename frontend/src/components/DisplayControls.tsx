import { useLanguage, setStoredLanguage } from '../utils/i18n';
import { useAppStore } from '../store/appStore';
import { useState } from 'react';

export function DisplayControls() {
  const language = useLanguage();
  const { isDarkMode, setDarkMode } = useAppStore();
  const [largeText, setLargeText] = useState(() => localStorage.getItem('large_text') === 'true');
  const en = language === 'en';
  return (
    <div className="display-controls" role="group" aria-label={en ? 'Language and display' : 'Sprache und Darstellung'}>
      <button type="button" onClick={() => setStoredLanguage(en ? 'de' : 'en')} aria-label={en ? 'Switch to German' : 'Switch to English'}>{en ? 'Deutsch' : 'English'}</button>
      <button type="button" onClick={() => setDarkMode(!isDarkMode)} aria-pressed={isDarkMode}
        title={isDarkMode ? (en ? 'Switch to light appearance' : 'Zu Hell wechseln') : (en ? 'Switch to dark appearance' : 'Zu Dark wechseln')}>
        <span className={isDarkMode ? undefined : 'active-theme'}>{en ? 'Light' : 'Hell'}</span> / <span className={isDarkMode ? 'active-theme' : undefined}>Dark</span>
      </button>
      <button type="button" aria-pressed={largeText} onClick={() => {
        const next = !largeText;
        setLargeText(next);
        localStorage.setItem('large_text', String(next));
        document.documentElement.classList.toggle('large-text', next);
      }}>{en ? 'Text size' : 'Textgröße'}: {largeText ? (en ? 'Large' : 'Groß') : (en ? 'Standard' : 'Standard')}</button>
    </div>
  );
}
