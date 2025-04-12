import React from 'react';
import { useNotifications } from '../../context/NotificationsContext';
import NotificationToast from './NotificationToast';
import './NotificationsContainer.css';

interface NotificationsContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Container component for displaying all active notifications
 * Renders a stack of NotificationToast components
 */
const NotificationsContainer: React.FC<NotificationsContainerProps> = ({
  position = 'top-right'
}) => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`notifications-container ${position}`} aria-live="polite" data-testid="notifications-container">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
          position={position}
        />
      ))}
    </div>
  );
};

export default NotificationsContainer;