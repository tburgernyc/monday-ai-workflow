import mondaySdk from 'monday-sdk-js';
import Bottleneck from 'bottleneck';

// Define TypeScript types for API responses and parameters
export namespace MondayTypes {
  // Common types
  export interface ApiResponse<T = unknown> {
    data: T;
    account_id?: number;
    errors?: ApiError[];
  }

  export interface ApiError {
    message: string;
    status: number;
    locations?: { line: number; column: number }[];
    path?: string[];
    extensions?: Record<string, unknown>;
  }

  export interface PaginationOptions {
    limit?: number;
    page?: number;
  }

  // Error types
  export class MondayApiError extends Error {
    status?: number;
    errors?: ApiError[];
    query?: string;
    variables?: Record<string, unknown>;

    constructor(message: string, options?: {
      status?: number;
      errors?: ApiError[];
      query?: string;
      variables?: Record<string, unknown>;
    }) {
      super(message);
      this.name = 'MondayApiError';
      this.status = options?.status;
      this.errors = options?.errors;
      this.query = options?.query;
      this.variables = options?.variables;
    }
  }

  export class RateLimitError extends MondayApiError {
    retryAfter?: number;

    constructor(message: string, retryAfter?: number) {
      super(message, { status: 429 });
      this.name = 'RateLimitError';
      this.retryAfter = retryAfter;
    }
  }

  export class AuthenticationError extends MondayApiError {
    constructor(message: string) {
      super(message, { status: 401 });
      this.name = 'AuthenticationError';
    }
  }

  export class NetworkError extends MondayApiError {
    constructor(message: string) {
      super(message, { status: 0 });
      this.name = 'NetworkError';
    }
  }
}

// Logger for debugging and monitoring
export class MondayLogger {
  private static logLevel: 'debug' | 'info' | 'warn' | 'error' =
    process.env.REACT_APP_ENV === 'development' ? 'debug' : 'warn';

  static setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level;
  }

  static debug(message: string, data?: unknown): void {
    if (this.logLevel === 'debug') {
      console.debug(`[Monday SDK] ${message}`, data || '');
    }
  }

  static info(message: string, data?: unknown): void {
    if (this.logLevel === 'debug' || this.logLevel === 'info') {
      console.info(`[Monday SDK] ${message}`, data || '');
    }
  }

  static warn(message: string, data?: unknown): void {
    if (this.logLevel === 'debug' || this.logLevel === 'info' || this.logLevel === 'warn') {
      console.warn(`[Monday SDK] ${message}`, data || '');
    }
  }

  static error(message: string, error?: unknown): void {
    console.error(`[Monday SDK] ${message}`, error || '');
  }
}

// Initialize the SDK
const monday = mondaySdk();

// Configure rate limiting to prevent API throttling
// monday.com has rate limits of 60 requests per minute
const limiter = new Bottleneck({
  maxConcurrent: 10, // Maximum number of requests running at the same time
  minTime: 100, // Minimum time between requests (in ms)
  reservoir: 60, // Number of requests allowed per minute
  reservoirRefreshInterval: 60 * 1000, // Refresh interval in ms (1 minute)
  reservoirRefreshAmount: 60, // Number of requests to add on each refresh
});

// Add events for monitoring rate limiting
limiter.on('failed', (error, jobInfo) => {
  MondayLogger.warn(`Rate limit job failed (attempt ${jobInfo.retryCount})`, error);
});

limiter.on('depleted', () => {
  MondayLogger.warn('Rate limit reservoir depleted. Requests will be queued.');
});

// Token setup function with error handling
export const initializeMonday = (token: string): any => {
  try {
    if (!token || token.trim() === '') {
      throw new MondayTypes.AuthenticationError('API token cannot be empty');
    }
    
    monday.setToken(token);
    MondayLogger.info('Monday SDK initialized with token');
    return monday;
  } catch (error) {
    MondayLogger.error('Failed to initialize Monday SDK', error);
    throw error;
  }
};

// Set token from environment if available
if (process.env.REACT_APP_MONDAY_API_TOKEN) {
  try {
    monday.setToken(process.env.REACT_APP_MONDAY_API_TOKEN);
    MondayLogger.info('Monday SDK initialized with token from environment');
  } catch (error) {
    MondayLogger.error('Failed to set token from environment', error);
  }
}

