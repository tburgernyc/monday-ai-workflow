import { StorageStrategy } from '../../../types/cacheTypes';

/**
 * In-memory storage strategy implementation
 * 
 * This strategy stores data in memory, which means it will be lost when the page is refreshed
 * or the application is closed. It's suitable for temporary caching during a session.
 */
export class MemoryStorage implements StorageStrategy {
  private storage: Map<string, any> = new Map();
  
  /**
   * Retrieve data from memory storage
   * @param key The key to retrieve
   * @returns Promise resolving to the data or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.storage.has(key)) {
      return this.storage.get(key) as T;
    }
    return null;
  }
  
  /**
   * Store data in memory storage
   * @param key The key to store under
   * @param value The data to store
   * @returns Promise resolving when the operation is complete
   */
  async set<T>(key: string, value: T): Promise<void> {
    this.storage.set(key, value);
  }
  
  /**
   * Remove data from memory storage
   * @param key The key to remove
   * @returns Promise resolving when the operation is complete
   */
  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }
  
  /**
   * Clear all data from memory storage
   * @returns Promise resolving when the operation is complete
   */
  async clear(): Promise<void> {
    this.storage.clear();
  }
  
  /**
   * Get all keys in memory storage, optionally filtered by pattern
   * @param pattern Optional pattern to filter keys
   * @returns Promise resolving to an array of keys
   */
  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.storage.keys());
    
    if (!pattern) {
      return allKeys;
    }
    
    // Convert pattern to regex for matching
    // Escape special regex characters and convert * to .*
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return allKeys.filter(key => regex.test(key));
  }
}