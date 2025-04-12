import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  // Basic rendering test
  it('renders correctly with default props', () => {
    render(<LoadingSpinner />);
    expect(screen.getByTestId('loading-spinner-container')).toBeInTheDocument();
  });

  // Test with text
  it('renders with text when provided', () => {
    const loadingText = 'Loading data...';
    render(<LoadingSpinner text={loadingText} />);
    expect(screen.getByText(loadingText)).toBeInTheDocument();
  });

  // Test centered prop
  it('applies centered styles when centered prop is true', () => {
    render(<LoadingSpinner centered />);
    const container = screen.getByTestId('loading-spinner-container');
    expect(container).toHaveStyle({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%'
    });
  });

  // Test fullPage prop
  it('applies fullPage styles when fullPage prop is true', () => {
    render(<LoadingSpinner fullPage />);
    const container = screen.getByTestId('loading-spinner-container');
    expect(container).toHaveStyle({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    });
  });

  // Test custom className
  it('applies custom className when provided', () => {
    render(<LoadingSpinner className="custom-spinner" />);
    const container = screen.getByTestId('loading-spinner-container');
    expect(container).toHaveClass('custom-spinner');
  });

  // Test size prop
  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="xs" />);
    expect(screen.getByTestId('loading-spinner-container')).toBeInTheDocument();
    
    rerender(<LoadingSpinner size="small" />);
    expect(screen.getByTestId('loading-spinner-container')).toBeInTheDocument();
    
    rerender(<LoadingSpinner size="large" />);
    expect(screen.getByTestId('loading-spinner-container')).toBeInTheDocument();
  });

  // Test color prop
  it('renders with different colors', () => {
    const { rerender } = render(<LoadingSpinner color="primary" />);
    expect(screen.getByTestId('loading-spinner-container')).toBeInTheDocument();
    
    rerender(<LoadingSpinner color="secondary" />);
    expect(screen.getByTestId('loading-spinner-container')).toBeInTheDocument();
    
    rerender(<LoadingSpinner color="dark" />);
    expect(screen.getByTestId('loading-spinner-container')).toBeInTheDocument();
  });

  // Snapshot test
  it('matches snapshot', () => {
    const { container } = render(
      <LoadingSpinner 
        size="medium"
        color="primary"
        text="Loading..."
        centered
      />
    );
    expect(container).toMatchSnapshot();
  });
});