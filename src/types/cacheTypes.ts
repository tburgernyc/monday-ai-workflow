/**
 * TypeScript interfaces for cache-related types
 */

/**
 * Options for configuring cache behavior
 */
export interface CacheOptions {
  /**
   * Time-to-live in milliseconds
   */
  ttl?: number;
  
  /**
   * Storage strategy to use
   */
  storage?: CacheStorage;
  
  /**
   * Whether to persist data when caching
   */
  persistOnSet?: boolean;
}

/**
 * Enum for different cache storage strategies
 */
export enum CacheStorage {
  Memory = 'memory',
  LocalStorage = 'localStorage',
  IndexedDB = 'indexedDB'
}

/**
 * Cache entry structure
 */
export interface CacheEntry<T> {
  /**
   * The cached data
   */
  data: T;
  
  /**
   * Timestamp when the entry expires (null for no expiration)
   */
  expires: number | null;
  
  /**
   * Timestamp when the entry was created
   */
  createdAt: number;
}

/**
 * Options for data persistence
 */
export interface PersistenceOptions {
  /**
   * Whether to compress the data before persistence
   */
  compress?: boolean;
  
  /**
   * Whether to encrypt the data before persistence
   */
  encrypt?: boolean;
}

/**
 * Interface for storage strategy implementations
 */
export interface StorageStrategy {
  /**
   * Retrieve data from storage
   * @param key The key to retrieve
   * @returns Promise resolving to the data or null if not found
   */
  get<T>(key: string): Promise<T | null>;
  
  /**
   * Store data in storage
   * @param key The key to store under
   * @param value The data to store
   * @returns Promise resolving when the operation is complete
   */
  set<T>(key: string, value: T): Promise<void>;
  
  /**
   * Remove data from storage
   * @param key The key to remove
   * @returns Promise resolving when the operation is complete
   */
  remove(key: string): Promise<void>;
  
  /**
   * Clear all data from storage
   * @returns Promise resolving when the operation is complete
   */
  clear(): Promise<void>;
  
  /**
   * Get all keys in storage, optionally filtered by pattern
   * @param pattern Optional pattern to filter keys
   * @returns Promise resolving to an array of keys
   */
  keys(pattern?: string): Promise<string[]>;
}