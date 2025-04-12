import { WorkspaceService } from '../../services/api/workspaceService';
import { executeQuery, executeQueryWithPagination, MondayTypes } from '../../services/api/mondayApi';
import { Workspace, WorkspaceUserRole } from '../../types/monday';

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

// Mock data
const mockWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'Workspace 1',
    description: 'Description 1',
    kind: 'open',
    state: 'active',
    created_at: '2023-01-01',
    updated_at: '2023-01-02',
    members_count: 5
  },
  {
    id: '2',
    name: 'Workspace 2',
    description: 'Description 2',
    kind: 'closed',
    state: 'active',
    created_at: '2023-02-01',
    updated_at: '2023-02-02',
    members_count: 10
  }
];

const mockWorkspaceUsers = [
  {
    id: 'wu1',
    user: {
      id: 'u1',
      name: 'User 1',
      email: 'user1@example.com',
      photo_url: 'https://example.com/photo1.jpg',
      title: 'Developer'
    },
    role: WorkspaceUserRole.ADMIN
  },
  {
    id: 'wu2',
    user: {
      id: 'u2',
      name: 'User 2',
      email: 'user2@example.com',
      photo_url: 'https://example.com/photo2.jpg',
      title: 'Designer'
    },
    role: WorkspaceUserRole.MEMBER
  }
];

