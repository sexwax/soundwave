import { createContext, useContext } from 'react';
import type { NotifyType } from '../../shared/utils/notify';

export interface Toast {
  id: string;
  message: string;
  type: NotifyType;
}

export interface NotificationContextValue {
  toast: (message: string, type?: Toast['type']) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export const NotifCtx = createContext<NotificationContextValue>({
  toast: () => {},
  toasts: [],
  removeToast: () => {},
});

export function useNotifications() {
  return useContext(NotifCtx);
}
