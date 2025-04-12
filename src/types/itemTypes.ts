/**
 * Type definitions for Monday.com Item API
 */

import { ColumnValue } from './monday';

/**
 * Options for querying items
 */
export interface ItemQueryOptions {
  limit?: number;
  page?: number;
  groupId?: string;
  columns?: string[];
  ids?: string[];
  newestFirst?: boolean;
}

/**
 * Input for creating a new item
 */
export interface ItemCreateInput {
  name: string;
  groupId: string;
  columnValues?: ColumnValues;
}

/**
 * Input for updating an item
 */
export interface ItemUpdateInput {
  name?: string;
  columnValues?: ColumnValues;
}

/**
 * Column values for item creation or update
 * This is a record where keys are column IDs and values can be various types
 * depending on the column type
 */
export type ColumnValues = Record<string, unknown>;

/**
 * Response for paginated item queries
 */
export interface ItemPaginationResponse {
  cursor: string;
  items: any[];
}

/**
 * Cache interface for item service
 */
export interface ItemCache {
  itemsByBoard: Map<string, CacheItem<any[]>>;
  itemById: Map<string, CacheItem<any>>;
}

/**
 * Cache item with timestamp for TTL validation
 */
export interface CacheItem<T> {
  data: T;
  timestamp: number;
}