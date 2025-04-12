/**
 * Type definitions for Monday.com API
 */

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

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  url?: string;
  photo_url?: string;
  title?: string;
  account?: {
    id: string;
    name: string;
  };
}

// Board types
export enum BoardKind {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SHARE = 'share'
}

export interface BoardUpdateInput {
  name?: string;
  description?: string;
  state?: string;
}

export interface BoardActivity {
  id: string;
  entity: string;
  event: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  data?: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  board_kind: string;
  state: string;
  workspace_id?: string;
  created_at?: string;
  updated_at?: string;
  columns?: Column[];
  groups?: Group[];
  items?: Item[];
  items_count?: number;
  activity_logs?: BoardActivity[];
}

export interface Column {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
  archived?: boolean;
  width?: number;
}

export interface Group {
  id: string;
  title: string;
  color: string;
  position: number;
  archived?: boolean;
}

export interface Item {
  id: string;
  name: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
  board?: {
    id: string;
    name?: string;
  };
  group?: {
    id: string;
    title: string;
  };
  column_values?: ColumnValue[];
}

export interface ColumnValue {
  id: string;
  text: string;
  value?: string;
  type?: string;
  additional_info?: Record<string, unknown>;
}

// Workspace types
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  kind: string;
  state: string;
  created_at?: string;
  updated_at?: string;
  members_count?: number;
}

export enum WorkspaceUserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export interface WorkspaceUser {
  id: string;
  user: User;
  role: WorkspaceUserRole;
}

export interface WorkspaceUpdateInput {
  name?: string;
  description?: string;
  kind?: string;
}

export interface WorkspaceCreateInput {
  name: string;
  description?: string;
  kind?: string;
}

export interface WorkspacePaginationResponse {
  cursor: string;
  items: Workspace[];
}

// Context types
export interface MondayContext {
  token?: string;
  boardIds?: string | string[];
  workspaceIds?: string | string[];
}

// Historical data types
export interface HistoricalData {
  period: string;
  throughput: number;
  cycleTime: number;
}

// Analysis types
export interface WorkflowMetrics {
  averageCycleTime: number; // in days
  throughput: number; // items per week
  wip: number; // work in progress count
  blockedItems: number;
  readyItems: number;
  completedItems: number;
  bottlenecks: Array<{
    groupId: string;
    groupName: string;
    count: number;
    stagnation: number; // average days in group
  }>;
}

export interface AnalysisResult {
  summary?: string;
  bottlenecks: Array<{
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestions: string[];
  }>;
  efficiencyScore: number;
  generalSuggestions: string[];
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  data?: User;
}

export interface RateLimitTestResult {
  success: boolean;
  message: string;
  data?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
}