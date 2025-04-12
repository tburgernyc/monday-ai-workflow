import { executeQuery, executeQueryWithPagination, MondayLogger } from './mondayApi';
import { Group } from '../../types/monday';
import { MondayTypes } from './mondayApi';
import { 
  GroupUpdateInput, 
  GroupCache,
  CacheItem
} from '../../types/groupTypes';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * GroupService class for managing Monday.com board groups
 * 
 * This service provides methods to interact with Monday.com groups,
 * including fetching, creating, updating, and deleting groups,
 * as well as reordering groups within a board.
 */
export class GroupService {
  private cache: GroupCache;

  // GraphQL queries and mutations
  private readonly QUERIES = {
    GET_GROUPS: `
      query GetBoardGroups($boardId: ID!) {
        boards(ids: [$boardId]) {
          groups {
            id
            title
            color
            position
            archived
          }
        }
      }
    `,

    GET_GROUP_BY_ID: `
      query GetGroupById($boardId: ID!, $groupId: String!) {
        boards(ids: [$boardId]) {
          groups(ids: [$groupId]) {
            id
            title
            color
            position
            archived
          }
        }
      }
    `,

    CREATE_GROUP: `
      mutation CreateGroup($boardId: ID!, $groupName: String!) {
        create_group(board_id: $boardId, group_name: $groupName) {
          id
          title
          color
          position
        }
      }
    `,

    UPDATE_GROUP: `
      mutation UpdateGroup($boardId: ID!, $groupId: String!, $title: String, $color: String) {
        update_group(board_id: $boardId, group_id: $groupId, title: $title, color: $color) {
          id
          title
          color
          position
        }
      }
    `,

    DELETE_GROUP: `
      mutation DeleteGroup($boardId: ID!, $groupId: String!) {
        delete_group(board_id: $boardId, group_id: $groupId) {
          id
          deleted
        }
      }
    `,

    REORDER_GROUPS: `
      mutation ReorderGroups($boardId: ID!, $groupIds: [String!]!) {
        reorder_groups(board_id: $boardId, group_ids: $groupIds) {
          id
        }
      }
    `
  };

  /**
   * Constructor initializes the cache
   */
  constructor() {
    this.cache = {
      groupsByBoard: new Map<string, CacheItem<Group[]>>(),
      groupById: new Map<string, CacheItem<Group>>()
    };
  }

  /**
   * Checks if a cached item is still valid
   * @param item The cached item to check
   * @returns True if the item is valid, false otherwise
   */
  private isCacheValid<T>(item?: CacheItem<T>): boolean {
    if (!item) return false;
    return Date.now() - item.timestamp < CACHE_TTL;
  }