// Create a wrapper for API calls with rate limiting and comprehensive error handling
export const executeQuery = async <T = unknown>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<MondayTypes.ApiResponse<T>> => {
  MondayLogger.debug('Executing query', { query, variables });
  
  try {
    // Use the limiter to prevent hitting rate limits
    const response = await limiter.schedule(() => monday.api(query, { variables }));
    
    // Check for errors in the response
    const apiResponse = response as MondayTypes.ApiResponse<T> & { 
      errors?: Array<{ message: string; status?: number }>;
      headers?: Record<string, string>;
    };
    
    if (apiResponse.errors && Array.isArray(apiResponse.errors) && apiResponse.errors.length > 0) {
      const errorMessages = apiResponse.errors.map(e => e.message).join('; ');
      
      // Check for specific error types
      if (apiResponse.errors.some(e => e.status === 429 || e.message.includes('rate limit'))) {
        throw new MondayTypes.RateLimitError(
          `Rate limit exceeded: ${errorMessages}`,
          parseInt(apiResponse.headers?.['retry-after'] || '60', 10)
        );
      }
      
      if (apiResponse.errors.some(e => e.status === 401 || e.message.includes('authentication'))) {
        throw new MondayTypes.AuthenticationError(`Authentication failed: ${errorMessages}`);
      }
      
      throw new MondayTypes.MondayApiError(errorMessages, {
        errors: apiResponse.errors as MondayTypes.ApiError[],
        query,
        variables
      });
    }
    
    MondayLogger.debug('Query executed successfully', {
      dataKeys: response.data ? Object.keys(response.data) : []
    });
    
    return response as MondayTypes.ApiResponse<T>;
  } catch (error: unknown) {
    // Handle network errors
    if (error instanceof Error) {
      if (error.name === 'NetworkError' || error.message.includes('network')) {
        throw new MondayTypes.NetworkError(`Network error: ${error.message}`);
      }
    }
    
    // If it's already a MondayApiError, just rethrow it
    if (error instanceof MondayTypes.MondayApiError) {
      throw error;
    }
    
    // Otherwise, wrap it in a MondayApiError
    MondayLogger.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new MondayTypes.MondayApiError(`API Error: ${errorMessage}`, {
      query,
      variables
    });
  }
};

// Helper for pagination with improved typing and error handling
export const executeQueryWithPagination = async <T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  itemsPath: string, // The path to the items array in the response (e.g., 'data.boards')
  limit: number = 100
): Promise<T[]> => {
  MondayLogger.debug('Executing paginated query', { query, variables, itemsPath, limit });
  
  let allItems: T[] = [];
  let page = 1;
  let hasMoreItems = true;
  let totalPages = 0;

  try {
    while (hasMoreItems) {
      const paginatedVariables = {
        ...variables,
        limit,
        page,
      };

      MondayLogger.debug(`Fetching page ${page}`, { paginatedVariables });
      const response = await executeQuery(query, paginatedVariables);
      totalPages++;
      
      // Navigate to the specified path to get the items
      const pathParts = itemsPath.split('.');
      let items: unknown = response;
      for (const part of pathParts) {
        if (items && typeof items === 'object') {
          items = (items as Record<string, unknown>)[part] || [];
        } else {
          items = [];
          break;
        }
      }

      if (Array.isArray(items) && items.length > 0) {
        MondayLogger.debug(`Retrieved ${items.length} items from page ${page}`);
        allItems = [...allItems, ...items as T[]];
        page++;
      } else {
        hasMoreItems = false;
      }

      // Safety check - if we've retrieved a lot of pages, break to prevent infinite loops
      if (page > 100) {
        MondayLogger.warn('Pagination safety limit reached. There might be more items.');
        break;
      }
    }

    MondayLogger.info(`Pagination complete. Retrieved ${allItems.length} items from ${totalPages} pages.`);
    return allItems;
  } catch (error: unknown) {
    MondayLogger.error('Error during paginated query', error);
    throw error;
  }
};

