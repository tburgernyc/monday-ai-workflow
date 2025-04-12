/**
 * Type definitions for Monday.com Column API
 */

import { Column } from './monday';

/**
 * Enum for column types supported by Monday.com
 */
export enum ColumnType {
  TEXT = 'text',
  LONG_TEXT = 'long-text',
  NUMBER = 'numbers',
  STATUS = 'status',
  DROPDOWN = 'dropdown',
  DATE = 'date',
  TIMELINE = 'timeline',
  PEOPLE = 'people',
  TEAM = 'team',
  WORLD_CLOCK = 'world-clock',
  FILE = 'file',
  LINK = 'link',
  COLOR_PICKER = 'color-picker',
  CHECKBOX = 'checkbox',
  RATING = 'rating',
  TAGS = 'tags',
  PHONE = 'phone',
  EMAIL = 'email',
  HOUR = 'hour',
  CREATION_LOG = 'creation-log',
  LAST_UPDATED = 'last-updated',
  FORMULA = 'formula',
  DEPENDENCY = 'dependency',
  VOTE = 'vote',
  LOCATION = 'location',
  AUTO_NUMBER = 'auto-number',
  INTEGRATION = 'integration',
  MIRROR = 'mirror',
  ITEM_ID = 'item-id',
  SUBTASKS = 'subtasks',
  PROGRESS = 'progress',
  TIME_TRACKING = 'time-tracking'
}

/**
 * Interface for column settings
 * Different column types have different settings
 */
export interface ColumnSettings {
  // Common settings
  width?: number;
  editable?: boolean;
  visible?: boolean;
  
  // Status/Dropdown specific settings
  labels?: {
    id: string;
    name: string;
    color: string;
  }[];
  
  // Number specific settings
  decimals?: number;
  
  // Date specific settings
  format?: string;
  
  // Other settings based on column type
  [key: string]: unknown;
}

/**
 * Interface for column creation input
 */
export interface ColumnCreateInput {
  title: string;
  type: ColumnType;
  description?: string;
  settings?: ColumnSettings;
}

/**
 * Interface for column update input
 */
export interface ColumnUpdateInput {
  title?: string;
  description?: string;
  settings?: Partial<ColumnSettings>;
  width?: number;
}

/**
 * Interface for column value options (for Status/Dropdown columns)
 */
export interface ColumnValueOption {
  id: string;
  value: string;
  color: string;
}

/**
 * Interface for column reordering input
 */
export interface ColumnReorderInput {
  boardId: string;
  columnIds: string[];
}

/**
 * Cache interface for column service
 */
export interface ColumnCache {
  columnsByBoard: Map<string, CacheItem<Column[]>>;
  columnById: Map<string, CacheItem<Column>>;
  columnValuesByColumn: Map<string, CacheItem<ColumnValueOption[]>>;
}

/**
 * Cache item with timestamp for TTL validation
 */
export interface CacheItem<T> {
  data: T;
  timestamp: number;
}