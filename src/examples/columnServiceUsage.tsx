import React, { useState, useEffect } from 'react';
import { columnService } from '../services/api/columnService';
import { Column } from '../types/monday';
import { ColumnType, ColumnValueOption, ColumnUpdateInput } from '../types/columnTypes';
import { MondayTypes } from '../services/api/mondayApi';

/**
 * Example component demonstrating how to use the ColumnService
 */
const ColumnServiceExample: React.FC = () => {
  const [boardId, setBoardId] = useState<string>('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);
  const [columnValues, setColumnValues] = useState<ColumnValueOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newColumnTitle, setNewColumnTitle] = useState<string>('');
  const [newColumnType, setNewColumnType] = useState<ColumnType>(ColumnType.TEXT);
  const [updateColumnValues, setUpdateColumnValues] = useState<ColumnUpdateInput>({});

  // Fetch columns for a board
  const fetchColumns = async () => {
    if (!boardId) {
      setError('Please enter a board ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const fetchedColumns = await columnService.getColumns(boardId);
      setColumns(fetchedColumns);
      
      console.log('Fetched columns:', fetchedColumns);
    } catch (err) {
      handleError(err, `Failed to fetch columns for board with ID ${boardId}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch a specific column by ID
  const fetchColumnById = async (columnId: string) => {
    if (!boardId) {
      setError('Board ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const column = await columnService.getColumnById(columnId, boardId);
      setSelectedColumn(column);
      
      console.log('Fetched column:', column);

      // If it's a status or dropdown column, fetch its values
      if (column && (column.type === 'status' || column.type === 'dropdown')) {
        fetchColumnValues(columnId);
      } else {
        setColumnValues([]);
      }
    } catch (err) {
      handleError(err, `Failed to fetch column with ID ${columnId}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch values for a status/dropdown column
  const fetchColumnValues = async (columnId: string) => {
    if (!boardId) {
      setError('Board ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const values = await columnService.getColumnValues(columnId, boardId);
      setColumnValues(values);
      
      console.log('Fetched column values:', values);
    } catch (err) {
      handleError(err, `Failed to fetch values for column with ID ${columnId}`);
    } finally {
      setLoading(false);
    }
  };

  // Create a new column
  const createColumn = async () => {
    if (!boardId || !newColumnTitle) {
      setError('Board ID and column title are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const column = await columnService.createColumn(
        boardId,
        newColumnTitle,
        newColumnType
      );
      
      console.log('Created column:', column);
      
      // Refresh columns
      fetchColumns();
      setNewColumnTitle('');
    } catch (err) {
      handleError(err, `Failed to create column in board with ID ${boardId}`);
    } finally {
      setLoading(false);
    }
  };

  // Update a column
  const updateColumn = async () => {
    if (!boardId || !selectedColumn) {
      setError('Board ID and selected column are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const updatedColumn = await columnService.updateColumn(
        selectedColumn.id,
        boardId,
        updateColumnValues
      );
      
      console.log('Updated column:', updatedColumn);
      
      // Refresh columns and selected column
      fetchColumns();
      fetchColumnById(selectedColumn.id);
      setUpdateColumnValues({});
    } catch (err) {
      handleError(err, `Failed to update column with ID ${selectedColumn.id}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete a column
  const deleteColumn = async (columnId: string) => {
    if (!boardId) {
      setError('Board ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await columnService.deleteColumn(columnId, boardId);
      
      console.log('Deleted column with ID:', columnId);
      
      // Refresh columns
      fetchColumns();
      if (selectedColumn?.id === columnId) {
        setSelectedColumn(null);
        setColumnValues([]);
      }
    } catch (err) {
      handleError(err, `Failed to delete column with ID ${columnId}`);
    } finally {
      setLoading(false);
    }
  };

  // Reorder columns
  const reorderColumns = async () => {
    if (!boardId || columns.length < 2) {
      setError('Board ID and at least 2 columns are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create a reversed order of column IDs for demonstration
      const reversedColumnIds = [...columns].reverse().map(column => column.id);
      
      await columnService.reorderColumns(boardId, reversedColumnIds);
      
      console.log('Reordered columns');
      
      // Refresh columns
      fetchColumns();
    } catch (err) {
      handleError(err, `Failed to reorder columns in board with ID ${boardId}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear cache
  const clearCache = () => {
    columnService.clearCache();
    console.log('Column service cache cleared');
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

  return (
    <div className="column-service-example">
      <h1>Column Service Example</h1>
      
      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">Error: {error}</div>}
      
      <div className="board-selector">
        <h2>Board Selection</h2>
        <input
          type="text"
          placeholder="Enter Board ID"
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
        />
        <button onClick={() => fetchColumns()} disabled={loading || !boardId}>
          Load Board Columns
        </button>
        <button onClick={clearCache} disabled={loading}>
          Clear Cache
        </button>
      </div>
      
      <div className="columns-section">
        <h2>Columns ({columns.length})</h2>
        
        <div className="create-column">
          <h3>Create New Column</h3>
          <input
            type="text"
            placeholder="Column Title"
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
          />
          <select
            value={newColumnType}
            onChange={(e) => setNewColumnType(e.target.value as ColumnType)}
          >
            {Object.values(ColumnType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <button onClick={createColumn} disabled={loading || !boardId || !newColumnTitle}>
            Create Column
          </button>
        </div>
        
        {columns.length > 1 && (
          <button onClick={reorderColumns} disabled={loading}>
            Reverse Column Order
          </button>
        )}
        
        <div className="columns-list">
          {columns.map(column => (
            <div key={column.id} className="column-item">
              <h3>{column.title}</h3>
              <p>ID: {column.id}</p>
              <p>Type: {column.type}</p>
              <div className="column-actions">
                <button 
                  onClick={() => fetchColumnById(column.id)} 
                  disabled={loading}
                >
                  Select Column
                </button>
                <button 
                  onClick={() => deleteColumn(column.id)} 
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {selectedColumn && (
        <div className="selected-column">
          <h2>Selected Column: {selectedColumn.title}</h2>
          
          <div className="column-details">
            <p>ID: {selectedColumn.id}</p>
            <p>Type: {selectedColumn.type}</p>
            <p>Settings: {selectedColumn.settings_str || 'None'}</p>
          </div>
          
          <div className="update-column">
            <h3>Update Column</h3>
            <input
              type="text"
              placeholder="New Title"
              value={updateColumnValues.title || ''}
              onChange={(e) => setUpdateColumnValues({...updateColumnValues, title: e.target.value})}
            />
            <button onClick={updateColumn} disabled={loading || !Object.keys(updateColumnValues).length}>
              Update Column
            </button>
          </div>
          
          {columnValues.length > 0 && (
            <div className="column-values">
              <h3>Column Values</h3>
              <div className="values-list">
                {columnValues.map(value => (
                  <div 
                    key={value.id} 
                    className="value-item"
                    style={{ backgroundColor: value.color, padding: '5px', margin: '5px', borderRadius: '3px' }}
                  >
                    {value.value}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ColumnServiceExample;