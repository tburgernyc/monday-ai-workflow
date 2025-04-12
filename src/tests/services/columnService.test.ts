import { columnService } from '../../services/api/columnService';
import { executeQuery } from '../../services/api/mondayApi';
import { ColumnType } from '../../types/columnTypes';

// Mock the mondayApi module
jest.mock('../../services/api/mondayApi', () => ({
  executeQuery: jest.fn(),
  MondayLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  MondayTypes: {
    MondayApiError: class MondayApiError extends Error {
      constructor(message: string, options?: any) {
        super(message);
        this.name = 'MondayApiError';
      }
    },
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
    }
  }
}));

describe('ColumnService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    columnService.clearCache();
  });

  describe('getColumns', () => {
    it('should fetch columns for a board', async () => {
      const mockColumns = [
        { id: 'col1', title: 'Status', type: 'status', settings_str: '{"labels":[]}' },
        { id: 'col2', title: 'Date', type: 'date', settings_str: '{}' }
      ];

      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ columns: mockColumns }]
        }
      });

      const result = await columnService.getColumns('board123');
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('GetColumns'),
        { boardId: 'board123' }
      );
      expect(result).toEqual(mockColumns);
    });

    it('should return empty array if board not found', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { boards: [] }
      });

      const result = await columnService.getColumns('nonexistent');
      
      expect(result).toEqual([]);
    });

    it('should use cached data when available', async () => {
      const mockColumns = [
        { id: 'col1', title: 'Status', type: 'status', settings_str: '{"labels":[]}' }
      ];

      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ columns: mockColumns }]
        }
      });

      // First call should hit the API
      await columnService.getColumns('board123');
      
      // Second call should use cache
      await columnService.getColumns('board123');
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('getColumnById', () => {
    it('should fetch a specific column by ID', async () => {
      const mockColumn = { 
        id: 'col1', 
        title: 'Status', 
        type: 'status', 
        settings_str: '{"labels":[]}' 
      };

      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ columns: [mockColumn] }]
        }
      });

      const result = await columnService.getColumnById('col1', 'board123');
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('GetColumnById'),
        { boardId: 'board123', columnId: 'col1' }
      );
      expect(result).toEqual(mockColumn);
    });

    it('should return null if column not found', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { boards: [{ columns: [] }] }
      });

      const result = await columnService.getColumnById('nonexistent', 'board123');
      
      expect(result).toBeNull();
    });
  });

  describe('createColumn', () => {
    it('should create a new column', async () => {
      const mockColumn = { 
        id: 'new-col', 
        title: 'New Column', 
        type: 'text' 
      };

      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          create_column: mockColumn
        }
      });

      const result = await columnService.createColumn(
        'board123',
        'New Column',
        ColumnType.TEXT
      );
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('CreateColumn'),
        expect.objectContaining({
          boardId: 'board123',
          title: 'New Column',
          columnType: 'text'
        })
      );
      expect(result).toEqual(mockColumn);
    });

    it('should create a column with settings', async () => {
      const mockColumn = { 
        id: 'new-col', 
        title: 'Status Column', 
        type: 'status' 
      };

      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          create_column: mockColumn
        }
      });

      const settings = {
        labels: [
          { id: 'label1', name: 'Done', color: '#00FF00' },
          { id: 'label2', name: 'Working on it', color: '#FFFF00' }
        ]
      };

      await columnService.createColumn(
        'board123',
        'Status Column',
        ColumnType.STATUS,
        settings
      );
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('CreateColumn'),
        expect.objectContaining({
          defaults: JSON.stringify(settings)
        })
      );
    });
  });

  describe('updateColumn', () => {
    it('should update a column', async () => {
      const mockUpdatedColumn = { 
        id: 'col1', 
        title: 'Updated Title', 
        type: 'status', 
        settings_str: '{"labels":[]}' 
      };

      // Mock for the update mutation
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          change_column_title: { id: 'col1', title: 'Updated Title' },
          change_column_metadata: { id: 'col1', settings_str: '{"labels":[]}' }
        }
      });

      // Mock for the getColumnById call that happens after update
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ columns: [mockUpdatedColumn] }]
        }
      });

      const result = await columnService.updateColumn(
        'col1',
        'board123',
        { title: 'Updated Title' }
      );
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UpdateColumn'),
        expect.objectContaining({
          boardId: 'board123',
          columnId: 'col1',
          title: 'Updated Title'
        })
      );
      expect(result).toEqual(mockUpdatedColumn);
    });
  });

  describe('deleteColumn', () => {
    it('should delete a column', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          delete_column: { id: 'col1' }
        }
      });

      const result = await columnService.deleteColumn('col1', 'board123');
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('DeleteColumn'),
        {
          boardId: 'board123',
          columnId: 'col1'
        }
      );
      expect(result).toEqual({ id: 'col1' });
    });
  });

  describe('reorderColumns', () => {
    it('should reorder columns', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { id: 'board123' }
      });

      const columnIds = ['col2', 'col1', 'col3'];
      const result = await columnService.reorderColumns('board123', columnIds);
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('ReorderColumns'),
        {
          boardId: 'board123',
          columnIds
        }
      );
      expect(result).toBe(true);
    });
  });

  describe('getColumnValues', () => {
    it('should get values for a status column', async () => {
      const mockColumn = { 
        id: 'col1', 
        title: 'Status', 
        type: 'status', 
        settings_str: JSON.stringify({
          labels: [
            { id: 'label1', name: 'Done', color: '#00FF00' },
            { id: 'label2', name: 'Working on it', color: '#FFFF00' }
          ]
        })
      };

      // Mock for getColumnById
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ columns: [mockColumn] }]
        }
      });

      const result = await columnService.getColumnValues('col1', 'board123');
      
      expect(result).toEqual([
        { id: 'label1', value: 'Done', color: '#00FF00' },
        { id: 'label2', value: 'Working on it', color: '#FFFF00' }
      ]);
    });

    it('should return empty array for non-status/dropdown columns', async () => {
      const mockColumn = { 
        id: 'col1', 
        title: 'Text', 
        type: 'text', 
        settings_str: '{}'
      };

      // Mock for getColumnById
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ columns: [mockColumn] }]
        }
      });

      const result = await columnService.getColumnValues('col1', 'board123');
      
      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(
        new Error('API error')
      );

      await expect(columnService.getColumns('board123')).rejects.toThrow();
    });
  });
});