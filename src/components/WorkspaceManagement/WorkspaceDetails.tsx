import React, { useState, useEffect } from 'react';
import './WorkspaceDetails.css';
import { 
  Box, 
  Button, 
  Flex, 
  Heading, 
  Text, 
  Avatar, 
  Loader
} from 'monday-ui-react-core';
import { 
  Edit, 
  Delete, 
  Person, 
  Board, 
  Group, 
  Item, 
  Settings 
} from 'monday-ui-react-core/icons';
import { Workspace } from '../../types/monday';
import { useWorkspaces } from '../../hooks/useWorkspaces';

interface WorkspaceDetailsProps {
  workspaceId: string;
  onEdit: (workspace: Workspace) => void;
  onDelete: (workspaceId: string) => void;
  onBack: () => void;
}

const WorkspaceDetails: React.FC<WorkspaceDetailsProps> = ({
  workspaceId,
  onEdit,
  onDelete,
  onBack
}) => {
  const { getWorkspaceById, loading, error } = useWorkspaces();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const data = await getWorkspaceById(workspaceId);
        setWorkspace(data);
      } catch (err) {
        console.error('Error fetching workspace details:', err);
      }
    };

    fetchWorkspace();
  }, [workspaceId, getWorkspaceById]);

  const handleEdit = () => {
    if (workspace) {
      onEdit(workspace);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this workspace?')) {
      onDelete(workspaceId);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  if (loading) {
    return (
      <Box className="workspace-details-loading" padding={Box.paddings.LARGE}>
        <Flex justify={Flex.justify.CENTER} align={Flex.align.CENTER} direction={Flex.directions.COLUMN} gap={Flex.gaps.MEDIUM}>
          <Loader size={Loader.sizes.MEDIUM} />
          <Text>Loading workspace details...</Text>
        </Flex>
      </Box>
    );
  }

  if (error || !workspace) {
    return (
      <Box className="workspace-details-error" padding={Box.paddings.LARGE}>
        <Flex justify={Flex.justify.CENTER} align={Flex.align.CENTER} direction={Flex.directions.COLUMN} gap={Flex.gaps.MEDIUM}>
          <Text weight={Text.weights.BOLD}>Error loading workspace</Text>
          <Text>{error || 'Workspace not found'}</Text>
          <Button onClick={onBack}>Back to Workspaces</Button>
        </Flex>
      </Box>
    );
  }

  return (
    <Box className="workspace-details-container" padding={Box.paddings.LARGE}>
      {/* Header */}
      <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER} className="workspace-details-header">
        <Flex align={Flex.align.CENTER} gap={Flex.gaps.SMALL}>
          <Button
            kind={Button.kinds.TERTIARY}
            size={Button.sizes.SMALL}
            onClick={onBack}
          >
            Back
          </Button>
          <Heading type={Heading.types.h2} value={workspace.name} />
          <div className="workspace-kind-tag">
            {workspace.kind?.charAt(0).toUpperCase() + workspace.kind?.slice(1)}
          </div>
        </Flex>
        <Flex gap={Flex.gaps.SMALL}>
          <Button
            kind={Button.kinds.TERTIARY}
            size={Button.sizes.SMALL}
            onClick={handleEdit}
            leftIcon={Edit}
          >
            Edit
          </Button>
          <Button
            kind={Button.kinds.TERTIARY}
            size={Button.sizes.SMALL}
            onClick={handleDelete}
            leftIcon={Delete}
            className="delete-button"
          >
            Delete
          </Button>
        </Flex>
      </Flex>

      {/* Description */}
      <Box className="workspace-description" padding={Box.paddings.MEDIUM}>
        <Text>{workspace.description || 'No description provided.'}</Text>
      </Box>

      {/* Metadata */}
      <Flex className="workspace-metadata" gap={Flex.gaps.LARGE}>
        <div className="metadata-item">
          <Text weight={Text.weights.BOLD}>Created</Text>
          <Text>{formatDate(workspace.created_at || '')}</Text>
        </div>
        <div className="metadata-item">
          <Text weight={Text.weights.BOLD}>Last Updated</Text>
          <Text>{formatDate(workspace.updated_at || '')}</Text>
        </div>
        <div className="metadata-item">
          <Text weight={Text.weights.BOLD}>Members</Text>
          <Text>{workspace.members_count || 0} members</Text>
        </div>
      </Flex>

      {/* Tabs */}
      <div className="workspace-tabs">
        <div className="tabs-header">
          <div 
            className={`tab-item ${activeTab === 0 ? 'active' : ''}`} 
            onClick={() => setActiveTab(0)}
          >
            <Board /> Boards
          </div>
          <div 
            className={`tab-item ${activeTab === 1 ? 'active' : ''}`} 
            onClick={() => setActiveTab(1)}
          >
            <Person /> Members
          </div>
          <div 
            className={`tab-item ${activeTab === 2 ? 'active' : ''}`} 
            onClick={() => setActiveTab(2)}
          >
            <Settings /> Settings
          </div>
        </div>
        
        <div className="tab-content">
          {activeTab === 0 && (
            <div className="boards-list">
              {/* We're showing sample boards since the Workspace type doesn't have boards property */}
              <div className="board-item">
                <Board />
                <Text>Sample Board</Text>
              </div>
              <div className="board-item">
                <Board />
                <Text>Another Board</Text>
              </div>
              <Text>No boards in this workspace.</Text>
            </div>
          )}
          
          {activeTab === 1 && (
            <div className="members-list">
              {/* We're showing sample members since the Workspace type doesn't have members property */}
              <div className="member-item">
                <Avatar
                  size={Avatar.sizes.SMALL}
                  src=""
                  type={Avatar.types.IMG}
                  text="John Doe"
                />
                <Text>John Doe</Text>
                <Text>john.doe@example.com</Text>
              </div>
              <div className="member-item">
                <Avatar
                  size={Avatar.sizes.SMALL}
                  src=""
                  type={Avatar.types.IMG}
                  text="Jane Smith"
                />
                <Text>Jane Smith</Text>
                <Text>jane.smith@example.com</Text>
              </div>
              <Text>No members in this workspace.</Text>
            </div>
          )}
          
          {activeTab === 2 && (
            <div>
              <Text>Workspace settings will be implemented in a future update.</Text>
            </div>
          )}
        </div>
      </div>
    </Box>
  );
};

export default WorkspaceDetails;