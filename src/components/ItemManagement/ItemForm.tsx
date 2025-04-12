import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { itemService } from '../../services/api/itemService';
import { columnService } from '../../services/api/columnService';
import { groupService } from '../../services/api/groupService';
import { Item, Group, Column } from '../../types/monday';
import { ItemCreateInput, ColumnValues } from '../../types/itemTypes';
import { Button, Loader, Box, Heading, TextField, Dropdown, Toast } from "monday-ui-react-core";
import ColumnValueEditor from './ColumnValueEditor';

interface ItemFormProps {
  boardId: string;
  groupId?: string;
  item?: Item;
  onSubmit: (item: Item) => void;
  onCancel: () => void;
}

const ItemForm: React.FC<ItemFormProps> = ({ 
  boardId, 
  groupId, 
  item, 
  onSubmit, 
  onCancel 
}) => {
  const { token } = useAuth();
  const [name, setName] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [columnValues, setColumnValues] = useState<ColumnValues>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const isEditMode = !!item;

  // Fetch groups and columns on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch groups
        const fetchedGroups = await groupService.getGroups(boardId);
        setGroups(fetchedGroups);
        
        // Set default group
        if (!selectedGroupId) {
          if (groupId) {
            setSelectedGroupId(groupId);
          } else if (item?.group?.id) {
            setSelectedGroupId(item.group.id);
          } else if (fetchedGroups.length > 0) {
            setSelectedGroupId(fetchedGroups[0].id);
          }
        }
        
        // Fetch columns
        const fetchedColumns = await columnService.getColumns(boardId);
        setColumns(fetchedColumns);
        
        // Set initial values if editing an item
        if (isEditMode && item) {
          setName(item.name);
          
          // Convert column_values array to object format expected by the API
          const initialColumnValues: ColumnValues = {};
          item.column_values?.forEach(cv => {
            if (cv.id && cv.value) {
              initialColumnValues[cv.id] = JSON.parse(cv.value);
            }
          });
          
          setColumnValues(initialColumnValues);
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
        setError('Failed to load form data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (token && boardId) {
      fetchData();
    }
  }, [token, boardId, groupId, item, isEditMode]);

  // Handle column value changes
  const handleColumnValueChange = (columnId: string, value: any) => {
    setColumnValues(prev => ({
      ...prev,
      [columnId]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Item name is required');
      return;
    }
    
    if (!selectedGroupId) {
      setError('Please select a group');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      let result: Item;
      
      if (isEditMode && item) {
        // Update existing item
        result = await itemService.updateItem(
          item.id,
          {
            ...columnValues
          }
        );
        setToastMessage('Item updated successfully');
      } else {
        // Create new item
        result = await itemService.createItem(
          boardId,
          selectedGroupId,
          name,
          columnValues
        );
        setToastMessage('Item created successfully');
      }
      
      setShowSuccessToast(true);
      onSubmit(result);
    } catch (error) {
      console.error('Error saving item:', error);
      setError('Failed to save item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader size={Loader.sizes.MEDIUM} />
      </div>
    );
  }

  return (
    <Box className="item-form" padding={Box.paddings.MEDIUM} style={{ backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
      <Heading type={Heading.types.h2} value={isEditMode ? `Edit Item: ${item?.name}` : 'Create New Item'} />
      
      {error && (
        <div style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#ffebee', borderRadius: '4px', color: '#d32f2f' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginTop: '16px' }}>
          <TextField
            title="Item Name"
            placeholder="Enter item name"
            value={name}
            onChange={(value: string) => setName(value)}
            required
            disabled={submitting}
          />
        </div>
        
        <div style={{ marginTop: '16px' }}>
          <Dropdown
            title="Group"
            placeholder="Select a group"
            options={groups.map(group => ({ 
              value: group.id, 
              label: group.title 
            }))}
            onChange={(option: { value: string }) => setSelectedGroupId(option.value)}
            value={selectedGroupId}
            disabled={submitting || isEditMode || !!groupId}
          />
        </div>
        
        {columns.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <Heading type={Heading.types.h3} value="Column Values" />
            
            <div style={{ marginTop: '16px' }}>
              {columns.map(column => (
                <div key={column.id} style={{ marginBottom: '16px' }}>
                  <ColumnValueEditor
                    column={column}
                    value={columnValues[column.id]}
                    onChange={(value: any) => handleColumnValueChange(column.id, value)}
                    boardId={boardId}
                    disabled={submitting}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div style={{ marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button
            onClick={onCancel}
            size={Button.sizes.MEDIUM}
            kind={Button.kinds.TERTIARY}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            size={Button.sizes.MEDIUM}
            kind={Button.kinds.PRIMARY}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : isEditMode ? 'Update Item' : 'Create Item'}
          </Button>
        </div>
      </form>
      
      {showSuccessToast && (
        <Toast
          open={showSuccessToast}
          type={Toast.types.POSITIVE}
          autoHideDuration={3000}
          onClose={() => setShowSuccessToast(false)}
        >
          {toastMessage}
        </Toast>
      )}
    </Box>
  );
};

export default ItemForm;