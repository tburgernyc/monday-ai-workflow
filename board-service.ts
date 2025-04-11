import { executeQuery, executeQueryWithPagination } from './mondayApi';

// Types
export interface Board {
  id: string;
  name: string;
  description?: string;
  board_kind: string;
  state: string;
  workspace_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Group {
  id: string;
  title: string;
  color: string;
  position: number;
}

export interface Column {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
}

export interface Item {
  id: string;
  name: string;
  group: {
    id: string;
    title: string;
  };
  column_values: Array<{
    id: string;
    text: string;
    value?: string;
  }>;
}

// Queries
const GET_BOARDS = `
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

const GET_BOARD_BY_ID = `
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

const GET_BOARD_ITEMS = `
  query GetBoardItems($boardId: ID!, $limit: Int, $page: Int, $groupId: String) {
    boards(ids: [$boardId]) {
      items(limit: $limit, page: $page, group_id: $groupId) {
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
  }
`;

// Mutations
const CREATE_BOARD = `
  mutation CreateBoard($name: String!, $boardKind: BoardKind, $workspaceId: ID, $templateId: ID) {
    create_board(board_name: $name, board_kind: $boardKind, workspace_id: $workspaceId, template_id: $templateId) {
      id
      name
      board_kind
      workspace_id
    }
  }
`;

const UPDATE_BOARD = `
  mutation UpdateBoard($boardId: ID!, $name: String, $description: String) {
    update_board(board_id: $boardId, board_name: $name, board_description: $description) {
      id
      name
      description
    }
  }
`;

const DELETE_BOARD = `
  mutation DeleteBoard($boardId: ID!) {
    delete_board(board_id: $boardId) {
      id
    }
  }
`;

const CREATE_GROUP = `
  mutation CreateGroup($boardId: ID!, $groupName: String!) {
    create_group(board_id: $boardId, group_name: $groupName) {
      id
      title
    }
  }
`;

const CREATE_ITEM = `
  mutation CreateItem($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON) {
    create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $columnValues) {
      id
      name
    }
  }
`;

// Service methods
export const BoardService = {
  // Get all boards with pagination
  getAll: async (workspaceId?: string): Promise<Board[]> => {
    try {
      return await executeQueryWithPagination(
        GET_BOARDS,
        { workspaceId },
        'data.boards',
        100
      );
    } catch (error) {
      console.error('Error fetching boards:', error);
      throw error;
    }
  },

  // Get a board by ID with its groups and columns
  getById: async (id: string): Promise<{
    board: Board;
    groups: Group[];
    columns: Column[];
  } | null> => {
    try {
      const response = await executeQuery(GET_BOARD_BY_ID, { id });
      const boards = response?.data?.boards || [];
      
      if (boards.length === 0) {
        return null;
      }
      
      const board = boards[0];
      const groups = board.groups || [];
      const columns = board.columns || [];
      
      // Remove groups and columns from board object to match Board type
      const { groups: _, columns: __, ...boardData } = board;
      
      return {
        board: boardData,
        groups,
        columns,
      };
    } catch (error) {
      console.error(`Error fetching board with ID ${id}:`, error);
      throw error;
    }
  },

  // Get items in a board with pagination
  getItems: async (
    boardId: string,
    options: { limit?: number; page?: number; groupId?: string } = {}
  ): Promise<Item[]> => {
    try {
      const { limit = 100, page = 1, groupId } = options;
      
      const response = await executeQuery(GET_BOARD_ITEMS, {
        boardId,
        limit,
        page,
        groupId,
      });
      
      const boards = response?.data?.boards || [];
      return boards.length > 0 ? boards[0].items || [] : [];
    } catch (error) {
      console.error(`Error fetching items for board ${boardId}:`, error);
      throw error;
    }
  },

  // Create a new board
  create: async (
    name: string,
    options: {
      boardKind?: string;
      workspaceId?: string;
      templateId?: string;
    } = {}
  ): Promise<Board> => {
    try {
      const { boardKind = 'public', workspaceId, templateId } = options;
      
      const response = await executeQuery(CREATE_BOARD, {
        name,
        boardKind,
        workspaceId,
        templateId,
      });
      
      return response?.data?.create_board;
    } catch (error) {
      console.error('Error creating board:', error);
      throw error;
    }
  },

  // Update an existing board
  update: async (
    boardId: string,
    data: { name?: string; description?: string }
  ): Promise<Board> => {
    try {
      const response = await executeQuery(UPDATE_BOARD, {
        boardId,
        ...data,
      });
      
      return response?.data?.update_board;
    } catch (error) {
      console.error(`Error updating board with ID ${boardId}:`, error);
      throw error;
    }
  },

  // Delete a board
  delete: async (boardId: string): Promise<{ id: string }> => {
    try {
      const response = await executeQuery(DELETE_BOARD, { boardId });
      return response?.data?.delete_board;
    } catch (error) {
      console.error(`Error deleting board with ID ${boardId}:`, error);
      throw error;
    }
  },

  // Create a new group in a board
  createGroup: async (boardId: string, groupName: string): Promise<{ id: string; title: string }> => {
    try {
      const response = await executeQuery(CREATE_GROUP, { boardId, groupName });
      return response?.data?.create_group;
    } catch (error) {
      console.error(`Error creating group in board ${boardId}:`, error);
      throw error;
    }
  },

  // Create a new item in a board
  createItem: async (
    boardId: string,
    groupId: string,
    itemName: string,
    columnValues: Record<string, any> = {}
  ): Promise<{ id: string; name: string }> => {
    try {
      const response = await executeQuery(CREATE_ITEM, {
        boardId,
        groupId,
        itemName,
        columnValues: JSON.stringify(columnValues),
      });
      
      return response?.data?.create_item;
    } catch (error) {
      console.error(`Error creating item in board ${boardId}:`, error);
      throw error;
    }
  },
};