import { useState, useEffect, useCallback } from 'react';
import { boardService } from '../services/api/boardService';
import { BoardKind } from '../types/monday';
import { Board, BoardUpdateInput } from '../types/monday';
import { useAuth } from '../components/Authentication/AuthContext';
import { useNotifications } from '../context/NotificationsContext';

interface UseBoardsOptions {
  initialLoad?: boolean;
  workspaceId?: string;
}

interface UseBoardsReturn {
  boards: Board[];
  selectedBoard: Board | null;
  loading: boolean;
  error: string | null;
  fetchBoards: (workspaceId?: string) => Promise<void>;
  getBoardById: (id: string) => Promise<Board | null>;
  createBoard: (name: string, workspaceId?: string, boardKind?: string, description?: string) => Promise<Board>;
  updateBoard: (id: string, data: Partial<BoardUpdateInput>) => Promise<Board>;
  deleteBoard: (id: string) => Promise<{ id: string }>;
  selectBoard: (board: Board | null) => void;
  sortBoards: (sortBy: 'name' | 'created_at' | 'updated_at' | 'items_count', ascending?: boolean) => void;
  filterBoards: (searchTerm: string) => void;
}

/**
 * Custom hook for managing boards
 * Provides methods for fetching, creating, updating, and deleting boards,
 * as well as filtering/sorting boards
 */
export const useBoards = (options: UseBoardsOptions = {}): UseBoardsReturn => {
  const { token } = useAuth();
  const { addNotification } = useNotifications();
  const [boards, setBoards] = useState<Board[]>([]);
  const [filteredBoards, setFilteredBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { initialLoad = true, workspaceId } = options;

  // Fetch boards
  const fetchBoards = useCallback(async (wsId?: string) => {
    if (!token) return;
    
    const targetWorkspaceId = wsId || workspaceId;
    
    try {
      setLoading(true);
      const boardsData = await boardService.getBoards(targetWorkspaceId);
      
      setBoards(boardsData);
      setFilteredBoards(boardsData);
      setError(null);
    } catch (err: unknown) {
      console.error('Error fetching boards:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch boards';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Board Error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [token, workspaceId, addNotification]);

  // Get board by ID
  const getBoardById = useCallback(async (id: string): Promise<Board | null> => {
    if (!token) return null;
    
    try {
      setLoading(true);
      const board = await boardService.getBoardById(id);
      return board;
    } catch (err: unknown) {
      console.error(`Error fetching board with ID ${id}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to fetch board with ID ${id}`;
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Board Error',
        message: errorMessage
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, addNotification]);

  // Create board
  const createBoard = useCallback(async (
    name: string,
    wsId?: string,
    boardKind: string = 'public',
    description?: string
  ): Promise<Board> => {
    if (!token) throw new Error('Authentication required');
    
    const targetWorkspaceId = wsId || workspaceId;
    
    try {
      setLoading(true);
      const board = await boardService.createBoard(
        name,
        boardKind as BoardKind,
        targetWorkspaceId
      );
      
      // Update boards list
      setBoards(prev => [...prev, board]);
      setFilteredBoards(prev => [...prev, board]);
      
      addNotification({
        type: 'success',
        title: 'Board Created',
        message: `Board "${name}" has been created successfully`
      });
      
      return board;
    } catch (err: unknown) {
      console.error('Error creating board:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create board';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Board Error',
        message: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, workspaceId, addNotification]);

  // Update board
  const updateBoard = useCallback(async (
    id: string,
    data: Partial<BoardUpdateInput>
  ): Promise<Board> => {
    if (!token) throw new Error('Authentication required');
    
    try {
      setLoading(true);
      const updatedBoard = await boardService.updateBoard(id, data);
      
      // Update boards list
      setBoards(prev => 
        prev.map(board => board.id === id ? updatedBoard : board)
      );
      setFilteredBoards(prev => 
        prev.map(board => board.id === id ? updatedBoard : board)
      );
      
      // Update selected board if it's the one being updated
      if (selectedBoard && selectedBoard.id === id) {
        setSelectedBoard(updatedBoard);
      }
      
      addNotification({
        type: 'success',
        title: 'Board Updated',
        message: `Board "${updatedBoard.name}" has been updated successfully`
      });
      
      return updatedBoard;
    } catch (err: unknown) {
      console.error(`Error updating board with ID ${id}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to update board with ID ${id}`;
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Board Error',
        message: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, selectedBoard, addNotification]);

  // Delete board
  const deleteBoard = useCallback(async (id: string): Promise<{ id: string }> => {
    if (!token) throw new Error('Authentication required');
    
    try {
      setLoading(true);
      const result = await boardService.deleteBoard(id);
      
      // Update boards list
      setBoards(prev => prev.filter(board => board.id !== id));
      setFilteredBoards(prev => prev.filter(board => board.id !== id));
      
      // Clear selected board if it's the one being deleted
      if (selectedBoard && selectedBoard.id === id) {
        setSelectedBoard(null);
      }
      
      addNotification({
        type: 'success',
        title: 'Board Deleted',
        message: 'Board has been deleted successfully'
      });
      
      return result;
    } catch (err: unknown) {
      console.error(`Error deleting board with ID ${id}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to delete board with ID ${id}`;
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Board Error',
        message: errorMessage
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, selectedBoard, addNotification]);

  // Select board
  const selectBoard = useCallback((board: Board | null) => {
    setSelectedBoard(board);
  }, []);

  // Sort boards
  const sortBoards = useCallback((
    sortBy: 'name' | 'created_at' | 'updated_at' | 'items_count',
    ascending: boolean = true
  ) => {
    const sorted = [...filteredBoards].sort((a, b) => {
      if (sortBy === 'name') {
        return ascending 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'items_count') {
        const countA = a.items_count || 0;
        const countB = b.items_count || 0;
        return ascending ? countA - countB : countB - countA;
      } else {
        const dateA = a[sortBy] ? new Date(a[sortBy]!).getTime() : 0;
        const dateB = b[sortBy] ? new Date(b[sortBy]!).getTime() : 0;
        return ascending ? dateA - dateB : dateB - dateA;
      }
    });
    
    setFilteredBoards(sorted);
  }, [filteredBoards]);

  // Filter boards
  const filterBoards = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredBoards(boards);
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const filtered = boards.filter(board => 
      board.name.toLowerCase().includes(term) || 
      (board.description && board.description.toLowerCase().includes(term))
    );
    
    setFilteredBoards(filtered);
  }, [boards]);

  // Initial load
  useEffect(() => {
    if (initialLoad && token) {
      fetchBoards();
    }
  }, [initialLoad, token, fetchBoards]);

  return {
    boards: filteredBoards,
    selectedBoard,
    loading,
    error,
    fetchBoards,
    getBoardById,
    createBoard,
    updateBoard,
    deleteBoard,
    selectBoard,
    sortBoards,
    filterBoards
  };
};

export default useBoards;