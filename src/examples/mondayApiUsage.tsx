import React, { useEffect, useState } from 'react';
import { MondayApi, MondayTypes, MondayLogger } from '../services/api/mondayApi';
import { User, Board } from '../types/monday';

/**
 * Example component demonstrating how to use the mondayApi service
 */
const MondayApiExample: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Example of fetching data using the mondayApi service
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current user information
        const currentUser = await MondayApi.users.me();
        setUser(currentUser);
        
        // Get all boards
        const userBoards = await MondayApi.boards.getAll({ limit: 10 });
        setBoards(userBoards);
        
        setLoading(false);
      } catch (err: unknown) {
        // Handle different types of errors
        if (err instanceof MondayTypes.RateLimitError) {
          setError(`Rate limit exceeded. Please try again in ${err.retryAfter} seconds.`);
          MondayLogger.warn('Rate limit exceeded', err);
        } else if (err instanceof MondayTypes.AuthenticationError) {
          setError('Authentication failed. Please check your API token.');
          MondayLogger.error('Authentication error', err);
        } else {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
          setError(`An error occurred: ${errorMessage}`);
          MondayLogger.error('API error', err);
        }
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Example of creating a new board
  const createNewBoard = async (name: string) => {
    try {
      setLoading(true);
      const newBoard = await MondayApi.boards.create(name, {
        boardKind: 'public'
      });
      
      // Add the new board to the list
      setBoards(prevBoards => [...prevBoards, newBoard]);
      setLoading(false);
      return newBoard;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to create board: ${errorMessage}`);
      setLoading(false);
      throw err;
    }
  };

  // Example of creating a new item in a board
  const createNewItem = async (boardId: string, groupId: string, itemName: string) => {
    try {
      const newItem = await MondayApi.items.create(boardId, groupId, itemName, {
        status: { label: "Working on it" },
        date: { date: new Date().toISOString().split('T')[0] }
      });
      return newItem;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to create item: ${errorMessage}`);
      throw err;
    }
  };

  // Example of pagination with large datasets
  const fetchAllItems = async (boardId: string) => {
    try {
      setLoading(true);
      
      // This will automatically handle pagination for large datasets
      const items = await MondayApi.items.getByBoardId(boardId, {
        limit: 100 // Items per page
      });
      
      setLoading(false);
      return items;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to fetch items: ${errorMessage}`);
      setLoading(false);
      throw err;
    }
  };

  return (
    <div>
      <h1>Monday API Example</h1>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div style={{ color: 'red', padding: '10px', backgroundColor: '#ffeeee' }}>
          {error}
        </div>
      )}
      
      {user && (
        <div>
          <h2>Current User</h2>
          <p>Name: {user.name}</p>
          <p>Email: {user.email}</p>
        </div>
      )}
      
      {boards.length > 0 && (
        <div>
          <h2>Your Boards</h2>
          <ul>
            {boards.map(board => (
              <li key={board.id}>
                {board.name} ({board.board_kind})
              </li>
            ))}
          </ul>
          
          <button 
            onClick={() => createNewBoard('New Project Board')}
            disabled={loading}
          >
            Create New Board
          </button>
        </div>
      )}
    </div>
  );
};

export default MondayApiExample;