import { 
  CacheOptions, 
  CacheStorage, 
  CacheEntry, 
  PersistenceOptions, 
  StorageStrategy 
} from '../../types/cacheTypes';
import { 
  MemoryStorage, 
  LocalStorageStrategy, 
  IndexedDBStrategy 
} from './strategies';

/**
 * Default cache options
 */
const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  ttl: 30 * 60 * 1000, // 30 minutes
  storage: CacheStorage.Memory,
  persistOnSet: false
};

/**
 * Default persistence options
 */
const DEFAULT_PERSISTENCE_OPTIONS: PersistenceOptions = {
  compress: false,
  encrypt: false
};

/**
 * Cache service for managing data caching and persistence
 */
export class CacheService {
  private memoryStorage: MemoryStorage;
  private localStorageStrategy: LocalStorageStrategy;
  private indexedDBStrategy: IndexedDBStrategy;
  private defaultOptions: CacheOptions;
  private persistenceOptions: PersistenceOptions;
  private onlineStatus: boolean = navigator.onLine;
  private offlineQueue: Array<() => Promise<void>> = [];
  
  /**
   * Constructor
   * @param options Default cache options
   * @param persistenceOptions Default persistence options
   */
  constructor(
    options: Partial<CacheOptions> = {},
    persistenceOptions: Partial<PersistenceOptions> = {}
  ) {
    this.defaultOptions = { ...DEFAULT_CACHE_OPTIONS, ...options };
    this.persistenceOptions = { ...DEFAULT_PERSISTENCE_OPTIONS, ...persistenceOptions };
    
    // Initialize storage strategies
    this.memoryStorage = new MemoryStorage();
    this.localStorageStrategy = new LocalStorageStrategy();
    this.indexedDBStrategy = new IndexedDBStrategy();
    
    // Set up online/offline event listeners
    this.setupNetworkListeners();
  }
  
