import { executeQuery, MondayLogger } from './mondayApi';
import { Column } from '../../types/monday';
import { 
  ColumnType, 
  ColumnUpdateInput, 
  ColumnValueOption,
  ColumnSettings,
  CacheItem
} from '../../types/columnTypes';
import { MondayTypes } from './mondayApi';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * ColumnService class for managing Monday.com board columns
 * 
 * This service provides methods to interact with Monday.com columns,
 * including fetching, creating, updating, and deleting columns,
 * as well as managing column values and reordering columns.
 */
export class ColumnService {
  private cache: {
    columnsByBoard: Map<string, CacheItem<Column[]>>;
    columnById: Map<string, CacheItem<Column>>;
    columnValuesByColumn: Map<string, CacheItem<ColumnValueOption[]>>;
  };

  // GraphQL queries and mutations
  private readonly QUERIES = {
    GET_COLUMNS: `
      query GetColumns($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns {
            id
            title
            type
            settings_str
            archived
            width
          }
        }
      }
    `,

    GET_COLUMN_BY_ID: `
      query GetColumnById($boardId: ID!, $columnId: String!) {
        boards(ids: [$boardId]) {
          columns(ids: [$columnId]) {
            id
            title
            type
            settings_str
            archived
            width
          }
        }
      }
    `,

    CREATE_COLUMN: `
      mutation CreateColumn($boardId: ID!, $title: String!, $columnType: ColumnType!, $defaults: JSON) {
        create_column(board_id: $boardId, title: $title, column_type: $columnType, defaults: $defaults) {
          id
          title
          type
          settings_str
          width
        }
      }
    `,

    UPDATE_COLUMN: `
      mutation UpdateColumn($boardId: ID!, $columnId: String!, $title: String, $defaults: JSON) {
        change_column_title(board_id: $boardId, column_id: $columnId, title: $title) {
          id
          title
        }
        change_column_metadata(board_id: $boardId, column_id: $columnId, column_metadata: $defaults) {
          id
          settings_str
        }
      }
      }
    `,

    DELETE_COLUMN: `
      mutation DeleteColumn($boardId: ID!, $columnId: String!) {
        delete_column(board_id: $boardId, column_id: $columnId) {
          id
        }
      }
    `,

    GET_COLUMN_VALUES: `
      query GetColumnValues($boardId: ID!, $columnId: String!) {
        boards(ids: [$boardId]) {
          columns(ids: [$columnId]) {
            settings_str
          }
        }
      }
    `,

    REORDER_COLUMNS: `
      mutation ReorderColumns($boardId: ID!, $columnIds: [String!]!) {
        duplicate_group(board_id: $boardId, column_ids: $columnIds) {
          id
        }
      }
    `
  };

  /**
   * Constructor initializes the cache
   */
  constructor() {
    this.cache = {
      columnsByBoard: new Map<string, CacheItem<Column[]>>(),
      columnById: new Map<string, CacheItem<Column>>(),
      columnValuesByColumn: new Map<string, CacheItem<ColumnValueOption[]>>()
    };
  }

  /**
   * Checks if a cached item is still valid
   * @param item The cached item to check
   * @returns True if the item is valid, false otherwise
   */
  private isCacheValid<T>(item?: CacheItem<T>): boolean {
    if (!item) return false;
    return Date.now() - item.timestamp < CACHE_TTL;
  }

  /**
   * Parses column settings from settings_str
   * @param column The column object with settings_str
   * @returns Parsed settings object
   */
  private parseColumnSettings(column: Column): ColumnSettings {
    try {
      if (!column.settings_str) return {};
      return JSON.parse(column.settings_str) as ColumnSettings;
    } catch (error) {
      MondayLogger.warn(`Failed to parse column settings for column ${column.id}`, error);
      return {};
    }
  }

