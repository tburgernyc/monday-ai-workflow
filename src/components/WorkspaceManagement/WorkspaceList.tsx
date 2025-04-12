import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Search,
  IconButton,
  Flex
} from 'monday-ui-react-core';
import {
  Filter,
  Sort,
  Add,
  DropdownChevronDown,
  Delete,
  Edit,
  Person
} from 'monday-ui-react-core/icons';
import { Workspace } from '../../types/monday';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import './WorkspaceList.css';

// Helper function to format dates
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

interface WorkspaceListProps {
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
  onEditWorkspace: (workspace: Workspace) => void;
  onDeleteWorkspace: (workspace: Workspace) => void;
  onManageUsers: (workspace: Workspace) => void;
}

const WorkspaceList: React.FC<WorkspaceListProps> = ({
  onSelectWorkspace,
  onCreateWorkspace,
  onEditWorkspace,
  onDeleteWorkspace,
  onManageUsers
}) => {
  const { 
    workspaces, 
    loading, 
    error, 
    fetchWorkspaces, 
    sortWorkspaces, 
    filterWorkspaces 
  } = useWorkspaces();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'created_at' | 'updated_at' | 'members_count'>('name');
  const [sortAscending, setSortAscending] = useState(true);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    filterWorkspaces(value);
  };

  const handleSort = (field: 'name' | 'created_at' | 'updated_at' | 'members_count') => {
    if (field === sortField) {
      // Toggle sort direction if clicking the same field
      setSortAscending(!sortAscending);
      sortWorkspaces(field, !sortAscending);
    } else {
      // Default to ascending for new sort field
      setSortField(field);
      setSortAscending(true);
      sortWorkspaces(field, true);
    }
  };

  const getSortIcon = (field: 'name' | 'created_at' | 'updated_at' | 'members_count') => {
    if (field !== sortField) return null;
    return sortAscending ? '↑' : '↓';
  };

  if (loading) {
    return <LoadingSpinner centered text="Loading workspaces..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading workspaces"
        description={error}
        actionLabel="Try Again"
        onAction={fetchWorkspaces}
      />
    );
  }

  if (workspaces.length === 0) {
    return (
      <EmptyState
        title="No workspaces found"
        description="Create your first workspace to get started"
        actionLabel="Create Workspace"
        onAction={onCreateWorkspace}
      />
    );
  }

  return (
    <Box padding={Box.paddings.MEDIUM}>
      <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER} gap={Flex.gaps.MEDIUM}>
        <h2>Workspaces</h2>
        <Button
          leftIcon={Add}
          onClick={onCreateWorkspace}
          kind={Button.kinds.PRIMARY}
        >
          Create Workspace
        </Button>
      </Flex>
      
      <Box marginTop={Box.marginTops.MEDIUM} marginBottom={Box.marginBottoms.MEDIUM}>
        <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER} gap={Flex.gaps.MEDIUM}>
          <Search
            placeholder="Search workspaces..."
            value={searchTerm}
            onChange={handleSearch}
            wrapperClassName="workspace-search"
          />
          
          <div className="sort-dropdown">
            <Button
              kind={Button.kinds.TERTIARY}
              leftIcon={Sort}
              size={Button.sizes.MEDIUM}
            >
              Sort By
            </Button>
            <div className="sort-menu">
              <div
                className="sort-menu-item"
                onClick={() => handleSort('name')}
              >
                <span>{getSortIcon('name')}</span>
                <span>Name</span>
              </div>
              <div
                className="sort-menu-item"
                onClick={() => handleSort('created_at')}
              >
                <span>{getSortIcon('created_at')}</span>
                <span>Created Date</span>
              </div>
              <div
                className="sort-menu-item"
                onClick={() => handleSort('updated_at')}
              >
                <span>{getSortIcon('updated_at')}</span>
                <span>Updated Date</span>
              </div>
              <div
                className="sort-menu-item"
                onClick={() => handleSort('members_count')}
              >
                <span>{getSortIcon('members_count')}</span>
                <span>Members Count</span>
              </div>
            </div>
          </div>
        </Flex>
      </Box>
      
      <div className="workspace-table">
        <table className="monday-style-table">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Name</th>
              <th style={{ width: '30%' }}>Description</th>
              <th style={{ width: '10%' }}>Members</th>
              <th style={{ width: '15%' }}>Last Updated</th>
              <th style={{ width: '15%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map(workspace => (
              <tr key={workspace.id} onClick={() => onSelectWorkspace(workspace)} className="workspace-row">
                <td>{workspace.name}</td>
                <td>{workspace.description || 'No description'}</td>
                <td>{workspace.members_count || 0}</td>
                <td>{workspace.updated_at ? formatDate(workspace.updated_at) : 'N/A'}</td>
                <td>
              <Flex justify={Flex.justify.START} align={Flex.align.CENTER} gap={Flex.gaps.SMALL}>
                <IconButton
                  icon={Edit}
                  kind={IconButton.kinds.TERTIARY}
                  ariaLabel="Edit workspace"
                  size={IconButton.sizes.SMALL}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditWorkspace(workspace);
                  }}
                />
                <IconButton
                  icon={Person}
                  kind={IconButton.kinds.TERTIARY}
                  ariaLabel="Manage users"
                  size={IconButton.sizes.SMALL}
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageUsers(workspace);
                  }}
                />
                <IconButton
                  icon={Delete}
                  kind={IconButton.kinds.TERTIARY}
                  ariaLabel="Delete workspace"
                  size={IconButton.sizes.SMALL}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteWorkspace(workspace);
                  }}
                />
              </Flex>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Box>
  );
};

export default WorkspaceList;