describe('WorkspaceService', () => {
  let workspaceService: WorkspaceService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    workspaceService = new WorkspaceService();
  });

  describe('getWorkspaces', () => {
    it('should fetch workspaces successfully', async () => {
      // Mock the API response
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          workspaces: {
            cursor: null,
            items: mockWorkspaces
          }
        }
      });

      const result = await workspaceService.getWorkspaces();
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWorkspaces);
    });

    it('should handle pagination correctly', async () => {
      // Mock the first page response
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          workspaces: {
            cursor: 'next-page',
            items: [mockWorkspaces[0]]
          }
        }
      });

      // Mock the second page response
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          workspaces: {
            cursor: null,
            items: [mockWorkspaces[1]]
          }
        }
      });

      const result = await workspaceService.getWorkspaces();
      
      expect(executeQuery).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockWorkspaces);
    });

    it('should use cached data when available and valid', async () => {
      // Mock the API response for the first call
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          workspaces: {
            cursor: null,
            items: mockWorkspaces
          }
        }
      });

      // First call should hit the API
      await workspaceService.getWorkspaces();
      
      // Second call should use cache
      const result = await workspaceService.getWorkspaces();
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWorkspaces);
    });

    it('should handle API errors', async () => {
      const error = new MondayTypes.MondayApiError('API Error');
      (executeQuery as jest.Mock).mockRejectedValueOnce(error);

      await expect(workspaceService.getWorkspaces()).rejects.toThrow('API Error');
    });
  });

  describe('getWorkspaceById', () => {
    it('should fetch a workspace by ID successfully', async () => {
      const mockWorkspace = mockWorkspaces[0];
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          workspaces: [mockWorkspace]
        }
      });

      const result = await workspaceService.getWorkspaceById('1');
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWorkspace);
    });

    it('should return null if workspace not found', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          workspaces: []
        }
      });

      const result = await workspaceService.getWorkspaceById('999');
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should use cached data when available and valid', async () => {
      const mockWorkspace = mockWorkspaces[0];
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          workspaces: [mockWorkspace]
        }
      });

      // First call should hit the API
      await workspaceService.getWorkspaceById('1');
      
      // Second call should use cache
      const result = await workspaceService.getWorkspaceById('1');
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWorkspace);
    });
  });

  describe('createWorkspace', () => {
    it('should create a workspace successfully', async () => {
      const newWorkspace = {
        id: '3',
        name: 'New Workspace',
        description: 'New Description',
        kind: 'open',
        state: 'active'
      };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          create_workspace: newWorkspace
        }
      });

      const result = await workspaceService.createWorkspace(
        'New Workspace',
        'New Description'
      );
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual(newWorkspace);
    });
  });

  describe('updateWorkspace', () => {
    it('should update a workspace successfully', async () => {
      const updatedWorkspace = {
        id: '1',
        name: 'Updated Workspace',
        description: 'Updated Description',
        kind: 'open',
        state: 'active'
      };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          update_workspace: updatedWorkspace
        }
      });

      const result = await workspaceService.updateWorkspace('1', {
        name: 'Updated Workspace',
        description: 'Updated Description'
      });
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updatedWorkspace);
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete a workspace successfully', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          delete_workspace: { id: '1' }
        }
      });

      const result = await workspaceService.deleteWorkspace('1');
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('getWorkspaceUsers', () => {
    it('should fetch workspace users successfully', async () => {
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          workspace_users: {
            cursor: null,
            items: mockWorkspaceUsers
          }
        }
      });

      const result = await workspaceService.getWorkspaceUsers('1');
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWorkspaceUsers);
    });

    it('should handle pagination correctly', async () => {
      // Mock the first page response
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          workspace_users: {
            cursor: 'next-page',
            items: [mockWorkspaceUsers[0]]
          }
        }
      });

      // Mock the second page response
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          workspace_users: {
            cursor: null,
            items: [mockWorkspaceUsers[1]]
          }
        }
      });

      const result = await workspaceService.getWorkspaceUsers('1');
      
      expect(executeQuery).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockWorkspaceUsers);
    });
  });

  describe('addUserToWorkspace', () => {
    it('should add a user to a workspace successfully', async () => {
      const workspaceUser = mockWorkspaceUsers[0];
      
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          add_users_to_workspace: [workspaceUser]
        }
      });

      const result = await workspaceService.addUserToWorkspace(
        '1',
        'u1',
        WorkspaceUserRole.ADMIN
      );
      
      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(result).toEqual(workspaceUser);
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', async () => {
      // First, populate the cache
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          workspaces: {
            cursor: null,
            items: mockWorkspaces
          }
        }
      });
      
      await workspaceService.getWorkspaces();
      
      // Clear the cache
      workspaceService.clearCache();
      
      // Mock the API response for the second call
      (executeQuery as jest.Mock).mockResolvedValueOnce({
        data: {
          workspaces: {
            cursor: null,
            items: mockWorkspaces
          }
        }
      });
      
      // This should hit the API again
      await workspaceService.getWorkspaces();
      
      expect(executeQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      const error = new MondayTypes.RateLimitError('Rate limit exceeded', 60);
      (executeQuery as jest.Mock).mockRejectedValueOnce(error);

      await expect(workspaceService.getWorkspaces()).rejects.toThrow(/Rate limit exceeded/);
    });

    it('should handle authentication errors', async () => {
      const error = new MondayTypes.AuthenticationError('Authentication failed');
      (executeQuery as jest.Mock).mockRejectedValueOnce(error);

      await expect(workspaceService.getWorkspaces()).rejects.toThrow(/Authentication failed/);
    });

    it('should handle network errors', async () => {
      const error = new MondayTypes.NetworkError('Network error');
      (executeQuery as jest.Mock).mockRejectedValueOnce(error);

      await expect(workspaceService.getWorkspaces()).rejects.toThrow(/Network error/);
    });

    it('should handle general API errors', async () => {
      const error = new MondayTypes.MondayApiError('General API error');
      (executeQuery as jest.Mock).mockRejectedValueOnce(error);

      await expect(workspaceService.getWorkspaces()).rejects.toThrow(/General API error/);
    });

    it('should handle unknown errors', async () => {
      const error = new Error('Unknown error');
      (executeQuery as jest.Mock).mockRejectedValueOnce(error);

      await expect(workspaceService.getWorkspaces()).rejects.toThrow(/Failed to fetch workspaces/);
    });
  });
});