  /**
   * Fetches all columns in a board
   * @param boardId The ID of the board
   * @returns Promise resolving to an array of Column objects
   */
  public async getColumns(boardId: string): Promise<Column[]> {
    try {
      // Check cache first
      const cacheKey = boardId;
      const cachedColumns = this.cache.columnsByBoard.get(cacheKey);
      if (this.isCacheValid(cachedColumns)) {
        MondayLogger.debug(`Using cached columns for board ID ${boardId}`);
        return cachedColumns!.data;
      }

      MondayLogger.debug(`Fetching columns for board ID ${boardId} from API`);
      
      const response = await executeQuery<{ boards: Array<{ columns: Column[] }> }>(
        this.QUERIES.GET_COLUMNS,
        { boardId }
      );

      const boards = response.data.boards || [];
      const columns = boards.length > 0 ? boards[0].columns || [] : [];

      // Update cache
      this.cache.columnsByBoard.set(cacheKey, {
        data: columns,
        timestamp: Date.now()
      });

      // Also cache individual columns
      columns.forEach(column => {
        this.cache.columnById.set(`${boardId}-${column.id}`, {
          data: column,
          timestamp: Date.now()
        });
      });

      return columns;
    } catch (error) {
      MondayLogger.error(`Error fetching columns for board ${boardId}:`, error);
      this.handleApiError(error, `Failed to fetch columns for board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Fetches a specific column by ID
   * @param id The ID of the column
   * @param boardId The ID of the board containing the column
   * @returns Promise resolving to a Column object or null if not found
   */
  public async getColumnById(id: string, boardId: string): Promise<Column | null> {
    try {
      // Check cache first
      const cacheKey = `${boardId}-${id}`;
      const cachedColumn = this.cache.columnById.get(cacheKey);
      if (this.isCacheValid(cachedColumn)) {
        MondayLogger.debug(`Using cached column for ID ${id}`);
        return cachedColumn!.data;
      }

      MondayLogger.debug(`Fetching column with ID ${id} from API`);
      
      const response = await executeQuery<{ boards: Array<{ columns: Column[] }> }>(
        this.QUERIES.GET_COLUMN_BY_ID,
        { boardId, columnId: id }
      );

      const boards = response.data.boards || [];
      const columns = boards.length > 0 ? boards[0].columns || [] : [];
      const column = columns.length > 0 ? columns[0] : null;

      if (column) {
        // Update cache
        this.cache.columnById.set(cacheKey, {
          data: column,
          timestamp: Date.now()
        });
      }

      return column;
    } catch (error) {
      MondayLogger.error(`Error fetching column with ID ${id}:`, error);
      this.handleApiError(error, `Failed to fetch column with ID ${id}`);
      throw error;
    }
  }

  /**
   * Creates a new column in a board
   * @param boardId The ID of the board
   * @param title The title of the column
   * @param columnType The type of column to create
   * @param settings Optional settings for the column
   * @returns Promise resolving to the created Column object
   */
  public async createColumn(
    boardId: string,
    title: string,
    columnType: ColumnType,
    settings?: ColumnSettings
  ): Promise<Column> {
    try {
      MondayLogger.debug(`Creating new column in board ${boardId}`, { title, columnType, settings });
      
      const response = await executeQuery<{ create_column: Column }>(
        this.QUERIES.CREATE_COLUMN,
        { 
          boardId, 
          title, 
          columnType, 
          defaults: settings ? JSON.stringify(settings) : undefined 
        }
      );

      const column = response.data.create_column;

      // Invalidate board columns cache
      this.cache.columnsByBoard.delete(boardId);

      return column;
    } catch (error) {
      MondayLogger.error(`Error creating column in board ${boardId}:`, error);
      this.handleApiError(error, `Failed to create column in board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Updates an existing column
   * @param columnId The ID of the column to update
   * @param boardId The ID of the board containing the column
   * @param data Object containing the properties to update
   * @returns Promise resolving to the updated Column object
   */
  public async updateColumn(
    columnId: string,
    boardId: string,
    data: Partial<ColumnUpdateInput>
  ): Promise<Column> {
    try {
      MondayLogger.debug(`Updating column with ID ${columnId}`, data);
      
      const response = await executeQuery<{ 
        change_column_title: { id: string; title: string }; 
        change_column_metadata: { id: string; settings_str: string } 
      }>(
        this.QUERIES.UPDATE_COLUMN,
        { 
          boardId, 
          columnId, 
          title: data.title, 
          defaults: data.settings ? JSON.stringify(data.settings) : undefined 
        }
      );

      // Get the updated column to return
      const updatedColumn = await this.getColumnById(columnId, boardId);
      
      if (!updatedColumn) {
        throw new Error(`Column with ID ${columnId} not found after update`);
      }

      // Invalidate caches
      this.cache.columnsByBoard.delete(boardId);
      this.cache.columnById.delete(`${boardId}-${columnId}`);
      this.cache.columnValuesByColumn.delete(`${boardId}-${columnId}`);

      return updatedColumn;
    } catch (error) {
      MondayLogger.error(`Error updating column with ID ${columnId}:`, error);
      this.handleApiError(error, `Failed to update column with ID ${columnId}`);
      throw error;
    }
  }

  /**
   * Deletes a column
   * @param columnId The ID of the column to delete
   * @param boardId The ID of the board containing the column
   * @returns Promise resolving to an object containing the deleted column ID
   */
  public async deleteColumn(columnId: string, boardId: string): Promise<{ id: string }> {
    try {
      MondayLogger.debug(`Deleting column with ID ${columnId} from board ${boardId}`);
      
      const response = await executeQuery<{ delete_column: { id: string } }>(
        this.QUERIES.DELETE_COLUMN,
        { boardId, columnId }
      );

      // Invalidate caches
      this.cache.columnsByBoard.delete(boardId);
      this.cache.columnById.delete(`${boardId}-${columnId}`);
      this.cache.columnValuesByColumn.delete(`${boardId}-${columnId}`);

      return response.data.delete_column;
    } catch (error) {
      MondayLogger.error(`Error deleting column with ID ${columnId}:`, error);
      this.handleApiError(error, `Failed to delete column with ID ${columnId}`);
      throw error;
    }
  }

  /**
   * Reorders columns in a board
   * @param boardId The ID of the board
   * @param columnIds Array of column IDs in the desired order
   * @returns Promise resolving to a success indicator
   */
  public async reorderColumns(boardId: string, columnIds: string[]): Promise<boolean> {
    try {
      MondayLogger.debug(`Reordering columns in board ${boardId}`, { columnIds });
      
      await executeQuery(
        this.QUERIES.REORDER_COLUMNS,
        { boardId, columnIds }
      );

      // Invalidate board columns cache
      this.cache.columnsByBoard.delete(boardId);

      return true;
    } catch (error) {
      MondayLogger.error(`Error reordering columns in board ${boardId}:`, error);
      this.handleApiError(error, `Failed to reorder columns in board with ID ${boardId}`);
      throw error;
    }
  }

  /**
   * Gets all possible values for Status/Dropdown columns
   * @param columnId The ID of the column
   * @param boardId The ID of the board containing the column
   * @returns Promise resolving to an array of column value options
   */
  public async getColumnValues(columnId: string, boardId: string): Promise<ColumnValueOption[]> {
    try {
      // Check cache first
      const cacheKey = `${boardId}-${columnId}`;
      const cachedValues = this.cache.columnValuesByColumn.get(cacheKey);
      if (this.isCacheValid(cachedValues)) {
        MondayLogger.debug(`Using cached values for column ID ${columnId}`);
        return cachedValues!.data;
      }

      MondayLogger.debug(`Fetching values for column ID ${columnId} from API`);
      
      // First, get the column to check its type
      const column = await this.getColumnById(columnId, boardId);
      
      if (!column) {
        throw new Error(`Column with ID ${columnId} not found`);
      }

      // Only status and dropdown columns have predefined values
      if (column.type !== 'status' && column.type !== 'dropdown') {
        return [];
      }

      // Parse settings to get the labels
      const settings = this.parseColumnSettings(column);
      const labels = settings.labels || [];
      
      const columnValues: ColumnValueOption[] = labels.map(label => ({
        id: label.id,
        value: label.name,
        color: label.color
      }));

      // Update cache
      this.cache.columnValuesByColumn.set(cacheKey, {
        data: columnValues,
        timestamp: Date.now()
      });

      return columnValues;
    } catch (error) {
      MondayLogger.error(`Error fetching values for column ${columnId}:`, error);
      this.handleApiError(error, `Failed to fetch values for column with ID ${columnId}`);
      throw error;
    }
  }

  /**
   * Clears all caches
   */
  public clearCache(): void {
    this.cache.columnsByBoard.clear();
    this.cache.columnById.clear();
    this.cache.columnValuesByColumn.clear();
    MondayLogger.debug('Column service cache cleared');
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
        `Rate limit exceeded while accessing column API. Retry after ${error.retryAfter} seconds.`,
        error.retryAfter
      );
    }

    if (error instanceof MondayTypes.AuthenticationError) {
      throw new MondayTypes.AuthenticationError(
        'Authentication failed while accessing column API. Please check your API token.'
      );
    }

    if (error instanceof MondayTypes.NetworkError) {
      throw new MondayTypes.NetworkError(
        'Network error while accessing column API. Please check your internet connection.'
      );
    }

    if (error instanceof MondayTypes.MondayApiError) {
      throw new MondayTypes.MondayApiError(
        `Column API error: ${error.message}`,
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
export const columnService = new ColumnService();

export default columnService;
