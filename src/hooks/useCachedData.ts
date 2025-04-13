import { useState, useEffect, useCallback, useRef } from 'react';
import { CacheService } from '../services/cache/cacheService';
import { MondayLogger } from '../services/api/mondayApi';

/**
 * Options for the useCachedData hook
 */
interface UseCachedDataOptions<T> {
  /**
   * Cache key to use for storing the data
   */
  cacheKey: string;
  
  /**
   * Cache namespace to use for storing the data
   */
  namespace?: string;
  
  /**
   * Function to fetch the data if not in cache
   */
  fetchFn: () => Promise<T>;
  
  /**
   * Time-to-live in milliseconds for the cached data
   */
  ttl?: number;
  
  /**
   * Whether to skip the initial fetch
   */
  skip?: boolean;
  
  /**
   * Dependencies array to trigger refetch
   */
  deps?: any[];
  
  /**
   * Whether to persist the data for offline use
   */
  persist?: boolean;
  
  /**
   * Function to transform the data before caching
   */
  transform?: (data: T) => T;
  
  /**
   * Whether to deduplicate concurrent requests for the same data
   */
  deduplicate?: boolean;
}

// Store for deduplicating in-flight requests
const pendingRequests: Record<string, Promise<any>> = {};

/**
 * Custom hook for fetching and caching data
 * 
 * This hook provides a way to fetch data with caching support, including:
 * - TTL-based caching
 * - Persistence for offline use
 * - Request deduplication
 * - Loading and error states
 * - Manual refetch capability
 * 
 * @param options Options for the hook
 * @returns Object containing data, loading state, error, and refetch function
 */
