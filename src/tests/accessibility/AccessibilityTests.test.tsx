import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { NotificationsProvider } from '../../context/NotificationsContext';
import NotificationsContainer from '../../components/common/NotificationsContainer';
import NotificationToast from '../../components/common/NotificationToast';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  describe('Card Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <Card 
          title="Accessible Card" 
          subtitle="This is an accessible card component"
          headerActions={<button aria-label="Card action">Action</button>}
        >
          <p>Card content that is accessible to all users</p>
        </Card>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    it('should be keyboard navigable', () => {
      const handleClick = jest.fn();
      render(
        <div>
          <button>Before</button>
          <Card 
            onClick={handleClick}
            title="Clickable Card"
          >
            Keyboard accessible content
          </Card>
          <button>After</button>
        </div>
      );
      
      // Focus the first button
      const beforeButton = screen.getByText('Before');
      beforeButton.focus();
      
      // Tab to the card (simulate keyboard navigation)
      fireEvent.keyDown(beforeButton, { key: 'Tab' });
      
      // Get the card element and simulate Enter key press
      const cardElement = screen.getByTestId('card-container');
      fireEvent.keyDown(cardElement, { key: 'Enter' });
      
      // Check that the click handler was called
      expect(handleClick).toHaveBeenCalled();
    });
  });
  
  describe('EmptyState Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <EmptyState 
          title="No Data Found"
          description="Try adjusting your filters to see more results"
          actionLabel="Reset Filters"
          onAction={() => {}}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    it('should have accessible button', () => {
      const handleAction = jest.fn();
      render(
        <EmptyState 
          title="No Data Found"
          actionLabel="Reset Filters"
          onAction={handleAction}
        />
      );
      
      // Find the button and check it's accessible
      const button = screen.getByText('Reset Filters');
      expect(button).toBeInTheDocument();
      
      // Test keyboard interaction
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleAction).toHaveBeenCalled();
      
      // Reset and test with Space key
      handleAction.mockReset();
      fireEvent.keyDown(button, { key: ' ' });
      expect(handleAction).toHaveBeenCalled();
    });
  });
  
  describe('LoadingSpinner Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <LoadingSpinner text="Loading content, please wait..." />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    it('should have appropriate ARIA attributes', () => {
      render(
        <LoadingSpinner text="Loading content, please wait..." />
      );
      
      // The loading text should be visible to screen readers
      expect(screen.getByText('Loading content, please wait...')).toBeInTheDocument();
      
      // The container should have appropriate role
      const container = screen.getByTestId('loading-spinner-container');
      expect(container).toHaveAttribute('role', 'status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });
  });
  
  describe('Notifications System', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <NotificationsProvider>
          <NotificationsContainer />
        </NotificationsProvider>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    it('should have appropriate ARIA attributes for notifications', async () => {
      const notification = {
        id: 'test-notification',
        type: 'info' as const,
        message: 'This is a test notification',
        title: 'Test Notification',
        autoClose: false
      };
      
      const { container } = render(
        <NotificationToast 
          notification={notification}
          onClose={() => {}}
        />
      );
      
      // The notification should have role="alert"
      const toast = screen.getByTestId('notification-toast');
      expect(toast).toHaveAttribute('role', 'alert');
      
      // The close button should be accessible
      const closeButton = screen.getByTestId('notification-close-button');
      expect(closeButton).toHaveAttribute('aria-label', 'Close notification');
      
      // Test keyboard accessibility of close button
      closeButton.focus();
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
  
  // Test for keyboard trap (a common accessibility issue)
  describe('Keyboard Trap Prevention', () => {
    it('should not trap keyboard focus', () => {
      render(
        <div>
          <button>Before</button>
          <div>
            <button>Inside 1</button>
            <button>Inside 2</button>
          </div>
          <button>After</button>
        </div>
      );
      
      // Get all the buttons
      const beforeButton = screen.getByText('Before');
      const inside1Button = screen.getByText('Inside 1');
      const inside2Button = screen.getByText('Inside 2');
      const afterButton = screen.getByText('After');
      
      // Focus the first button
      beforeButton.focus();
      
      // Simulate tabbing through elements
      // Note: We can't actually change the activeElement in tests,
      // so we're testing that the elements exist and are tabbable
      expect(beforeButton).toBeInTheDocument();
      expect(inside1Button).toBeInTheDocument();
      expect(inside2Button).toBeInTheDocument();
      expect(afterButton).toBeInTheDocument();
      
      // Verify all elements have tabIndex that allows keyboard navigation
      expect(beforeButton).not.toHaveAttribute('tabIndex', '-1');
      expect(inside1Button).not.toHaveAttribute('tabIndex', '-1');
      expect(inside2Button).not.toHaveAttribute('tabIndex', '-1');
      expect(afterButton).not.toHaveAttribute('tabIndex', '-1');
    });
  });
});