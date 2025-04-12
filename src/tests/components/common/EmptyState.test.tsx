import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../../../components/common/EmptyState';

describe('EmptyState Component', () => {
  // Basic rendering test
  it('renders with required props', () => {
    render(<EmptyState title="No data found" />);
    
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  // Test with description
  it('renders with description when provided', () => {
    render(
      <EmptyState 
        title="No data found" 
        description="Try adjusting your filters to see more results"
      />
    );
    
    expect(screen.getByText('No data found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters to see more results')).toBeInTheDocument();
  });

  // Test with icon
  it('renders with icon when provided', () => {
    const mockIcon = <div data-testid="mock-icon">🔍</div>;
    
    render(
      <EmptyState 
        title="No data found" 
        icon={mockIcon}
      />
    );
    
    expect(screen.getByTestId('empty-state-icon')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  // Test with action button
  it('renders action button when actionLabel and onAction are provided', () => {
    const handleAction = jest.fn();
    
    render(
      <EmptyState 
        title="No data found" 
        actionLabel="Refresh data"
        onAction={handleAction}
      />
    );
    
    const actionButton = screen.getByTestId('empty-state-action');
    expect(actionButton).toBeInTheDocument();
    expect(actionButton).toHaveTextContent('Refresh data');
    
    // Test click handler
    fireEvent.click(actionButton);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  // Test without action button
  it('does not render action button when actionLabel or onAction is missing', () => {
    const { rerender } = render(
      <EmptyState 
        title="No data found" 
        actionLabel="Refresh data"
      />
    );
    
    expect(screen.queryByTestId('empty-state-action')).not.toBeInTheDocument();
    
    rerender(
      <EmptyState 
        title="No data found" 
        onAction={() => {}}
      />
    );
    
    expect(screen.queryByTestId('empty-state-action')).not.toBeInTheDocument();
  });

  // Test different sizes
  it('renders with different sizes', () => {
    const { rerender } = render(<EmptyState title="Small" size="small" />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    
    rerender(<EmptyState title="Medium" size="medium" />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    
    rerender(<EmptyState title="Large" size="large" />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  // Test custom className
  it('applies custom className when provided', () => {
    render(<EmptyState title="Test" className="custom-empty-state" />);
    
    const emptyState = screen.getByTestId('empty-state');
    expect(emptyState).toHaveClass('custom-empty-state');
  });

  // Snapshot test
  it('matches snapshot', () => {
    const mockIcon = <div data-testid="mock-icon">🔍</div>;
    const { container } = render(
      <EmptyState 
        title="No data found" 
        description="Try adjusting your filters"
        icon={mockIcon}
        actionLabel="Refresh"
        onAction={() => {}}
        size="medium"
      />
    );
    
    expect(container).toMatchSnapshot();
  });
});