export function useCachedData<T>(options: UseCachedDataOptions<T>) {
  const {
    cacheKey,
    namespace,
    fetchFn,
    ttl = 5 * 60 * 1000, // 5 minutes default
    skip = false,
    deps = [],
    persist = false,
    transform,
    deduplicate = true
  } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!skip);
  const [error, setError] = useState<Error | null>(null);
  
  // Use a ref for the cache service to avoid recreating it on each render
  const cacheServiceRef = useRef<CacheService>(new CacheService());
  
  // Generate a unique request key for deduplication
  const requestKey = `${namespace || 'default'}:${cacheKey}`;
  
  // Function to fetch data and update cache
  const fetchData = useCallback(async (force: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first if not forcing a refresh
      if (!force) {
        const cachedData = await cacheServiceRef.current.get<T>(cacheKey, namespace);
        if (cachedData) {
          MondayLogger.debug(`Using cached data for ${cacheKey}`);
          setData(cachedData);
          setLoading(false);
          return cachedData;
        }
      }
      
      // If deduplication is enabled and there's already a request in progress
      if (deduplicate && requestKey in pendingRequests && !force) {
        MondayLogger.debug(`Deduplicating request for ${cacheKey}`);
        const result = await pendingRequests[requestKey];
        setData(result);
        setLoading(false);
        return result;
      }
      
      // Create the fetch promise
      const fetchPromise = async () => {
        try {
          MondayLogger.debug(`Fetching data for ${cacheKey}`);
          const fetchedData = await fetchFn();
          
          // Transform data if needed
          const finalData = transform ? transform(fetchedData) : fetchedData;
          
          // Cache the data
          await cacheServiceRef.current.set(
            cacheKey,
            finalData,
            { ttl, persistOnSet: persist },
            namespace
          );
          
          return finalData;
        } finally {
          // Remove from pending requests when done
          if (deduplicate) {
            delete pendingRequests[requestKey];
          }
        }
      };
      
      // Store the promise for deduplication if enabled
      if (deduplicate) {
        pendingRequests[requestKey] = fetchPromise();
      }
      
      // Execute the fetch
      const result = deduplicate ? await pendingRequests[requestKey] : await fetchPromise();
      
      setData(result);
      return result;
    } catch (err) {
      MondayLogger.error(`Error fetching data for ${cacheKey}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // Try to load persisted data if available
      if (persist) {
        try {
          const persistedData = await cacheServiceRef.current.loadPersisted<T>(cacheKey, namespace);
          if (persistedData) {
            MondayLogger.debug(`Using persisted data for ${cacheKey} due to fetch error`);
            setData(persistedData);
            return persistedData;
          }
        } catch (persistError) {
          MondayLogger.error(`Error loading persisted data for ${cacheKey}:`, persistError);
        }
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, namespace, fetchFn, ttl, persist, transform, deduplicate, requestKey]);
  
  // Function to manually refetch data
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);
  
  // Fetch data on mount and when dependencies change
  useEffect(() => {
    if (!skip) {
      fetchData();
    }
  }, [skip, fetchData, ...deps]);
  
  return { data, loading, error, refetch };
}

/**
 * Hook for prefetching data into cache
 * 
 * This hook allows prefetching data that might be needed later,
 * without setting state or causing re-renders.
 * 
 * @param options Options for prefetching
 * @returns Function to trigger prefetch
 */
export function usePrefetch<T>(options: Omit<UseCachedDataOptions<T>, 'skip'>) {
  const {
    cacheKey,
    namespace,
    fetchFn,
    ttl = 15 * 60 * 1000, // 15 minutes default for prefetched data
    persist = false,
    transform,
    deduplicate = true
  } = options;
  
  // Use a ref for the cache service to avoid recreating it on each render
  const cacheServiceRef = useRef<CacheService>(new CacheService());
  
  // Generate a unique request key for deduplication
  const requestKey = `prefetch:${namespace || 'default'}:${cacheKey}`;
  
  // Function to prefetch data
  const prefetch = useCallback(async () => {
    try {
      // Check if already in cache
      const cachedData = await cacheServiceRef.current.get<T>(cacheKey, namespace);
      if (cachedData) {
        MondayLogger.debug(`Data already in cache for ${cacheKey}`);
        return;
      }
      
      // If deduplication is enabled and there's already a request in progress
      if (deduplicate && requestKey in pendingRequests) {
        MondayLogger.debug(`Deduplicating prefetch request for ${cacheKey}`);
        await pendingRequests[requestKey];
        return;
      }
      
      // Create the fetch promise
      const fetchPromise = async () => {
        try {
          MondayLogger.debug(`Prefetching data for ${cacheKey}`);
          const fetchedData = await fetchFn();
          
          // Transform data if needed
          const finalData = transform ? transform(fetchedData) : fetchedData;
          
          // Cache the data with longer TTL
          await cacheServiceRef.current.set(
            cacheKey,
            finalData,
            { ttl, persistOnSet: persist },
            namespace
          );
          
          return finalData;
        } finally {
          // Remove from pending requests when done
          if (deduplicate) {
            delete pendingRequests[requestKey];
          }
        }
      };
      
      // Store the promise for deduplication if enabled
      if (deduplicate) {
        pendingRequests[requestKey] = fetchPromise();
        await pendingRequests[requestKey];
      } else {
        await fetchPromise();
      }
      
    } catch (err) {
      MondayLogger.error(`Error prefetching data for ${cacheKey}:`, err);
      // Don't throw errors for prefetch operations
    }
  }, [cacheKey, namespace, fetchFn, ttl, persist, transform, deduplicate, requestKey]);
  
  return prefetch;
}

/**
 * Hook for invalidating cached data
 * 
 * @param namespace Optional namespace
 * @returns Function to invalidate cache entries
 */
export function useInvalidateCache(namespace?: string) {
  // Use a ref for the cache service to avoid recreating it on each render
  const cacheServiceRef = useRef<CacheService>(new CacheService());
  
  // Function to invalidate a specific cache entry
  const invalidateEntry = useCallback((key: string) => {
    return cacheServiceRef.current.invalidate(key, namespace);
  }, [namespace]);
  
  // Function to invalidate cache entries matching a pattern
  const invalidatePattern = useCallback((pattern: string) => {
    return cacheServiceRef.current.invalidatePattern(pattern, namespace);
  }, [namespace]);
  
  // Function to clear all cache entries in the namespace
  const clearNamespace = useCallback(() => {
    return cacheServiceRef.current.invalidatePattern('*', namespace);
  }, [namespace]);
  
  return { invalidateEntry, invalidatePattern, clearNamespace };
}

export default useCachedData;