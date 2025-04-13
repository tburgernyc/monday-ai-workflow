import { useState, useCallback } from 'react';
import { Board, BoardKind, BoardUpdateInput, BoardActivity, Group, Item } from '../types/monday';
import { enhancedBoardService } from '../services/api/enhancedBoardService';
import { useCachedData, useInvalidateCache, usePrefetch } from './useCachedData';
import { MondayLogger } from '../services/api/mondayApi';

// Cache namespace for board-related data
const CACHE_NAMESPACE = 'board';

/**
 * Options for the useEnhancedBoards hook
 */
interface UseEnhancedBoardsOptions {
  /**
   * Whether to skip the initial fetch
   */
  initialLoad?: boolean;
  
  /**
   * Time-to-live in milliseconds for the cached data
   */
  ttl?: number;
  
  /**
   * Workspace ID to filter boards
   */
  workspaceId?: string;
  
  /**
   * Whether to prefetch board details when boards are loaded
   */
  prefetchDetails?: boolean;
}

/**
 * Custom hook for working with boards using enhanced caching
 * 
 * This hook provides methods to interact with Monday.com boards,
 * including fetching, creating, updating, and deleting boards,
 * as well as managing board activities and items. It uses the EnhancedBoardService
 * for improved caching and performance.
 * 
 * @param options Options for the hook
 * @returns Object containing boards data and methods to interact with boards
 */
