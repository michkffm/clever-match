import { useAppStore } from '../store/appStore';

/**
 * Hook to show notifications
 */
export function useNotification() {
  const { showNotification } = useAppStore();

  return {
    success: (message: string) => showNotification(message, 'success'),
    error: (message: string) => showNotification(message, 'error'),
    info: (message: string) => showNotification(message, 'info'),
    warning: (message: string) => showNotification(message, 'warning'),
  };
}
