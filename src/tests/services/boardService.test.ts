import { boardService, BoardService } from '../../services/api/boardService';
import { executeQuery, executeQueryWithPagination } from '../../services/api/mondayApi';
import { Board, BoardKind, BoardActivity } from '../../types/monday';

// Mock the mondayApi module
jest.mock('../../services/api/mondayApi', () => ({
  executeQuery: jest.fn(),
  executeQueryWithPagination: jest.fn(),
  MondayLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  MondayTypes: {
    RateLimitError: class RateLimitError extends Error {
      retryAfter?: number;
      constructor(message: string, retryAfter?: number) {
        super(message);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
      }
    },
    AuthenticationError: class AuthenticationError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
      }
    },
    NetworkError: class NetworkError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
      }
    },
    MondayApiError: class MondayApiError extends Error {
      status?: number;
      errors?: any[];
      query?: string;
      variables?: Record<string, unknown>;
      constructor(message: string, options?: any) {
        super(message);
        this.name = 'MondayApiError';
        this.status = options?.status;
        this.errors = options?.errors;
        this.query = options?.query;
        this.variables = options?.variables;
      }
    }
  }
}));

describe('BoardService', () => {
  let service: BoardService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new BoardService();
  });

  describe('getBoards', () => {
    it('should fetch boards from API when cache is empty', async () => {
      // Mock data
      const mockBoards: Board[] = [
        { id: '1', name: 'Board 1', board_kind: 'public', state: 'active' },
        { id: '2', name: 'Board 2', board_kind: 'private', state: 'active' }
      ];
      
      // Setup mock
      (executeQueryWithPagination as jest.Mock).mockResolvedValueOnce(mockBoards);
      
      // Execute
      const result = await service.getBoards();
      
      // Verify
      expect(executeQueryWithPagination).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoards'),
        expect.any(Object),
        'data.boards',
        100
      );
      expect(result).toEqual(mockBoards);
    });

    it('should return cached boards when cache is valid', async () => {
      // Mock data
      const mockBoards: Board[] = [
        { id: '1', name: 'Board 1', board_kind: 'public', state: 'active' },
        { id: '2', name: 'Board 2', board_kind: 'private', state: 'active' }
      ];
      
      // Setup mock for first call
      (executeQueryWithPagination as jest.Mock).mockResolvedValueOnce(mockBoards);
      
      // First call to populate cache
      await service.getBoards();
      
      // Reset mock to verify it's not called again
      (executeQueryWithPagination as jest.Mock).mockClear();
      
      // Second call should use cache
      const result = await service.getBoards();
      
      // Verify
      expect(executeQueryWithPagination).not.toHaveBeenCalled();
      expect(result).toEqual(mockBoards);
    });

    it('should filter boards by workspace ID when provided', async () => {
      // Mock data
      const mockBoards: Board[] = [
        { id: '1', name: 'Board 1', board_kind: 'public', state: 'active', workspace_id: 'ws1' }
      ];
      
      // Setup mock
      (executeQueryWithPagination as jest.Mock).mockResolvedValueOnce(mockBoards);
      
      // Execute
      const result = await service.getBoards('ws1');
      
      // Verify
      expect(executeQueryWithPagination).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoards'),
        expect.objectContaining({ workspaceId: 'ws1' }),
        'data.boards',
        100
      );
      expect(result).toEqual(mockBoards);
    });
  });

  describe('getBoardById', () => {
    it('should fetch board by ID from API when cache is empty', async () => {
      // Mock data
      const mockBoard: Board = {
        id: '1',
        name: 'Board 1',
        board_kind: 'public',
        state: 'active',
        groups: [{ id: 'g1', title: 'Group 1', color: 'green', position: 1 }],
        columns: [{ id: 'c1', title: 'Column 1', type: 'text' }]
      };
      
      // Setup mock
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { boards: [mockBoard] }
      });
      
      // Execute
      const result = await service.getBoardById('1');
      
      // Verify
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardById'),
        { id: '1' }
      );
      expect(result).toEqual(mockBoard);
    });

    it('should return null when board is not found', async () => {
      // Setup mock
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { boards: [] }
      });
      
      // Execute
      const result = await service.getBoardById('999');
      
      // Verify
      expect(result).toBeNull();
    });
  });

  describe('createBoard', () => {
    it('should create a new board with the provided details', async () => {
      // Mock data
      const mockBoard: Board = {
        id: '1',
        name: 'New Board',
        board_kind: 'public',
        state: 'active',
        workspace_id: 'ws1',
        created_at: '2025-01-01'
      };
      
      // Setup mock
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { create_board: mockBoard }
      });
      
      // Execute
      const result = await service.createBoard('New Board', BoardKind.PUBLIC, 'ws1');
      
      // Verify
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('mutation CreateBoard'),
        {
          name: 'New Board',
          boardKind: BoardKind.PUBLIC,
          workspaceId: 'ws1'
        }
      );
      expect(result).toEqual(mockBoard);
    });
  });

  describe('duplicateBoard', () => {
    it('should duplicate a board with a new name', async () => {
      // Mock data
      const mockBoard: Board = {
        id: '2',
        name: 'Board 1 (Copy)',
        board_kind: 'public',
        state: 'active',
        workspace_id: 'ws1',
        created_at: '2025-01-01'
      };
      
      // Setup mock
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { duplicate_board: mockBoard }
      });
      
      // Execute
      const result = await service.duplicateBoard('1', 'Board 1 (Copy)');
      
      // Verify
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('mutation DuplicateBoard'),
        {
          boardId: '1',
          name: 'Board 1 (Copy)'
        }
      );
      expect(result).toEqual(mockBoard);
    });
  });

  describe('updateBoard', () => {
    it('should update a board with the provided details', async () => {
      // Mock data
      const mockBoard: Board = {
        id: '1',
        name: 'Updated Board',
        description: 'New description',
        board_kind: 'public',
        state: 'active',
        updated_at: '2025-01-01'
      };
      
      // Setup mock
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { update_board: mockBoard }
      });
      
      // Execute
      const result = await service.updateBoard('1', {
        name: 'Updated Board',
        description: 'New description'
      });
      
      // Verify
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('mutation UpdateBoard'),
        {
          boardId: '1',
          name: 'Updated Board',
          description: 'New description'
        }
      );
      expect(result).toEqual(mockBoard);
    });
  });

  describe('deleteBoard', () => {
    it('should delete a board by ID', async () => {
      // Setup mock for getBoardById (used for cache invalidation)
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { boards: [{ id: '1', workspace_id: 'ws1' }] }
      });
      
      // Setup mock for deleteBoard
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { delete_board: { id: '1' } }
      });
      
      // Execute
      const result = await service.deleteBoard('1');
      
      // Verify
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('mutation DeleteBoard'),
        { boardId: '1' }
      );
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('getBoardActivity', () => {
    it('should fetch board activity from API when cache is empty', async () => {
      // Mock data
      const mockActivities: BoardActivity[] = [
        {
          id: 'a1',
          entity: 'board',
          event: 'create',
          created_at: '2025-01-01',
          user: { id: 'u1', name: 'User 1', email: 'user1@example.com' }
        }
      ];
      
      // Setup mock
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { boards: [{ activity_logs: mockActivities }] }
      });
      
      // Execute
      const result = await service.getBoardActivity('1');
      
      // Verify
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoardActivity'),
        { boardId: '1', limit: 50 }
      );
      expect(result).toEqual(mockActivities);
    });
  });

  describe('error handling', () => {
    it('should handle rate limit errors', async () => {
      // Setup mock
      const error = new (jest.mocked(executeQuery).mock.contexts[0].MondayTypes.RateLimitError)(
        'Rate limit exceeded',
        60
      );
      (executeQuery as jest.Mock).mockRejectedValueOnce(error);
      
      // Execute and verify
      await expect(service.getBoardById('1')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      // Setup mock
      const error = new (jest.mocked(executeQuery).mock.contexts[0].MondayTypes.AuthenticationError)(
        'Authentication failed'
      );
      (executeQuery as jest.Mock).mockRejectedValueOnce(error);
      
      // Execute and verify
      await expect(service.getBoardById('1')).rejects.toThrow('Authentication failed');
    });
  });

  describe('cache management', () => {
    it('should clear all caches when clearCache is called', async () => {
      // Mock data
      const mockBoards: Board[] = [{ id: '1', name: 'Board 1', board_kind: 'public', state: 'active' }];
      
      // Setup mock
      (executeQueryWithPagination as jest.Mock).mockResolvedValueOnce(mockBoards);
      
      // Populate cache
      await service.getBoards();
      
      // Clear cache
      service.clearCache();
      
      // Reset mock
      (executeQueryWithPagination as jest.Mock).mockClear();
      
      // Execute again
      await service.getBoards();
      
      // Verify cache was cleared and API was called again
      expect(executeQueryWithPagination).toHaveBeenCalled();
    });
  });
});