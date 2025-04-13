import { useState, useCallback } from 'react';
import { Workspace, WorkspaceUpdateInput, WorkspaceUser, WorkspaceUserRole } from '../types/monday';
import { enhancedWorkspaceService } from '../services/api/enhancedWorkspaceService';
import { useCachedData, useInvalidateCache } from './useCachedData';
import { MondayLogger } from '../services/api/mondayApi';

// Cache namespace for workspace-related data
const CACHE_NAMESPACE = 'workspace';

/**
 * Options for the useEnhancedWorkspaces hook
 */
interface UseEnhancedWorkspacesOptions {
  /**
   * Whether to skip the initial fetch
   */
  initialLoad?: boolean;
  
  /**
   * Time-to-live in milliseconds for the cached data
   */
  ttl?: number;
}

/**
 * Custom hook for working with workspaces using enhanced caching
 * 
 * This hook provides methods to interact with Monday.com workspaces,
 * including fetching, creating, updating, and deleting workspaces,
 * as well as managing workspace users. It uses the EnhancedWorkspaceService
 * for improved caching and performance.
 * 
 * @param options Options for the hook
 * @returns Object containing workspaces data and methods to interact with workspaces
 */
export function useEnhancedWorkspaces(options: UseEnhancedWorkspacesOptions = {}) {
  const { initialLoad = true, ttl = 5 * 60 * 1000 } = options;
  
  // State for selected workspace
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  
  // Cache invalidation functions
  const { invalidateEntry, invalidatePattern } = useInvalidateCache(CACHE_NAMESPACE);
  
  // Fetch all workspaces with caching
  const {
    data: workspaces,
    loading: loadingWorkspaces,
    error: workspacesError,
    refetch: refetchWorkspaces
  } = useCachedData<Workspace[]>({
    cacheKey: 'all-workspaces',
    namespace: CACHE_NAMESPACE,
    fetchFn: () => enhancedWorkspaceService.getWorkspaces(),
    ttl,
    skip: !initialLoad,
    persist: true
  });
  
  // Fetch selected workspace details if ID is provided
  const {
    data: selectedWorkspace,
    loading: loadingSelectedWorkspace,
    error: selectedWorkspaceError,
    refetch: refetchSelectedWorkspace
  } = useCachedData<Workspace | null>({
    cacheKey: selectedWorkspaceId ? `workspace-${selectedWorkspaceId}` : 'no-workspace',
    namespace: CACHE_NAMESPACE,
    fetchFn: () => selectedWorkspaceId ? enhancedWorkspaceService.getWorkspaceById(selectedWorkspaceId) : Promise.resolve(null),
    ttl,
    skip: !selectedWorkspaceId,
    deps: [selectedWorkspaceId]
  });
  
  // Fetch workspace users if a workspace is selected
  const {
    data: workspaceUsers,
    loading: loadingWorkspaceUsers,
    error: workspaceUsersError,
    refetch: refetchWorkspaceUsers
  } = useCachedData<WorkspaceUser[]>({
    cacheKey: selectedWorkspaceId ? `workspace-users-${selectedWorkspaceId}` : 'no-workspace-users',
    namespace: CACHE_NAMESPACE,
    fetchFn: () => selectedWorkspaceId ? enhancedWorkspaceService.getWorkspaceUsers(selectedWorkspaceId) : Promise.resolve([]),
    ttl,
    skip: !selectedWorkspaceId,
    deps: [selectedWorkspaceId]
  });
  
  /**
   * Select a workspace by ID
   * @param id The ID of the workspace to select
   */
  const selectWorkspace = useCallback((id: string | null) => {
    setSelectedWorkspaceId(id);
  }, []);
  
  /**
   * Create a new workspace
   * @param name The name of the workspace
   * @param description Optional description for the workspace
   * @param kind Optional workspace kind (defaults to "open")
   * @returns Promise resolving to the created Workspace object
   */
  const createWorkspace = useCallback(async (
    name: string,
    description?: string,
    kind: string = 'open'
  ): Promise<Workspace> => {
    try {
      const workspace = await enhancedWorkspaceService.createWorkspace(name, description, kind);
      
      // Invalidate workspaces cache
      await invalidateEntry('all-workspaces');
      
      // Refetch workspaces
      refetchWorkspaces();
      
      return workspace;
    } catch (error) {
      MondayLogger.error('Error creating workspace:', error);
      throw error;
    }
  }, [invalidateEntry, refetchWorkspaces]);
  
  /**
   * Update an existing workspace
   * @param id The ID of the workspace to update
   * @param data Object containing the properties to update
   * @returns Promise resolving to the updated Workspace object
   */
  const updateWorkspace = useCallback(async (
    id: string,
    data: Partial<WorkspaceUpdateInput>
  ): Promise<Workspace> => {
    try {
      const workspace = await enhancedWorkspaceService.updateWorkspace(id, data);
      
      // Invalidate caches
      await invalidateEntry(`workspace-${id}`);
      await invalidateEntry('all-workspaces');
      
      // Refetch data if this is the selected workspace
      if (id === selectedWorkspaceId) {
        refetchSelectedWorkspace();
      }
      
      // Refetch workspaces list
      refetchWorkspaces();
      
      return workspace;
    } catch (error) {
      MondayLogger.error(`Error updating workspace with ID ${id}:`, error);
      throw error;
    }
  }, [invalidateEntry, selectedWorkspaceId, refetchSelectedWorkspace, refetchWorkspaces]);
  
  /**
   * Delete a workspace
   * @param id The ID of the workspace to delete
   * @returns Promise resolving to an object containing the deleted workspace ID
   */
  const deleteWorkspace = useCallback(async (id: string): Promise<{ id: string }> => {
    try {
      const result = await enhancedWorkspaceService.deleteWorkspace(id);
      
      // Invalidate caches
      await invalidateEntry(`workspace-${id}`);
      await invalidateEntry('all-workspaces');
      await invalidatePattern(`workspace-users-${id}*`);
      
      // If this was the selected workspace, clear selection
      if (id === selectedWorkspaceId) {
        setSelectedWorkspaceId(null);
      }
      
      // Refetch workspaces list
      refetchWorkspaces();
      
      return result;
    } catch (error) {
      MondayLogger.error(`Error deleting workspace with ID ${id}:`, error);
      throw error;
    }
  }, [invalidateEntry, invalidatePattern, selectedWorkspaceId, refetchWorkspaces]);
  
  /**
   * Add a user to a workspace with a specified role
   * @param workspaceId The ID of the workspace
   * @param userId The ID of the user to add
   * @param role The role to assign to the user
   * @returns Promise resolving to the created WorkspaceUser object
   */
  const addUserToWorkspace = useCallback(async (
    workspaceId: string,
    userId: string,
    role: WorkspaceUserRole
  ): Promise<WorkspaceUser> => {
    try {
      const workspaceUser = await enhancedWorkspaceService.addUserToWorkspace(workspaceId, userId, role);
      
      // Invalidate workspace users cache
      await invalidateEntry(`workspace-users-${workspaceId}`);
      
      // Refetch workspace users if this is the selected workspace
      if (workspaceId === selectedWorkspaceId) {
        refetchWorkspaceUsers();
      }
      
      return workspaceUser;
    } catch (error) {
      MondayLogger.error(`Error adding user ${userId} to workspace ${workspaceId}:`, error);
      throw error;
    }
  }, [invalidateEntry, selectedWorkspaceId, refetchWorkspaceUsers]);
  
  /**
   * Clear all workspace-related caches
   */
  const clearCache = useCallback(async (): Promise<void> => {
    await invalidatePattern('*');
    
    // Refetch data if needed
    if (initialLoad) {
      refetchWorkspaces();
      
      if (selectedWorkspaceId) {
        refetchSelectedWorkspace();
        refetchWorkspaceUsers();
      }
    }
  }, [invalidatePattern, initialLoad, selectedWorkspaceId, refetchWorkspaces, refetchSelectedWorkspace, refetchWorkspaceUsers]);
  
  return {
    // Data
    workspaces: workspaces || [],
    selectedWorkspace,
    workspaceUsers: workspaceUsers || [],
    
    // Loading states
    loading: loadingWorkspaces || (selectedWorkspaceId && loadingSelectedWorkspace) || (selectedWorkspaceId && loadingWorkspaceUsers),
    loadingWorkspaces,
    loadingSelectedWorkspace,
    loadingWorkspaceUsers,
    
    // Errors
    error: workspacesError || selectedWorkspaceError || workspaceUsersError,
    workspacesError,
    selectedWorkspaceError,
    workspaceUsersError,
    
    // Actions
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    addUserToWorkspace,
    
    // Refetch functions
    refetchWorkspaces,
    refetchSelectedWorkspace,
    refetchWorkspaceUsers,
    clearCache
  };
}

export default useEnhancedWorkspaces;