// Common API operations
export const MondayApi = {
  // User operations
  users: {
    // Get current user information
    me: async (): Promise<any> => {
      const query = `query { me { id name email url photo_url title account { id name } } }`;
      const response = await executeQuery<{ me: any }>(query);
      return response.data.me;
    },
    
    // Get a list of users
    getAll: async (options: MondayTypes.PaginationOptions = {}): Promise<any[]> => {
      const { limit = 100, page = 1 } = options;
      const query = `
        query GetUsers($limit: Int, $page: Int) {
          users(limit: $limit, page: $page) {
            id
            name
            email
            url
            photo_url
            title
          }
        }
      `;
      return executeQueryWithPagination<any>(
        query,
        { limit, page },
        'data.users',
        limit
      );
    }
  },
  
  // Board operations
  boards: {
    // Get all boards
    getAll: async (options: {
      limit?: number;
      page?: number;
      workspaceId?: string;
    } = {}): Promise<any[]> => {
      const { limit = 100, page = 1, workspaceId } = options;
      const query = `
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
          }
        }
      `;
      return executeQueryWithPagination<any>(
        query,
        { limit, page, workspaceId },
        'data.boards',
        limit
      );
    },
    
    // Get a board by ID
    getById: async (id: string): Promise<any | null> => {
      const query = `
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
      `;
      const response = await executeQuery<{ boards: any[] }>(query, { id });
      const boards = response.data.boards || [];
      return boards.length > 0 ? boards[0] : null;
    },
    
    // Create a new board
    create: async (
      name: string,
      options: {
        boardKind?: string;
        workspaceId?: string;
        templateId?: string;
      } = {}
    ): Promise<any> => {
      const { boardKind = 'public', workspaceId, templateId } = options;
      const query = `
        mutation CreateBoard($name: String!, $boardKind: BoardKind, $workspaceId: ID, $templateId: ID) {
          create_board(board_name: $name, board_kind: $boardKind, workspace_id: $workspaceId, template_id: $templateId) {
            id
            name
            board_kind
            workspace_id
          }
        }
      `;
      const response = await executeQuery<{ create_board: any }>(
        query,
        { name, boardKind, workspaceId, templateId }
      );
      return response.data.create_board;
    },
    
    // Update a board
    update: async (
      boardId: string,
      data: { name?: string; description?: string }
    ): Promise<any> => {
      const query = `
        mutation UpdateBoard($boardId: ID!, $name: String, $description: String) {
          update_board(board_id: $boardId, board_name: $name, board_description: $description) {
            id
            name
            description
          }
        }
      `;
      const response = await executeQuery<{ update_board: any }>(
        query,
        { boardId, ...data }
      );
      return response.data.update_board;
    },
    
    // Delete a board
    delete: async (boardId: string): Promise<{ id: string }> => {
      const query = `
        mutation DeleteBoard($boardId: ID!) {
          delete_board(board_id: $boardId) {
            id
          }
        }
      `;
      const response = await executeQuery<{ delete_board: { id: string } }>(query, { boardId });
      return response.data.delete_board;
    }
  },
  
  // Group operations
  groups: {
    // Get groups in a board
    getByBoardId: async (boardId: string): Promise<any[]> => {
      const query = `
        query GetBoardGroups($boardId: ID!) {
          boards(ids: [$boardId]) {
            groups {
              id
              title
              color
              position
            }
          }
        }
      `;
      const response = await executeQuery<{ boards: Array<{ groups: any[] }> }>(query, { boardId });
      const boards = response.data.boards || [];
      return boards.length > 0 ? boards[0].groups || [] : [];
    },
    
    // Create a group in a board
    create: async (boardId: string, groupName: string): Promise<{ id: string; title: string }> => {
      const query = `
        mutation CreateGroup($boardId: ID!, $groupName: String!) {
          create_group(board_id: $boardId, group_name: $groupName) {
            id
            title
          }
        }
      `;
      const response = await executeQuery<{ create_group: { id: string; title: string } }>(query, { boardId, groupName });
      return response.data.create_group;
    },
    
    // Delete a group
    delete: async (boardId: string, groupId: string): Promise<{ id: string }> => {
      const query = `
        mutation DeleteGroup($boardId: ID!, $groupId: String!) {
          delete_group(board_id: $boardId, group_id: $groupId) {
            id
          }
        }
      `;
      const response = await executeQuery<{ delete_group: { id: string } }>(query, { boardId, groupId });
      return response.data.delete_group;
    }
  },
  
  // Item operations
  items: {
    // Get items in a board
    getByBoardId: async (
      boardId: string,
      options: {
        limit?: number;
        page?: number;
        groupId?: string;
        columns?: string[];
      } = {}
    ): Promise<any[]> => {
      const { limit = 100, page = 1, groupId, columns = [] } = options;
      
      // Build the query with optional columns
      let columnsQuery = '';
      if (columns.length > 0) {
        columnsQuery = `
          column_values(ids: [${columns.map(c => `"${c}"`).join(', ')}]) {
            id
            text
            value
          }
        `;
      } else {
        columnsQuery = `
          column_values {
            id
            text
            value
          }
        `;
      }
      
      const query = `
        query GetBoardItems($boardId: ID!, $limit: Int, $page: Int, $groupId: String) {
          boards(ids: [$boardId]) {
            items(limit: $limit, page: $page, group_id: $groupId) {
              id
              name
              group {
                id
                title
              }
              ${columnsQuery}
            }
          }
        }
      `;
      
      const response = await executeQuery<{ boards: Array<{ items: any[] }> }>(
        query,
        { boardId, limit, page, groupId }
      );
      
      const boards = response.data.boards || [];
      return boards.length > 0 ? boards[0].items || [] : [];
    },
    
    // Get an item by ID
    getById: async (itemId: string): Promise<any | null> => {
      const query = `
        query GetItemById($itemId: ID!) {
          items(ids: [$itemId]) {
            id
            name
            group {
              id
              title
            }
            column_values {
              id
              text
              value
            }
          }
        }
      `;
      const response = await executeQuery<{ items: any[] }>(query, { itemId });
      const items = response.data.items || [];
      return items.length > 0 ? items[0] : null;
    },
    
    // Create a new item
    create: async (
      boardId: string,
      groupId: string,
      itemName: string,
      columnValues: Record<string, unknown> = {}
    ): Promise<any> => {
      const query = `
        mutation CreateItem($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON) {
          create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $columnValues) {
            id
            name
          }
        }
      `;
      
      const response = await executeQuery<{ create_item: any }>(
        query,
        {
          boardId,
          groupId,
          itemName,
          columnValues: JSON.stringify(columnValues)
        }
      );
      
      return response.data.create_item;
    },
    
    // Update an item
    update: async (
      itemId: string,
      columnValues: Record<string, unknown> = {}
    ): Promise<any> => {
      const query = `
        mutation UpdateItem($itemId: ID!, $columnValues: JSON!) {
          change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $columnValues) {
            id
            name
          }
        }
      `;
      
      const response = await executeQuery<{ change_multiple_column_values: any }>(
        query,
        {
          itemId,
          columnValues: JSON.stringify(columnValues)
        }
      );
      
      return response.data.change_multiple_column_values;
    },
    
    // Delete an item
    delete: async (itemId: string): Promise<{ id: string }> => {
      const query = `
        mutation DeleteItem($itemId: ID!) {
          delete_item(item_id: $itemId) {
            id
          }
        }
      `;
      
      const response = await executeQuery<{ delete_item: { id: string } }>(query, { itemId });
      return response.data.delete_item;
    }
  },
  
  // Workspace operations
  workspaces: {
    // Get all workspaces
    getAll: async (options: MondayTypes.PaginationOptions = {}): Promise<any[]> => {
      const { limit = 100, page = 1 } = options;
      const query = `
        query GetWorkspaces($limit: Int, $page: Int) {
          workspaces(limit: $limit, page: $page) {
            id
            name
            description
            kind
            state
            created_at
            updated_at
          }
        }
      `;
      return executeQueryWithPagination<any>(
        query,
        { limit, page },
        'data.workspaces',
        limit
      );
    },
    
    // Get a workspace by ID
    getById: async (id: string): Promise<any | null> => {
      const query = `
        query GetWorkspaceById($id: ID!) {
          workspaces(ids: [$id]) {
            id
            name
            description
            kind
            state
            created_at
            updated_at
          }
        }
      `;
      const response = await executeQuery<{ workspaces: any[] }>(query, { id });
      const workspaces = response.data.workspaces || [];
      return workspaces.length > 0 ? workspaces[0] : null;
    },
    
    // Create a new workspace
    create: async (
      name: string,
      kind: string = 'open',
      description?: string
    ): Promise<any> => {
      const query = `
        mutation CreateWorkspace($name: String!, $kind: String!, $description: String) {
          create_workspace(workspace_name: $name, workspace_kind: $kind, description: $description) {
            id
            name
            description
            kind
            state
          }
        }
      `;
      const response = await executeQuery<{ create_workspace: any }>(
        query,
        { name, kind, description }
      );
      return response.data.create_workspace;
    }
  }
};

export default MondayApi;