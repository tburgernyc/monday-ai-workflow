import React, { useState, useEffect } from 'react';
import { workspaceService } from '../services/api/workspaceService';
import { Workspace, WorkspaceUser, WorkspaceUserRole } from '../types/monday';
import { MondayTypes } from '../services/api/mondayApi';

/**
 * Example component demonstrating how to use the WorkspaceService
 */
const WorkspaceServiceExample: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all workspaces
  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fetchedWorkspaces = await workspaceService.getWorkspaces();
      setWorkspaces(fetchedWorkspaces);
      
      console.log('Fetched workspaces:', fetchedWorkspaces);
    } catch (err) {
      handleError(err, 'Failed to fetch workspaces');
    } finally {
      setLoading(false);
    }
  };

  // Fetch a specific workspace by ID
  const fetchWorkspaceById = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const workspace = await workspaceService.getWorkspaceById(id);
      setSelectedWorkspace(workspace);
      
      console.log('Fetched workspace:', workspace);
      
      // If workspace exists, fetch its users
      if (workspace) {
        fetchWorkspaceUsers(id);
      }
    } catch (err) {
      handleError(err, `Failed to fetch workspace with ID ${id}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users in a workspace
  const fetchWorkspaceUsers = async (workspaceId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const users = await workspaceService.getWorkspaceUsers(workspaceId);
      setWorkspaceUsers(users);
      
      console.log('Fetched workspace users:', users);
    } catch (err) {
      handleError(err, `Failed to fetch users for workspace with ID ${workspaceId}`);
    } finally {
      setLoading(false);
    }
  };

  // Create a new workspace
  const createWorkspace = async (name: string, description?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const newWorkspace = await workspaceService.createWorkspace(name, description);
      
      console.log('Created workspace:', newWorkspace);
      
      // Refresh the workspaces list
      fetchWorkspaces();
    } catch (err) {
      handleError(err, 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  // Update a workspace
  const updateWorkspace = async (id: string, data: { name?: string; description?: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedWorkspace = await workspaceService.updateWorkspace(id, data);
      
      console.log('Updated workspace:', updatedWorkspace);
      
      // Refresh the selected workspace
      if (selectedWorkspace?.id === id) {
        setSelectedWorkspace(updatedWorkspace);
      }
      
      // Refresh the workspaces list
      fetchWorkspaces();
    } catch (err) {
      handleError(err, `Failed to update workspace with ID ${id}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete a workspace
  const deleteWorkspace = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await workspaceService.deleteWorkspace(id);
      
      console.log('Deleted workspace with ID:', id);
      
      // Clear selected workspace if it was deleted
      if (selectedWorkspace?.id === id) {
        setSelectedWorkspace(null);
        setWorkspaceUsers([]);
      }
      
      // Refresh the workspaces list
      fetchWorkspaces();
    } catch (err) {
      handleError(err, `Failed to delete workspace with ID ${id}`);
    } finally {
      setLoading(false);
    }
  };

  // Add a user to a workspace
  const addUserToWorkspace = async (workspaceId: string, userId: string, role: WorkspaceUserRole) => {
    try {
      setLoading(true);
      setError(null);
      
      const workspaceUser = await workspaceService.addUserToWorkspace(workspaceId, userId, role);
      
      console.log('Added user to workspace:', workspaceUser);
      
      // Refresh workspace users if this is the selected workspace
      if (selectedWorkspace?.id === workspaceId) {
        fetchWorkspaceUsers(workspaceId);
      }
    } catch (err) {
      handleError(err, `Failed to add user to workspace with ID ${workspaceId}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear the service cache
  const clearCache = () => {
    workspaceService.clearCache();
    console.log('Workspace service cache cleared');
  };

  // Error handling helper
  const handleError = (err: unknown, defaultMessage: string) => {
    console.error(defaultMessage, err);
    
    if (err instanceof MondayTypes.RateLimitError) {
      setError(`Rate limit exceeded. Please try again in ${err.retryAfter} seconds.`);
    } else if (err instanceof MondayTypes.AuthenticationError) {
      setError('Authentication failed. Please check your API token.');
    } else if (err instanceof MondayTypes.NetworkError) {
      setError('Network error. Please check your internet connection.');
    } else if (err instanceof MondayTypes.MondayApiError) {
      setError(`API Error: ${err.message}`);
    } else {
      setError(err instanceof Error ? err.message : defaultMessage);
    }
  };

  // Example usage in useEffect
  useEffect(() => {
    // Fetch all workspaces when component mounts
    fetchWorkspaces();
    
    // Example of creating a workspace
    // createWorkspace('New Project Workspace', 'Workspace for our new project');
    
    // Example of fetching a specific workspace
    // fetchWorkspaceById('12345');
    
    // Example of updating a workspace
    // updateWorkspace('12345', { name: 'Updated Workspace Name' });
    
    // Example of adding a user to a workspace
    // addUserToWorkspace('12345', '67890', WorkspaceUserRole.MEMBER);
    
    // Example of deleting a workspace
    // deleteWorkspace('12345');
    
    // Cleanup function
    return () => {
      // Optional: clear cache when component unmounts
      // workspaceService.clearCache();
    };
  }, []);

  return (
    <div className="workspace-service-example">
      <h1>Workspace Service Example</h1>
      
      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">Error: {error}</div>}
      
      <div className="actions">
        <button onClick={fetchWorkspaces} disabled={loading}>
          Fetch All Workspaces
        </button>
        <button onClick={clearCache} disabled={loading}>
          Clear Cache
        </button>
        <button 
          onClick={() => createWorkspace('New Workspace', 'Created from example')} 
          disabled={loading}
        >
          Create New Workspace
        </button>
      </div>
      
      <div className="workspaces-list">
        <h2>Workspaces ({workspaces.length})</h2>
        {workspaces.map(workspace => (
          <div key={workspace.id} className="workspace-item">
            <h3>{workspace.name}</h3>
            <p>{workspace.description || 'No description'}</p>
            <div className="workspace-actions">
              <button 
                onClick={() => fetchWorkspaceById(workspace.id)} 
                disabled={loading}
              >
                View Details
              </button>
              <button 
                onClick={() => updateWorkspace(workspace.id, { 
                  name: `${workspace.name} (Updated)` 
                })} 
                disabled={loading}
              >
                Update
              </button>
              <button 
                onClick={() => deleteWorkspace(workspace.id)} 
                disabled={loading}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {selectedWorkspace && (
        <div className="selected-workspace">
          <h2>Selected Workspace: {selectedWorkspace.name}</h2>
          <p>ID: {selectedWorkspace.id}</p>
          <p>Description: {selectedWorkspace.description || 'No description'}</p>
          <p>Kind: {selectedWorkspace.kind}</p>
          <p>State: {selectedWorkspace.state}</p>
          <p>Created: {selectedWorkspace.created_at}</p>
          <p>Updated: {selectedWorkspace.updated_at}</p>
          
          <h3>Users ({workspaceUsers.length})</h3>
          <div className="users-list">
            {workspaceUsers.map(wu => (
              <div key={wu.id} className="user-item">
                <p>Name: {wu.user.name}</p>
                <p>Email: {wu.user.email}</p>
                <p>Role: {wu.role}</p>
              </div>
            ))}
          </div>
          
          <div className="add-user-form">
            <h4>Add User</h4>
            <button 
              onClick={() => addUserToWorkspace(
                selectedWorkspace.id, 
                'user_id_here', 
                WorkspaceUserRole.MEMBER
              )} 
              disabled={loading}
            >
              Add Example User
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceServiceExample;