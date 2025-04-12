import React from 'react';
import { Box, Heading, Text, Button } from 'monday-ui-react-core';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * EmptyState component to display when there's no data to show
 * Used for lists, tables, and other data displays when they are empty
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
  size = 'medium'
}) => {
  // Determine sizes based on the size prop
  const getSizes = () => {
    switch (size) {
      case 'small':
        return {
          padding: Box.paddings.SMALL,
          titleType: Heading.types.h5,
          iconSize: 32
        };
      case 'large':
        return {
          padding: Box.paddings.LARGE,
          titleType: Heading.types.h2,
          iconSize: 64
        };
      case 'medium':
      default:
        return {
          padding: Box.paddings.MEDIUM,
          titleType: Heading.types.h3,
          iconSize: 48
        };
    }
  };

  const { padding, titleType, iconSize } = getSizes();

  return (
    <Box
      padding={padding}
      backgroundColor={Box.backgroundColors.PRIMARY_BACKGROUND_COLOR}
      rounded={Box.roundeds.MEDIUM}
      border={Box.borders.DEFAULT}
      className={`empty-state ${className}`}
      data-testid="empty-state"
      style={{
        textAlign: 'center',
        maxWidth: '100%',
        margin: '0 auto'
      }}
    >
      {icon && (
        <div className="empty-state-icon" style={{ marginBottom: '16px' }} data-testid="empty-state-icon">
          {icon}
        </div>
      )}

      <Heading type={titleType} value={title} />

      {description && (
        <Box marginTop={Box.marginTops.SMALL}>
          <Text>{description}</Text>
        </Box>
      )}

      {actionLabel && onAction && (
        <Box marginTop={Box.marginTops.MEDIUM}>
          <Button onClick={onAction} data-testid="empty-state-action">
            {actionLabel}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default EmptyState;