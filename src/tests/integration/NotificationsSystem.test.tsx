import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NotificationsProvider, useNotifications } from '../../context/NotificationsContext';
import NotificationsContainer from '../../components/common/NotificationsContainer';

// Test component that uses the notifications context
const NotificationTester = () => {
  const { addNotification, success, error, warning, info, clearNotifications } = useNotifications();

  const handleAddCustom = () => {
    addNotification({
      type: 'info',
      message: 'Custom notification',
      title: 'Custom Title',
      autoClose: false
    });
  };

  const handleAddSuccess = () => {
    success('Success message');
  };

  const handleAddError = () => {
    error('Error message');
  };

  const handleAddWarning = () => {
    warning('Warning message');
  };

  const handleAddInfo = () => {
    info('Info message');
  };

  const handleClearAll = () => {
    clearNotifications();
  };

  return (
    <div>
      <button data-testid="add-custom" onClick={handleAddCustom}>Add Custom</button>
      <button data-testid="add-success" onClick={handleAddSuccess}>Add Success</button>
      <button data-testid="add-error" onClick={handleAddError}>Add Error</button>
      <button data-testid="add-warning" onClick={handleAddWarning}>Add Warning</button>
      <button data-testid="add-info" onClick={handleAddInfo}>Add Info</button>
      <button data-testid="clear-all" onClick={handleClearAll}>Clear All</button>
    </div>
  );
};

// Wrapper component that provides the notifications context
const TestApp = () => {
  return (
    <NotificationsProvider>
      <NotificationTester />
      <NotificationsContainer />
    </NotificationsProvider>
  );
};

describe('Notifications System Integration', () => {
  beforeEach(() => {
    // Mock timers for testing auto-close functionality
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without notifications initially', () => {
    render(<TestApp />);
    
    // Container should not be visible when there are no notifications
    expect(screen.queryByTestId('notifications-container')).not.toBeInTheDocument();
  });

  it('displays a notification when added', () => {
    render(<TestApp />);
    
    // Add a custom notification
    fireEvent.click(screen.getByTestId('add-custom'));
    
    // Container should now be visible
    expect(screen.getByTestId('notifications-container')).toBeInTheDocument();
    
    // Notification should be displayed with correct content
    expect(screen.getByTestId('notification-toast')).toBeInTheDocument();
    expect(screen.getByTestId('notification-info')).toBeInTheDocument();
    expect(screen.getByText('Custom notification')).toBeInTheDocument();
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('displays different types of notifications', async () => {
    render(<TestApp />);
    
    // Add different types of notifications
    fireEvent.click(screen.getByTestId('add-success'));
    
    // Success notification should be displayed
    expect(screen.getByTestId('notification-success')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
    
    // Add error notification
    fireEvent.click(screen.getByTestId('add-error'));
    
    // Error notification should be displayed
    expect(screen.getByTestId('notification-error')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    
    // Add warning notification
    fireEvent.click(screen.getByTestId('add-warning'));
    
    // Warning notification should be displayed
    expect(screen.getByTestId('notification-warning')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    
    // Add info notification
    fireEvent.click(screen.getByTestId('add-info'));
    
    // Info notification should be displayed
    expect(screen.getByTestId('notification-info')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('removes a notification when close button is clicked', () => {
    render(<TestApp />);
    
    // Add a notification
    fireEvent.click(screen.getByTestId('add-info'));
    
    // Notification should be displayed
    expect(screen.getByTestId('notification-toast')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
    
    // Click the close button
    fireEvent.click(screen.getByTestId('notification-close-button'));
    
    // Wait for the animation to complete
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Notification should be removed
    expect(screen.queryByTestId('notification-toast')).not.toBeInTheDocument();
    expect(screen.queryByText('Info message')).not.toBeInTheDocument();
  });

  it('auto-closes notifications with autoClose enabled', () => {
    render(<TestApp />);
    
    // Add a success notification (which has autoClose enabled by default)
    fireEvent.click(screen.getByTestId('add-success'));
    
    // Notification should be displayed
    expect(screen.getByTestId('notification-toast')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
    
    // Progress bar should be visible
    expect(screen.getByTestId('notification-progress-bar')).toBeInTheDocument();
    
    // Advance timers to trigger auto-close
    act(() => {
      jest.advanceTimersByTime(5000); // Default duration
    });
    
    // Wait for the animation to complete
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Notification should be removed
    expect(screen.queryByTestId('notification-toast')).not.toBeInTheDocument();
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('clears all notifications when clearNotifications is called', () => {
    render(<TestApp />);
    
    // Add multiple notifications
    fireEvent.click(screen.getByTestId('add-success'));
    fireEvent.click(screen.getByTestId('add-error'));
    fireEvent.click(screen.getByTestId('add-warning'));
    
    // All notifications should be displayed
    expect(screen.getAllByTestId('notification-toast').length).toBe(3);
    
    // Clear all notifications
    fireEvent.click(screen.getByTestId('clear-all'));
    
    // All notifications should be removed
    expect(screen.queryByTestId('notification-toast')).not.toBeInTheDocument();
  });

  it('limits the number of notifications to maxNotifications', () => {
    // Render with a custom NotificationsProvider that has maxNotifications=2
    render(
      <NotificationsProvider maxNotifications={2}>
        <NotificationTester />
        <NotificationsContainer />
      </NotificationsProvider>
    );
    
    // Add three notifications
    fireEvent.click(screen.getByTestId('add-success')); // This one should be removed when the third is added
    fireEvent.click(screen.getByTestId('add-error'));
    fireEvent.click(screen.getByTestId('add-warning'));
    
    // Only two notifications should be displayed (the newest ones)
    expect(screen.getAllByTestId('notification-toast').length).toBe(2);
    
    // The first notification should be removed
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    
    // The second and third notifications should still be displayed
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });
});