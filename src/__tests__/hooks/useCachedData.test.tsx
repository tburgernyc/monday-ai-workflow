import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCachedData, useInvalidateCache, usePrefetch } from '../../hooks/useCachedData';
import { CacheService } from '../../services/cache/cacheService';

// Mock the CacheService
jest.mock('../../services/cache/cacheService', () => {
  return {
    CacheService: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
      invalidatePattern: jest.fn(),
      loadPersisted: jest.fn()
    })),
    CacheStorage: {
      Memory: 'memory'
    }
  };
});

// Mock the MondayLogger
jest.mock('../../services/api/mondayApi', () => ({
  MondayLogger: {
    debug: jest.fn(),
    error: jest.fn()
  }
}));

describe('useCachedData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and cache data when not in cache', async () => {
    // Mock data
    const testData = { id: '1', name: 'Test Data' };
    const fetchFn = jest.fn().mockResolvedValue(testData);
    
    // Mock cache miss
    (CacheService.prototype.get as jest.Mock).mockResolvedValue(null);
    
    // Render the hook
    const { result } = renderHook(() => useCachedData({
      cacheKey: 'test-key',
      namespace: 'test-namespace',
      fetchFn
    }));
    
    // Initially loading, no data, no error
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
    
    // Wait for the fetch to complete
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    // Verify data is loaded
    expect(result.current.data).toEqual(testData);
    expect(result.current.error).toBe(null);
    
    // Verify cache interactions
    expect(CacheService.prototype.get).toHaveBeenCalledWith('test-key', 'test-namespace');
    expect(fetchFn).toHaveBeenCalled();
    expect(CacheService.prototype.set).toHaveBeenCalledWith(
      'test-key',
      testData,
      expect.any(Object),
      'test-namespace'
    );
  });

  it('should use cached data when available', async () => {
    // Mock data
    const cachedData = { id: '1', name: 'Cached Data' };
    const fetchFn = jest.fn().mockResolvedValue({ id: '1', name: 'Fresh Data' });
    
    // Mock cache hit
    (CacheService.prototype.get as jest.Mock).mockResolvedValue(cachedData);
    
    // Render the hook
    const { result } = renderHook(() => useCachedData({
      cacheKey: 'test-key',
      namespace: 'test-namespace',
      fetchFn
    }));
    
    // Wait for the hook to process
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    // Verify cached data is used
    expect(result.current.data).toEqual(cachedData);
    expect(result.current.error).toBe(null);
    
    // Verify fetch was not called
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should handle fetch errors', async () => {
    // Mock error
    const testError = new Error('Fetch failed');
    const fetchFn = jest.fn().mockRejectedValue(testError);
    
    // Mock cache miss
    (CacheService.prototype.get as jest.Mock).mockResolvedValue(null);
    
    // Render the hook
    const { result } = renderHook(() => useCachedData({
      cacheKey: 'test-key',
      namespace: 'test-namespace',
      fetchFn
    }));
    
    // Wait for the fetch to complete
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    // Verify error is captured
    expect(result.current.data).toBe(null);
    expect(result.current.error).toEqual(testError);
  });

  it('should try to load persisted data on fetch error when persist is true', async () => {
    // Mock error and persisted data
    const testError = new Error('Fetch failed');
    const persistedData = { id: '1', name: 'Persisted Data' };
    const fetchFn = jest.fn().mockRejectedValue(testError);
    
    // Mock cache miss but persisted data hit
    (CacheService.prototype.get as jest.Mock).mockResolvedValue(null);
    (CacheService.prototype.loadPersisted as jest.Mock).mockResolvedValue(persistedData);
    
    // Render the hook
    const { result } = renderHook(() => useCachedData({
      cacheKey: 'test-key',
      namespace: 'test-namespace',
      fetchFn,
      persist: true
    }));
    
    // Wait for the fetch to complete
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    // Verify persisted data is used
    expect(result.current.data).toEqual(persistedData);
    expect(result.current.error).toEqual(testError);
    
    // Verify persisted data was loaded
    expect(CacheService.prototype.loadPersisted).toHaveBeenCalledWith('test-key', 'test-namespace');
  });

  it('should refetch data when refetch is called', async () => {
    // Mock data
    const initialData = { id: '1', name: 'Initial Data' };
    const updatedData = { id: '1', name: 'Updated Data' };
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(updatedData);
    
    // Mock cache miss
    (CacheService.prototype.get as jest.Mock).mockResolvedValue(null);
    
    // Render the hook
    const { result } = renderHook(() => useCachedData({
      cacheKey: 'test-key',
      namespace: 'test-namespace',
      fetchFn
    }));
    
    // Wait for the initial fetch to complete
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    // Verify initial data is loaded
    expect(result.current.data).toEqual(initialData);
    
    // Call refetch
    await act(async () => {
      await result.current.refetch();
    });
    
    // Verify updated data is loaded
    expect(result.current.data).toEqual(updatedData);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('should skip fetch when skip is true', async () => {
    // Mock data
    const fetchFn = jest.fn().mockResolvedValue({ id: '1', name: 'Test Data' });
    
    // Render the hook with skip=true
    const { result } = renderHook(() => useCachedData({
      cacheKey: 'test-key',
      namespace: 'test-namespace',
      fetchFn,
      skip: true
    }));
    
    // Verify loading is false and fetch was not called
    expect(result.current.loading).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(CacheService.prototype.get).not.toHaveBeenCalled();
  });

  it('should deduplicate concurrent requests for the same data', async () => {
    // Mock data
    const testData = { id: '1', name: 'Test Data' };
    const fetchFn1 = jest.fn().mockResolvedValue(testData);
    const fetchFn2 = jest.fn().mockResolvedValue(testData);
    
    // Mock cache miss
    (CacheService.prototype.get as jest.Mock).mockResolvedValue(null);
    
    // Render two hooks with the same cache key
    const { result: result1 } = renderHook(() => useCachedData({
      cacheKey: 'test-key',
      namespace: 'test-namespace',
      fetchFn: fetchFn1,
      deduplicate: true
    }));
    
    const { result: result2 } = renderHook(() => useCachedData({
      cacheKey: 'test-key',
      namespace: 'test-namespace',
      fetchFn: fetchFn2,
      deduplicate: true
    }));
    
    // Wait for both hooks to complete
    await waitFor(() => expect(result1.current.loading).toBe(false));
    await waitFor(() => expect(result2.current.loading).toBe(false));
    
    // Verify both hooks have the data
    expect(result1.current.data).toEqual(testData);
    expect(result2.current.data).toEqual(testData);
    
    // Verify only one fetch was called
    expect(fetchFn1).toHaveBeenCalledTimes(1);
    expect(fetchFn2).not.toHaveBeenCalled();
  });
});

describe('useInvalidateCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should invalidate a specific cache entry', async () => {
    // Render the hook
    const { result } = renderHook(() => useInvalidateCache('test-namespace'));
    
    // Call invalidateEntry
    await act(async () => {
      await result.current.invalidateEntry('test-key');
    });
    
    // Verify cache invalidation
    expect(CacheService.prototype.invalidate).toHaveBeenCalledWith('test-key', 'test-namespace');
  });

  it('should invalidate cache entries matching a pattern', async () => {
    // Render the hook
    const { result } = renderHook(() => useInvalidateCache('test-namespace'));
    
    // Call invalidatePattern
    await act(async () => {
      await result.current.invalidatePattern('test-*');
    });
    
    // Verify cache invalidation
    expect(CacheService.prototype.invalidatePattern).toHaveBeenCalledWith('test-*', 'test-namespace');
  });

  it('should clear all cache entries in the namespace', async () => {
    // Render the hook
    const { result } = renderHook(() => useInvalidateCache('test-namespace'));
    
    // Call clearNamespace
    await act(async () => {
      await result.current.clearNamespace();
    });
    
    // Verify cache invalidation
    expect(CacheService.prototype.invalidatePattern).toHaveBeenCalledWith('*', 'test-namespace');
  });
});

describe('usePrefetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prefetch and cache data', async () => {
    // Mock data
    const testData = { id: '1', name: 'Test Data' };
    const fetchFn = jest.fn().mockResolvedValue(testData);
    
    // Mock cache miss
    (CacheService.prototype.get as jest.Mock).mockResolvedValue(null);
    
    // Render the hook
    const { result } = renderHook(() => usePrefetch({
      cacheKey: 'test-key',
      namespace: 'test-namespace',
      fetchFn
    }));
    
    // Call prefetch
    await act(async () => {
      await result.current();
    });
    
    // Verify fetch was called and data was cached
    expect(fetchFn).toHaveBeenCalled();
    expect(CacheService.prototype.set).toHaveBeenCalledWith(
      'test-key',
      testData,
      expect.any(Object),
      'test-namespace'
    );
  });

  it('should not prefetch if data is already in cache', async () => {
    // Mock data
    const cachedData = { id: '1', name: 'Cached Data' };
    const fetchFn = jest.fn().mockResolvedValue({ id: '1', name: 'Fresh Data' });
    
    // Mock cache hit
    (CacheService.prototype.get as jest.Mock).mockResolvedValue(cachedData);
    
    // Render the hook
    const { result } = renderHook(() => usePrefetch({
      cacheKey: 'test-key',
      namespace: 'test-namespace',
      fetchFn
    }));
    
    // Call prefetch
    await act(async () => {
      await result.current();
    });
    
    // Verify fetch was not called
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should handle errors during prefetch without throwing', async () => {
    // Mock error
    const testError = new Error('Prefetch failed');
    const fetchFn = jest.fn().mockRejectedValue(testError);
    
    // Mock cache miss
    (CacheService.prototype.get as jest.Mock).mockResolvedValue(null);
    
    // Render the hook
    const { result } = renderHook(() => usePrefetch({
      cacheKey: 'test-key',
      namespace: 'test-namespace',
      fetchFn
    }));
    
    // Call prefetch (should not throw)
    await act(async () => {
      await result.current();
    });
    
    // Verify fetch was called but error was handled
    expect(fetchFn).toHaveBeenCalled();
    expect(CacheService.prototype.set).not.toHaveBeenCalled();
  });
});