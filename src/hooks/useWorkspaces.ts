import { useState, useEffect, useCallback } from 'react';
import { workspaceService } from '../services/api/workspaceService';
import { Workspace, WorkspaceUser, WorkspaceUpdateInput, WorkspaceUserRole } from '../types/monday';
import { useAuth } from '../components/Authentication/AuthContext';
import { useNotifications } from '../context/NotificationsContext';

interface UseWorkspacesOptions {
  initialLoad?: boolean;
}

interface UseWorkspacesReturn {
  workspaces: Workspace[];
  selectedWorkspace: Workspace | null;
  workspaceUsers: WorkspaceUser[];
  loading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  getWorkspaceById: (id: string) => Promise<Workspace | null>;
  createWorkspace: (name: string, description?: string, kind?: string) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<WorkspaceUpdateInput>) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<{ id: string }>;
  selectWorkspace: (workspace: Workspace | null) => void;
  fetchWorkspaceUsers: (workspaceId: string) => Promise<WorkspaceUser[]>;
  addUserToWorkspace: (workspaceId: string, userId: string, role: WorkspaceUserRole) => Promise<WorkspaceUser>;
  sortWorkspaces: (sortBy: 'name' | 'created_at' | 'updated_at' | 'members_count', ascending?: boolean) => void;
  filterWorkspaces: (searchTerm: string) => void;
}

/**
 * Custom hook for managing workspaces
 * Provides methods for fetching, creating, updating, and deleting workspaces,
 * as well as managing workspace users and filtering/sorting workspaces
 */
