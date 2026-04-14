import { createContext, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface NotificationContextValue {
  toast: (message: string, type?: Toast['type']) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const NotifCtx = createContext<NotificationContextValue>({
  toast: () => {},
  toasts: [],
  removeToast: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => removeToast(id), 3500);
  };

  const removeToast = (id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  };

  return (
    <NotifCtx.Provider value={{ toast, toasts, removeToast }}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          bottom: '96px',
          right: '16px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              onClick={() => removeToast(t.id)}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2 }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background:
                  t.type === 'error'
                    ? 'var(--accent-danger)'
                    : t.type === 'success'
                    ? 'var(--accent-success)'
                    : t.type === 'warning'
                    ? 'var(--accent-warning)'
                    : 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                maxWidth: '320px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotifCtx.Provider>
  );
}

export function useNotifications() {
  return useContext(NotifCtx);
}
