import { executeQuery, executeQueryWithPagination } from './mondayApi';

// Types
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  kind: string;
  state: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceUser {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: string;
}

// Queries
const GET_WORKSPACES = `
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

const GET_WORKSPACE_BY_ID = `
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

const GET_WORKSPACE_USERS = `
  query GetWorkspaceUsers($workspaceId: ID!, $limit: Int, $page: Int) {
    workspace_users(workspace_id: $workspaceId, limit: $limit, page: $page) {
      id
      user {
        id
        name
        email
      }
      role
    }
  }
`;

// Mutations
const CREATE_WORKSPACE = `
  mutation CreateWorkspace($name: String!, $kind: String = "open", $description: String) {
    create_workspace(workspace_name: $name, workspace_kind: $kind, description: $description) {
      id
      name
      description
      kind
      state
    }
  }
`;

const UPDATE_WORKSPACE = `
  mutation UpdateWorkspace($id: ID!, $name: String, $description: String) {
    update_workspace(id: $id, name: $name, description: $description) {
      id
      name
      description
    }
  }
`;

const DELETE_WORKSPACE = `
  mutation DeleteWorkspace($id: ID!) {
    delete_workspace(workspace_id: $id) {
      id
    }
  }
`;

// Service methods
export const WorkspaceService = {
  // Get all workspaces with pagination
  getAll: async (): Promise<Workspace[]> => {
    try {
      return await executeQueryWithPagination(
        GET_WORKSPACES,
        {},
        'data.workspaces',
        100
      );
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      throw error;
    }
  },

  // Get a workspace by ID
  getById: async (id: string): Promise<Workspace | null> => {
    try {
      const response = await executeQuery(GET_WORKSPACE_BY_ID, { id });
      const workspaces = response?.data?.workspaces || [];
      return workspaces.length > 0 ? workspaces[0] : null;
    } catch (error) {
      console.error(`Error fetching workspace with ID ${id}:`, error);
      throw error;
    }
  },

  // Get users in a workspace
  getUsers: async (workspaceId: string): Promise<WorkspaceUser[]> => {
    try {
      return await executeQueryWithPagination(
        GET_WORKSPACE_USERS,
        { workspaceId },
        'data.workspace_users',
        100
      );
    } catch (error) {
      console.error(`Error fetching users for workspace ${workspaceId}:`, error);
      throw error;
    }
  },

  // Create a new workspace
  create: async (
    name: string,
    kind: string = 'open',
    description?: string
  ): Promise<Workspace> => {
    try {
      const response = await executeQuery(CREATE_WORKSPACE, {
        name,
        kind,
        description,
      });
      return response?.data?.create_workspace;
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  },

  // Update an existing workspace
  update: async (
    id: string,
    data: { name?: string; description?: string }
  ): Promise<Workspace> => {
    try {
      const response = await executeQuery(UPDATE_WORKSPACE, {
        id,
        ...data,
      });
      return response?.data?.update_workspace;
    } catch (error) {
      console.error(`Error updating workspace with ID ${id}:`, error);
      throw error;
    }
  },

  // Delete a workspace
  delete: async (id: string): Promise<{ id: string }> => {
    try {
      const response = await executeQuery(DELETE_WORKSPACE, { id });
      return response?.data?.delete_workspace;
    } catch (error) {
      console.error(`Error deleting workspace with ID ${id}:`, error);
      throw error;
    }
  },
};

export default WorkspaceService;