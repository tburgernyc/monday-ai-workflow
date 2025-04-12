import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import mondaySdk from 'monday-sdk-js';
import { User, MondayContext, ApiResponse } from '../../types/monday';
import { ApiError } from '../../types/errors';

// Initialize monday SDK
const monday = mondaySdk();

// Types
// Renamed from MondayUser to avoid conflict with imported type
export type MondayUser = User;

export interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: MondayUser | null;
  boardIds: string[];
  workspaceIds: string[];
  loading: boolean;
  error: string | null;
  setToken: (token: string) => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  token: null,
  user: null,
  boardIds: [],
  workspaceIds: [],
  loading: true,
  error: null,
  setToken: () => {},
  logout: () => {},
  refreshToken: async () => false,
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<MondayUser | null>(null);
  const [boardIds, setBoardIds] = useState<string[]>([]);
  const [workspaceIds, setWorkspaceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number>(Date.now());

  // Set token and initialize monday SDK
  const setToken = (newToken: string) => {
    localStorage.setItem('monday_token', newToken);
    setTokenState(newToken);
    monday.setToken(newToken);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('monday_token');
    setTokenState(null);
    setIsAuthenticated(false);
    setUser(null);
    setBoardIds([]);
    setWorkspaceIds([]);
  };

  // Effect to check for stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('monday_token');
    
    if (storedToken) {
      setToken(storedToken);
    } else {
      // Get token from URL or monday context
      monday.listen('context', (res: { data: MondayContext }) => {
        if (res.data.token) {
          setToken(res.data.token);
        }
        
        // Set board and workspace IDs if available
        if (res.data.boardIds) {
          setBoardIds(Array.isArray(res.data.boardIds) ? res.data.boardIds : [res.data.boardIds]);
        }
        
        if (res.data.workspaceIds) {
          setWorkspaceIds(Array.isArray(res.data.workspaceIds) ? res.data.workspaceIds : [res.data.workspaceIds]);
        }
      });
    }
    
    setLoading(false);
  }, []);

  // Refresh token function
  const refreshToken = async (): Promise<boolean> => {
    try {
      // In a real app, you would implement token refresh logic here
      // For now, we'll just check if the current token is still valid
      
      // Only attempt refresh if we have a token
      if (!token) {
        return false;
      }
      
      const query = `query { me { id } }`;
      await monday.api(query);
      
      // If we get here, the token is still valid
      setLastTokenRefresh(Date.now());
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, log the user out
      logout();
      return false;
    }
  };

  // Effect to fetch user data when token changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }
      
      setLoading(true);
      
      try {
        const query = `query { me { id name email url photo_url title account { id name } } }`;
        const response = await monday.api(query);
        
        // Handle the response properly with type assertion
        const typedResponse = response as ApiResponse<{ me: MondayUser }>;
        
        if (typedResponse.data && typedResponse.data.me) {
          setUser(typedResponse.data.me);
          setIsAuthenticated(true);
          setError(null);
        } else {
          throw new Error('Failed to fetch user data');
        }
      } catch (err: unknown) {
        console.error('Error fetching user data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [token]);
  
  // Effect to periodically check token validity (every 15 minutes)
  useEffect(() => {
    if (!token) return;
    
    const tokenCheckInterval = setInterval(() => {
      // If it's been more than 15 minutes since the last refresh, check the token
      if (Date.now() - lastTokenRefresh > 15 * 60 * 1000) {
        refreshToken().catch(console.error);
      }
    }, 60 * 1000); // Check every minute
    
    return () => clearInterval(tokenCheckInterval);
  }, [token, lastTokenRefresh]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        user,
        boardIds,
        workspaceIds,
        loading,
        error,
        setToken,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;