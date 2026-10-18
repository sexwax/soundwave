/**
 * Tiny event bus so non-React code (services, stores) can show toasts.
 * NotificationProvider subscribes and renders them.
 */
export type NotifyType = 'info' | 'success' | 'warning' | 'error';

type Listener = (message: string, type: NotifyType) => void;

const listeners = new Set<Listener>();

export function notify(message: string, type: NotifyType = 'info'): void {
  if (listeners.size === 0) {
    // No UI mounted (tests, early boot) — keep the message visible somewhere.
    console.info(`[notify:${type}]`, message);
    return;
  }
  listeners.forEach((l) => l(message, type));
}

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
