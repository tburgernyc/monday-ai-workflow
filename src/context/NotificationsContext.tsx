import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  autoClose?: boolean;
  duration?: number;
}
interface NotificationsContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  success: (message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) => string;
  error: (message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) => string;
  warning: (message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) => string;
  info: (message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) => string;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

interface NotificationsProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

/**
 * Provider component for managing application notifications
 */
export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({
  children,
  maxNotifications = 5
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Add a new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = uuidv4();
    const newNotification = {
      id,
      autoClose: true, // Default to auto-close
      duration: 5000, // Default duration
      ...notification
    };

    setNotifications(prevNotifications => {
      // If we're at max capacity, remove the oldest notification
      if (prevNotifications.length >= maxNotifications) {
        return [...prevNotifications.slice(1), newNotification];
      }
      return [...prevNotifications, newNotification];
    });

    return id;
  }, [maxNotifications]);

  // Remove a notification by ID
  const removeNotification = useCallback((id: string) => {
    setNotifications(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== id)
    );
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Create success notification helper
  const success = useCallback((message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) => {
    return addNotification({
      type: 'success',
      message,
      ...options
    });
  }, [addNotification]);

  // Create error notification helper
  const error = useCallback((message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) => {
    return addNotification({
      type: 'error',
      message,
      ...options
    });
  }, [addNotification]);

  // Create warning notification helper
  const warning = useCallback((message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) => {
    return addNotification({
      type: 'warning',
      message,
      ...options
    });
  }, [addNotification]);

  // Create info notification helper
  const info = useCallback((message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) => {
    return addNotification({
      type: 'info',
      message,
      ...options
    });
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    success,
    error,
    warning,
    info
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

/**
 * Hook to use the notifications context
 */
export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export default NotificationsContext;