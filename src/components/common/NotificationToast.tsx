import React, { useEffect, useState, useCallback } from 'react';
import { IconButton } from 'monday-ui-react-core';
import { CloseSmall } from 'monday-ui-react-core/icons';
import { Notification } from '../../context/NotificationsContext';
import './NotificationToast.css';

interface NotificationToastProps {
  notification: Notification;
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoCloseDelay?: number;
}

/**
 * Component for displaying a single notification toast
 */
const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  position = 'top-right',
  autoCloseDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  // Map notification type to CSS class
  const getNotificationClass = () => {
    switch (notification.type) {
      case 'success': return 'notification-success';
      case 'error': return 'notification-error';
      case 'warning': return 'notification-warning';
      case 'info': return 'notification-info';
      default: return 'notification-info';
    }
  };

  // Handle close button click
  const handleClose = useCallback(() => {
    setIsVisible(false);
    // Wait for exit animation to complete before removing
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  }, [notification.id, onClose]);

  // Set up auto-close timer and animation
  useEffect(() => {
    // Show the notification with a slight delay for entrance animation
    const showTimeout = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    let progressInterval: NodeJS.Timeout | null = null;
    let closeTimeout: NodeJS.Timeout | null = null;

    // If auto-close is enabled, set up the timer and progress animation
    if (notification.autoClose) {
      const duration = notification.duration || autoCloseDelay;
      const step = 100 / (duration / 100); // Update progress every 100ms

      progressInterval = setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = prevProgress - step;
          return newProgress < 0 ? 0 : newProgress;
        });
      }, 100);

      closeTimeout = setTimeout(() => {
        handleClose();
      }, duration);
    }

    // Clean up timers on unmount
    return () => {
      clearTimeout(showTimeout);
      if (progressInterval) clearInterval(progressInterval);
      if (closeTimeout) clearTimeout(closeTimeout);
    };
  }, [notification.autoClose, notification.duration, autoCloseDelay, handleClose]);

  return (
    <div
      className={`notification-toast ${position} ${isVisible ? 'visible' : ''}`}
      role="alert"
      data-testid="notification-toast"
    >
      <div className={`notification-content ${getNotificationClass()}`} data-testid={`notification-${notification.type}`}>
        <div className="notification-header">
          {notification.title && (
            <div className="notification-title">{notification.title}</div>
          )}
          <IconButton
            icon={CloseSmall}
            onClick={handleClose}
            size={IconButton.sizes.SMALL}
            kind={IconButton.kinds.TERTIARY}
            ariaLabel="Close notification"
            className="notification-close-button"
            data-testid="notification-close-button"
          />
        </div>
        <div className="notification-message" data-testid="notification-message">
          {notification.message}
        </div>
      </div>
      {notification.autoClose && (
        <div className="notification-progress-bar" data-testid="notification-progress-bar">
          <div
            className="notification-progress"
            style={{ width: `${progress}%` }}
            data-testid="notification-progress"
          />
        </div>
      )}
    </div>
  );
};

export default NotificationToast;