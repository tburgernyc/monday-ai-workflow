import { executeQuery, executeQueryWithPagination, MondayLogger } from './mondayApi';
import {
  Workspace,
  WorkspaceUser,
  WorkspaceUserRole,
  WorkspaceUpdateInput,
  WorkspacePaginationResponse
} from '../../types/monday';
import { MondayTypes } from './mondayApi';
import { CacheService } from '../cache/cacheService';
import { CacheStorage } from '../../types/cacheTypes';

// Cache namespace for workspace-related data
const CACHE_NAMESPACE = 'workspace';

/**
 * EnhancedWorkspaceService class for managing Monday.com workspaces with improved caching
 * 
 * This service provides methods to interact with Monday.com workspaces,
 * including fetching, creating, updating, and deleting workspaces,
 * as well as managing workspace users. It uses the CacheService for
 * more robust caching with TTL, persistence, and offline support.
 */
export class EnhancedWorkspaceService {
  private cacheService: CacheService;

  // GraphQL queries
  private readonly QUERIES = {
    GET_WORKSPACES: `
      query GetWorkspaces($limit: Int, $cursor: String) {
        workspaces(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            description
            kind
            state
            created_at
            updated_at
            members_count
          }
        }
      }
    `,

    GET_WORKSPACE_BY_ID: `
      query GetWorkspaceById($id: ID!) {
        workspaces(ids: [$id]) {
          id
          name
          description
          kind
          state
          created_at
          updated_at
          members_count
        }
      }
    `,

    GET_WORKSPACE_USERS: `
      query GetWorkspaceUsers($workspaceId: ID!, $limit: Int, $cursor: String) {
        workspace_users(workspace_id: $workspaceId, limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            user {
              id
              name
              email
              photo_url
              title
            }
            role
          }
        }
      }
    `,

    CREATE_WORKSPACE: `
      mutation CreateWorkspace($name: String!, $kind: String = "open", $description: String) {
        create_workspace(workspace_name: $name, workspace_kind: $kind, description: $description) {
          id
          name
          description
          kind
          state
          created_at
          updated_at
        }
      }
    `,

    UPDATE_WORKSPACE: `
      mutation UpdateWorkspace($id: ID!, $name: String, $description: String, $kind: String) {
        update_workspace(id: $id, name: $name, description: $description, kind: $kind) {
          id
          name
          description
          kind
          state
          updated_at
        }
      }
    `,

    DELETE_WORKSPACE: `
      mutation DeleteWorkspace($id: ID!) {
        delete_workspace(workspace_id: $id) {
          id
        }
      }
    `,

    ADD_USER_TO_WORKSPACE: `
      mutation AddUserToWorkspace($workspaceId: ID!, $userId: ID!, $role: WorkspaceUserRoleEnum!) {
        add_users_to_workspace(workspace_id: $workspaceId, user_ids: [$userId], kind: $role) {
          id
          user {
            id
            name
            email
          }
          role
        }
      }
    `
  };

  /**
   * Constructor initializes the cache service
   * @param cacheService Optional CacheService instance to use
   */
  constructor(cacheService?: CacheService) {
    this.cacheService = cacheService || new CacheService({
      ttl: 5 * 60 * 1000, // 5 minutes
      storage: CacheStorage.Memory,
      persistOnSet: false
    });
  }

