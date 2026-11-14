export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // In development, service workers often cause stale asset caches and blank screens.
  if (import.meta.env.DEV) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });

    if ('caches' in window) {
      void caches.keys().then((keys) => {
        keys
          .filter((key) => key.startsWith('tanzmatch-static-'))
          .forEach((key) => {
            void caches.delete(key);
          });
      });
    }

    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js')
      .then(() => {
        // SW registered
      })
      .catch((error) => {
        console.error('[PWA] Service worker registration failed', error);
      });
  });
}
