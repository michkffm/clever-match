import { useEffect, useState } from 'react';
import { storageService } from '../services/storage';

export type Language = 'de' | 'en';

export function getStoredLanguage(): Language {
  const prefs = storageService.getPreferences();
  return prefs.language === 'en' ? 'en' : 'de';
}

export function setStoredLanguage(language: Language) {
  const prefs = storageService.getPreferences();
  storageService.setPreferences({ ...prefs, language });
  window.dispatchEvent(new CustomEvent('language:change', { detail: language }));
}

export function useLanguage(): Language {
  const [language, setLanguage] = useState<Language>(getStoredLanguage());

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent<Language>).detail;
      setLanguage(detail ?? getStoredLanguage());
    };

    window.addEventListener('language:change', handleLanguageChange);
    return () => window.removeEventListener('language:change', handleLanguageChange);
  }, []);

  return language;
}
