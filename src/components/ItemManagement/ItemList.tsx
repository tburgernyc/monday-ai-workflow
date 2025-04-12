import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { itemService } from '../../services/api/itemService';
import { groupService } from '../../services/api/groupService';
import { columnService } from '../../services/api/columnService';
import { Item, Group, Column, ColumnValue } from '../../types/monday';
import { ItemQueryOptions } from '../../types/itemTypes';
import { 
  Button, 
  Loader, 
  Box, 
  Heading, 
  TextField, 
  Dropdown, 
  Table, 
  Menu, 
  MenuItem, 
  Search, 
  Checkbox, 
  IconButton,
  Toast
} from "monday-ui-react-core";
import { 
  Add, 
  Filter, 
  Sort, 
  Delete, 
  Edit, 
  Duplicate, 
  DropdownChevronDown 
} from "monday-ui-react-core/icons";

interface ItemListProps {
  boardId: string;
  groupId?: string;
  onItemSelect: (item: Item) => void;
  onItemEdit: (item: Item) => void;
  onItemDelete: (itemId: string) => void;
  onItemMove: (itemId: string) => void;
  onCreateItem: () => void;
}

const ItemList: React.FC<ItemListProps> = ({ 
  boardId, 
  groupId, 
  onItemSelect, 
  onItemEdit, 
  onItemDelete, 
  onItemMove, 
  onCreateItem 
}) => {
  const { token } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(groupId || null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<string>('positive');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Fetch items, groups, and columns on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch groups
        const fetchedGroups = await groupService.getGroups(boardId);
        setGroups(fetchedGroups);
        
        // Fetch columns
        const fetchedColumns = await columnService.getColumns(boardId);
        setColumns(fetchedColumns);
        
        // Fetch items
        const options: ItemQueryOptions = {};
        if (selectedGroupId) {
          options.groupId = selectedGroupId;
        }
        
        const fetchedItems = await itemService.getItems(boardId, options);
        setItems(fetchedItems);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load items. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (token && boardId) {
      fetchData();
    }
  }, [token, boardId, selectedGroupId]);

  // Handle group change
  const handleGroupChange = (option: { value: string }) => {
    setSelectedGroupId(option.value);
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  // Handle sort
  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  // Handle filter toggle
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Handle filter change
  const handleFilterChange = (columnId: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [columnId]: value
    }));
  };

  // Handle item selection
  const handleItemSelect = (itemId: string) => {
    const newSelectedItems = new Set(selectedItems);
    if (newSelectedItems.has(itemId)) {
      newSelectedItems.delete(itemId);
    } else {
      newSelectedItems.add(itemId);
    }
    setSelectedItems(newSelectedItems);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) {
      try {
        setLoading(true);
        
        // Delete each selected item
        const itemIdsToDelete = Array.from(selectedItems);
        for (const itemId of itemIdsToDelete) {
          await itemService.deleteItem(itemId);
        }
        
        // Refresh items
        const options: ItemQueryOptions = {};
        if (selectedGroupId) {
          options.groupId = selectedGroupId;
        }
        
        const fetchedItems = await itemService.getItems(boardId, options);
        setItems(fetchedItems);
        
        // Show success toast
        setToastMessage(`Successfully deleted ${selectedItems.size} items`);
        setToastType('positive');
        setShowToast(true);
        
        // Clear selection
        setSelectedItems(new Set());
      } catch (error) {
        console.error('Error deleting items:', error);
        setToastMessage('Failed to delete items');
        setToastType('negative');
        setShowToast(true);
      } finally {
        setLoading(false);
      }
    }
  };

  // Get column value text
  const getColumnValueText = (item: Item, columnId: string): string => {
    const columnValue = item.column_values?.find(cv => cv.id === columnId);
    return columnValue?.text || '';
  };

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    // First, filter by search term
    let result = items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.column_values?.some(cv => 
        cv.text?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    
    // Apply column filters
    if (Object.keys(filters).length > 0) {
      result = result.filter(item => {
        for (const [columnId, filterValue] of Object.entries(filters)) {
          if (!filterValue) continue;
          
          const columnValueText = getColumnValueText(item, columnId);
          if (!columnValueText.toLowerCase().includes(filterValue.toLowerCase())) {
            return false;
          }
        }
        return true;
      });
    }
    
    // Sort items
    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = getColumnValueText(a, sortColumn);
        const bValue = getColumnValueText(b, sortColumn);
        
        if (sortDirection === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });
    }
    
    return result;
  }, [items, searchTerm, filters, sortColumn, sortDirection]);

  if (loading && items.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader size={Loader.sizes.MEDIUM} />
      </div>
    );
  }

  return (
    <Box className="item-list" padding={Box.paddings.MEDIUM}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Heading type={Heading.types.h2} value="Items" />
        <Button
          onClick={onCreateItem}
          size={Button.sizes.MEDIUM}
          kind={Button.kinds.PRIMARY}
          leftIcon={Add}
        >
          Create Item
        </Button>
      </div>
      
      {error && (
        <div style={{ marginBottom: '16px', padding: '8px 16px', backgroundColor: '#ffebee', borderRadius: '4px', color: '#d32f2f' }}>
          {error}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <Search
            placeholder="Search items..."
            value={searchTerm}
            onChange={handleSearch}
            size={Search.sizes.MEDIUM}
          />
        </div>
        
        <div style={{ width: '200px' }}>
          <Dropdown
            placeholder="Select group"
            options={[
              { value: '', label: 'All Groups' },
              ...groups.map(group => ({ 
                value: group.id, 
                label: group.title 
              }))
            ]}
            onChange={handleGroupChange}
            value={selectedGroupId || ''}
          />
        </div>
        
        <IconButton
          icon={Filter}
          onClick={toggleFilters}
          kind={showFilters ? IconButton.kinds.PRIMARY : IconButton.kinds.TERTIARY}
          ariaLabel="Toggle filters"
        />
        
        {selectedItems.size > 0 && (
          <Button
            onClick={handleBulkDelete}
            size={Button.sizes.MEDIUM}
            kind={Button.kinds.TERTIARY}
            color={Button.colors.NEGATIVE}
            leftIcon={Delete}
          >
            Delete ({selectedItems.size})
          </Button>
        )}
      </div>
      
      {showFilters && (
        <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <Heading type={Heading.types.h4} value="Filters" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px' }}>
            {columns.slice(0, 3).map(column => (
              <div key={column.id} style={{ width: '200px' }}>
                <TextField
                  title={column.title}
                  placeholder={`Filter by ${column.title.toLowerCase()}`}
                  value={filters[column.id] || ''}
                  onChange={(value: string) => handleFilterChange(column.id, value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="items-table" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '8px', textAlign: 'left', width: '40px' }}>
                <Checkbox
                  checked={selectedItems.size > 0 && selectedItems.size === filteredAndSortedItems.length}
                  indeterminate={selectedItems.size > 0 && selectedItems.size < filteredAndSortedItems.length}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedItems(new Set(filteredAndSortedItems.map(item => item.id)));
                    } else {
                      setSelectedItems(new Set());
                    }
                  }}
                />
              </th>
              <th style={{ padding: '8px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                  Name
                  {sortColumn === 'name' && (
                    <span style={{ marginLeft: '4px' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              {columns.slice(0, 3).map(column => (
                <th key={column.id} style={{ padding: '8px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort(column.id)}>
                    {column.title}
                    {sortColumn === column.id && (
                      <span style={{ marginLeft: '4px' }}>
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ padding: '8px', textAlign: 'left', width: '100px' }}>Group</th>
              <th style={{ padding: '8px', textAlign: 'center', width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan={6 + columns.slice(0, 3).length} style={{ padding: '16px', textAlign: 'center' }}>
                  No items found
                </td>
              </tr>
            ) : (
              filteredAndSortedItems.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '8px' }}>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleItemSelect(item.id)}
                    />
                  </td>
                  <td style={{ padding: '8px', cursor: 'pointer' }} onClick={() => onItemSelect(item)}>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                  </td>
                  {columns.slice(0, 3).map(column => (
                    <td key={column.id} style={{ padding: '8px' }}>
                      {getColumnValueText(item, column.id)}
                    </td>
                  ))}
                  <td style={{ padding: '8px' }}>
                    {item.group?.title || ''}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                      <IconButton
                        icon={Edit}
                        onClick={() => onItemEdit(item)}
                        kind={IconButton.kinds.TERTIARY}
                        size={IconButton.sizes.SMALL}
                        ariaLabel="Edit item"
                      />
                      <IconButton
                        icon={Duplicate}
                        onClick={() => onItemMove(item.id)}
                        kind={IconButton.kinds.TERTIARY}
                        size={IconButton.sizes.SMALL}
                        ariaLabel="Move item"
                      />
                      <IconButton
                        icon={Delete}
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this item?')) {
                            onItemDelete(item.id);
                          }
                        }}
                        kind={IconButton.kinds.TERTIARY}
                        size={IconButton.sizes.SMALL}
                        ariaLabel="Delete item"
                        color={IconButton.colors.NEGATIVE}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {loading && items.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
          <Loader size={Loader.sizes.SMALL} />
        </div>
      )}
      
      {showToast && (
        <Toast
          open={showToast}
          type={toastType === 'positive' ? Toast.types.POSITIVE : Toast.types.NEGATIVE}
          autoHideDuration={3000}
          onClose={() => setShowToast(false)}
        >
          {toastMessage}
        </Toast>
      )}
    </Box>
  );
};

export default ItemList;