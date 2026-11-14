// === Notification Component ===
// Global notification/toast system

import { AlertCircle, Check, Info, AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import './NotificationContainer.css';

export function NotificationContainer() {
  const { notifications, removeNotification } = useAppStore();

  if (!notifications.length) return null;

  return (
    <div className="toast-container">
      <div className="toast-stack">
        {notifications.map((notification) => {
          const variantClass = {
            success: 'toast-success',
            error: 'toast-error',
            info: 'toast-info',
            warning: 'toast-warning',
          }[notification.type];

          const Icon = {
            success: Check,
            error: AlertCircle,
            info: Info,
            warning: AlertTriangle,
          }[notification.type];

          return (
            <div key={notification.id} className={`toast ${variantClass}`}>
              <Icon className="toast-icon" />
              <span className="toast-message">{notification.message}</span>
              <button
                onClick={() => removeNotification(notification.id)}
                className="toast-close"
                aria-label="Schließen"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
