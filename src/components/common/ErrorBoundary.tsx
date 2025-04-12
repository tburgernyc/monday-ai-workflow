import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Heading, Text, Button } from 'monday-ui-react-core';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component that catches JavaScript errors in its child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Update state with error info
    this.setState({
      errorInfo
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Otherwise, use the default fallback UI
      return (
        <Box
          padding={Box.paddings.LARGE}
          backgroundColor={Box.backgroundColors.PRIMARY_BACKGROUND_COLOR}
          rounded={Box.roundeds.MEDIUM}
          border={Box.borders.DEFAULT}
          style={{
            maxWidth: '800px',
            margin: '32px auto',
            textAlign: 'center'
          }}
          data-testid="error-boundary-fallback"
        >
          <Heading type={Heading.types.h2} value="Something went wrong" />
          
          <Box marginTop={Box.marginTops.MEDIUM}>
            <Text>We're sorry, but an error occurred while rendering this component.</Text>
          </Box>
          
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <Box
              padding={Box.paddings.MEDIUM}
              backgroundColor={Box.backgroundColors.GREY_BACKGROUND_COLOR}
              rounded={Box.roundeds.SMALL}
              marginTop={Box.marginTops.MEDIUM}
              style={{ textAlign: 'left', overflow: 'auto' }}
            >
              <Text weight={Text.weights.BOLD}>{this.state.error.toString()}</Text>
              
              {this.state.errorInfo && (
                <pre style={{ marginTop: '16px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </Box>
          )}
          
          <Box marginTop={Box.marginTops.LARGE}>
            <Button
              onClick={this.handleReset}
              data-testid="error-boundary-reset-button"
            >
              Try Again
            </Button>
          </Box>
        </Box>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;