import React, { useState, useEffect } from 'react';
import { boardService } from '../services/api/boardService';
import { Board, BoardKind, BoardActivity, Group, Item } from '../types/monday';
import { MondayTypes } from '../services/api/mondayApi';

/**
 * Example component demonstrating how to use the BoardService
 */
const BoardServiceExample: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [boardActivity, setBoardActivity] = useState<BoardActivity[]>([]);
  const [boardItems, setBoardItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all boards
  const fetchBoards = async (workspaceId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const fetchedBoards = await boardService.getBoards(workspaceId);
      setBoards(fetchedBoards);
      
      console.log('Fetched boards:', fetchedBoards);
    } catch (err) {
      handleError(err, 'Failed to fetch boards');
    } finally {
      setLoading(false);
    }
  };

  // Fetch a specific board by ID
  const fetchBoardById = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const board = await boardService.getBoardById(id);
      setSelectedBoard(board);
      
      console.log('Fetched board:', board);
      
      // If board exists, fetch its activity and items
      if (board) {
        fetchBoardActivity(id);
        fetchBoardItems(id);
      }
    } catch (err) {
      handleError(err, `Failed to fetch board with ID ${id}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch board activity
  const fetchBoardActivity = async (boardId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const activity = await boardService.getBoardActivity(boardId);
      setBoardActivity(activity);
      
      console.log('Fetched board activity:', activity);
    } catch (err) {
      handleError(err, `Failed to fetch activity for board with ID ${boardId}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch board items
  const fetchBoardItems = async (boardId: string, groupId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const items = await boardService.getBoardItems(boardId, { groupId });
      setBoardItems(items);
      
      console.log('Fetched board items:', items);
    } catch (err) {
      handleError(err, `Failed to fetch items for board with ID ${boardId}`);
    } finally {
      setLoading(false);
    }
  };

  // Create a new board
  const createBoard = async (name: string, boardKind: BoardKind, workspaceId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const newBoard = await boardService.createBoard(name, boardKind, workspaceId);
      
      console.log('Created board:', newBoard);
      
      // Refresh the boards list
      fetchBoards(workspaceId);
    } catch (err) {
      handleError(err, 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  // Duplicate a board
  const duplicateBoard = async (id: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const duplicatedBoard = await boardService.duplicateBoard(id, name);
      
      console.log('Duplicated board:', duplicatedBoard);
      
      // Refresh the boards list
      fetchBoards();
    } catch (err) {
      handleError(err, `Failed to duplicate board with ID ${id}`);
    } finally {
      setLoading(false);
    }
  };

  // Update a board
  const updateBoard = async (id: string, data: { name?: string; description?: string; state?: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedBoard = await boardService.updateBoard(id, data);
      
      console.log('Updated board:', updatedBoard);
      
      // Refresh the selected board
      if (selectedBoard?.id === id) {
        fetchBoardById(id);
      }
      
      // Refresh the boards list
      fetchBoards();
    } catch (err) {
      handleError(err, `Failed to update board with ID ${id}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete a board
  const deleteBoard = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await boardService.deleteBoard(id);
      
      console.log('Deleted board with ID:', id);
      
      // Clear selected board if it was deleted
      if (selectedBoard?.id === id) {
        setSelectedBoard(null);
        setBoardActivity([]);
        setBoardItems([]);
      }
      
      // Refresh the boards list
      fetchBoards();
    } catch (err) {
      handleError(err, `Failed to delete board with ID ${id}`);
    } finally {
      setLoading(false);
    }
  };

  // Create a new group in a board
  const createGroup = async (boardId: string, groupName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const group = await boardService.createGroup(boardId, groupName);
      
      console.log('Created group:', group);
      
      // Refresh the selected board to show the new group
      if (selectedBoard?.id === boardId) {
        fetchBoardById(boardId);
      }
    } catch (err) {
      handleError(err, `Failed to create group in board with ID ${boardId}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear the service cache
  const clearCache = () => {
    boardService.clearCache();
    console.log('Board service cache cleared');
  };

  // Error handling helper
  const handleError = (err: unknown, defaultMessage: string) => {
    console.error(defaultMessage, err);
    
    if (err instanceof MondayTypes.RateLimitError) {
      setError(`Rate limit exceeded. Please try again in ${err.retryAfter} seconds.`);
    } else if (err instanceof MondayTypes.AuthenticationError) {
      setError('Authentication failed. Please check your API token.');
    } else if (err instanceof MondayTypes.NetworkError) {
      setError('Network error. Please check your internet connection.');
    } else if (err instanceof MondayTypes.MondayApiError) {
      setError(`API Error: ${err.message}`);
    } else {
      setError(err instanceof Error ? err.message : defaultMessage);
    }
  };

  // Example usage in useEffect
  useEffect(() => {
    // Fetch all boards when component mounts
    fetchBoards();
    
    // Example of creating a board
    // createBoard('New Project Board', BoardKind.PUBLIC);
    
    // Example of fetching a specific board
    // fetchBoardById('12345');
    
    // Example of updating a board
    // updateBoard('12345', { name: 'Updated Board Name' });
    
    // Example of duplicating a board
    // duplicateBoard('12345', 'Duplicated Board');
    
    // Example of creating a group in a board
    // createGroup('12345', 'New Group');
    
    // Example of deleting a board
    // deleteBoard('12345');
    
    // Cleanup function
    return () => {
      // Optional: clear cache when component unmounts
      // boardService.clearCache();
    };
  }, []);

  return (
    <div className="board-service-example">
      <h1>Board Service Example</h1>
      
      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">Error: {error}</div>}
      
      <div className="actions">
        <button onClick={() => fetchBoards()} disabled={loading}>
          Fetch All Boards
        </button>
        <button onClick={clearCache} disabled={loading}>
          Clear Cache
        </button>
        <button 
          onClick={() => createBoard('New Board', BoardKind.PUBLIC)} 
          disabled={loading}
        >
          Create New Board
        </button>
      </div>
      
      <div className="boards-list">
        <h2>Boards ({boards.length})</h2>
        {boards.map(board => (
          <div key={board.id} className="board-item">
            <h3>{board.name}</h3>
            <p>{board.description || 'No description'}</p>
            <p>Kind: {board.board_kind}</p>
            <p>Items: {board.items_count || 0}</p>
            <div className="board-actions">
              <button 
                onClick={() => fetchBoardById(board.id)} 
                disabled={loading}
              >
                View Details
              </button>
              <button 
                onClick={() => duplicateBoard(board.id, `${board.name} (Copy)`)} 
                disabled={loading}
              >
                Duplicate
              </button>
              <button 
                onClick={() => updateBoard(board.id, { 
                  name: `${board.name} (Updated)` 
                })} 
                disabled={loading}
              >
                Update
              </button>
              <button 
                onClick={() => deleteBoard(board.id)} 
                disabled={loading}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {selectedBoard && (
        <div className="selected-board">
          <h2>Selected Board: {selectedBoard.name}</h2>
          <p>ID: {selectedBoard.id}</p>
          <p>Description: {selectedBoard.description || 'No description'}</p>
          <p>Kind: {selectedBoard.board_kind}</p>
          <p>State: {selectedBoard.state}</p>
          <p>Created: {selectedBoard.created_at}</p>
          <p>Updated: {selectedBoard.updated_at}</p>
          
          <div className="board-groups">
            <h3>Groups ({selectedBoard.groups?.length || 0})</h3>
            <button 
              onClick={() => createGroup(selectedBoard.id, 'New Group')} 
              disabled={loading}
            >
              Add Group
            </button>
            <div className="groups-list">
              {selectedBoard.groups?.map(group => (
                <div key={group.id} className="group-item">
                  <p>Name: {group.title}</p>
                  <p>Color: {group.color}</p>
                  <button 
                    onClick={() => fetchBoardItems(selectedBoard.id, group.id)} 
                    disabled={loading}
                  >
                    View Items
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="board-items">
            <h3>Items ({boardItems.length})</h3>
            <div className="items-list">
              {boardItems.map(item => (
                <div key={item.id} className="item-item">
                  <p>Name: {item.name}</p>
                  <p>Group: {item.group?.title}</p>
                  <p>Created: {item.created_at}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="board-activity">
            <h3>Recent Activity ({boardActivity.length})</h3>
            <button 
              onClick={() => fetchBoardActivity(selectedBoard.id)} 
              disabled={loading}
            >
              Refresh Activity
            </button>
            <div className="activity-list">
              {boardActivity.map(activity => (
                <div key={activity.id} className="activity-item">
                  <p>Event: {activity.event}</p>
                  <p>Entity: {activity.entity}</p>
                  <p>User: {activity.user?.name}</p>
                  <p>Date: {activity.created_at}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardServiceExample;