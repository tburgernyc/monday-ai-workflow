import { StorageStrategy } from '../../../types/cacheTypes';

/**
 * IndexedDB storage strategy implementation
 * 
 * This strategy uses the browser's IndexedDB API for persistent storage of larger data.
 * IndexedDB is more suitable for storing large amounts of structured data and
 * supports transactions for data integrity.
 */
export class IndexedDBStrategy implements StorageStrategy {
  private dbName: string;
  private storeName: string;
  private dbVersion: number;
  private dbPromise: Promise<IDBDatabase> | null = null;
  
  /**
   * Constructor
   * @param dbName The name of the IndexedDB database
   * @param storeName The name of the object store
   * @param dbVersion The version of the database
   */
  constructor(
    dbName: string = 'monday_ai_cache',
    storeName: string = 'cache_store',
    dbVersion: number = 1
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.dbVersion = dbVersion;
  }
  
  /**
   * Initialize the database connection
   * @returns Promise resolving to the database connection
   */
  private async getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          reject(new Error('IndexedDB is not supported in this browser'));
          return;
        }
        
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = (event) => {
          console.error('Error opening IndexedDB', event);
          reject(new Error('Could not open IndexedDB'));
        };
        
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create object store if it doesn't exist
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'key' });
          }
        };
      });
    }
    
    return this.dbPromise;
  }
  
  /**
   * Retrieve data from IndexedDB
   * @param key The key to retrieve
   * @returns Promise resolving to the data or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      
      return new Promise<T | null>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
        
        request.onerror = (event) => {
          console.error(`Error retrieving item from IndexedDB: ${key}`, event);
          reject(new Error(`Failed to retrieve item: ${key}`));
        };
        
        request.onsuccess = (event) => {
          const result = (event.target as IDBRequest).result;
          if (!result) {
            resolve(null);
            return;
          }
          resolve(result.value as T);
        };
      });
    } catch (error) {
      console.error(`Error retrieving item from IndexedDB: ${key}`, error);
      return null;
    }
  }
  
  /**
   * Store data in IndexedDB
   * @param key The key to store under
   * @param value The data to store
   * @returns Promise resolving when the operation is complete
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.getDB();
      
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put({ key, value });
        
        request.onerror = (event) => {
          console.error(`Error storing item in IndexedDB: ${key}`, event);
          reject(new Error(`Failed to store item: ${key}`));
        };
        
        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      console.error(`Error storing item in IndexedDB: ${key}`, error);
      throw error;
    }
  }
  
  /**
   * Remove data from IndexedDB
   * @param key The key to remove
   * @returns Promise resolving when the operation is complete
   */
  async remove(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);
        
        request.onerror = (event) => {
          console.error(`Error removing item from IndexedDB: ${key}`, event);
          reject(new Error(`Failed to remove item: ${key}`));
        };
        
        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      console.error(`Error removing item from IndexedDB: ${key}`, error);
      throw error;
    }
  }
  
  /**
   * Clear all data from IndexedDB store
   * @returns Promise resolving when the operation is complete
   */
  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();
        
        request.onerror = (event) => {
          console.error('Error clearing IndexedDB store', event);
          reject(new Error('Failed to clear IndexedDB store'));
        };
        
        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      console.error('Error clearing IndexedDB store', error);
      throw error;
    }
  }
  
  /**
   * Get all keys in IndexedDB store, optionally filtered by pattern
   * @param pattern Optional pattern to filter keys
   * @returns Promise resolving to an array of keys
   */
  async keys(pattern?: string): Promise<string[]> {
    try {
      const db = await this.getDB();
      
      return new Promise<string[]>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAllKeys();
        
        request.onerror = (event) => {
          console.error('Error getting keys from IndexedDB', event);
          reject(new Error('Failed to get keys from IndexedDB'));
        };
        
        request.onsuccess = (event) => {
          const allKeys = (event.target as IDBRequest).result as IDBValidKey[];
          const stringKeys = allKeys.map(key => String(key));
          
          if (!pattern) {
            resolve(stringKeys);
            return;
          }
          
          // Convert pattern to regex for matching
          // Escape special regex characters and convert * to .*
          const regexPattern = pattern
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*');
          
          const regex = new RegExp(`^${regexPattern}$`);
          resolve(stringKeys.filter(key => regex.test(key)));
        };
      });
    } catch (error) {
      console.error('Error getting keys from IndexedDB', error);
      return [];
    }
  }
  
  /**
   * Delete the entire database
   * @returns Promise resolving when the operation is complete
   */
  async deleteDatabase(): Promise<void> {
    // Close any existing connection
    if (this.dbPromise) {
      const db = await this.dbPromise;
      db.close();
      this.dbPromise = null;
    }
    
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      
      request.onerror = (event) => {
        console.error('Error deleting IndexedDB database', event);
        reject(new Error('Failed to delete IndexedDB database'));
      };
      
      request.onsuccess = () => {
        resolve();
      };
    });
  }
}