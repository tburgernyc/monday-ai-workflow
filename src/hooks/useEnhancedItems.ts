import { useState, useCallback } from 'react';
import { Item } from '../types/monday';
import { ItemQueryOptions, ItemCreateInput, ColumnValues } from '../types/itemTypes';
import { enhancedItemService } from '../services/api/enhancedItemService';
import { useCachedData, useInvalidateCache } from './useCachedData';
import { MondayLogger } from '../services/api/mondayApi';

// Cache namespace for item-related data
const CACHE_NAMESPACE = 'item';

/**
 * Options for the useEnhancedItems hook
 */
interface UseEnhancedItemsOptions {
  /**
   * Whether to skip the initial fetch
   */
  initialLoad?: boolean;
  
  /**
   * Time-to-live in milliseconds for the cached data
   */
  ttl?: number;
  
  /**
   * Board ID to fetch items from
   */
  boardId?: string;
  
  /**
   * Group ID to filter items
   */
  groupId?: string;
  
  /**
   * Maximum number of items to fetch per page
   */
  limit?: number;
  
  /**
   * Page number to fetch
   */
  page?: number;
  
  /**
   * Column IDs to include in the response
   */
  columns?: string[];
  
  /**
   * Item IDs to filter by
   */
  ids?: string[];
  
  /**
   * Whether to sort items by newest first
   */
  newestFirst?: boolean;
}

/**
 * Custom hook for working with items using enhanced caching
 * 
 * This hook provides methods to interact with Monday.com items,
 * including fetching, creating, updating, and deleting items,
 * as well as moving items between groups and batch operations.
 * It uses the EnhancedItemService for improved caching and performance.
 * 
 * @param options Options for the hook
 * @returns Object containing items data and methods to interact with items
 */
