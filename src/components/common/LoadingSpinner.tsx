import React from 'react';
import { Loader } from 'monday-ui-react-core';

interface LoadingSpinnerProps {
  size?: 'xs' | 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'dark';
  className?: string;
  centered?: boolean;
  fullPage?: boolean;
  text?: string;
}

/**
 * A reusable loading spinner component that can be used to indicate loading states
 * throughout the application.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color,
  className = '',
  centered = false,
  fullPage = false,
  text
}) => {
  // Map size values to Loader size values
  const sizeMap = {
    xs: Loader.sizes.XS,
    small: Loader.sizes.SMALL,
    medium: Loader.sizes.MEDIUM,
    large: Loader.sizes.LARGE
  };

  // Map color values to Loader color values
  const colorMap = {
    primary: Loader.colors.PRIMARY,
    secondary: Loader.colors.SECONDARY,
    dark: Loader.colors.DARK
  };

  // Create styles for different display modes
  const containerStyle: React.CSSProperties = {};
  
  if (centered) {
    containerStyle.display = 'flex';
    containerStyle.justifyContent = 'center';
    containerStyle.alignItems = 'center';
    containerStyle.width = '100%';
  }
  
  if (fullPage) {
    containerStyle.position = 'fixed';
    containerStyle.top = 0;
    containerStyle.left = 0;
    containerStyle.right = 0;
    containerStyle.bottom = 0;
    containerStyle.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    containerStyle.zIndex = 1000;
    containerStyle.display = 'flex';
    containerStyle.flexDirection = 'column';
    containerStyle.justifyContent = 'center';
    containerStyle.alignItems = 'center';
  }
  
  return (
    <div
      className={`loading-spinner-container ${className}`}
      style={containerStyle}
      data-testid="loading-spinner-container"
      role="status"
      aria-live="polite"
    >
      <Loader size={sizeMap[size]} color={color ? colorMap[color] : undefined} data-testid="loading-spinner" />
      {text && <div className="loading-text" style={{ marginTop: '12px' }}>{text}</div>}
    </div>
  );
};

export default LoadingSpinner;