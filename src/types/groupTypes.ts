/**
 * Type definitions for Monday.com Group API
 */

import { Group } from './monday';

/**
 * Input for updating a group
 */
export interface GroupUpdateInput {
  title?: string;
  color?: string;
  position?: number;
}

/**
 * Response for paginated group queries
 */
export interface GroupPaginationResponse {
  cursor: string;
  groups: Group[];
}

/**
 * Cache interface for group service
 */
export interface GroupCache {
  groupsByBoard: Map<string, CacheItem<Group[]>>;
  groupById: Map<string, CacheItem<Group>>;
}

/**
 * Cache item with timestamp for TTL validation
 */
export interface CacheItem<T> {
  data: T;
  timestamp: number;
}