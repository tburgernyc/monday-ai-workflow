import React, { useState, useEffect } from 'react';
import { CacheService, CacheStorage } from '../services/cache';
import { BoardService } from '../services/api/boardService';

/**
 * Example component demonstrating CacheService usage
 */
const CacheServiceExample: React.FC = () => {
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cacheStatus, setCacheStatus] = useState<string>('');
  const [offlineStatus, setOfflineStatus] = useState<boolean>(navigator.onLine);
  
  // Initialize cache service
  const cacheService = new CacheService({
    ttl: 5 * 60 * 1000, // 5 minutes
    storage: CacheStorage.LocalStorage,
    persistOnSet: true
  });
  
  // Initialize board service
  const boardService = new BoardService();
  
  // Function to fetch boards with caching
  const fetchBoards = async () => {
    setLoading(true);
    setCacheStatus('');
    
    try {
      // Try to get from cache first
      const cachedBoards = await cacheService.get<any[]>('all_boards', 'boards');
      
      if (cachedBoards) {
        // Use cached data
        setBoards(cachedBoards);
        setCacheStatus('Data loaded from cache');
        setLoading(false);
        
        // Refresh in background if online
        if (navigator.onLine) {
          refreshBoardsInBackground();
        }
      } else {
        // No cache, fetch from API
        await fetchBoardsFromAPI();
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
      setCacheStatus('Error: ' + (error as Error).message);
      setLoading(false);
    }
  };
  
  // Function to fetch boards from API
  const fetchBoardsFromAPI = async () => {
    try {
      if (!navigator.onLine) {
        // Try to load from persistence if offline
        const persistedBoards = await cacheService.loadPersisted<any[]>('all_boards', 'boards');
        
        if (persistedBoards) {
          setBoards(persistedBoards);
          setCacheStatus('Offline: Using persisted data');
        } else {
          setCacheStatus('Offline: No persisted data available');
        }
        
        setLoading(false);
        return;
      }
      
      // Fetch from API
      const fetchedBoards = await boardService.getBoards();
      
      // Cache the results
      await cacheService.set('all_boards', fetchedBoards, {}, 'boards');
      
      setBoards(fetchedBoards);
      setCacheStatus('Data loaded from API and cached');
      setLoading(false);
    } catch (error) {
      console.error('Error fetching from API:', error);
      setCacheStatus('API Error: ' + (error as Error).message);
      setLoading(false);
    }
  };
  
  // Refresh boards in background without showing loading state
  const refreshBoardsInBackground = async () => {
    try {
      // Fetch from API
      const fetchedBoards = await boardService.getBoards();
      
      // Update cache
      await cacheService.set('all_boards', fetchedBoards, {}, 'boards');
      
      // Update state
      setBoards(fetchedBoards);
      setCacheStatus('Data refreshed in background');
    } catch (error) {
      console.error('Error refreshing boards:', error);
      // Don't update status to avoid confusing the user
    }
  };
  
  // Clear cache
  const clearCache = async () => {
    await cacheService.invalidate('all_boards', 'boards');
    setCacheStatus('Cache cleared');
  };
  
  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setOfflineStatus(true);
      // Refresh data when coming back online
      fetchBoardsFromAPI();
    };
    
    const handleOffline = () => {
      setOfflineStatus(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial fetch
    fetchBoards();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return (
    <div className="cache-example">
      <h2>Cache Service Example</h2>
      
      <div className="status-bar">
        <div className={`connection-status ${offlineStatus ? 'online' : 'offline'}`}>
          {offlineStatus ? 'Online' : 'Offline'}
        </div>
        
        <div className="cache-status">
          {cacheStatus}
        </div>
      </div>
      
      <div className="actions">
        <button onClick={fetchBoards} disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Boards'}
        </button>
        
        <button onClick={fetchBoardsFromAPI} disabled={loading || !offlineStatus}>
          Force Refresh
        </button>
        
        <button onClick={clearCache}>
          Clear Cache
        </button>
      </div>
      
      <div className="boards-list">
        <h3>Boards ({boards.length})</h3>
        
        {loading ? (
          <div className="loading">Loading boards...</div>
        ) : (
          <ul>
            {boards.map((board: any) => (
              <li key={board.id}>
                <strong>{board.name}</strong>
                <span className="board-info">ID: {board.id}</span>
              </li>
            ))}
          </ul>
        )}
        
        {boards.length === 0 && !loading && (
          <div className="no-data">No boards found</div>
        )}
      </div>
      
      <div className="cache-info">
        <h3>Cache Information</h3>
        <CacheInfoPanel cacheService={cacheService} />
      </div>
    </div>
  );
};

/**
 * Component to display cache information
 */
const CacheInfoPanel: React.FC<{ cacheService: CacheService }> = ({ cacheService }) => {
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [offlineQueueLength, setOfflineQueueLength] = useState<number>(0);
  
  // Update cache info periodically
  useEffect(() => {
    const updateCacheInfo = async () => {
      const size = await cacheService.getCacheSize();
      setCacheSize(size);
      setOfflineQueueLength(cacheService.getOfflineQueueLength());
    };
    
    updateCacheInfo();
    const interval = setInterval(updateCacheInfo, 5000);
    
    return () => clearInterval(interval);
  }, [cacheService]);
  
  return (
    <div className="cache-info-panel">
      <div className="info-item">
        <span className="label">Cache Size:</span>
        <span className="value">{formatBytes(cacheSize)}</span>
      </div>
      
      <div className="info-item">
        <span className="label">Offline Queue:</span>
        <span className="value">{offlineQueueLength} operations</span>
      </div>
      
      <div className="info-item">
        <span className="label">Online Status:</span>
        <span className="value">{cacheService.isOnline() ? 'Online' : 'Offline'}</span>
      </div>
    </div>
  );
};

/**
 * Format bytes to human-readable format
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default CacheServiceExample;