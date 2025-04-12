import React, { useState, useEffect } from 'react';
import { itemService } from '../services/api/itemService';
import { groupService } from '../services/api/groupService';
import { Item, Group, ColumnValue } from '../types/monday';
import { ItemQueryOptions } from '../types/itemTypes';
import { GroupUpdateInput } from '../types/groupTypes';
import { MondayTypes } from '../services/api/mondayApi';

/**
 * Example component demonstrating how to use the ItemService and GroupService
 */
const ItemAndGroupServiceExample: React.FC = () => {
  const [boardId, setBoardId] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newItemName, setNewItemName] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [updateItemValues, setUpdateItemValues] = useState<Record<string, string>>({});
  const [updateGroupValues, setUpdateGroupValues] = useState<GroupUpdateInput>({});

  // Fetch groups for a board
  const fetchGroups = async () => {
    if (!boardId) {
      setError('Please enter a board ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const fetchedGroups = await groupService.getGroups(boardId);
      setGroups(fetchedGroups);
      
      console.log('Fetched groups:', fetchedGroups);
    } catch (err) {
      handleError(err, `Failed to fetch groups for board with ID ${boardId}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch items for a board with optional group filter
  const fetchItems = async (groupId?: string) => {
    if (!boardId) {
      setError('Please enter a board ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const options: ItemQueryOptions = {};
      if (groupId) {
        options.groupId = groupId;
      }
      
      const fetchedItems = await itemService.getItems(boardId, options);
      setItems(fetchedItems);
      
      console.log('Fetched items:', fetchedItems);
    } catch (err) {
      handleError(err, `Failed to fetch items for board with ID ${boardId}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch a specific item by ID
  const fetchItemById = async (itemId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const item = await itemService.getItemById(itemId);
      setSelectedItem(item);
      
      console.log('Fetched item:', item);
    } catch (err) {
      handleError(err, `Failed to fetch item with ID ${itemId}`);
    } finally {
      setLoading(false);
    }
  };

  // Create a new group
  const createGroup = async () => {
    if (!boardId || !newGroupName) {
      setError('Board ID and group name are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const group = await groupService.createGroup(boardId, newGroupName);
      
      console.log('Created group:', group);
      
      // Refresh groups
      fetchGroups();
      setNewGroupName('');
    } catch (err) {
      handleError(err, `Failed to create group in board with ID ${boardId}`);
    } finally {
      setLoading(false);
    }
  };

  // Update a group
  const updateGroup = async () => {
    if (!boardId || !selectedGroup) {
      setError('Board ID and selected group are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const updatedGroup = await groupService.updateGroup(
        boardId,
        selectedGroup.id,
        updateGroupValues
      );
      
      console.log('Updated group:', updatedGroup);
      
      // Refresh groups
      fetchGroups();
      setUpdateGroupValues({});
    } catch (err) {
      handleError(err, `Failed to update group with ID ${selectedGroup.id}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete a group
  const deleteGroup = async (groupId: string) => {
    if (!boardId) {
      setError('Board ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await groupService.deleteGroup(boardId, groupId);
      
      console.log('Deleted group with ID:', groupId);
      
      // Refresh groups
      fetchGroups();
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
    } catch (err) {
      handleError(err, `Failed to delete group with ID ${groupId}`);
    } finally {
      setLoading(false);
    }
  };

  // Reorder groups
  const reorderGroups = async () => {
    if (!boardId || groups.length < 2) {
      setError('Board ID and at least 2 groups are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create a reversed order of group IDs for demonstration
      const reversedGroupIds = [...groups].reverse().map(group => group.id);
      
      await groupService.reorderGroups(boardId, reversedGroupIds);
      
      console.log('Reordered groups');
      
      // Refresh groups
      fetchGroups();
    } catch (err) {
      handleError(err, `Failed to reorder groups in board with ID ${boardId}`);
    } finally {
      setLoading(false);
    }
  };

  // Create a new item
  const createItem = async () => {
    if (!boardId || !selectedGroup || !newItemName) {
      setError('Board ID, group, and item name are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const item = await itemService.createItem(
        boardId,
        selectedGroup.id,
        newItemName
      );
      
      console.log('Created item:', item);
      
      // Refresh items
      fetchItems(selectedGroup.id);
      setNewItemName('');
    } catch (err) {
      handleError(err, `Failed to create item in board with ID ${boardId}`);
    } finally {
      setLoading(false);
    }
  };

  // Update an item
  const updateItem = async () => {
    if (!selectedItem) {
      setError('Selected item is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Convert string values to appropriate format for column values
      const columnValues: Record<string, unknown> = {};
      
      Object.entries(updateItemValues).forEach(([key, value]) => {
        // This is a simplified example - in a real app, you'd need to format
        // values according to the column type (date, status, etc.)
        columnValues[key] = value;
      });
      
      const updatedItem = await itemService.updateItem(
        selectedItem.id,
        columnValues
      );
      
      console.log('Updated item:', updatedItem);
      
      // Refresh the selected item
      fetchItemById(selectedItem.id);
      setUpdateItemValues({});
    } catch (err) {
      handleError(err, `Failed to update item with ID ${selectedItem.id}`);
    } finally {
      setLoading(false);
    }
  };

  // Move an item to a different group
  const moveItem = async (itemId: string, targetGroupId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const movedItem = await itemService.moveItem(itemId, targetGroupId);
      
      console.log('Moved item:', movedItem);
      
      // Refresh items
      fetchItems();
      if (selectedItem?.id === itemId) {
        fetchItemById(itemId);
      }
    } catch (err) {
      handleError(err, `Failed to move item with ID ${itemId}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete an item
  const deleteItem = async (itemId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await itemService.deleteItem(itemId);
      
      console.log('Deleted item with ID:', itemId);
      
      // Refresh items
      fetchItems(selectedGroup?.id);
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
      }
    } catch (err) {
      handleError(err, `Failed to delete item with ID ${itemId}`);
    } finally {
      setLoading(false);
    }
  };

  // Batch create items
  const batchCreateItems = async () => {
    if (!boardId || !selectedGroup) {
      setError('Board ID and group are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create 3 sample items
      const items = [
        { name: 'Batch Item 1', groupId: selectedGroup.id },
        { name: 'Batch Item 2', groupId: selectedGroup.id },
        { name: 'Batch Item 3', groupId: selectedGroup.id }
      ];
      
      const createdItems = await itemService.batchCreateItems(boardId, items);
      
      console.log('Batch created items:', createdItems);
      
      // Refresh items
      fetchItems(selectedGroup.id);
    } catch (err) {
      handleError(err, `Failed to batch create items in board with ID ${boardId}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear caches
  const clearCaches = () => {
    itemService.clearCache();
    groupService.clearCache();
    console.log('Item and Group service caches cleared');
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
    <div className="item-group-service-example">
      <h1>Item and Group Service Example</h1>
      
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
        <button onClick={() => fetchGroups()} disabled={loading || !boardId}>
          Load Board Data
        </button>
        <button onClick={clearCaches} disabled={loading}>
          Clear Caches
        </button>
      </div>
      
      <div className="groups-section">
        <h2>Groups ({groups.length})</h2>
        
        <div className="create-group">
          <h3>Create New Group</h3>
          <input
            type="text"
            placeholder="Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <button onClick={createGroup} disabled={loading || !boardId || !newGroupName}>
            Create Group
          </button>
        </div>
        
        {groups.length > 1 && (
          <button onClick={reorderGroups} disabled={loading}>
            Reverse Group Order
          </button>
        )}
        
        <div className="groups-list">
          {groups.map(group => (
            <div key={group.id} className="group-item">
              <h3 style={{ color: group.color || 'black' }}>{group.title}</h3>
              <p>ID: {group.id}</p>
              <p>Position: {group.position}</p>
              <div className="group-actions">
                <button 
                  onClick={() => {
                    setSelectedGroup(group);
                    fetchItems(group.id);
                  }} 
                  disabled={loading}
                >
                  Select Group
                </button>
                <button 
                  onClick={() => deleteGroup(group.id)} 
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {selectedGroup && (
        <div className="selected-group">
          <h2>Selected Group: {selectedGroup.title}</h2>
          
          <div className="update-group">
            <h3>Update Group</h3>
            <input
              type="text"
              placeholder="New Title"
              value={updateGroupValues.title || ''}
              onChange={(e) => setUpdateGroupValues({...updateGroupValues, title: e.target.value})}
            />
            <input
              type="text"
              placeholder="New Color (e.g., 'green', '#00FF00')"
              value={updateGroupValues.color || ''}
              onChange={(e) => setUpdateGroupValues({...updateGroupValues, color: e.target.value})}
            />
            <button onClick={updateGroup} disabled={loading || !Object.keys(updateGroupValues).length}>
              Update Group
            </button>
          </div>
          
          <div className="create-item">
            <h3>Create New Item</h3>
            <input
              type="text"
              placeholder="Item Name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
            />
            <button onClick={createItem} disabled={loading || !newItemName}>
              Create Item
            </button>
            <button onClick={batchCreateItems} disabled={loading}>
              Create 3 Sample Items
            </button>
          </div>
          
          <div className="items-list">
            <h3>Items in Group ({items.length})</h3>
            {items.map(item => (
              <div key={item.id} className="item-item">
                <h4>{item.name}</h4>
                <p>ID: {item.id}</p>
                <p>Created: {item.created_at}</p>
                <div className="item-actions">
                  <button
                    onClick={() => fetchItemById(item.id)}
                    disabled={loading}
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                  {groups.length > 1 && (
                    <select
                      onChange={(e) => moveItem(item.id, e.target.value)}
                      disabled={loading}
                      value=""
                    >
                      <option value="" disabled>Move to group...</option>
                      {groups
                        .filter(g => g.id !== selectedGroup.id)
                        .map(group => (
                          <option key={group.id} value={group.id}>
                            {group.title}
                          </option>
                        ))
                      }
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {selectedItem && (
        <div className="selected-item">
          <h2>Selected Item: {selectedItem.name}</h2>
          <p>ID: {selectedItem.id}</p>
          <p>Group: {selectedItem.group?.title}</p>
          <p>Created: {selectedItem.created_at}</p>
          <p>Updated: {selectedItem.updated_at}</p>
          
          <div className="item-column-values">
            <h3>Column Values</h3>
            {selectedItem.column_values?.map(column => (
              <div key={column.id} className="column-value">
                <p>
                  <strong>{column.id}:</strong> {column.text}
                </p>
              </div>
            ))}
          </div>
          
          <div className="update-item">
            <h3>Update Item</h3>
            <div className="column-inputs">
              <div className="column-input">
                <input
                  type="text"
                  placeholder="Column ID"
                  value={Object.keys(updateItemValues)[0] || ''}
                  onChange={(e) => {
                    const oldKey = Object.keys(updateItemValues)[0];
                    const oldValue = oldKey ? updateItemValues[oldKey] : '';
                    const newValues: Record<string, string> = {};
                    if (e.target.value) {
                      newValues[e.target.value] = oldValue;
                    }
                    setUpdateItemValues(newValues);
                  }}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={Object.values(updateItemValues)[0] || ''}
                  onChange={(e) => {
                    const key = Object.keys(updateItemValues)[0];
                    if (key) {
                      setUpdateItemValues({
                        ...updateItemValues,
                        [key]: e.target.value
                      });
                    }
                  }}
                />
              </div>
            </div>
            <button
              onClick={updateItem}
              disabled={loading || !Object.keys(updateItemValues).length}
            >
              Update Item
            </button>
          </div>
        </div>
      )}
      
      {/* CSS styles are in a separate CSS file or can be imported from a CSS module */}
    </div>
  );
};

export default ItemAndGroupServiceExample;
