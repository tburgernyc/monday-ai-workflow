import { executeQuery, executeQueryWithPagination, MondayLogger } from './mondayApi';
import { Item, ColumnValue } from '../../types/monday';
import { MondayTypes } from './mondayApi';
import { 
  ItemQueryOptions, 
  ItemCreateInput, 
  ColumnValues
} from '../../types/itemTypes';
import { CacheService } from '../cache/cacheService';
import { CacheStorage } from '../../types/cacheTypes';

// Cache namespace for item-related data
const CACHE_NAMESPACE = 'item';

/**
 * EnhancedItemService class for managing Monday.com board items with improved caching
 * 
 * This service provides methods to interact with Monday.com items,
 * including fetching, creating, updating, and deleting items,
 * as well as moving items between groups and batch operations.
 * It uses the CacheService for more robust caching with TTL, persistence, and offline support.
 */
export class EnhancedItemService {
  private cacheService: CacheService;

  // GraphQL queries and mutations
  private readonly QUERIES = {
    GET_ITEMS: `
      query GetItems($boardId: ID!, $limit: Int, $page: Int, $groupId: String, $columns: [String], $ids: [ID], $newestFirst: Boolean) {
        boards(ids: [$boardId]) {
          items(limit: $limit, page: $page, group_id: $groupId, ids: $ids, newest_first: $newestFirst) {
            id
            name
            state
            created_at
            updated_at
            group {
              id
              title
            }
            column_values(ids: $columns) {
              id
              text
              value
              type
            }
          }
        }
      }
    `,

    GET_ITEM_BY_ID: `
      query GetItemById($itemId: ID!) {
        items(ids: [$itemId]) {
          id
          name
          state
          created_at
          updated_at
          board {
            id
            name
          }
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
    `,

    CREATE_ITEM: `
      mutation CreateItem($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON) {
        create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $columnValues) {
          id
          name
          state
          created_at
          board {
            id
          }
          group {
            id
            title
          }
        }
      }
    `,

    UPDATE_ITEM: `
      mutation UpdateItem($itemId: ID!, $boardId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $columnValues) {
          id
          name
          state
          updated_at
        }
      }
    `,

    MOVE_ITEM: `
      mutation MoveItemToGroup($itemId: ID!, $groupId: String!) {
        move_item_to_group(item_id: $itemId, group_id: $groupId) {
          id
          group {
            id
            title
          }
        }
      }
    `,

    DELETE_ITEM: `
      mutation DeleteItem($itemId: ID!) {
        delete_item(item_id: $itemId) {
          id
        }
      }
    `,

    BATCH_CREATE_ITEMS: `
      mutation BatchCreateItems($boardId: ID!, $items: [ItemCreateInput]!) {
        create_items(board_id: $boardId, items: $items) {
          id
          name
          board {
            id
          }
          group {
            id
          }
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
   * Fetches items from a board with optional filtering
   * 
   * @param boardId The ID of the board containing the items
   * @param options Optional parameters for filtering and pagination
   * @returns Promise resolving to an array of Item objects
   */
  public async getItems(boardId: string, options: ItemQueryOptions = {}): Promise<Item[]> {
    try {
      const { 
        limit = 100, 
        page = 1, 
        groupId, 
        columns = [], 
        ids = [],
        newestFirst = true 
      } = options;

      // Generate cache key based on query parameters
      const cacheKey = `items-board-${boardId}-${groupId || 'all'}-${columns.join(',')}-${ids.join(',')}-${newestFirst}-${limit}-${page}`;
      
      // Check cache first
      const cachedItems = await this.cacheService.get<Item[]>(cacheKey, CACHE_NAMESPACE);
      
      if (cachedItems) {
        MondayLogger.debug(`Using cached items for board ID ${boardId} with options`, options);
        return cachedItems;
      }

      MondayLogger.debug(`Fetching items for board ID ${boardId} from API with options`, options);
      
      const response = await executeQuery<{ boards: Array<{ items: Item[] }> }>(
        this.QUERIES.GET_ITEMS,
        {
          boardId,
          limit,
          page,
          groupId,
          columns: columns.length > 0 ? columns : undefined,
          ids: ids.length > 0 ? ids : undefined,
          newestFirst
        }
      );
      
      const boards = response.data.boards || [];
      const items = boards.length > 0 ? boards[0].items || [] : [];

      // Update cache
      await this.cacheService.set(cacheKey, items, {}, CACHE_NAMESPACE);

      // Also cache individual items
      for (const item of items) {
        const itemCacheKey = `item-${item.id}`;
        await this.cacheService.set(itemCacheKey, item, {}, CACHE_NAMESPACE);
      }

      return items;
    } catch (error) {
      MondayLogger.error(`Error fetching items for board ${boardId}:`, error);
      this.handleApiError(error, `Failed to fetch items for board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Fetches a specific item by ID with all details
   * 
   * @param id The ID of the item to fetch
   * @returns Promise resolving to an Item object or null if not found
   */
  public async getItemById(id: string): Promise<Item | null> {
    try {
      // Check cache first
      const cacheKey = `item-${id}`;
      const cachedItem = await this.cacheService.get<Item>(cacheKey, CACHE_NAMESPACE);
      
      if (cachedItem) {
        MondayLogger.debug(`Using cached item for ID ${id}`);
        return cachedItem;
      }

      MondayLogger.debug(`Fetching item with ID ${id} from API`);
      
      const response = await executeQuery<{ items: Item[] }>(
        this.QUERIES.GET_ITEM_BY_ID,
        { itemId: id }
      );

      const items = response.data.items || [];
      const item = items.length > 0 ? items[0] : null;

      if (item) {
        // Update cache
        await this.cacheService.set(cacheKey, item, {}, CACHE_NAMESPACE);
      }

      return item;
    } catch (error) {
      MondayLogger.error(`Error fetching item with ID ${id}:`, error);
      this.handleApiError(error, `Failed to fetch item with ID ${id}`);
      throw error;
    }
  }

  /**
   * Creates a new item in a board
   * 
   * @param boardId The ID of the board to create the item in
   * @param groupId The ID of the group to create the item in
   * @param name The name of the item
   * @param columnValues Optional column values for the new item
   * @returns Promise resolving to the created Item object
   */
  public async createItem(
    boardId: string,
    groupId: string,
    name: string,
    columnValues: ColumnValues = {}
  ): Promise<Item> {
    try {
      MondayLogger.debug(`Creating new item in board ${boardId}, group ${groupId}`, { name, columnValues });
      
      const response = await executeQuery<{ create_item: Item }>(
        this.QUERIES.CREATE_ITEM,
        {
          boardId,
          groupId,
          itemName: name,
          columnValues: JSON.stringify(columnValues)
        }
      );

      const item = response.data.create_item;

      // Invalidate board items cache
      await this.cacheService.invalidatePattern(`items-board-${boardId}*`, CACHE_NAMESPACE);

      // Cache the new item
      const cacheKey = `item-${item.id}`;
      await this.cacheService.set(cacheKey, item, {}, CACHE_NAMESPACE);

      return item;
    } catch (error) {
      MondayLogger.error(`Error creating item in board ${boardId}:`, error);
      this.handleApiError(error, `Failed to create item in board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Updates an existing item's column values
   * 
   * @param itemId The ID of the item to update
   * @param columnValues The column values to update
   * @returns Promise resolving to the updated Item object
   */
  public async updateItem(
    itemId: string,
    columnValues: ColumnValues
  ): Promise<Item> {
    try {
      // First get the item to know its board ID
      const item = await this.getItemById(itemId);
      if (!item || !item.board?.id) {
        throw new Error(`Item with ID ${itemId} not found or has no board ID`);
      }

      const boardId = item.board.id;
      
      MondayLogger.debug(`Updating item ${itemId} in board ${boardId}`, { columnValues });
      
      const response = await executeQuery<{ change_multiple_column_values: Item }>(
        this.QUERIES.UPDATE_ITEM,
        {
          itemId,
          boardId,
          columnValues: JSON.stringify(columnValues)
        }
      );

      const updatedItem = response.data.change_multiple_column_values;

      // Invalidate caches
      const cacheKey = `item-${itemId}`;
      await this.cacheService.invalidate(cacheKey, CACHE_NAMESPACE);
      
      // Invalidate board items cache
      await this.cacheService.invalidatePattern(`items-board-${boardId}*`, CACHE_NAMESPACE);

      return updatedItem;
    } catch (error) {
      MondayLogger.error(`Error updating item ${itemId}:`, error);
      this.handleApiError(error, `Failed to update item with ID ${itemId}`);
      throw error;
    }
  }

  /**
   * Moves an item to a different group
   * 
   * @param itemId The ID of the item to move
   * @param groupId The ID of the destination group
   * @returns Promise resolving to the moved Item object
   */
  public async moveItem(
    itemId: string,
    groupId: string
  ): Promise<Item> {
    try {
      MondayLogger.debug(`Moving item ${itemId} to group ${groupId}`);
      
      const response = await executeQuery<{ move_item_to_group: Item }>(
        this.QUERIES.MOVE_ITEM,
        { itemId, groupId }
      );

      const movedItem = response.data.move_item_to_group;

      // Invalidate caches
      const cacheKey = `item-${itemId}`;
      await this.cacheService.invalidate(cacheKey, CACHE_NAMESPACE);
      
      // Get the item to know its board ID
      const item = await this.getItemById(itemId);
      if (item?.board?.id) {
        // Invalidate board items cache
        await this.cacheService.invalidatePattern(`items-board-${item.board.id}*`, CACHE_NAMESPACE);
      }

      return movedItem;
    } catch (error) {
      MondayLogger.error(`Error moving item ${itemId} to group ${groupId}:`, error);
      this.handleApiError(error, `Failed to move item with ID ${itemId} to group ${groupId}`);
      throw error;
    }
  }

  /**
   * Deletes an item
   * 
   * @param itemId The ID of the item to delete
   * @returns Promise resolving to an object containing the deleted item ID
   */
  public async deleteItem(itemId: string): Promise<{ id: string }> {
    try {
      // Get the item first to know its board ID for cache invalidation
      const item = await this.getItemById(itemId);
      
      MondayLogger.debug(`Deleting item with ID ${itemId}`);
      
      const response = await executeQuery<{ delete_item: { id: string } }>(
        this.QUERIES.DELETE_ITEM,
        { itemId }
      );

      // Invalidate caches
      const cacheKey = `item-${itemId}`;
      await this.cacheService.invalidate(cacheKey, CACHE_NAMESPACE);
      
      if (item?.board?.id) {
        // Invalidate board items cache
        await this.cacheService.invalidatePattern(`items-board-${item.board.id}*`, CACHE_NAMESPACE);
      }

      return response.data.delete_item;
    } catch (error) {
      MondayLogger.error(`Error deleting item ${itemId}:`, error);
      this.handleApiError(error, `Failed to delete item with ID ${itemId}`);
      throw error;
    }
  }

  /**
   * Creates multiple items at once in a board
   * 
   * @param boardId The ID of the board to create items in
   * @param items Array of item creation inputs
   * @returns Promise resolving to an array of created Item objects
   */
  public async batchCreateItems(
    boardId: string,
    items: ItemCreateInput[]
  ): Promise<Item[]> {
    try {
      if (items.length === 0) {
        return [];
      }

      MondayLogger.debug(`Batch creating ${items.length} items in board ${boardId}`);
      
      // Transform the items to match the API's expected format
      const formattedItems = items.map(item => ({
        group_id: item.groupId,
        item_name: item.name,
        column_values: item.columnValues ? JSON.stringify(item.columnValues) : undefined
      }));
      
      const response = await executeQuery<{ create_items: Item[] }>(
        this.QUERIES.BATCH_CREATE_ITEMS,
        {
          boardId,
          items: formattedItems
        }
      );

      const createdItems = response.data.create_items;

      // Invalidate board items cache
      await this.cacheService.invalidatePattern(`items-board-${boardId}*`, CACHE_NAMESPACE);

      // Cache the new items
      for (const item of createdItems) {
        const cacheKey = `item-${item.id}`;
        await this.cacheService.set(cacheKey, item, {}, CACHE_NAMESPACE);
      }

      return createdItems;
    } catch (error) {
      MondayLogger.error(`Error batch creating items in board ${boardId}:`, error);
      this.handleApiError(error, `Failed to batch create items in board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Prefetches and caches items for a board to improve performance
   * 
   * @param boardId The ID of the board to prefetch items for
   * @param options Optional parameters for filtering and pagination
   * @returns Promise resolving to an array of Item objects
   */
  public async prefetchBoardItems(boardId: string, options: ItemQueryOptions = {}): Promise<Item[]> {
    try {
      MondayLogger.debug(`Prefetching items for board ${boardId}`);
      
      // Use a longer TTL for prefetched data
      const prefetchOptions = {
        ...options,
        ttl: 15 * 60 * 1000 // 15 minutes
      };
      
      // Fetch items with the specified options
      const items = await this.getItems(boardId, options);
      
      // Store in cache with longer TTL
      const cacheKey = `items-board-${boardId}-prefetch`;
      await this.cacheService.set(cacheKey, items, prefetchOptions, CACHE_NAMESPACE);
      
      return items;
    } catch (error) {
      MondayLogger.error(`Error prefetching items for board ${boardId}:`, error);
      // Don't throw error for prefetch operations, just log it
      return [];
    }
  }

  /**
   * Clears all item-related caches
   */
  public async clearCache(): Promise<void> {
    await this.cacheService.invalidatePattern('*', CACHE_NAMESPACE);
    MondayLogger.debug('Item service cache cleared');
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
        `Rate limit exceeded while accessing item API. Retry after ${error.retryAfter} seconds.`,
        error.retryAfter
      );
    }

    if (error instanceof MondayTypes.AuthenticationError) {
      throw new MondayTypes.AuthenticationError(
        'Authentication failed while accessing item API. Please check your API token.'
      );
    }

    if (error instanceof MondayTypes.NetworkError) {
      throw new MondayTypes.NetworkError(
        'Network error while accessing item API. Please check your internet connection.'
      );
    }

    if (error instanceof MondayTypes.MondayApiError) {
      throw new MondayTypes.MondayApiError(
        `Item API error: ${error.message}`,
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
export const enhancedItemService = new EnhancedItemService();

export default enhancedItemService;