export const useWorkspaces = (options: UseWorkspacesOptions = {}): UseWorkspacesReturn => {
  const { token } = useAuth();
  const { addNotification } = useNotifications();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [filteredWorkspaces, setFilteredWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { initialLoad = true } = options;

  // Fetch workspaces
  const fetchWorkspaces = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const workspacesData = await workspaceService.getWorkspaces();
      setWorkspaces(workspacesData);
      setFilteredWorkspaces(workspacesData);
      setError(null);
    } catch (err: unknown) {
      console.error('Error fetching workspaces:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch workspaces';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Workspace Error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [token, addNotification]);

  // Get workspace by ID
  const getWorkspaceById = useCallback(async (id: string): Promise<Workspace | null> => {
    if (!token) return null;
    
    try {
      setLoading(true);
      const workspace = await workspaceService.getWorkspaceById(id);
      return workspace;
    } catch (err: unknown) {
      console.error(`Error fetching workspace with ID ${id}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to fetch workspace with ID ${id}`;
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Workspace Error',
        message: errorMessage
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, addNotification]);

  // Create workspace
  const createWorkspace = useCallback(async (
    name: string,
    description?: string,
    kind: string = 'open'
  ): Promise<Workspace> => {
    if (!token) throw new Error('Authentication required');
    
    try {
      setLoading(true);
      const workspace = await workspaceService.createWorkspace(name, description, kind);
      
      // Update workspaces list
      setWorkspaces(prev => [...prev, workspace]);
      setFilteredWorkspaces(prev => [...prev, workspace]);
      
      addNotification({
        type: 'success',
        title: 'Workspace Created',
        message: `Workspace "${name}" has been created successfully`
      });
      
      return workspace;
    } catch (err: unknown) {
      console.error('Error creating workspace:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Workspace Error',
        message: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, addNotification]);

  // Update workspace
  const updateWorkspace = useCallback(async (
    id: string,
    data: Partial<WorkspaceUpdateInput>
  ): Promise<Workspace> => {
    if (!token) throw new Error('Authentication required');
    
    try {
      setLoading(true);
      const updatedWorkspace = await workspaceService.updateWorkspace(id, data);
      
      // Update workspaces list
      setWorkspaces(prev => 
        prev.map(workspace => workspace.id === id ? updatedWorkspace : workspace)
      );
      setFilteredWorkspaces(prev => 
        prev.map(workspace => workspace.id === id ? updatedWorkspace : workspace)
      );
      
      // Update selected workspace if it's the one being updated
      if (selectedWorkspace && selectedWorkspace.id === id) {
        setSelectedWorkspace(updatedWorkspace);
      }
      
      addNotification({
        type: 'success',
        title: 'Workspace Updated',
        message: `Workspace "${updatedWorkspace.name}" has been updated successfully`
      });
      
      return updatedWorkspace;
    } catch (err: unknown) {
      console.error(`Error updating workspace with ID ${id}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to update workspace with ID ${id}`;
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Workspace Error',
        message: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, selectedWorkspace, addNotification]);

  // Delete workspace
  const deleteWorkspace = useCallback(async (id: string): Promise<{ id: string }> => {
    if (!token) throw new Error('Authentication required');
    
    try {
      setLoading(true);
      const result = await workspaceService.deleteWorkspace(id);
      
      // Update workspaces list
      setWorkspaces(prev => prev.filter(workspace => workspace.id !== id));
      setFilteredWorkspaces(prev => prev.filter(workspace => workspace.id !== id));
      
      // Clear selected workspace if it's the one being deleted
      if (selectedWorkspace && selectedWorkspace.id === id) {
        setSelectedWorkspace(null);
      }
      
      addNotification({
        type: 'success',
        title: 'Workspace Deleted',
        message: 'Workspace has been deleted successfully'
      });
      
      return result;
    } catch (err: unknown) {
      console.error(`Error deleting workspace with ID ${id}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to delete workspace with ID ${id}`;
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Workspace Error',
        message: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, selectedWorkspace, addNotification]);

  // Select workspace
  const selectWorkspace = useCallback((workspace: Workspace | null) => {
    setSelectedWorkspace(workspace);
  }, []);

  // Fetch workspace users
  const fetchWorkspaceUsers = useCallback(async (workspaceId: string): Promise<WorkspaceUser[]> => {
    if (!token) return [];
    
    try {
      setLoading(true);
      const users = await workspaceService.getWorkspaceUsers(workspaceId);
      setWorkspaceUsers(users);
      return users;
    } catch (err: unknown) {
      console.error(`Error fetching users for workspace ${workspaceId}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to fetch users for workspace with ID ${workspaceId}`;
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Workspace Error',
        message: errorMessage
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [token, addNotification]);

  // Add user to workspace
  const addUserToWorkspace = useCallback(async (
    workspaceId: string,
    userId: string,
    role: WorkspaceUserRole
  ): Promise<WorkspaceUser> => {
    if (!token) throw new Error('Authentication required');
    
    try {
      setLoading(true);
      const workspaceUser = await workspaceService.addUserToWorkspace(workspaceId, userId, role);
      
      // Update workspace users list
      setWorkspaceUsers(prev => [...prev, workspaceUser]);
      
      addNotification({
        type: 'success',
        title: 'User Added',
        message: `User has been added to the workspace successfully with role: ${role}`
      });
      
      return workspaceUser;
    } catch (err: unknown) {
      console.error(`Error adding user ${userId} to workspace ${workspaceId}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to add user to workspace with ID ${workspaceId}`;
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Workspace Error',
        message: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, addNotification]);

  // Sort workspaces
  const sortWorkspaces = useCallback((
    sortBy: 'name' | 'created_at' | 'updated_at' | 'members_count',
    ascending: boolean = true
  ) => {
    const sorted = [...filteredWorkspaces].sort((a, b) => {
      if (sortBy === 'name') {
        return ascending 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'members_count') {
        const countA = a.members_count || 0;
        const countB = b.members_count || 0;
        return ascending ? countA - countB : countB - countA;
      } else {
        const dateA = a[sortBy] ? new Date(a[sortBy]!).getTime() : 0;
        const dateB = b[sortBy] ? new Date(b[sortBy]!).getTime() : 0;
        return ascending ? dateA - dateB : dateB - dateA;
      }
    });
    
    setFilteredWorkspaces(sorted);
  }, [filteredWorkspaces]);

  // Filter workspaces
  const filterWorkspaces = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredWorkspaces(workspaces);
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const filtered = workspaces.filter(workspace => 
      workspace.name.toLowerCase().includes(term) || 
      (workspace.description && workspace.description.toLowerCase().includes(term))
    );
    
    setFilteredWorkspaces(filtered);
  }, [workspaces]);

  // Initial load
  useEffect(() => {
    if (initialLoad && token) {
      fetchWorkspaces();
    }
  }, [initialLoad, token, fetchWorkspaces]);

  return {
    workspaces: filteredWorkspaces,
    selectedWorkspace,
    workspaceUsers,
    loading,
    error,
    fetchWorkspaces,
    getWorkspaceById,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    selectWorkspace,
    fetchWorkspaceUsers,
    addUserToWorkspace,
    sortWorkspaces,
    filterWorkspaces
  };
};

export default useWorkspaces;