import { createContext, use, useState, useCallback, type ReactNode } from 'react';
import { NotificationHub } from '../components/ui/NotificationHub';

export type Severity = 'success' | 'error' | 'info';

export interface Toast {id: string; message: string; severity: Severity;
}

interface NotificationContextValue {addNotification: (message: string, severity: Severity) => void;}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);
const DURATION = 2000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {setToasts(prev => prev.filter(t => t.id !== id));}, []);

  const addNotification = useCallback((message: string, severity: Severity) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, severity }]);
    setTimeout(() => removeToast(id), DURATION);
  }, [removeToast]);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <NotificationHub toasts={toasts} onRemove={removeToast} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = use(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