  /**
   * Set up network status event listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }
  
  /**
   * Handle online event
   */
  private async handleOnline(): Promise<void> {
    console.log('Network connection restored. Processing offline queue...');
    this.onlineStatus = true;
    
    // Process offline queue
    while (this.offlineQueue.length > 0) {
      const operation = this.offlineQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('Error processing offline operation:', error);
          // Put the operation back in the queue if it fails
          this.offlineQueue.push(operation);
          break;
        }
      }
    }
  }
  
  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('Network connection lost. Operations will be queued.');
    this.onlineStatus = false;
  }
  
  /**
   * Get the appropriate storage strategy based on options
   * @param options Cache options
   * @returns The storage strategy
   */
  private getStorageStrategy(options: CacheOptions): StorageStrategy {
    switch (options.storage) {
      case CacheStorage.LocalStorage:
        return this.localStorageStrategy;
      case CacheStorage.IndexedDB:
        return this.indexedDBStrategy;
      case CacheStorage.Memory:
      default:
        return this.memoryStorage;
    }
  }
  
  /**
   * Generate a cache key with namespace
   * @param key The base key
   * @param namespace Optional namespace
   * @returns The namespaced key
   */
  private getNamespacedKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }
  
  /**
   * Retrieve data from cache
   * @param key The key to retrieve
   * @param namespace Optional namespace
   * @returns Promise resolving to the data or null if not found
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    
    // Try memory cache first (fastest)
    const memoryResult = await this.memoryStorage.get<CacheEntry<T>>(namespacedKey);
    if (memoryResult) {
      // Check if the entry is expired
      if (memoryResult.expires === null || memoryResult.expires > Date.now()) {
        return memoryResult.data;
      }
      
      // If expired, remove it from memory
      await this.memoryStorage.remove(namespacedKey);
    }
    
    // Try localStorage next
    const localStorageResult = await this.localStorageStrategy.get<CacheEntry<T>>(namespacedKey);
    if (localStorageResult) {
      // Check if the entry is expired
      if (localStorageResult.expires === null || localStorageResult.expires > Date.now()) {
        // Cache in memory for faster access next time
        await this.memoryStorage.set(namespacedKey, localStorageResult);
        return localStorageResult.data;
      }
      
      // If expired, remove it from localStorage
      await this.localStorageStrategy.remove(namespacedKey);
    }
    
    // Try IndexedDB last
    const indexedDBResult = await this.indexedDBStrategy.get<CacheEntry<T>>(namespacedKey);
    if (indexedDBResult) {
      // Check if the entry is expired
      if (indexedDBResult.expires === null || indexedDBResult.expires > Date.now()) {
        // Cache in memory for faster access next time
        await this.memoryStorage.set(namespacedKey, indexedDBResult);
        return indexedDBResult.data;
      }
      
      // If expired, remove it from IndexedDB
      await this.indexedDBStrategy.remove(namespacedKey);
    }
    
    return null;
  }
  
  /**
   * Store data in cache
   * @param key The key to store under
   * @param data The data to store
   * @param options Cache options
   * @param namespace Optional namespace
   * @returns Promise resolving when the operation is complete
   */
  async set<T>(
    key: string, 
    data: T, 
    options: Partial<CacheOptions> = {}, 
    namespace?: string
  ): Promise<void> {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    const mergedOptions: CacheOptions = { ...this.defaultOptions, ...options };
    
    // Create cache entry
    const entry: CacheEntry<T> = {
      data,
      expires: mergedOptions.ttl ? Date.now() + mergedOptions.ttl : null,
      createdAt: Date.now()
    };
    
    // Get the appropriate storage strategy
    const storage = this.getStorageStrategy(mergedOptions);
    
    // Store in the selected storage
    await storage.set(namespacedKey, entry);
    
    // Also store in memory for faster access
    if (storage !== this.memoryStorage) {
      await this.memoryStorage.set(namespacedKey, entry);
    }
    
    // Persist if requested
    if (mergedOptions.persistOnSet) {
      await this.persist(key, data, namespace);
    }
  }
  
  /**
   * Invalidate a cache entry
   * @param key The key to invalidate
   * @param namespace Optional namespace
   * @returns Promise resolving when the operation is complete
   */
  async invalidate(key: string, namespace?: string): Promise<void> {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    
    // Remove from all storage strategies
    await Promise.all([
      this.memoryStorage.remove(namespacedKey),
      this.localStorageStrategy.remove(namespacedKey),
      this.indexedDBStrategy.remove(namespacedKey)
    ]);
  }
  
  /**
   * Invalidate cache entries matching a pattern
   * @param pattern Pattern to match keys against
   * @param namespace Optional namespace
   * @returns Promise resolving when the operation is complete
   */
  async invalidatePattern(pattern: string, namespace?: string): Promise<void> {
    const namespacedPattern = namespace ? `${namespace}:${pattern}` : pattern;
    
    // Get all keys from all storage strategies
    const [memoryKeys, localStorageKeys, indexedDBKeys] = await Promise.all([
      this.memoryStorage.keys(namespacedPattern),
      this.localStorageStrategy.keys(namespacedPattern),
      this.indexedDBStrategy.keys(namespacedPattern)
    ]);
    
    // Combine and deduplicate keys
    const allKeys = Array.from(new Set([...memoryKeys, ...localStorageKeys, ...indexedDBKeys]));
    
    // Remove all matching keys from all storage strategies
    await Promise.all(
      allKeys.flatMap(key => [
        this.memoryStorage.remove(key),
        this.localStorageStrategy.remove(key),
        this.indexedDBStrategy.remove(key)
      ])
    );
  }
  
  /**
   * Persist data for offline use
   * @param key The key to persist
   * @param data The data to persist
   * @param namespace Optional namespace
   * @returns Promise resolving when the operation is complete
   */
  async persist<T>(key: string, data: T, namespace?: string): Promise<void> {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    const persistKey = `persist:${namespacedKey}`;
    
    // Create persistence entry
    const entry: CacheEntry<T> = {
      data,
      expires: null, // Persisted data doesn't expire
      createdAt: Date.now()
    };
    
    // Store in IndexedDB for persistence
    await this.indexedDBStrategy.set(persistKey, entry);
  }
  
  /**
   * Check if data is persisted
   * @param key The key to check
   * @param namespace Optional namespace
   * @returns Promise resolving to true if the data is persisted
   */
  async isPersisted(key: string, namespace?: string): Promise<boolean> {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    const persistKey = `persist:${namespacedKey}`;
    
    const entry = await this.indexedDBStrategy.get(persistKey);
    return entry !== null;
  }
  
  /**
   * Load persisted data
   * @param key The key to load
   * @param namespace Optional namespace
   * @returns Promise resolving to the persisted data or null if not found
   */
  async loadPersisted<T>(key: string, namespace?: string): Promise<T | null> {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    const persistKey = `persist:${namespacedKey}`;
    
    const entry = await this.indexedDBStrategy.get<CacheEntry<T>>(persistKey);
    return entry ? entry.data : null;
  }
  
  /**
   * Clear all cache data
   * @returns Promise resolving when the operation is complete
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.memoryStorage.clear(),
      this.localStorageStrategy.clear(),
      this.indexedDBStrategy.clear()
    ]);
  }
  
  /**
   * Get the size of the cache in bytes (approximate)
   * @returns Promise resolving to the cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    // Get all keys from all storage strategies
    const [memoryKeys, localStorageKeys, indexedDBKeys] = await Promise.all([
      this.memoryStorage.keys(),
      this.localStorageStrategy.keys(),
      this.indexedDBStrategy.keys()
    ]);
    
    let totalSize = 0;
    
    // Calculate size from localStorage
    for (const key of localStorageKeys) {
      const item = localStorage.getItem(this.localStorageStrategy['getPrefixedKey'](key));
      if (item) {
        totalSize += item.length * 2; // UTF-16 characters are 2 bytes each
      }
    }
    
    // For memory and IndexedDB, we can only estimate
    // Assume an average of 1KB per item
    totalSize += (memoryKeys.length + indexedDBKeys.length) * 1024;
    
    return totalSize;
  }
  
  /**
   * Get the TTL (time-to-live) for a cache entry
   * @param key The key to check
   * @param namespace Optional namespace
   * @returns Promise resolving to the TTL in milliseconds or null if not set
   */
  async getTTL(key: string, namespace?: string): Promise<number | null> {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    
    // Try to get the entry from any storage
    const entry = 
      await this.memoryStorage.get<CacheEntry<any>>(namespacedKey) ||
      await this.localStorageStrategy.get<CacheEntry<any>>(namespacedKey) ||
      await this.indexedDBStrategy.get<CacheEntry<any>>(namespacedKey);
    
    if (!entry || entry.expires === null) {
      return null;
    }
    
    const ttl = entry.expires - Date.now();
    return ttl > 0 ? ttl : 0;
  }
  
  /**
   * Extend the TTL for a cache entry
   * @param key The key to extend
   * @param additionalTime Additional time in milliseconds
   * @param namespace Optional namespace
   * @returns Promise resolving to true if the TTL was extended
   */
  async extendTTL(key: string, additionalTime: number, namespace?: string): Promise<boolean> {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    
    // Try to get the entry from any storage
    let entry = 
      await this.memoryStorage.get<CacheEntry<any>>(namespacedKey) ||
      await this.localStorageStrategy.get<CacheEntry<any>>(namespacedKey) ||
      await this.indexedDBStrategy.get<CacheEntry<any>>(namespacedKey);
    
    if (!entry) {
      return false;
    }
    
    // If the entry has no expiration, it doesn't need extension
    if (entry.expires === null) {
      return true;
    }
    
    // Extend the expiration time
    entry.expires += additionalTime;
    
    // Update the entry in all storages where it exists
    const updatePromises: Promise<void>[] = [];
    
    if (await this.memoryStorage.get(namespacedKey)) {
      updatePromises.push(this.memoryStorage.set(namespacedKey, entry));
    }
    
    if (await this.localStorageStrategy.get(namespacedKey)) {
      updatePromises.push(this.localStorageStrategy.set(namespacedKey, entry));
    }
    
    if (await this.indexedDBStrategy.get(namespacedKey)) {
      updatePromises.push(this.indexedDBStrategy.set(namespacedKey, entry));
    }
    
    await Promise.all(updatePromises);
    return true;
  }
  
  /**
   * Add an operation to the offline queue
   * @param operation Function to execute when online
   */
  queueOfflineOperation(operation: () => Promise<void>): void {
    if (this.onlineStatus) {
      // If online, execute immediately
      operation().catch(error => {
        console.error('Error executing operation:', error);
      });
    } else {
      // If offline, add to queue
      this.offlineQueue.push(operation);
    }
  }
  
  /**
   * Check if the application is online
   * @returns True if online
   */
  isOnline(): boolean {
    return this.onlineStatus;
  }
  
  /**
   * Get the number of operations in the offline queue
   * @returns Number of queued operations
   */
  getOfflineQueueLength(): number {
    return this.offlineQueue.length;
  }
}