export function useEnhancedBoards(options: UseEnhancedBoardsOptions = {}) {
  const { 
    initialLoad = true, 
    ttl = 5 * 60 * 1000,
    workspaceId,
    prefetchDetails = false
  } = options;
  
  // State for selected board
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  
  // Cache invalidation functions
  const { invalidateEntry, invalidatePattern } = useInvalidateCache(CACHE_NAMESPACE);
  
  // Fetch all boards with caching
  const {
    data: boards,
    loading: loadingBoards,
    error: boardsError,
    refetch: refetchBoards
  } = useCachedData<Board[]>({
    cacheKey: workspaceId ? `boards-workspace-${workspaceId}` : 'all-boards',
    namespace: CACHE_NAMESPACE,
    fetchFn: () => enhancedBoardService.getBoards(workspaceId),
    ttl,
    skip: !initialLoad,
    persist: true,
    deps: [workspaceId]
  });
  
  // Fetch selected board details if ID is provided
  const {
    data: selectedBoard,
    loading: loadingSelectedBoard,
    error: selectedBoardError,
    refetch: refetchSelectedBoard
  } = useCachedData<Board | null>({
    cacheKey: selectedBoardId ? `board-${selectedBoardId}` : 'no-board',
    namespace: CACHE_NAMESPACE,
    fetchFn: () => selectedBoardId ? enhancedBoardService.getBoardById(selectedBoardId) : Promise.resolve(null),
    ttl,
    skip: !selectedBoardId,
    deps: [selectedBoardId]
  });
  
  // Fetch board activity if a board is selected
  const {
    data: boardActivity,
    loading: loadingBoardActivity,
    error: boardActivityError,
    refetch: refetchBoardActivity
  } = useCachedData<BoardActivity[]>({
    cacheKey: selectedBoardId ? `board-activity-${selectedBoardId}` : 'no-board-activity',
    namespace: CACHE_NAMESPACE,
    fetchFn: () => selectedBoardId ? enhancedBoardService.getBoardActivity(selectedBoardId) : Promise.resolve([]),
    ttl: 2 * 60 * 1000, // 2 minutes TTL for activity data since it changes frequently
    skip: !selectedBoardId,
    deps: [selectedBoardId]
  });
  
  // Prefetch function for board details
  const prefetchBoardDetails = usePrefetch<Board | null>({
    cacheKey: 'prefetch-board-details',
    namespace: CACHE_NAMESPACE,
    fetchFn: async () => {
      if (!boards || boards.length === 0) return null;
      
      // Prefetch details for the first few boards
      const boardsToFetch = boards.slice(0, 3);
      
      for (const board of boardsToFetch) {
        try {
          const cacheKey = `board-${board.id}`;
          const boardDetails = await enhancedBoardService.getBoardById(board.id);
          MondayLogger.debug(`Prefetched details for board ${board.id}`);
          
          // No need to do anything with the result, it's already cached by the service
        } catch (error) {
          MondayLogger.error(`Error prefetching board details for ${board.id}:`, error);
          // Continue with other boards even if one fails
        }
      }
      
      return null;
    },
    ttl: 10 * 60 * 1000 // 10 minutes TTL for prefetched data
  });
  
  // Prefetch board details when boards are loaded
  if (prefetchDetails && boards && boards.length > 0 && !loadingBoards) {
    prefetchBoardDetails();
  }
  
  /**
   * Select a board by ID
   * @param id The ID of the board to select
   */
  const selectBoard = useCallback((id: string | null) => {
    setSelectedBoardId(id);
  }, []);
  
  /**
   * Create a new board
   * @param name The name of the board
   * @param boardKind The kind of board to create
   * @param workspaceId Optional workspace ID to create the board in
   * @returns Promise resolving to the created Board object
   */
  const createBoard = useCallback(async (
    name: string,
    boardKind: BoardKind,
    boardWorkspaceId?: string
  ): Promise<Board> => {
    try {
      const board = await enhancedBoardService.createBoard(name, boardKind, boardWorkspaceId);
      
      // Invalidate boards cache
      await invalidateEntry('all-boards');
      if (boardWorkspaceId) {
        await invalidateEntry(`boards-workspace-${boardWorkspaceId}`);
      }
      
      // Refetch boards
      refetchBoards();
      
      return board;
    } catch (error) {
      MondayLogger.error('Error creating board:', error);
      throw error;
    }
  }, [invalidateEntry, refetchBoards]);
  
  /**
   * Duplicate an existing board
   * @param id The ID of the board to duplicate
   * @param name The name for the new duplicated board
   * @returns Promise resolving to the duplicated Board object
   */
  const duplicateBoard = useCallback(async (
    id: string,
    name: string
  ): Promise<Board> => {
    try {
      const board = await enhancedBoardService.duplicateBoard(id, name);
      
      // Invalidate boards cache
      await invalidateEntry('all-boards');
      
      // Get the original board to check its workspace
      const originalBoard = await enhancedBoardService.getBoardById(id);
      if (originalBoard?.workspace_id) {
        await invalidateEntry(`boards-workspace-${originalBoard.workspace_id}`);
      }
      
      // Refetch boards
      refetchBoards();
      
      return board;
    } catch (error) {
      MondayLogger.error(`Error duplicating board with ID ${id}:`, error);
      throw error;
    }
  }, [invalidateEntry, refetchBoards]);
  
  /**
   * Update an existing board
   * @param id The ID of the board to update
   * @param data Object containing the properties to update
   * @returns Promise resolving to the updated Board object
   */
  const updateBoard = useCallback(async (
    id: string,
    data: Partial<BoardUpdateInput>
  ): Promise<Board> => {
    try {
      const board = await enhancedBoardService.updateBoard(id, data);
      
      // Invalidate caches
      await invalidateEntry(`board-${id}`);
      await invalidateEntry('all-boards');
      
      // Get the board to check its workspace
      const fullBoard = await enhancedBoardService.getBoardById(id);
      if (fullBoard?.workspace_id) {
        await invalidateEntry(`boards-workspace-${fullBoard.workspace_id}`);
      }
      
      // Refetch data if this is the selected board
      if (id === selectedBoardId) {
        refetchSelectedBoard();
      }
      
      // Refetch boards list
      refetchBoards();
      
      return board;
    } catch (error) {
      MondayLogger.error(`Error updating board with ID ${id}:`, error);
      throw error;
    }
  }, [invalidateEntry, selectedBoardId, refetchSelectedBoard, refetchBoards]);
  
  /**
   * Delete a board
   * @param id The ID of the board to delete
   * @returns Promise resolving to an object containing the deleted board ID
   */
  const deleteBoard = useCallback(async (id: string): Promise<{ id: string }> => {
    try {
      // Get the board first to know its workspace for cache invalidation
      const board = await enhancedBoardService.getBoardById(id);
      
      const result = await enhancedBoardService.deleteBoard(id);
      
      // Invalidate caches
      await invalidateEntry(`board-${id}`);
      await invalidateEntry('all-boards');
      await invalidateEntry(`board-activity-${id}`);
      await invalidatePattern(`board-items-${id}*`);
      
      if (board?.workspace_id) {
        await invalidateEntry(`boards-workspace-${board.workspace_id}`);
      }
      
      // If this was the selected board, clear selection
      if (id === selectedBoardId) {
        setSelectedBoardId(null);
      }
      
      // Refetch boards list
      refetchBoards();
      
      return result;
    } catch (error) {
      MondayLogger.error(`Error deleting board with ID ${id}:`, error);
      throw error;
    }
  }, [invalidateEntry, invalidatePattern, selectedBoardId, refetchBoards]);
  
  /**
   * Get items in a board with pagination
   * @param boardId The ID of the board
   * @param options Options for pagination and filtering
   * @returns Promise resolving to an array of Item objects
   */
  const getBoardItems = useCallback(async (
    boardId: string,
    options: { limit?: number; page?: number; groupId?: string } = {}
  ): Promise<Item[]> => {
    try {
      return await enhancedBoardService.getBoardItems(boardId, options);
    } catch (error) {
      MondayLogger.error(`Error fetching items for board ${boardId}:`, error);
      throw error;
    }
  }, []);
  
  /**
   * Creates a new group in a board
   * @param boardId The ID of the board
   * @param groupName The name of the group to create
   * @returns Promise resolving to the created Group object
   */
  const createGroup = useCallback(async (
    boardId: string,
    groupName: string
  ): Promise<Group> => {
    try {
      const group = await enhancedBoardService.createGroup(boardId, groupName);
      
      // Invalidate board cache as groups have changed
      await invalidateEntry(`board-${boardId}`);
      
      // Refetch selected board if this is the selected board
      if (boardId === selectedBoardId) {
        refetchSelectedBoard();
      }
      
      return group;
    } catch (error) {
      MondayLogger.error(`Error creating group in board ${boardId}:`, error);
      throw error;
    }
  }, [invalidateEntry, selectedBoardId, refetchSelectedBoard]);
  
  /**
   * Clear all board-related caches
   */
  const clearCache = useCallback(async (): Promise<void> => {
    await invalidatePattern('*');
    
    // Refetch data if needed
    if (initialLoad) {
      refetchBoards();
      
      if (selectedBoardId) {
        refetchSelectedBoard();
        refetchBoardActivity();
      }
    }
  }, [invalidatePattern, initialLoad, selectedBoardId, refetchBoards, refetchSelectedBoard, refetchBoardActivity]);
  
  return {
    // Data
    boards: boards || [],
    selectedBoard,
    boardActivity: boardActivity || [],
    
    // Loading states
    loading: loadingBoards || (selectedBoardId && loadingSelectedBoard) || (selectedBoardId && loadingBoardActivity),
    loadingBoards,
    loadingSelectedBoard,
    loadingBoardActivity,
    
    // Errors
    error: boardsError || selectedBoardError || boardActivityError,
    boardsError,
    selectedBoardError,
    boardActivityError,
    
    // Actions
    selectBoard,
    createBoard,
    duplicateBoard,
    updateBoard,
    deleteBoard,
    getBoardItems,
    createGroup,
    
    // Refetch functions
    refetchBoards,
    refetchSelectedBoard,
    refetchBoardActivity,
    clearCache
  };
}

export default useEnhancedBoards;