export function useEnhancedItems(options: UseEnhancedItemsOptions = {}) {
  const { 
    initialLoad = true, 
    ttl = 5 * 60 * 1000,
    boardId,
    groupId,
    limit = 100,
    page = 1,
    columns = [],
    ids = [],
    newestFirst = true
  } = options;
  
  // State for selected item
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Cache invalidation functions
  const { invalidateEntry, invalidatePattern } = useInvalidateCache(CACHE_NAMESPACE);
  
  // Generate cache key based on query parameters
  const itemsCacheKey = boardId 
    ? `items-board-${boardId}-${groupId || 'all'}-${columns.join(',')}-${ids.join(',')}-${newestFirst}-${limit}-${page}`
    : 'no-items';
  
  // Fetch items with caching
  const {
    data: items,
    loading: loadingItems,
    error: itemsError,
    refetch: refetchItems
  } = useCachedData<Item[]>({
    cacheKey: itemsCacheKey,
    namespace: CACHE_NAMESPACE,
    fetchFn: () => boardId 
      ? enhancedItemService.getItems(boardId, { 
          limit, 
          page, 
          groupId, 
          columns, 
          ids, 
          newestFirst 
        })
      : Promise.resolve([]),
    ttl,
    skip: !initialLoad || !boardId,
    deps: [boardId, groupId, limit, page, columns.join(','), ids.join(','), newestFirst]
  });
  
  // Fetch selected item details if ID is provided
  const {
    data: selectedItem,
    loading: loadingSelectedItem,
    error: selectedItemError,
    refetch: refetchSelectedItem
  } = useCachedData<Item | null>({
    cacheKey: selectedItemId ? `item-${selectedItemId}` : 'no-item',
    namespace: CACHE_NAMESPACE,
    fetchFn: () => selectedItemId ? enhancedItemService.getItemById(selectedItemId) : Promise.resolve(null),
    ttl,
    skip: !selectedItemId,
    deps: [selectedItemId]
  });
  
  /**
   * Select an item by ID
   * @param id The ID of the item to select
   */
  const selectItem = useCallback((id: string | null) => {
    setSelectedItemId(id);
  }, []);
  
  /**
   * Create a new item in a board
   * @param itemBoardId The ID of the board to create the item in
   * @param itemGroupId The ID of the group to create the item in
   * @param name The name of the item
   * @param columnValues Optional column values for the new item
   * @returns Promise resolving to the created Item object
   */
  const createItem = useCallback(async (
    itemBoardId: string,
    itemGroupId: string,
    name: string,
    columnValues: ColumnValues = {}
  ): Promise<Item> => {
    try {
      const item = await enhancedItemService.createItem(itemBoardId, itemGroupId, name, columnValues);
      
      // Invalidate board items cache
      await invalidatePattern(`items-board-${itemBoardId}*`);
      
      // Refetch items if this is the current board
      if (itemBoardId === boardId) {
        refetchItems();
      }
      
      return item;
    } catch (error) {
      MondayLogger.error(`Error creating item in board ${itemBoardId}:`, error);
      throw error;
    }
  }, [invalidatePattern, boardId, refetchItems]);
  
  /**
   * Update an existing item's column values
   * @param itemId The ID of the item to update
   * @param columnValues The column values to update
   * @returns Promise resolving to the updated Item object
   */
  const updateItem = useCallback(async (
    itemId: string,
    columnValues: ColumnValues
  ): Promise<Item> => {
    try {
      // First get the item to know its board ID
      const item = await enhancedItemService.getItemById(itemId);
      if (!item || !item.board?.id) {
        throw new Error(`Item with ID ${itemId} not found or has no board ID`);
      }
      
      const itemBoardId = item.board.id;
      
      const updatedItem = await enhancedItemService.updateItem(itemId, columnValues);
      
      // Invalidate caches
      await invalidateEntry(`item-${itemId}`);
      
      // Invalidate board items cache
      await invalidatePattern(`items-board-${itemBoardId}*`);
      
      // Refetch data if this is the selected item
      if (itemId === selectedItemId) {
        refetchSelectedItem();
      }
      
      // Refetch items if this is the current board
      if (itemBoardId === boardId) {
        refetchItems();
      }
      
      return updatedItem;
    } catch (error) {
      MondayLogger.error(`Error updating item ${itemId}:`, error);
      throw error;
    }
  }, [invalidateEntry, invalidatePattern, selectedItemId, boardId, refetchSelectedItem, refetchItems]);
  
  /**
   * Move an item to a different group
   * @param itemId The ID of the item to move
   * @param targetGroupId The ID of the destination group
   * @returns Promise resolving to the moved Item object
   */
  const moveItem = useCallback(async (
    itemId: string,
    targetGroupId: string
  ): Promise<Item> => {
    try {
      const movedItem = await enhancedItemService.moveItem(itemId, targetGroupId);
      
      // Get the item to know its board ID
      const item = await enhancedItemService.getItemById(itemId);
      if (item?.board?.id) {
        // Invalidate board items cache
        await invalidatePattern(`items-board-${item.board.id}*`);
        
        // Refetch items if this is the current board
        if (item.board.id === boardId) {
          refetchItems();
        }
      }
      
      // Invalidate item cache
      await invalidateEntry(`item-${itemId}`);
      
      // Refetch data if this is the selected item
      if (itemId === selectedItemId) {
        refetchSelectedItem();
      }
      
      return movedItem;
    } catch (error) {
      MondayLogger.error(`Error moving item ${itemId} to group ${targetGroupId}:`, error);
      throw error;
    }
  }, [invalidateEntry, invalidatePattern, selectedItemId, boardId, refetchSelectedItem, refetchItems]);
  
  /**
   * Delete an item
   * @param itemId The ID of the item to delete
   * @returns Promise resolving to an object containing the deleted item ID
   */
  const deleteItem = useCallback(async (itemId: string): Promise<{ id: string }> => {
    try {
      // Get the item first to know its board ID for cache invalidation
      const item = await enhancedItemService.getItemById(itemId);
      
      const result = await enhancedItemService.deleteItem(itemId);
      
      // Invalidate item cache
      await invalidateEntry(`item-${itemId}`);
      
      if (item?.board?.id) {
        // Invalidate board items cache
        await invalidatePattern(`items-board-${item.board.id}*`);
        
        // Refetch items if this is the current board
        if (item.board.id === boardId) {
          refetchItems();
        }
      }
      
      // If this was the selected item, clear selection
      if (itemId === selectedItemId) {
        setSelectedItemId(null);
      }
      
      return result;
    } catch (error) {
      MondayLogger.error(`Error deleting item ${itemId}:`, error);
      throw error;
    }
  }, [invalidateEntry, invalidatePattern, selectedItemId, boardId, refetchItems]);
  
  /**
   * Create multiple items at once in a board
   * @param itemBoardId The ID of the board to create items in
   * @param newItems Array of item creation inputs
   * @returns Promise resolving to an array of created Item objects
   */
  const batchCreateItems = useCallback(async (
    itemBoardId: string,
    newItems: ItemCreateInput[]
  ): Promise<Item[]> => {
    try {
      if (newItems.length === 0) {
        return [];
      }
      
      const createdItems = await enhancedItemService.batchCreateItems(itemBoardId, newItems);
      
      // Invalidate board items cache
      await invalidatePattern(`items-board-${itemBoardId}*`);
      
      // Refetch items if this is the current board
      if (itemBoardId === boardId) {
        refetchItems();
      }
      
      return createdItems;
    } catch (error) {
      MondayLogger.error(`Error batch creating items in board ${itemBoardId}:`, error);
      throw error;
    }
  }, [invalidatePattern, boardId, refetchItems]);
  
  /**
   * Prefetch and cache items for a board to improve performance
   * @param prefetchBoardId The ID of the board to prefetch items for
   * @param prefetchOptions Optional parameters for filtering and pagination
   * @returns Promise resolving to an array of Item objects
   */
  const prefetchBoardItems = useCallback(async (
    prefetchBoardId: string,
    prefetchOptions: ItemQueryOptions = {}
  ): Promise<Item[]> => {
    try {
      return await enhancedItemService.prefetchBoardItems(prefetchBoardId, prefetchOptions);
    } catch (error) {
      MondayLogger.error(`Error prefetching items for board ${prefetchBoardId}:`, error);
      // Don't throw error for prefetch operations, just log it
      return [];
    }
  }, []);
  
  /**
   * Clear all item-related caches
   */
  const clearCache = useCallback(async (): Promise<void> => {
    await invalidatePattern('*');
    
    // Refetch data if needed
    if (initialLoad && boardId) {
      refetchItems();
      
      if (selectedItemId) {
        refetchSelectedItem();
      }
    }
  }, [invalidatePattern, initialLoad, boardId, selectedItemId, refetchItems, refetchSelectedItem]);
  
  return {
    // Data
    items: items || [],
    selectedItem,
    
    // Loading states
    loading: loadingItems || (selectedItemId && loadingSelectedItem),
    loadingItems,
    loadingSelectedItem,
    
    // Errors
    error: itemsError || selectedItemError,
    itemsError,
    selectedItemError,
    
    // Actions
    selectItem,
    createItem,
    updateItem,
    moveItem,
    deleteItem,
    batchCreateItems,
    prefetchBoardItems,
    
    // Refetch functions
    refetchItems,
    refetchSelectedItem,
    clearCache
  };
}

export default useEnhancedItems;