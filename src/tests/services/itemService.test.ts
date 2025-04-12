import { itemService } from '../../services/api/itemService';
import { executeQuery, executeQueryWithPagination, MondayLogger } from '../../services/api/mondayApi';
import { MondayTypes } from '../../services/api/mondayApi';

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
      constructor(message: string, public retryAfter?: number) {
        super(message);
        this.name = 'RateLimitError';
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
      constructor(message: string, public options?: any) {
        super(message);
        this.name = 'MondayApiError';
      }
    }
  }
}));

describe('ItemService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    itemService.clearCache();
  });

  describe('getItems', () => {
    it('should fetch items from a board', async () => {
      const mockItems = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ items: mockItems }]
        }
      });

      const result = await itemService.getItems('board123');
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('GetItems'),
        expect.objectContaining({ boardId: 'board123' })
      );
      expect(result).toEqual(mockItems);
    });

    it('should handle filtering options', async () => {
      const mockItems = [{ id: '1', name: 'Item 1' }];
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ items: mockItems }]
        }
      });

      const options = {
        limit: 10,
        page: 2,
        groupId: 'group123',
        columns: ['status', 'priority'],
        newestFirst: true
      };

      await itemService.getItems('board123', options);
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('GetItems'),
        expect.objectContaining({
          boardId: 'board123',
          limit: 10,
          page: 2,
          groupId: 'group123',
          columns: ['status', 'priority'],
          newestFirst: true
        })
      );
    });

    it('should return empty array when no boards are found', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { boards: [] }
      });

      const result = await itemService.getItems('board123');
      
      expect(result).toEqual([]);
    });

    it('should return empty array when no items are found', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { boards: [{ items: [] }] }
      });

      const result = await itemService.getItems('board123');
      
      expect(result).toEqual([]);
    });

    it('should use cached items when available and valid', async () => {
      const mockItems = [{ id: '1', name: 'Item 1' }];
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ items: mockItems }]
        }
      });

      // First call should hit the API
      await itemService.getItems('board123');
      
      // Second call should use cache
      await itemService.getItems('board123');
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(
        new MondayTypes.MondayApiError('API error')
      );

      await expect(itemService.getItems('board123')).rejects.toThrow('API error');
    });
  });

  describe('getItemById', () => {
    it('should fetch an item by ID', async () => {
      const mockItem = { id: '123', name: 'Test Item' };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          items: [mockItem]
        }
      });

      const result = await itemService.getItemById('123');
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('GetItemById'),
        expect.objectContaining({ itemId: '123' })
      );
      expect(result).toEqual(mockItem);
    });

    it('should return null when item is not found', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { items: [] }
      });

      const result = await itemService.getItemById('123');
      
      expect(result).toBeNull();
    });

    it('should use cached item when available and valid', async () => {
      const mockItem = { id: '123', name: 'Test Item' };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          items: [mockItem]
        }
      });

      // First call should hit the API
      await itemService.getItemById('123');
      
      // Second call should use cache
      await itemService.getItemById('123');
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('createItem', () => {
    it('should create a new item', async () => {
      const mockItem = { 
        id: '123', 
        name: 'New Item',
        board: { id: 'board123' },
        group: { id: 'group123', title: 'Group 1' }
      };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          create_item: mockItem
        }
      });

      const columnValues = { status: 'Done', priority: 'High' };
      const result = await itemService.createItem('board123', 'group123', 'New Item', columnValues);
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('CreateItem'),
        expect.objectContaining({
          boardId: 'board123',
          groupId: 'group123',
          itemName: 'New Item',
          columnValues: JSON.stringify(columnValues)
        })
      );
      expect(result).toEqual(mockItem);
    });
  });

  describe('updateItem', () => {
    it('should update an item', async () => {
      // Mock getItemById to return an item with board ID
      const mockItem = { 
        id: '123', 
        name: 'Test Item',
        board: { id: 'board123' }
      };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          items: [mockItem]
        }
      });

      // Mock the update response
      const mockUpdatedItem = { 
        id: '123', 
        name: 'Test Item',
        state: 'active',
        updated_at: '2023-01-01'
      };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          change_multiple_column_values: mockUpdatedItem
        }
      });

      const columnValues = { status: 'In Progress' };
      const result = await itemService.updateItem('123', columnValues);
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UpdateItem'),
        expect.objectContaining({
          itemId: '123',
          boardId: 'board123',
          columnValues: JSON.stringify(columnValues)
        })
      );
      expect(result).toEqual(mockUpdatedItem);
    });

    it('should throw error if item is not found', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { items: [] }
      });

      await expect(itemService.updateItem('123', {})).rejects.toThrow('Item with ID 123 not found');
    });
  });

  describe('moveItem', () => {
    it('should move an item to a different group', async () => {
      const mockMovedItem = { 
        id: '123',
        group: { id: 'new-group', title: 'New Group' }
      };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          move_item_to_group: mockMovedItem
        }
      });

      // Mock getItemById for cache invalidation
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          items: [{ id: '123', board: { id: 'board123' } }]
        }
      });

      const result = await itemService.moveItem('123', 'new-group');
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('MoveItemToGroup'),
        expect.objectContaining({
          itemId: '123',
          groupId: 'new-group'
        })
      );
      expect(result).toEqual(mockMovedItem);
    });
  });

  describe('deleteItem', () => {
    it('should delete an item', async () => {
      // Mock getItemById to return an item with board ID
      const mockItem = { 
        id: '123', 
        board: { id: 'board123' }
      };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          items: [mockItem]
        }
      });

      // Mock the delete response
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          delete_item: { id: '123' }
        }
      });

      const result = await itemService.deleteItem('123');
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('DeleteItem'),
        expect.objectContaining({
          itemId: '123'
        })
      );
      expect(result).toEqual({ id: '123' });
    });
  });

  describe('batchCreateItems', () => {
    it('should create multiple items at once', async () => {
      const mockItems = [
        { id: '1', name: 'Item 1', board: { id: 'board123' }, group: { id: 'group1' } },
        { id: '2', name: 'Item 2', board: { id: 'board123' }, group: { id: 'group2' } }
      ];
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          create_items: mockItems
        }
      });

      const itemsToCreate = [
        { name: 'Item 1', groupId: 'group1', columnValues: { status: 'New' } },
        { name: 'Item 2', groupId: 'group2', columnValues: { status: 'New' } }
      ];

      const result = await itemService.batchCreateItems('board123', itemsToCreate);
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('BatchCreateItems'),
        expect.objectContaining({
          boardId: 'board123',
          items: expect.arrayContaining([
            expect.objectContaining({
              group_id: 'group1',
              item_name: 'Item 1',
              column_values: JSON.stringify({ status: 'New' })
            }),
            expect.objectContaining({
              group_id: 'group2',
              item_name: 'Item 2',
              column_values: JSON.stringify({ status: 'New' })
            })
          ])
        })
      );
      expect(result).toEqual(mockItems);
    });

    it('should return empty array when no items are provided', async () => {
      const result = await itemService.batchCreateItems('board123', []);
      
      expect(executeQuery).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle rate limit errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(
        new MondayTypes.RateLimitError('Rate limit exceeded', 30)
      );

      await expect(itemService.getItems('board123')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(
        new MondayTypes.AuthenticationError('Authentication failed')
      );

      await expect(itemService.getItems('board123')).rejects.toThrow('Authentication failed');
    });

    it('should handle network errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(
        new MondayTypes.NetworkError('Network error')
      );

      await expect(itemService.getItems('board123')).rejects.toThrow('Network error');
    });

    it('should handle generic API errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(
        new MondayTypes.MondayApiError('API error')
      );

      await expect(itemService.getItems('board123')).rejects.toThrow('API error');
    });

    it('should handle unknown errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(new Error('Unknown error'));

      await expect(itemService.getItems('board123')).rejects.toThrow('Unknown error');
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', async () => {
      // Populate cache
      const mockItems = [{ id: '1', name: 'Item 1' }];
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ items: mockItems }]
        }
      });

      await itemService.getItems('board123');
      
      // Clear cache
      itemService.clearCache();
      
      // Should hit API again
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ items: mockItems }]
        }
      });
      
      await itemService.getItems('board123');
      
      expect(executeQuery).toHaveBeenCalledTimes(2);
    });
  });
});