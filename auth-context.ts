import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import mondaySdk from 'monday-sdk-js';

// Initialize monday SDK
const monday = mondaySdk();

// Types
interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: any | null;
  boardIds: string[];
  workspaceIds: string[];
  loading: boolean;
  error: string | null;
  setToken: (token: string) => void;
  logout: () => void;
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
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [boardIds, setBoardIds] = useState<string[]>([]);
  const [workspaceIds, setWorkspaceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      monday.listen('context', (res: any) => {
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
        const query = `query { me { id name email url account { id name } } }`;
        const response = await monday.api(query);
        
        if (response.data && response.data.me) {
          setUser(response.data.me);
          setIsAuthenticated(true);
          setError(null);
        } else {
          throw new Error('Failed to fetch user data');
        }
      } catch (err: any) {
        console.error('Error fetching user data:', err);
        setError(err.message || 'Authentication failed');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [token]);

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;