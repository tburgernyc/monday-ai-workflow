import { executeQuery, executeQueryWithPagination, MondayLogger } from './mondayApi';
import {
  Board,
  BoardKind,
  BoardUpdateInput,
  BoardActivity,
  Group,
  Column,
  Item
} from '../../types/monday';
import { MondayTypes } from './mondayApi';
import { CacheService } from '../cache/cacheService';
import { CacheStorage } from '../../types/cacheTypes';

// Cache namespace for board-related data
const CACHE_NAMESPACE = 'board';

/**
 * EnhancedBoardService class for managing Monday.com boards with improved caching
 *
 * This service provides methods to interact with Monday.com boards,
 * including fetching, creating, updating, and deleting boards,
 * as well as managing board activities and items. It uses the CacheService for
 * more robust caching with TTL, persistence, and offline support.
 */
export class EnhancedBoardService {
  private cacheService: CacheService;

  // GraphQL queries and mutations
  private readonly QUERIES = {
    GET_BOARDS: `
      query GetBoards($limit: Int, $page: Int, $workspaceId: ID) {
        boards(limit: $limit, page: $page, workspace_id: $workspaceId) {
          id
          name
          description
          board_kind
          state
          workspace_id
          created_at
          updated_at
          items_count
        }
      }
    `,

    GET_BOARD_BY_ID: `
      query GetBoardById($id: ID!) {
        boards(ids: [$id]) {
          id
          name
          description
          board_kind
          state
          workspace_id
          created_at
          updated_at
          items_count
          groups {
            id
            title
            color
            position
          }
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `,

    GET_BOARD_ITEMS: `
      query GetBoardItems($boardId: ID!, $limit: Int, $page: Int, $groupId: String) {
        boards(ids: [$boardId]) {
          items(limit: $limit, page: $page, group_id: $groupId) {
            id
            name
            state
            created_at
            updated_at
            group {
              id
              title
            }
            column_values {
              id
              text
              value
              type
            }
          }
        }
      }
    `,

    GET_BOARD_ACTIVITY: `
      query GetBoardActivity($boardId: ID!, $limit: Int) {
        boards(ids: [$boardId]) {
          activity_logs(limit: $limit) {
            id
            entity
            event
            created_at
            user {
              id
              name
              email
            }
            data
          }
        }
      }
    `,

    CREATE_BOARD: `
      mutation CreateBoard($name: String!, $boardKind: BoardKind!, $workspaceId: ID, $templateId: ID) {
        create_board(board_name: $name, board_kind: $boardKind, workspace_id: $workspaceId, template_id: $templateId) {
          id
          name
          board_kind
          workspace_id
          state
          created_at
        }
      }
    `,

    DUPLICATE_BOARD: `
      mutation DuplicateBoard($boardId: ID!, $name: String!) {
        duplicate_board(board_id: $boardId, duplicate_type: duplicate_board_with_structure, board_name: $name) {
          id
          name
          board_kind
          workspace_id
          state
          created_at
        }
      }
    `,

    UPDATE_BOARD: `
      mutation UpdateBoard($boardId: ID!, $name: String, $description: String, $state: State) {
        update_board(board_id: $boardId, board_name: $name, board_description: $description, board_state: $state) {
          id
          name
          description
          state
          updated_at
        }
      }
    `,

    DELETE_BOARD: `
      mutation DeleteBoard($boardId: ID!) {
        delete_board(board_id: $boardId) {
          id
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
   * Fetches all boards with optional workspace filter
   * @param workspaceId Optional workspace ID to filter boards
   * @returns Promise resolving to an array of Board objects
   */
  public async getBoards(workspaceId?: string): Promise<Board[]> {
    try {
      // Check cache first
      const cacheKey = workspaceId ? `boards-workspace-${workspaceId}` : 'all-boards';
      const cachedBoards = await this.cacheService.get<Board[]>(cacheKey, CACHE_NAMESPACE);
      
      if (cachedBoards) {
        MondayLogger.debug(`Using cached boards${workspaceId ? ` for workspace ${workspaceId}` : ''}`);
        return cachedBoards;
      }

      MondayLogger.debug(`Fetching boards${workspaceId ? ` for workspace ${workspaceId}` : ''} from API`);
      
      const boards = await executeQueryWithPagination<Board>(
        this.QUERIES.GET_BOARDS,
        { workspaceId },
        'data.boards',
        100
      );

      // Update cache
      await this.cacheService.set(cacheKey, boards, {}, CACHE_NAMESPACE);

      return boards;
    } catch (error) {
      MondayLogger.error(`Error fetching boards${workspaceId ? ` for workspace ${workspaceId}` : ''}:`, error);
      this.handleApiError(error, `Failed to fetch boards${workspaceId ? ` for workspace ${workspaceId}` : ''}`);
      throw error;
    }
  }

  /**
   * Fetches a specific board by ID with all details
   * @param id The ID of the board to fetch
   * @returns Promise resolving to a Board object or null if not found
   */
  public async getBoardById(id: string): Promise<Board | null> {
    try {
      // Check cache first
      const cacheKey = `board-${id}`;
      const cachedBoard = await this.cacheService.get<Board>(cacheKey, CACHE_NAMESPACE);
      
      if (cachedBoard) {
        MondayLogger.debug(`Using cached board for ID ${id}`);
        return cachedBoard;
      }

      MondayLogger.debug(`Fetching board with ID ${id} from API`);
      
      const response = await executeQuery<{ boards: Board[] }>(
        this.QUERIES.GET_BOARD_BY_ID,
        { id }
      );

      const boards = response.data.boards || [];
      const board = boards.length > 0 ? boards[0] : null;

      if (board) {
        // Update cache
        await this.cacheService.set(cacheKey, board, {}, CACHE_NAMESPACE);
      }

      return board;
    } catch (error) {
      MondayLogger.error(`Error fetching board with ID ${id}:`, error);
      this.handleApiError(error, `Failed to fetch board with ID ${id}`);
      throw error;
    }
  }

  /**
   * Creates a new board
   * @param name The name of the board
   * @param boardKind The kind of board to create
   * @param workspaceId Optional workspace ID to create the board in
   * @returns Promise resolving to the created Board object
   */
  public async createBoard(
    name: string,
    boardKind: BoardKind,
    workspaceId?: string
  ): Promise<Board> {
    try {
      MondayLogger.debug('Creating new board', { name, boardKind, workspaceId });
      
      const response = await executeQuery<{ create_board: Board }>(
        this.QUERIES.CREATE_BOARD,
        { name, boardKind, workspaceId }
      );

      const board = response.data.create_board;

      // Invalidate caches
      await this.cacheService.invalidate('all-boards', CACHE_NAMESPACE);
      if (workspaceId) {
        await this.cacheService.invalidate(`boards-workspace-${workspaceId}`, CACHE_NAMESPACE);
      }

      return board;
    } catch (error) {
      MondayLogger.error('Error creating board:', error);
      this.handleApiError(error, 'Failed to create board');
      throw error;
    }
  }

  /**
   * Duplicates an existing board
   * @param id The ID of the board to duplicate
   * @param name The name for the new duplicated board
   * @returns Promise resolving to the duplicated Board object
   */
  public async duplicateBoard(id: string, name: string): Promise<Board> {
    try {
      MondayLogger.debug(`Duplicating board with ID ${id}`, { name });
      
      const response = await executeQuery<{ duplicate_board: Board }>(
        this.QUERIES.DUPLICATE_BOARD,
        { boardId: id, name }
      );

      const board = response.data.duplicate_board;

      // Invalidate caches
      await this.cacheService.invalidate('all-boards', CACHE_NAMESPACE);
      
      // Get the original board to check its workspace
      const originalBoard = await this.getBoardById(id);
      if (originalBoard?.workspace_id) {
        await this.cacheService.invalidate(`boards-workspace-${originalBoard.workspace_id}`, CACHE_NAMESPACE);
      }

      return board;
    } catch (error) {
      MondayLogger.error(`Error duplicating board with ID ${id}:`, error);
      this.handleApiError(error, `Failed to duplicate board with ID ${id}`);
      throw error;
    }
  }

  /**
   * Updates an existing board
   * @param id The ID of the board to update
   * @param data Object containing the properties to update
   * @returns Promise resolving to the updated Board object
   */
  public async updateBoard(
    id: string,
    data: Partial<BoardUpdateInput>
  ): Promise<Board> {
    try {
      MondayLogger.debug(`Updating board with ID ${id}`, data);
      
      const response = await executeQuery<{ update_board: Board }>(
        this.QUERIES.UPDATE_BOARD,
        { boardId: id, ...data }
      );

      const board = response.data.update_board;

      // Update cache and invalidate related caches
      const cacheKey = `board-${id}`;
      await this.cacheService.invalidate(cacheKey, CACHE_NAMESPACE);
      await this.cacheService.invalidate('all-boards', CACHE_NAMESPACE);
      
      // Get the board to check its workspace
      const fullBoard = await this.getBoardById(id);
      if (fullBoard?.workspace_id) {
        await this.cacheService.invalidate(`boards-workspace-${fullBoard.workspace_id}`, CACHE_NAMESPACE);
      }

      return board;
    } catch (error) {
      MondayLogger.error(`Error updating board with ID ${id}:`, error);
      this.handleApiError(error, `Failed to update board with ID ${id}`);
      throw error;
    }
  }

  /**
   * Deletes a board
   * @param id The ID of the board to delete
   * @returns Promise resolving to an object containing the deleted board ID
   */
  public async deleteBoard(id: string): Promise<{ id: string }> {
    try {
      // Get the board first to know its workspace for cache invalidation
      const board = await this.getBoardById(id);
      
      MondayLogger.debug(`Deleting board with ID ${id}`);
      
      const response = await executeQuery<{ delete_board: { id: string } }>(
        this.QUERIES.DELETE_BOARD,
        { boardId: id }
      );

      // Invalidate caches
      const cacheKey = `board-${id}`;
      await this.cacheService.invalidate(cacheKey, CACHE_NAMESPACE);
      await this.cacheService.invalidate('all-boards', CACHE_NAMESPACE);
      await this.cacheService.invalidate(`board-activity-${id}`, CACHE_NAMESPACE);
      await this.cacheService.invalidatePattern(`board-items-${id}*`, CACHE_NAMESPACE);
      
      if (board?.workspace_id) {
        await this.cacheService.invalidate(`boards-workspace-${board.workspace_id}`, CACHE_NAMESPACE);
      }

      return response.data.delete_board;
    } catch (error) {
      MondayLogger.error(`Error deleting board with ID ${id}:`, error);
      this.handleApiError(error, `Failed to delete board with ID ${id}`);
      throw error;
    }
  }

  /**
   * Gets recent activity for a board
   * @param id The ID of the board
   * @param limit Optional limit for the number of activities to retrieve
   * @returns Promise resolving to an array of BoardActivity objects
   */
  public async getBoardActivity(id: string, limit: number = 50): Promise<BoardActivity[]> {
    try {
      // Check cache first
      const cacheKey = `board-activity-${id}`;
      const cachedActivity = await this.cacheService.get<BoardActivity[]>(cacheKey, CACHE_NAMESPACE);
      
      if (cachedActivity) {
        MondayLogger.debug(`Using cached activity for board ID ${id}`);
        return cachedActivity;
      }

      MondayLogger.debug(`Fetching activity for board ID ${id} from API`);
      
      const response = await executeQuery<{ boards: Array<{ activity_logs: BoardActivity[] }> }>(
        this.QUERIES.GET_BOARD_ACTIVITY,
        { boardId: id, limit }
      );

      const boards = response.data.boards || [];
      const activities = boards.length > 0 ? boards[0].activity_logs || [] : [];

      // Update cache with a shorter TTL for activity data since it changes frequently
      await this.cacheService.set(cacheKey, activities, { ttl: 2 * 60 * 1000 }, CACHE_NAMESPACE); // 2 minutes TTL

      return activities;
    } catch (error) {
      MondayLogger.error(`Error fetching activity for board ${id}:`, error);
      this.handleApiError(error, `Failed to fetch activity for board with ID ${id}`);
      throw error;
    }
  }

  /**
   * Gets items in a board with pagination
   * @param boardId The ID of the board
   * @param options Options for pagination and filtering
   * @returns Promise resolving to an array of Item objects
   */
  public async getBoardItems(
    boardId: string,
    options: { limit?: number; page?: number; groupId?: string } = {}
  ): Promise<Item[]> {
    try {
      const { limit = 100, page = 1, groupId } = options;
      
      // Generate cache key based on query parameters
      const cacheKey = `board-items-${boardId}-${groupId || 'all'}-${limit}-${page}`;
      
      // Check cache first
      const cachedItems = await this.cacheService.get<Item[]>(cacheKey, CACHE_NAMESPACE);
      
      if (cachedItems) {
        MondayLogger.debug(`Using cached items for board ID ${boardId} with options`, options);
        return cachedItems;
      }
      
      MondayLogger.debug(`Fetching items for board ID ${boardId} from API with options`, options);
      
      const response = await executeQuery<{ boards: Array<{ items: Item[] }> }>(
        this.QUERIES.GET_BOARD_ITEMS,
        {
          boardId,
          limit,
          page,
          groupId,
        }
      );
      
      const boards = response.data.boards || [];
      const items = boards.length > 0 ? boards[0].items || [] : [];
      
      // Update cache
      await this.cacheService.set(cacheKey, items, {}, CACHE_NAMESPACE);
      
      return items;
    } catch (error) {
      MondayLogger.error(`Error fetching items for board ${boardId}:`, error);
      this.handleApiError(error, `Failed to fetch items for board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Creates a new group in a board
   * @param boardId The ID of the board
   * @param groupName The name of the group to create
   * @returns Promise resolving to the created Group object
   */
  public async createGroup(boardId: string, groupName: string): Promise<Group> {
    try {
      MondayLogger.debug(`Creating group in board ${boardId}`, { groupName });
      
      const response = await executeQuery<{ create_group: Group }>(
        this.QUERIES.CREATE_GROUP,
        { boardId, groupName }
      );
      
      // Invalidate board cache as groups have changed
      const cacheKey = `board-${boardId}`;
      await this.cacheService.invalidate(cacheKey, CACHE_NAMESPACE);
      
      return response.data.create_group;
    } catch (error) {
      MondayLogger.error(`Error creating group in board ${boardId}:`, error);
      this.handleApiError(error, `Failed to create group in board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Clears all board-related caches
   */
  public async clearCache(): Promise<void> {
    await this.cacheService.invalidatePattern('*', CACHE_NAMESPACE);
    MondayLogger.debug('Board service cache cleared');
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
        `Rate limit exceeded while accessing board API. Retry after ${error.retryAfter} seconds.`,
        error.retryAfter
      );
    }

    if (error instanceof MondayTypes.AuthenticationError) {
      throw new MondayTypes.AuthenticationError(
        'Authentication failed while accessing board API. Please check your API token.'
      );
    }

    if (error instanceof MondayTypes.NetworkError) {
      throw new MondayTypes.NetworkError(
        'Network error while accessing board API. Please check your internet connection.'
      );
    }

    if (error instanceof MondayTypes.MondayApiError) {
      throw new MondayTypes.MondayApiError(
        `Board API error: ${error.message}`,
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
export const enhancedBoardService = new EnhancedBoardService();

export default enhancedBoardService;