  /**
   * Fetches all groups in a board
   * 
   * @param boardId The ID of the board
   * @returns Promise resolving to an array of Group objects
   */
  public async getGroups(boardId: string): Promise<Group[]> {
    try {
      // Check cache first
      const cacheKey = boardId;
      const cachedGroups = this.cache.groupsByBoard.get(cacheKey);
      if (this.isCacheValid(cachedGroups)) {
        MondayLogger.debug(`Using cached groups for board ID ${boardId}`);
        return cachedGroups!.data;
      }

      MondayLogger.debug(`Fetching groups for board ID ${boardId} from API`);
      
      const response = await executeQuery<{ boards: Array<{ groups: Group[] }> }>(
        this.QUERIES.GET_GROUPS,
        { boardId }
      );
      
      const boards = response.data.boards || [];
      const groups = boards.length > 0 ? boards[0].groups || [] : [];

      // Update cache
      this.cache.groupsByBoard.set(cacheKey, {
        data: groups,
        timestamp: Date.now()
      });

      // Also cache individual groups with compound key (boardId-groupId)
      groups.forEach(group => {
        const groupCacheKey = `${boardId}-${group.id}`;
        this.cache.groupById.set(groupCacheKey, {
          data: group,
          timestamp: Date.now()
        });
      });

      return groups;
    } catch (error) {
      MondayLogger.error(`Error fetching groups for board ${boardId}:`, error);
      this.handleApiError(error, `Failed to fetch groups for board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Fetches a specific group by ID
   * 
   * @param boardId The ID of the board containing the group
   * @param groupId The ID of the group to fetch
   * @returns Promise resolving to a Group object or null if not found
   */
  public async getGroupById(boardId: string, groupId: string): Promise<Group | null> {
    try {
      // Check cache first with compound key
      const cacheKey = `${boardId}-${groupId}`;
      const cachedGroup = this.cache.groupById.get(cacheKey);
      if (this.isCacheValid(cachedGroup)) {
        MondayLogger.debug(`Using cached group for ID ${groupId} in board ${boardId}`);
        return cachedGroup!.data;
      }

      MondayLogger.debug(`Fetching group with ID ${groupId} from board ${boardId} from API`);
      
      const response = await executeQuery<{ boards: Array<{ groups: Group[] }> }>(
        this.QUERIES.GET_GROUP_BY_ID,
        { boardId, groupId }
      );

      const boards = response.data.boards || [];
      const groups = boards.length > 0 ? boards[0].groups || [] : [];
      const group = groups.length > 0 ? groups[0] : null;

      if (group) {
        // Update cache with compound key
        this.cache.groupById.set(cacheKey, {
          data: group,
          timestamp: Date.now()
        });
      }

      return group;
    } catch (error) {
      MondayLogger.error(`Error fetching group ${groupId} from board ${boardId}:`, error);
      this.handleApiError(error, `Failed to fetch group with ID ${groupId} from board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Creates a new group in a board
   * 
   * @param boardId The ID of the board to create the group in
   * @param name The name of the group
   * @returns Promise resolving to the created Group object
   */
  public async createGroup(boardId: string, name: string): Promise<Group> {
    try {
      MondayLogger.debug(`Creating new group in board ${boardId}`, { name });
      
      const response = await executeQuery<{ create_group: Group }>(
        this.QUERIES.CREATE_GROUP,
        { boardId, groupName: name }
      );

      const group = response.data.create_group;

      // Invalidate board groups cache
      this.cache.groupsByBoard.delete(boardId);

      // Cache the new group with compound key
      const cacheKey = `${boardId}-${group.id}`;
      this.cache.groupById.set(cacheKey, {
        data: group,
        timestamp: Date.now()
      });

      return group;
    } catch (error) {
      MondayLogger.error(`Error creating group in board ${boardId}:`, error);
      this.handleApiError(error, `Failed to create group in board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Updates an existing group
   * 
   * @param groupId The ID of the group to update
   * @param boardId The ID of the board containing the group
   * @param data Object containing the properties to update
   * @returns Promise resolving to the updated Group object
   */
  public async updateGroup(
    boardId: string,
    groupId: string,
    data: Partial<GroupUpdateInput>
  ): Promise<Group> {
    try {
      MondayLogger.debug(`Updating group ${groupId} in board ${boardId}`, data);
      
      const response = await executeQuery<{ update_group: Group }>(
        this.QUERIES.UPDATE_GROUP,
        {
          boardId,
          groupId,
          title: data.title,
          color: data.color
        }
      );

      const updatedGroup = response.data.update_group;

      // Invalidate caches
      this.cache.groupsByBoard.delete(boardId);
      this.cache.groupById.delete(`${boardId}-${groupId}`);

      // Update cache with the updated group
      const cacheKey = `${boardId}-${groupId}`;
      this.cache.groupById.set(cacheKey, {
        data: updatedGroup,
        timestamp: Date.now()
      });

      return updatedGroup;
    } catch (error) {
      MondayLogger.error(`Error updating group ${groupId} in board ${boardId}:`, error);
      this.handleApiError(error, `Failed to update group with ID ${groupId} in board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Deletes a group
   * 
   * @param boardId The ID of the board containing the group
   * @param groupId The ID of the group to delete
   * @returns Promise resolving to an object indicating deletion status
   */
  public async deleteGroup(boardId: string, groupId: string): Promise<{ id: string; deleted: boolean }> {
    try {
      MondayLogger.debug(`Deleting group ${groupId} from board ${boardId}`);
      
      const response = await executeQuery<{ delete_group: { id: string; deleted: boolean } }>(
        this.QUERIES.DELETE_GROUP,
        { boardId, groupId }
      );

      // Invalidate caches
      this.cache.groupsByBoard.delete(boardId);
      this.cache.groupById.delete(`${boardId}-${groupId}`);

      return response.data.delete_group;
    } catch (error) {
      MondayLogger.error(`Error deleting group ${groupId} from board ${boardId}:`, error);
      this.handleApiError(error, `Failed to delete group with ID ${groupId} from board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Reorders groups in a board
   * 
   * @param boardId The ID of the board
   * @param groupIds Array of group IDs in the desired order
   * @returns Promise resolving to an object containing the board ID
   */
  public async reorderGroups(boardId: string, groupIds: string[]): Promise<{ id: string }> {
    try {
      MondayLogger.debug(`Reordering groups in board ${boardId}`, { groupIds });
      
      const response = await executeQuery<{ reorder_groups: { id: string } }>(
        this.QUERIES.REORDER_GROUPS,
        { boardId, groupIds }
      );

      // Invalidate board groups cache as order has changed
      this.cache.groupsByBoard.delete(boardId);

      return response.data.reorder_groups;
    } catch (error) {
      MondayLogger.error(`Error reordering groups in board ${boardId}:`, error);
      this.handleApiError(error, `Failed to reorder groups in board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Clears all caches
   */
  public clearCache(): void {
    this.cache.groupsByBoard.clear();
    this.cache.groupById.clear();
    MondayLogger.debug('Group service cache cleared');
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
        `Rate limit exceeded while accessing group API. Retry after ${error.retryAfter} seconds.`,
        error.retryAfter
      );
    }

    if (error instanceof MondayTypes.AuthenticationError) {
      throw new MondayTypes.AuthenticationError(
        'Authentication failed while accessing group API. Please check your API token.'
      );
    }

    if (error instanceof MondayTypes.NetworkError) {
      throw new MondayTypes.NetworkError(
        'Network error while accessing group API. Please check your internet connection.'
      );
    }

    if (error instanceof MondayTypes.MondayApiError) {
      throw new MondayTypes.MondayApiError(
        `Group API error: ${error.message}`,
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
export const groupService = new GroupService();

export default groupService;