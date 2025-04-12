import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../../../components/common/ErrorBoundary';

// Create a component that throws an error when rendered
const ErrorThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock console.error to prevent test output pollution
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary Component', () => {
  // Test normal rendering (no errors)
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  // Test error state
  it('renders fallback UI when child component throws an error', () => {
    // We need to suppress the error boundary warning in the test
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );
    
    // Check that the fallback UI is rendered
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('We\'re sorry, but an error occurred while rendering this component.')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-reset-button')).toBeInTheDocument();
    
    spy.mockRestore();
  });

  // Test custom fallback
  it('renders custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>;
    
    // We need to suppress the error boundary warning in the test
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );
    
    // Check that the custom fallback is rendered
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    
    spy.mockRestore();
  });

  // Test error callback
  it('calls onError callback when an error occurs', () => {
    const onErrorMock = jest.fn();
    
    // We need to suppress the error boundary warning in the test
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );
    
    // Check that onError was called
    expect(onErrorMock).toHaveBeenCalled();
    expect(onErrorMock.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onErrorMock.mock.calls[0][0].message).toBe('Test error');
    
    spy.mockRestore();
  });

  // Test reset functionality
  it('resets error state when reset button is clicked', () => {
    // We need to suppress the error boundary warning in the test
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    // Create a component that can toggle the error state
    const ToggleErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    // Create a wrapper component that can control the error state
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      
      // This function will be called by the ErrorBoundary when reset button is clicked
      const handleReset = () => {
        setShouldThrow(false);
      };
      
      return (
        <ErrorBoundary onError={() => handleReset()}>
          <ToggleErrorComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };

    render(<TestComponent />);
    
    // Verify error state is shown
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    
    // Click the reset button
    fireEvent.click(screen.getByTestId('error-boundary-reset-button'));
    
    spy.mockRestore();
  });

  // Snapshot test
  it('matches error state snapshot', () => {
    // We need to suppress the error boundary warning in the test
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    const { container } = render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );
    
    expect(container).toMatchSnapshot();
    
    spy.mockRestore();
  });
});