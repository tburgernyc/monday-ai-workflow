import React, { ReactNode } from 'react';
import { Box, Heading, Text, Flex } from 'monday-ui-react-core';
import './Card.css';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
  footerActions?: ReactNode;
  onClick?: () => void;
  elevation?: 'none' | 'low' | 'medium' | 'high';
  padding?: 'none' | 'small' | 'medium' | 'large';
  border?: boolean;
  borderColor?: string;
  backgroundColor?: string;
  width?: string | number;
  height?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
}

/**
 * Card component for displaying content in a contained box
 * Used for dashboard widgets, list items, and content sections
 */
const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  headerActions,
  footerActions,
  onClick,
  elevation = 'low',
  padding = 'medium',
  border = true,
  borderColor,
  backgroundColor,
  width,
  height,
  minHeight,
  maxHeight,
  overflow = 'visible'
}) => {
  // Map elevation to box-shadow
  const getElevationClass = () => {
    switch (elevation) {
      case 'none': return 'card-elevation-none';
      case 'low': return 'card-elevation-low';
      case 'medium': return 'card-elevation-medium';
      case 'high': return 'card-elevation-high';
      default: return 'card-elevation-low';
    }
  };

  // Map padding to Box padding
  const getPadding = () => {
    switch (padding) {
      case 'none': return Box.paddings.XS;
      case 'small': return Box.paddings.SMALL;
      case 'medium': return Box.paddings.MEDIUM;
      case 'large': return Box.paddings.LARGE;
      default: return Box.paddings.MEDIUM;
    }
  };

  const handleClick = onClick ? () => onClick() : undefined;

  return (
    <div
      className={`card ${getElevationClass()} ${className} ${onClick ? 'card-clickable' : ''}`}
      onClick={handleClick}
      data-testid="card-container"
    >
      <Box
        padding={getPadding()}
        rounded={Box.roundeds.MEDIUM}
        border={border ? Box.borders.DEFAULT : undefined}
        borderColor={borderColor}
        backgroundColor={backgroundColor || 'var(--primary-background-color)'}
        data-testid="card-box"
        style={{
          width,
          height,
          minHeight,
          maxHeight,
          overflow
        }}
      >
        {/* Card Header */}
        {(title || headerActions) && (
          <div className="card-header">
            <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER} gap={Flex.gaps.MEDIUM}>
              <div className="card-header-content">
                {title && (
                  <Heading type={Heading.types.h4} value={title} />
                )}
                {subtitle && (
                  <Text className="card-subtitle" color={Text.colors.SECONDARY}>
                    {subtitle}
                  </Text>
                )}
              </div>
              {headerActions && (
                <div className="card-header-actions">
                  {headerActions}
                </div>
              )}
            </Flex>
          </div>
        )}

        {/* Card Content */}
        <div className="card-content">
          {children}
        </div>

        {/* Card Footer */}
        {footerActions && (
          <div className="card-footer">
            {footerActions}
          </div>
        )}
      </Box>
    </div>
  );
};

export default Card;