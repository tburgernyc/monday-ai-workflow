import { groupService } from '../../services/api/groupService';
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

describe('GroupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    groupService.clearCache();
  });

  describe('getGroups', () => {
    it('should fetch groups from a board', async () => {
      const mockGroups = [
        { id: 'group1', title: 'Group 1', color: 'green', position: 0 },
        { id: 'group2', title: 'Group 2', color: 'blue', position: 1 }
      ];
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ groups: mockGroups }]
        }
      });

      const result = await groupService.getGroups('board123');
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('GetBoardGroups'),
        expect.objectContaining({ boardId: 'board123' })
      );
      expect(result).toEqual(mockGroups);
    });

    it('should return empty array when no boards are found', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { boards: [] }
      });

      const result = await groupService.getGroups('board123');
      
      expect(result).toEqual([]);
    });

    it('should return empty array when no groups are found', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { boards: [{ groups: [] }] }
      });

      const result = await groupService.getGroups('board123');
      
      expect(result).toEqual([]);
    });

    it('should use cached groups when available and valid', async () => {
      const mockGroups = [
        { id: 'group1', title: 'Group 1', color: 'green', position: 0 }
      ];
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ groups: mockGroups }]
        }
      });

      // First call should hit the API
      await groupService.getGroups('board123');
      
      // Second call should use cache
      await groupService.getGroups('board123');
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(
        new MondayTypes.MondayApiError('API error')
      );

      await expect(groupService.getGroups('board123')).rejects.toThrow('API error');
    });
  });

  describe('getGroupById', () => {
    it('should fetch a group by ID', async () => {
      const mockGroup = { id: 'group1', title: 'Group 1', color: 'green', position: 0 };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ groups: [mockGroup] }]
        }
      });

      const result = await groupService.getGroupById('board123', 'group1');
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('GetGroupById'),
        expect.objectContaining({ boardId: 'board123', groupId: 'group1' })
      );
      expect(result).toEqual(mockGroup);
    });

    it('should return null when group is not found', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: { boards: [{ groups: [] }] }
      });

      const result = await groupService.getGroupById('board123', 'group1');
      
      expect(result).toBeNull();
    });

    it('should use cached group when available and valid', async () => {
      const mockGroup = { id: 'group1', title: 'Group 1', color: 'green', position: 0 };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ groups: [mockGroup] }]
        }
      });

      // First call should hit the API
      await groupService.getGroupById('board123', 'group1');
      
      // Second call should use cache
      await groupService.getGroupById('board123', 'group1');
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('createGroup', () => {
    it('should create a new group', async () => {
      const mockGroup = { 
        id: 'new-group', 
        title: 'New Group',
        color: 'green',
        position: 2
      };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          create_group: mockGroup
        }
      });

      const result = await groupService.createGroup('board123', 'New Group');
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('CreateGroup'),
        expect.objectContaining({
          boardId: 'board123',
          groupName: 'New Group'
        })
      );
      expect(result).toEqual(mockGroup);
    });
  });

  describe('updateGroup', () => {
    it('should update a group', async () => {
      const mockUpdatedGroup = { 
        id: 'group1', 
        title: 'Updated Group',
        color: 'red',
        position: 0
      };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          update_group: mockUpdatedGroup
        }
      });

      const updateData = { title: 'Updated Group', color: 'red' };
      const result = await groupService.updateGroup('board123', 'group1', updateData);
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UpdateGroup'),
        expect.objectContaining({
          boardId: 'board123',
          groupId: 'group1',
          title: 'Updated Group',
          color: 'red'
        })
      );
      expect(result).toEqual(mockUpdatedGroup);
    });
  });

  describe('deleteGroup', () => {
    it('should delete a group', async () => {
      const mockDeleteResult = { id: 'group1', deleted: true };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          delete_group: mockDeleteResult
        }
      });

      const result = await groupService.deleteGroup('board123', 'group1');
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('DeleteGroup'),
        expect.objectContaining({
          boardId: 'board123',
          groupId: 'group1'
        })
      );
      expect(result).toEqual(mockDeleteResult);
    });
  });

  describe('reorderGroups', () => {
    it('should reorder groups in a board', async () => {
      const mockResult = { id: 'board123' };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          reorder_groups: mockResult
        }
      });

      const groupIds = ['group2', 'group1', 'group3'];
      const result = await groupService.reorderGroups('board123', groupIds);
      
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('ReorderGroups'),
        expect.objectContaining({
          boardId: 'board123',
          groupIds: groupIds
        })
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('error handling', () => {
    it('should handle rate limit errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(
        new MondayTypes.RateLimitError('Rate limit exceeded', 30)
      );

      await expect(groupService.getGroups('board123')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(
        new MondayTypes.AuthenticationError('Authentication failed')
      );

      await expect(groupService.getGroups('board123')).rejects.toThrow('Authentication failed');
    });

    it('should handle network errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(
        new MondayTypes.NetworkError('Network error')
      );

      await expect(groupService.getGroups('board123')).rejects.toThrow('Network error');
    });

    it('should handle generic API errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(
        new MondayTypes.MondayApiError('API error')
      );

      await expect(groupService.getGroups('board123')).rejects.toThrow('API error');
    });

    it('should handle unknown errors', async () => {
      (executeQuery as jest.Mock).mockRejectedValueOnce(new Error('Unknown error'));

      await expect(groupService.getGroups('board123')).rejects.toThrow('Unknown error');
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', async () => {
      // Populate cache
      const mockGroups = [
        { id: 'group1', title: 'Group 1', color: 'green', position: 0 }
      ];
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ groups: mockGroups }]
        }
      });

      await groupService.getGroups('board123');
      
      // Clear cache
      groupService.clearCache();
      
      // Should hit API again
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          boards: [{ groups: mockGroups }]
        }
      });
      
      await groupService.getGroups('board123');
      
      expect(executeQuery).toHaveBeenCalledTimes(2);
    });
  });
});