  /**
   * Fetches all workspaces with pagination
   * @param limit Maximum number of workspaces to fetch per page
   * @returns Promise resolving to an array of Workspace objects
   */
  public async getWorkspaces(limit: number = 100): Promise<Workspace[]> {
    try {
      // Check cache first
      const cacheKey = 'all-workspaces';
      const cachedWorkspaces = await this.cacheService.get<Workspace[]>(cacheKey, CACHE_NAMESPACE);
      
      if (cachedWorkspaces) {
        MondayLogger.debug('Using cached workspaces');
        return cachedWorkspaces;
      }

      MondayLogger.debug('Fetching workspaces from API');
      
      let allWorkspaces: Workspace[] = [];
      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const response: MondayTypes.ApiResponse<{ workspaces: WorkspacePaginationResponse }> = await executeQuery<{ workspaces: WorkspacePaginationResponse }>(
          this.QUERIES.GET_WORKSPACES,
          { limit, cursor }
        );

        const workspacesPage: WorkspacePaginationResponse = response.data.workspaces;
        allWorkspaces = [...allWorkspaces, ...workspacesPage.items];
        
        // Update cursor for next page
        cursor = workspacesPage.cursor;
        hasMore = cursor !== null && cursor !== '';
      }

      // Update cache
      await this.cacheService.set(cacheKey, allWorkspaces, {}, CACHE_NAMESPACE);

      return allWorkspaces;
    } catch (error) {
      MondayLogger.error('Error fetching workspaces:', error);
      this.handleApiError(error, 'Failed to fetch workspaces');
      throw error; // This will be reached only if handleApiError doesn't throw
    }
  }

  /**
   * Fetches a specific workspace by ID
   * @param id The ID of the workspace to fetch
   * @returns Promise resolving to a Workspace object or null if not found
   */
  public async getWorkspaceById(id: string): Promise<Workspace | null> {
    try {
      // Check cache first
      const cacheKey = `workspace-${id}`;
      const cachedWorkspace = await this.cacheService.get<Workspace>(cacheKey, CACHE_NAMESPACE);
      
      if (cachedWorkspace) {
        MondayLogger.debug(`Using cached workspace for ID ${id}`);
        return cachedWorkspace;
      }

      MondayLogger.debug(`Fetching workspace with ID ${id} from API`);
      
      const response = await executeQuery<{ workspaces: Workspace[] }>(
        this.QUERIES.GET_WORKSPACE_BY_ID,
        { id }
      );

      const workspaces = response.data.workspaces || [];
      const workspace = workspaces.length > 0 ? workspaces[0] : null;

      if (workspace) {
        // Update cache
        await this.cacheService.set(cacheKey, workspace, {}, CACHE_NAMESPACE);
      }

      return workspace;
    } catch (error) {
      MondayLogger.error(`Error fetching workspace with ID ${id}:`, error);
      this.handleApiError(error, `Failed to fetch workspace with ID ${id}`);
      throw error;
    }
  }

  /**
   * Creates a new workspace
   * @param name The name of the workspace
   * @param description Optional description for the workspace
   * @param kind Optional workspace kind (defaults to "open")
   * @returns Promise resolving to the created Workspace object
   */
  public async createWorkspace(
    name: string,
    description?: string,
    kind: string = 'open'
  ): Promise<Workspace> {
    try {
      MondayLogger.debug('Creating new workspace', { name, description, kind });
      
      const response = await executeQuery<{ create_workspace: Workspace }>(
        this.QUERIES.CREATE_WORKSPACE,
        { name, description, kind }
      );

      const workspace = response.data.create_workspace;

      // Invalidate workspaces cache
      await this.cacheService.invalidate('all-workspaces', CACHE_NAMESPACE);

      return workspace;
    } catch (error) {
      MondayLogger.error('Error creating workspace:', error);
      this.handleApiError(error, 'Failed to create workspace');
      throw error;
    }
  }

  /**
   * Updates an existing workspace
   * @param id The ID of the workspace to update
   * @param data Object containing the properties to update
   * @returns Promise resolving to the updated Workspace object
   */
  public async updateWorkspace(
    id: string,
    data: Partial<WorkspaceUpdateInput>
  ): Promise<Workspace> {
    try {
      MondayLogger.debug(`Updating workspace with ID ${id}`, data);
      
      const response = await executeQuery<{ update_workspace: Workspace }>(
        this.QUERIES.UPDATE_WORKSPACE,
        { id, ...data }
      );

      const workspace = response.data.update_workspace;

      // Update cache and invalidate related caches
      const cacheKey = `workspace-${id}`;
      await this.cacheService.set(cacheKey, workspace, {}, CACHE_NAMESPACE);
      await this.cacheService.invalidate('all-workspaces', CACHE_NAMESPACE);

      return workspace;
    } catch (error) {
      MondayLogger.error(`Error updating workspace with ID ${id}:`, error);
      this.handleApiError(error, `Failed to update workspace with ID ${id}`);
      throw error;
    }
  }

  /**
   * Deletes a workspace
   * @param id The ID of the workspace to delete
   * @returns Promise resolving to an object containing the deleted workspace ID
   */
  public async deleteWorkspace(id: string): Promise<{ id: string }> {
    try {
      MondayLogger.debug(`Deleting workspace with ID ${id}`);
      
      const response = await executeQuery<{ delete_workspace: { id: string } }>(
        this.QUERIES.DELETE_WORKSPACE,
        { id }
      );

      // Invalidate caches
      const cacheKey = `workspace-${id}`;
      await this.cacheService.invalidate(cacheKey, CACHE_NAMESPACE);
      await this.cacheService.invalidate('all-workspaces', CACHE_NAMESPACE);
      await this.cacheService.invalidatePattern(`workspace-users-${id}*`, CACHE_NAMESPACE);

      return response.data.delete_workspace;
    } catch (error) {
      MondayLogger.error(`Error deleting workspace with ID ${id}:`, error);
      this.handleApiError(error, `Failed to delete workspace with ID ${id}`);
      throw error;
    }
  }

  /**
   * Fetches users in a workspace
   * @param workspaceId The ID of the workspace
   * @param limit Maximum number of users to fetch per page
   * @returns Promise resolving to an array of WorkspaceUser objects
   */
  public async getWorkspaceUsers(workspaceId: string, limit: number = 100): Promise<WorkspaceUser[]> {
    try {
      // Check cache first
      const cacheKey = `workspace-users-${workspaceId}`;
      const cachedUsers = await this.cacheService.get<WorkspaceUser[]>(cacheKey, CACHE_NAMESPACE);
      
      if (cachedUsers) {
        MondayLogger.debug(`Using cached users for workspace ID ${workspaceId}`);
        return cachedUsers;
      }

      MondayLogger.debug(`Fetching users for workspace ID ${workspaceId} from API`);
      
      let allUsers: WorkspaceUser[] = [];
      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const response: MondayTypes.ApiResponse<{ workspace_users: { cursor: string; items: WorkspaceUser[] } }> = await executeQuery<{ workspace_users: { cursor: string; items: WorkspaceUser[] } }>(
          this.QUERIES.GET_WORKSPACE_USERS,
          { workspaceId, limit, cursor }
        );

        const usersPage: { cursor: string; items: WorkspaceUser[] } = response.data.workspace_users;
        allUsers = [...allUsers, ...usersPage.items];
        
        // Update cursor for next page
        cursor = usersPage.cursor;
        hasMore = cursor !== null && cursor !== '';
      }

      // Update cache
      await this.cacheService.set(cacheKey, allUsers, {}, CACHE_NAMESPACE);

      return allUsers;
    } catch (error) {
      MondayLogger.error(`Error fetching users for workspace ${workspaceId}:`, error);
      this.handleApiError(error, `Failed to fetch users for workspace with ID ${workspaceId}`);
      throw error;
    }
  }

  /**
   * Adds a user to a workspace with a specified role
   * @param workspaceId The ID of the workspace
   * @param userId The ID of the user to add
   * @param role The role to assign to the user
   * @returns Promise resolving to the created WorkspaceUser object
   */
  public async addUserToWorkspace(
    workspaceId: string,
    userId: string,
    role: WorkspaceUserRole
  ): Promise<WorkspaceUser> {
    try {
      MondayLogger.debug(`Adding user ${userId} to workspace ${workspaceId} with role ${role}`);
      
      const response = await executeQuery<{ add_users_to_workspace: WorkspaceUser[] }>(
        this.QUERIES.ADD_USER_TO_WORKSPACE,
        { workspaceId, userId, role }
      );

      const workspaceUser = response.data.add_users_to_workspace[0];

      // Invalidate workspace users cache
      const cacheKey = `workspace-users-${workspaceId}`;
      await this.cacheService.invalidate(cacheKey, CACHE_NAMESPACE);

      return workspaceUser;
    } catch (error) {
      MondayLogger.error(`Error adding user ${userId} to workspace ${workspaceId}:`, error);
      this.handleApiError(error, `Failed to add user to workspace with ID ${workspaceId}`);
      throw error;
    }
  }

  /**
   * Clears all workspace-related caches
   */
  public async clearCache(): Promise<void> {
    await this.cacheService.invalidatePattern('*', CACHE_NAMESPACE);
    MondayLogger.debug('Workspace service cache cleared');
  }

  /**
   * Handles API errors with appropriate error messages and status codes
   * @param error The error object from the API call
   * @param defaultMessage Default message to use if error details are not available
   * @throws Appropriate error based on the API response
   */
  private handleApiError(error: unknown, defaultMessage: string): never {
    if (error instanceof MondayTypes.RateLimitError) {
      throw new MondayTypes.RateLimitError(
        `Rate limit exceeded while accessing workspace API. Retry after ${error.retryAfter} seconds.`,
        error.retryAfter
      );
    }

    if (error instanceof MondayTypes.AuthenticationError) {
      throw new MondayTypes.AuthenticationError(
        'Authentication failed while accessing workspace API. Please check your API token.'
      );
    }

    if (error instanceof MondayTypes.NetworkError) {
      throw new MondayTypes.NetworkError(
        'Network error while accessing workspace API. Please check your internet connection.'
      );
    }

    if (error instanceof MondayTypes.MondayApiError) {
      throw new MondayTypes.MondayApiError(
        `Workspace API error: ${error.message}`,
        {
          status: error.status,
          errors: error.errors,
          query: error.query,
          variables: error.variables
        }
      );
    }

    // For unknown errors
    throw new MondayTypes.MondayApiError(
      defaultMessage,
      {
        status: 500,
        errors: [{ message: error instanceof Error ? error.message : String(error), status: 500 }]
      }
    );
  }
}

// Export a singleton instance for easy use
export const enhancedWorkspaceService = new EnhancedWorkspaceService();

export default enhancedWorkspaceService;