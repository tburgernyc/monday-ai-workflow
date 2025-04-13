import React, { useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import './WorkspaceList.css';
import './EnhancedWorkspaceList.css';
import {
  Button,
  Box,
  Text,
  Loader,
  Flex,
  Heading,
  IconButton,
  Tooltip,
  Divider
} from 'monday-ui-react-core';
import {
  Retry, 
  Add, 
  Edit, 
  Delete, 
  Board, 
  Person, 
  Time, 
  Workspace as WorkspaceIcon
} from 'monday-ui-react-core/icons';
import { useEnhancedWorkspaces } from '../../hooks/useEnhancedWorkspaces';
import { Workspace as WorkspaceType } from '../../types/monday';

// Define our own extended workspace type to handle the properties we need
interface EnhancedWorkspace extends WorkspaceType {
  boards_count?: number;
  members_count?: number;
}

// Create a simple Card component since monday-ui-react-core doesn't export it directly
const Card: React.FC<{
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  'aria-label'?: string;
  children: React.ReactNode;
}> = ({ className, onClick, onMouseEnter, tabIndex, onKeyDown, 'aria-label': ariaLabel, children }) => {
  return (
    <div 
      className={`monday-card ${className || ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      role="button"
    >
      {children}
    </div>
  );
};

// Create a simple Banner component since monday-ui-react-core doesn't export it directly
type BannerType = 'positive' | 'negative' | 'warning' | 'info';

interface BannerProps {
  content: string;
  subtitle?: string;
  type: BannerType;
}

const BANNER_TYPES = {
  POSITIVE: 'positive' as BannerType,
  NEGATIVE: 'negative' as BannerType,
  WARNING: 'warning' as BannerType,
  INFO: 'info' as BannerType
};

const Banner: React.FC<BannerProps> = ({ content, subtitle, type }) => {
  const getClassName = () => {
    switch (type) {
      case 'positive': return 'monday-banner-positive';
      case 'negative': return 'monday-banner-negative';
      case 'warning': return 'monday-banner-warning';
      default: return 'monday-banner-info';
    }
  };

  return (
    <div className={`monday-banner ${getClassName()}`}>
      <div className="monday-banner-content">{content}</div>
      {subtitle && <div className="monday-banner-subtitle">{subtitle}</div>}
    </div>
  );
};

interface EnhancedWorkspaceListProps {
  /**
   * Whether to show action buttons (edit, delete)
   */
  showActions?: boolean;
  
  /**
   * Custom CSS class
   */
  className?: string;
  
  /**
   * Whether to prefetch workspace details on hover
   */
  prefetchOnHover?: boolean;
}

/**
 * EnhancedWorkspaceList component that uses the enhanced workspace service and hooks
 * for better performance and caching. It also standardizes UI components using
 * monday-ui-react-core.
 * 
 * Accessibility features:
 * - Uses proper heading hierarchy
 * - Uses semantic list elements
 * - Provides proper ARIA attributes
 * - Ensures keyboard navigation
 * - Includes screen reader text
 */
const EnhancedWorkspaceList: React.FC<EnhancedWorkspaceListProps> = ({
  showActions = true,
  className = '',
  prefetchOnHover = true
}) => {
  const navigate = useNavigate();
  
  // Use the enhanced workspaces hook
  const { 
    workspaces, 
    loading, 
    error, 
    deleteWorkspace,
    selectWorkspace
  } = useEnhancedWorkspaces({
    initialLoad: true,
    ttl: 5 * 60 * 1000 // 5 minutes cache
  });
  
  const handleSelect = useCallback((workspaceId: string) => {
    selectWorkspace(workspaceId);
    navigate(`/workspace/${workspaceId}`);
  }, [selectWorkspace, navigate]);
  
  const handleEdit = useCallback((e: React.MouseEvent, workspaceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/workspace/${workspaceId}/edit`);
  }, [navigate]);
  
  const handleDelete = useCallback((e: React.MouseEvent, workspaceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Confirm before deleting
    if (window.confirm('Are you sure you want to delete this workspace?')) {
      deleteWorkspace(workspaceId)
        .then(() => {
          // Show success message or notification
          console.log('Workspace deleted successfully');
        })
        .catch((error) => {
          // Show error message
          console.error('Error deleting workspace:', error);
        });
    }
  }, [deleteWorkspace]);
  
  const handleCreateWorkspace = useCallback(() => {
    navigate('/workspaces/create');
  }, [navigate]);
  
  if (loading) {
    return (
      <Box className="workspace-list-loading" padding={Box.paddings.LARGE}>
        <Flex direction={Flex.directions.COLUMN} align={Flex.align.CENTER} gap={Flex.gaps.MEDIUM}>
          <Loader size={Loader.sizes.MEDIUM} />
          <Text>Loading workspaces...</Text>
        </Flex>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box className="workspace-list-error" padding={Box.paddings.MEDIUM}>
        <Banner
          content="Error loading workspaces"
          type={BANNER_TYPES.NEGATIVE}
          subtitle={error.message || String(error)}
        />
        <Box padding={Box.paddings.MEDIUM}>
          <Button
            onClick={() => window.location.reload()}
            kind={Button.kinds.SECONDARY}
            leftIcon={Retry}
          >
            Retry
          </Button>
        </Box>
      </Box>
    );
  }
  
  if (workspaces.length === 0) {
    return (
      <Box className="workspace-list-empty" padding={Box.paddings.LARGE}>
        <Flex direction={Flex.directions.COLUMN} align={Flex.align.CENTER} gap={Flex.gaps.MEDIUM}>
          <Text>No workspaces found.</Text>
          <Button
            onClick={handleCreateWorkspace}
            kind={Button.kinds.PRIMARY}
            leftIcon={Add}
          >
            Create Workspace
          </Button>
        </Flex>
      </Box>
    );
  }
  
  return (
    <nav
      className={`workspace-list-container ${className}`}
      aria-label="Workspaces"
    >
      <Heading
        type={Heading.types.h2}
        id="workspace-list-heading"
        value="My Workspaces"
        size={Heading.sizes.MEDIUM}
      />
      
      <Box padding={Box.paddings.MEDIUM}>
        <Button
          onClick={handleCreateWorkspace}
          kind={Button.kinds.PRIMARY}
          leftIcon={Add}
          size={Button.sizes.SMALL}
        >
          Create Workspace
        </Button>
      </Box>
      
      <Divider className="margin-medium" />
      
      <ul
        className="workspace-list"
        role="list"
        aria-labelledby="workspace-list-heading"
      >
        {workspaces.map((workspace) => (
          <li
            key={workspace.id}
            className="workspace-list-item"
            role="listitem"
          >
            <Card
              className="workspace-card"
              onClick={() => handleSelect(workspace.id)}
              onMouseEnter={prefetchOnHover ? () => selectWorkspace(workspace.id) : undefined}
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(workspace.id);
                }
              }}
              aria-label={`Workspace: ${workspace.name}`}
            >
              <Flex direction={Flex.directions.COLUMN} gap={Flex.gaps.SMALL}>
                <Flex align={Flex.align.CENTER} gap={Flex.gaps.SMALL}>
                  <WorkspaceIcon size="24" />
                  <Heading
                    type={Heading.types.h3}
                    value={workspace.name}
                    size={Heading.sizes.SMALL}
                    className="workspace-name"
                  />
                </Flex>
                
                {workspace.description && (
                  <Text className="workspace-description">
                    {workspace.description}
                  </Text>
                )}
                
                <Flex className="workspace-meta" gap={Flex.gaps.MEDIUM}>
                  {/* Display board count if available */}
                  <Flex align={Flex.align.CENTER} gap={Flex.gaps.SMALL}>
                    <Board size="16" />
                    <Text color={Text.colors.SECONDARY}>
                      <span className="sr-only">Number of boards:</span>
                      {(workspace as EnhancedWorkspace).boards_count || 0} {((workspace as EnhancedWorkspace).boards_count === 1) ? 'board' : 'boards'}
                    </Text>
                  </Flex>
                  
                  {/* Display member count if available */}
                  <Flex align={Flex.align.CENTER} gap={Flex.gaps.SMALL}>
                    <Person size="16" />
                    <Text color={Text.colors.SECONDARY}>
                      <span className="sr-only">Number of members:</span>
                      {(workspace as EnhancedWorkspace).members_count || 0} {((workspace as EnhancedWorkspace).members_count === 1) ? 'member' : 'members'}
                    </Text>
                  </Flex>
                  
                  {/* Display updated date if available */}
                  {workspace.updated_at && (
                    <Flex align={Flex.align.CENTER} gap={Flex.gaps.SMALL}>
                      <Time size="16" />
                      <Text color={Text.colors.SECONDARY}>
                        <span className="sr-only">Last updated:</span>
                        {new Date(workspace.updated_at).toLocaleDateString()}
                      </Text>
                    </Flex>
                  )}
                </Flex>
                
                {showActions && (
                  <Flex className="workspace-actions" justify={Flex.justify.END} gap={Flex.gaps.SMALL}>
                    <Tooltip content="Edit workspace">
                      <IconButton
                        onClick={(e: React.MouseEvent) => handleEdit(e, workspace.id)}
                        ariaLabel={`Edit workspace: ${workspace.name}`}
                        kind={IconButton.kinds.TERTIARY}
                        size={IconButton.sizes.SMALL}
                        icon={Edit}
                      />
                    </Tooltip>
                    
                    <Tooltip content="Delete workspace">
                      <IconButton
                        onClick={(e: React.MouseEvent) => handleDelete(e, workspace.id)}
                        ariaLabel={`Delete workspace: ${workspace.name}`}
                        kind={IconButton.kinds.TERTIARY}
                        size={IconButton.sizes.SMALL}
                        icon={Delete}
                        color={IconButton.colors.NEGATIVE}
                      />
                    </Tooltip>
                  </Flex>
                )}
              </Flex>
            </Card>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default memo(EnhancedWorkspaceList);