import { StorageStrategy } from '../../../types/cacheTypes';

/**
 * LocalStorage strategy implementation
 * 
 * This strategy uses the browser's localStorage API for persistent storage.
 * Note that localStorage has a size limit (usually 5-10MB) and stores only strings,
 * so we need to serialize/deserialize the data.
 */
export class LocalStorageStrategy implements StorageStrategy {
  private prefix: string;
  
  /**
   * Constructor
   * @param prefix Optional prefix for all keys to avoid collisions with other applications
   */
  constructor(prefix: string = 'monday_ai_') {
    this.prefix = prefix;
  }
  
  /**
   * Get the prefixed key
   * @param key The original key
   * @returns The prefixed key
   */
  private getPrefixedKey(key: string): string {
    return `${this.prefix}${key}`;
  }
  
  /**
   * Remove the prefix from a key
   * @param prefixedKey The prefixed key
   * @returns The original key
   */
  private removePrefix(prefixedKey: string): string {
    return prefixedKey.substring(this.prefix.length);
  }
  
  /**
   * Retrieve data from localStorage
   * @param key The key to retrieve
   * @returns Promise resolving to the data or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      const item = localStorage.getItem(prefixedKey);
      
      if (item === null) {
        return null;
      }
      
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error retrieving item from localStorage: ${key}`, error);
      return null;
    }
  }
  
  /**
   * Store data in localStorage
   * @param key The key to store under
   * @param value The data to store
   * @returns Promise resolving when the operation is complete
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(prefixedKey, serializedValue);
    } catch (error) {
      console.error(`Error storing item in localStorage: ${key}`, error);
      
      // If it's a quota exceeded error, try to handle it
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error('localStorage quota exceeded. Consider using IndexedDB for larger data.');
      }
      
      throw error;
    }
  }
  
  /**
   * Remove data from localStorage
   * @param key The key to remove
   * @returns Promise resolving when the operation is complete
   */
  async remove(key: string): Promise<void> {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      localStorage.removeItem(prefixedKey);
    } catch (error) {
      console.error(`Error removing item from localStorage: ${key}`, error);
      throw error;
    }
  }
  
  /**
   * Clear all data from localStorage that matches our prefix
   * @returns Promise resolving when the operation is complete
   */
  async clear(): Promise<void> {
    try {
      const keysToRemove = [];
      
      // Find all keys with our prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all matching keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Error clearing localStorage', error);
      throw error;
    }
  }
  
  /**
   * Get all keys in localStorage, optionally filtered by pattern
   * @param pattern Optional pattern to filter keys
   * @returns Promise resolving to an array of keys
   */
  async keys(pattern?: string): Promise<string[]> {
    try {
      const result: string[] = [];
      
      // Find all keys with our prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const unprefixedKey = this.removePrefix(key);
          result.push(unprefixedKey);
        }
      }
      
      if (!pattern) {
        return result;
      }
      
      // Convert pattern to regex for matching
      // Escape special regex characters and convert * to .*
      const regexPattern = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      
      const regex = new RegExp(`^${regexPattern}$`);
      return result.filter(key => regex.test(key));
    } catch (error) {
      console.error('Error getting keys from localStorage', error);
      return [];
    }
  }
}