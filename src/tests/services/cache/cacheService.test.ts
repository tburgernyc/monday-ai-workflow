import { CacheService, CacheStorage } from '../../../services/cache';
import { MemoryStorage, LocalStorageStrategy, IndexedDBStrategy } from '../../../services/cache/strategies';

// Mock the storage strategies
jest.mock('../../../services/cache/strategies/memoryStorage');
jest.mock('../../../services/cache/strategies/localStorageStrategy');
jest.mock('../../../services/cache/strategies/indexedDBStrategy');

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockMemoryStorage: jest.Mocked<MemoryStorage>;
  let mockLocalStorageStrategy: jest.Mocked<LocalStorageStrategy>;
  let mockIndexedDBStrategy: jest.Mocked<IndexedDBStrategy>;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock implementations
    mockMemoryStorage = new MemoryStorage() as jest.Mocked<MemoryStorage>;
    mockLocalStorageStrategy = new LocalStorageStrategy() as jest.Mocked<LocalStorageStrategy>;
    mockIndexedDBStrategy = new IndexedDBStrategy() as jest.Mocked<IndexedDBStrategy>;
    
    // Set up mock methods
    mockMemoryStorage.get.mockImplementation(async (key) => null);
    mockMemoryStorage.set.mockImplementation(async () => {});
    mockMemoryStorage.remove.mockImplementation(async () => {});
    mockMemoryStorage.clear.mockImplementation(async () => {});
    mockMemoryStorage.keys.mockImplementation(async () => []);
    
    mockLocalStorageStrategy.get.mockImplementation(async (key) => null);
    mockLocalStorageStrategy.set.mockImplementation(async () => {});
    mockLocalStorageStrategy.remove.mockImplementation(async () => {});
    mockLocalStorageStrategy.clear.mockImplementation(async () => {});
    mockLocalStorageStrategy.keys.mockImplementation(async () => []);
    
    mockIndexedDBStrategy.get.mockImplementation(async (key) => null);
    mockIndexedDBStrategy.set.mockImplementation(async () => {});
    mockIndexedDBStrategy.remove.mockImplementation(async () => {});
    mockIndexedDBStrategy.clear.mockImplementation(async () => {});
    mockIndexedDBStrategy.keys.mockImplementation(async () => []);
    
    // Mock constructors
    (MemoryStorage as jest.Mock).mockImplementation(() => mockMemoryStorage);
    (LocalStorageStrategy as jest.Mock).mockImplementation(() => mockLocalStorageStrategy);
    (IndexedDBStrategy as jest.Mock).mockImplementation(() => mockIndexedDBStrategy);
    
    // Create cache service instance
    cacheService = new CacheService();
  });
  
  describe('get', () => {
    it('should return null when item is not in any storage', async () => {
      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
      expect(mockMemoryStorage.get).toHaveBeenCalledWith('test-key');
      expect(mockLocalStorageStrategy.get).toHaveBeenCalledWith('test-key');
      expect(mockIndexedDBStrategy.get).toHaveBeenCalledWith('test-key');
    });
    
    it('should return data from memory cache when available', async () => {
      const testData = { data: 'test-data', expires: null, createdAt: Date.now() };
      mockMemoryStorage.get.mockResolvedValueOnce(testData);
      
      const result = await cacheService.get('test-key');
      
      expect(result).toBe('test-data');
      expect(mockMemoryStorage.get).toHaveBeenCalledWith('test-key');
      expect(mockLocalStorageStrategy.get).not.toHaveBeenCalled();
      expect(mockIndexedDBStrategy.get).not.toHaveBeenCalled();
    });
    
    it('should return data from localStorage when memory cache misses', async () => {
      const testData = { data: 'test-data', expires: null, createdAt: Date.now() };
      mockMemoryStorage.get.mockResolvedValueOnce(null);
      mockLocalStorageStrategy.get.mockResolvedValueOnce(testData);
      
      const result = await cacheService.get('test-key');
      
      expect(result).toBe('test-data');
      expect(mockMemoryStorage.get).toHaveBeenCalledWith('test-key');
      expect(mockLocalStorageStrategy.get).toHaveBeenCalledWith('test-key');
      expect(mockIndexedDBStrategy.get).not.toHaveBeenCalled();
      expect(mockMemoryStorage.set).toHaveBeenCalledWith('test-key', testData);
    });
    
    it('should return data from IndexedDB when memory and localStorage miss', async () => {
      const testData = { data: 'test-data', expires: null, createdAt: Date.now() };
      mockMemoryStorage.get.mockResolvedValueOnce(null);
      mockLocalStorageStrategy.get.mockResolvedValueOnce(null);
      mockIndexedDBStrategy.get.mockResolvedValueOnce(testData);
      
      const result = await cacheService.get('test-key');
      
      expect(result).toBe('test-data');
      expect(mockMemoryStorage.get).toHaveBeenCalledWith('test-key');
      expect(mockLocalStorageStrategy.get).toHaveBeenCalledWith('test-key');
      expect(mockIndexedDBStrategy.get).toHaveBeenCalledWith('test-key');
      expect(mockMemoryStorage.set).toHaveBeenCalledWith('test-key', testData);
    });
    
    it('should not return expired data from cache', async () => {
      const expiredData = { 
        data: 'expired-data', 
        expires: Date.now() - 1000, // Expired 1 second ago
        createdAt: Date.now() - 60000 
      };
      mockMemoryStorage.get.mockResolvedValueOnce(expiredData);
      
      const result = await cacheService.get('test-key');
      
      expect(result).toBeNull();
      expect(mockMemoryStorage.get).toHaveBeenCalledWith('test-key');
      expect(mockMemoryStorage.remove).toHaveBeenCalledWith('test-key');
    });
    
    it('should respect namespaces', async () => {
      await cacheService.get('test-key', 'test-namespace');
      
      expect(mockMemoryStorage.get).toHaveBeenCalledWith('test-namespace:test-key');
      expect(mockLocalStorageStrategy.get).toHaveBeenCalledWith('test-namespace:test-key');
      expect(mockIndexedDBStrategy.get).toHaveBeenCalledWith('test-namespace:test-key');
    });
  });
  
  describe('set', () => {
    it('should store data in memory by default', async () => {
      await cacheService.set('test-key', 'test-data');
      
      expect(mockMemoryStorage.set).toHaveBeenCalled();
      const setCall = mockMemoryStorage.set.mock.calls[0];
      expect(setCall[0]).toBe('test-key');
      
      const cacheEntry = setCall[1] as any;
      expect(cacheEntry.data).toBe('test-data');
      expect(cacheEntry.expires).not.toBeNull();
      expect(cacheEntry.createdAt).toBeLessThanOrEqual(Date.now());
    });
    
    it('should store data in localStorage when specified', async () => {
      await cacheService.set('test-key', 'test-data', { storage: CacheStorage.LocalStorage });
      
      expect(mockLocalStorageStrategy.set).toHaveBeenCalled();
      const setCall = mockLocalStorageStrategy.set.mock.calls[0];
      expect(setCall[0]).toBe('test-key');
      
      const cacheEntry = setCall[1] as any;
      expect(cacheEntry.data).toBe('test-data');
      expect(cacheEntry.expires).not.toBeNull();
      expect(cacheEntry.createdAt).toBeLessThanOrEqual(Date.now());
      
      // Should also store in memory for faster access
      expect(mockMemoryStorage.set).toHaveBeenCalled();
    });
    
    it('should store data in IndexedDB when specified', async () => {
      await cacheService.set('test-key', 'test-data', { storage: CacheStorage.IndexedDB });
      
      expect(mockIndexedDBStrategy.set).toHaveBeenCalled();
      const setCall = mockIndexedDBStrategy.set.mock.calls[0];
      expect(setCall[0]).toBe('test-key');
      
      const cacheEntry = setCall[1] as any;
      expect(cacheEntry.data).toBe('test-data');
      expect(cacheEntry.expires).not.toBeNull();
      expect(cacheEntry.createdAt).toBeLessThanOrEqual(Date.now());
      
      // Should also store in memory for faster access
      expect(mockMemoryStorage.set).toHaveBeenCalled();
    });
    
    it('should respect TTL option', async () => {
      const ttl = 60000; // 1 minute
      await cacheService.set('test-key', 'test-data', { ttl });
      
      const setCall = mockMemoryStorage.set.mock.calls[0];
      const cacheEntry = setCall[1] as any;
      
      // Expires should be approximately now + ttl
      const expectedExpires = Date.now() + ttl;
      expect(cacheEntry.expires).toBeGreaterThan(expectedExpires - 100);
      expect(cacheEntry.expires).toBeLessThan(expectedExpires + 100);
    });
    
    it('should persist data when persistOnSet is true', async () => {
      await cacheService.set('test-key', 'test-data', { persistOnSet: true });
      
      // Should call persist method
      expect(mockIndexedDBStrategy.set).toHaveBeenCalled();
      const setCall = mockIndexedDBStrategy.set.mock.calls[0];
      expect(setCall[0]).toBe('persist:test-key');
      
      const cacheEntry = setCall[1] as any;
      expect(cacheEntry.data).toBe('test-data');
      expect(cacheEntry.expires).toBeNull(); // Persisted data doesn't expire
    });
    
    it('should respect namespaces', async () => {
      await cacheService.set('test-key', 'test-data', {}, 'test-namespace');
      
      expect(mockMemoryStorage.set).toHaveBeenCalled();
      const setCall = mockMemoryStorage.set.mock.calls[0];
      expect(setCall[0]).toBe('test-namespace:test-key');
    });
  });
  
  describe('invalidate', () => {
    it('should remove data from all storage strategies', async () => {
      await cacheService.invalidate('test-key');
      
      expect(mockMemoryStorage.remove).toHaveBeenCalledWith('test-key');
      expect(mockLocalStorageStrategy.remove).toHaveBeenCalledWith('test-key');
      expect(mockIndexedDBStrategy.remove).toHaveBeenCalledWith('test-key');
    });
    
    it('should respect namespaces', async () => {
      await cacheService.invalidate('test-key', 'test-namespace');
      
      expect(mockMemoryStorage.remove).toHaveBeenCalledWith('test-namespace:test-key');
      expect(mockLocalStorageStrategy.remove).toHaveBeenCalledWith('test-namespace:test-key');
      expect(mockIndexedDBStrategy.remove).toHaveBeenCalledWith('test-namespace:test-key');
    });
  });
  
  describe('invalidatePattern', () => {
    it('should remove data matching pattern from all storage strategies', async () => {
      mockMemoryStorage.keys.mockResolvedValueOnce(['test-key1', 'test-key2']);
      mockLocalStorageStrategy.keys.mockResolvedValueOnce(['test-key2', 'test-key3']);
      mockIndexedDBStrategy.keys.mockResolvedValueOnce(['test-key3', 'test-key4']);
      
      await cacheService.invalidatePattern('test-*');
      
      // Should get keys from all storage strategies
      expect(mockMemoryStorage.keys).toHaveBeenCalledWith('test-*');
      expect(mockLocalStorageStrategy.keys).toHaveBeenCalledWith('test-*');
      expect(mockIndexedDBStrategy.keys).toHaveBeenCalledWith('test-*');
      
      // Should remove all unique keys
      expect(mockMemoryStorage.remove).toHaveBeenCalledWith('test-key1');
      expect(mockMemoryStorage.remove).toHaveBeenCalledWith('test-key2');
      expect(mockMemoryStorage.remove).toHaveBeenCalledWith('test-key3');
      expect(mockMemoryStorage.remove).toHaveBeenCalledWith('test-key4');
      
      expect(mockLocalStorageStrategy.remove).toHaveBeenCalledWith('test-key1');
      expect(mockLocalStorageStrategy.remove).toHaveBeenCalledWith('test-key2');
      expect(mockLocalStorageStrategy.remove).toHaveBeenCalledWith('test-key3');
      expect(mockLocalStorageStrategy.remove).toHaveBeenCalledWith('test-key4');
      
      expect(mockIndexedDBStrategy.remove).toHaveBeenCalledWith('test-key1');
      expect(mockIndexedDBStrategy.remove).toHaveBeenCalledWith('test-key2');
      expect(mockIndexedDBStrategy.remove).toHaveBeenCalledWith('test-key3');
      expect(mockIndexedDBStrategy.remove).toHaveBeenCalledWith('test-key4');
    });
  });
  
  describe('persist', () => {
    it('should store data in IndexedDB with persist prefix', async () => {
      await cacheService.persist('test-key', 'test-data');
      
      expect(mockIndexedDBStrategy.set).toHaveBeenCalled();
      const setCall = mockIndexedDBStrategy.set.mock.calls[0];
      expect(setCall[0]).toBe('persist:test-key');
      
      const cacheEntry = setCall[1] as any;
      expect(cacheEntry.data).toBe('test-data');
      expect(cacheEntry.expires).toBeNull(); // Persisted data doesn't expire
    });
    
    it('should respect namespaces', async () => {
      await cacheService.persist('test-key', 'test-data', 'test-namespace');
      
      expect(mockIndexedDBStrategy.set).toHaveBeenCalled();
      const setCall = mockIndexedDBStrategy.set.mock.calls[0];
      expect(setCall[0]).toBe('persist:test-namespace:test-key');
    });
  });
  
  describe('isPersisted', () => {
    it('should check if data is persisted in IndexedDB', async () => {
      mockIndexedDBStrategy.get.mockResolvedValueOnce(null);
      const result1 = await cacheService.isPersisted('test-key');
      expect(result1).toBe(false);
      
      mockIndexedDBStrategy.get.mockResolvedValueOnce({ data: 'test-data', expires: null, createdAt: Date.now() });
      const result2 = await cacheService.isPersisted('test-key');
      expect(result2).toBe(true);
      
      expect(mockIndexedDBStrategy.get).toHaveBeenCalledWith('persist:test-key');
    });
  });
  
  describe('loadPersisted', () => {
    it('should load persisted data from IndexedDB', async () => {
      mockIndexedDBStrategy.get.mockResolvedValueOnce(null);
      const result1 = await cacheService.loadPersisted('test-key');
      expect(result1).toBeNull();
      
      const testData = { data: 'test-data', expires: null, createdAt: Date.now() };
      mockIndexedDBStrategy.get.mockResolvedValueOnce(testData);
      const result2 = await cacheService.loadPersisted('test-key');
      expect(result2).toBe('test-data');
      
      expect(mockIndexedDBStrategy.get).toHaveBeenCalledWith('persist:test-key');
    });
  });
  
  describe('clearAll', () => {
    it('should clear all storage strategies', async () => {
      await cacheService.clearAll();
      
      expect(mockMemoryStorage.clear).toHaveBeenCalled();
      expect(mockLocalStorageStrategy.clear).toHaveBeenCalled();
      expect(mockIndexedDBStrategy.clear).toHaveBeenCalled();
    });
  });
  
  describe('getTTL', () => {
    it('should return null for non-existent entries', async () => {
      const result = await cacheService.getTTL('test-key');
      expect(result).toBeNull();
    });
    
    it('should return null for entries without expiration', async () => {
      const testData = { data: 'test-data', expires: null, createdAt: Date.now() };
      mockMemoryStorage.get.mockResolvedValueOnce(testData);
      
      const result = await cacheService.getTTL('test-key');
      expect(result).toBeNull();
    });
    
    it('should return remaining TTL for entries with expiration', async () => {
      const expires = Date.now() + 60000; // 1 minute from now
      const testData = { data: 'test-data', expires, createdAt: Date.now() };
      mockMemoryStorage.get.mockResolvedValueOnce(testData);
      
      const result = await cacheService.getTTL('test-key');
      
      // Should be approximately 60000, but allow for small timing differences
      expect(result).toBeGreaterThan(59000);
      expect(result).toBeLessThanOrEqual(60000);
    });
  });
  
  describe('extendTTL', () => {
    it('should return false for non-existent entries', async () => {
      const result = await cacheService.extendTTL('test-key', 60000);
      expect(result).toBe(false);
    });
    
    it('should return true for entries without expiration', async () => {
      const testData = { data: 'test-data', expires: null, createdAt: Date.now() };
      mockMemoryStorage.get.mockResolvedValueOnce(testData);
      
      const result = await cacheService.extendTTL('test-key', 60000);
      expect(result).toBe(true);
      
      // Should not update the entry
      expect(mockMemoryStorage.set).not.toHaveBeenCalled();
    });
    
    it('should extend TTL for entries with expiration', async () => {
      const originalExpires = Date.now() + 60000; // 1 minute from now
      const testData = { data: 'test-data', expires: originalExpires, createdAt: Date.now() };
      
      // Entry exists in memory
      mockMemoryStorage.get.mockResolvedValueOnce(testData);
      mockMemoryStorage.get.mockResolvedValueOnce(testData);
      
      const additionalTime = 120000; // 2 minutes
      const result = await cacheService.extendTTL('test-key', additionalTime);
      
      expect(result).toBe(true);
      
      // Should update the entry
      expect(mockMemoryStorage.set).toHaveBeenCalled();
      const setCall = mockMemoryStorage.set.mock.calls[0];
      const updatedEntry = setCall[1] as any;
      
      // New expiration should be original + additional
      expect(updatedEntry.expires).toBe(originalExpires + additionalTime);
    });
  });
  
  describe('offline queue', () => {
    it('should execute operations immediately when online', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      const mockOperation = jest.fn().mockResolvedValue(undefined);
      cacheService.queueOfflineOperation(mockOperation);
      
      expect(mockOperation).toHaveBeenCalled();
    });
    
    it('should queue operations when offline', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      const mockOperation = jest.fn().mockResolvedValue(undefined);
      cacheService.queueOfflineOperation(mockOperation);
      
      expect(mockOperation).not.toHaveBeenCalled();
      expect(cacheService.getOfflineQueueLength()).toBe(1);
    });
  });
});