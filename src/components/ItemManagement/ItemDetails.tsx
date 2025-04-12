import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { itemService } from '../../services/api/itemService';
import { columnService } from '../../services/api/columnService';
import { Item, ColumnValue, Column } from '../../types/monday';
import { Button, Loader, Flex, Box, Heading, Text, Icon, Tooltip } from "monday-ui-react-core";
import { Delete, Edit, Time, Duplicate } from "monday-ui-react-core/icons";

interface ItemDetailsProps {
  itemId: string;
  boardId: string;
  onEdit: (item: Item) => void;
  onDelete: (itemId: string) => void;
  onMoveToGroup: (itemId: string) => void;
  onBack: () => void;
}

const ItemDetails: React.FC<ItemDetailsProps> = ({ 
  itemId, 
  boardId, 
  onEdit, 
  onDelete, 
  onMoveToGroup, 
  onBack 
}) => {
  const { token } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activityLoading, setActivityLoading] = useState<boolean>(false);
  const [showActivity, setShowActivity] = useState<boolean>(false);
  const [activityData, setActivityData] = useState<any[]>([]);

  // Fetch item details on component mount
  useEffect(() => {
    const fetchItemDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch item details
        const fetchedItem = await itemService.getItemById(itemId);
        if (fetchedItem) {
          setItem(fetchedItem);
          
          // Fetch columns to get column titles
          const fetchedColumns = await columnService.getColumns(boardId);
          setColumns(fetchedColumns);
        } else {
          setError(`Item with ID ${itemId} not found`);
        }
      } catch (error) {
        console.error('Error fetching item details:', error);
        setError('Failed to load item details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (token && itemId) {
      fetchItemDetails();
    }
  }, [token, itemId, boardId]);

  // Fetch item activity/history
  const fetchItemActivity = async () => {
    if (!item) return;
    
    try {
      setActivityLoading(true);
      // This would be implemented in a real API service
      // For now, we'll simulate activity data
      setTimeout(() => {
        const mockActivity = [
          { id: '1', date: new Date().toISOString(), user: 'John Doe', action: 'Created item' },
          { id: '2', date: new Date(Date.now() - 86400000).toISOString(), user: 'Jane Smith', action: 'Updated status to "In Progress"' },
          { id: '3', date: new Date(Date.now() - 172800000).toISOString(), user: 'John Doe', action: 'Added comment: "Let\'s get this started"' }
        ];
        setActivityData(mockActivity);
        setActivityLoading(false);
        setShowActivity(true);
      }, 500);
    } catch (error) {
      console.error('Error fetching item activity:', error);
      setActivityLoading(false);
    }
  };

  // Handle delete confirmation
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      onDelete(itemId);
    }
  };

  // Get column title by ID
  const getColumnTitle = (columnId: string): string => {
    const column = columns.find(col => col.id === columnId);
    return column ? column.title : columnId;
  };

  if (loading) {
    return (
      <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader size={Loader.sizes.MEDIUM} />
      </div>
    );
  }

  if (error) {
    return (
      <Box padding={Box.paddings.MEDIUM} style={{ backgroundColor: '#ffebee', borderRadius: '4px' }}>
        <Text type={Text.types.TEXT1} weight={Text.weights.BOLD} style={{ color: 'var(--negative-color, #e44258)' }}>Error: {error}</Text>
        <div style={{ marginTop: '16px' }}>
          <Button onClick={onBack} size={Button.sizes.SMALL}>Back to Items</Button>
        </div>
      </Box>
    );
  }

  if (!item) {
    return (
      <Box padding={Box.paddings.MEDIUM} style={{ backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <Text type={Text.types.TEXT1}>Item not found</Text>
        <div style={{ marginTop: '16px' }}>
          <Button onClick={onBack} size={Button.sizes.SMALL}>Back to Items</Button>
        </div>
      </Box>
    );
  }

  return (
    <Box className="item-details" padding={Box.paddings.MEDIUM} style={{ backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Heading type={Heading.types.h2} value={item.name} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Tooltip content="Edit Item">
              <Button
                onClick={() => onEdit(item)}
                size={Button.sizes.SMALL}
                kind={Button.kinds.TERTIARY}
                leftIcon={Edit}
              />
            </Tooltip>
            <Tooltip content="Move to Another Group">
              <Button
                onClick={() => onMoveToGroup(itemId)}
                size={Button.sizes.SMALL}
                kind={Button.kinds.TERTIARY}
                leftIcon={Duplicate}
              />
            </Tooltip>
            <Tooltip content="Delete Item">
              <Button
                onClick={handleDelete}
                size={Button.sizes.SMALL}
                kind={Button.kinds.TERTIARY}
                leftIcon={Delete}
                color={Button.colors.NEGATIVE}
              />
            </Tooltip>
          </div>
        </div>
      </div>

      <Box marginBottom={Box.marginBottoms.MEDIUM}>
        <Text type={Text.types.TEXT1} weight={Text.weights.BOLD}>Board: </Text>
        <Text type={Text.types.TEXT1}>{item.board?.name || boardId}</Text>
      </Box>

      <Box marginBottom={Box.marginBottoms.MEDIUM}>
        <Text type={Text.types.TEXT1} weight={Text.weights.BOLD}>Group: </Text>
        <Text type={Text.types.TEXT1}>{item.group?.title || 'Unknown'}</Text>
      </Box>

      <Box marginBottom={Box.marginBottoms.MEDIUM}>
        <Text type={Text.types.TEXT1} weight={Text.weights.BOLD}>Created: </Text>
        <Text type={Text.types.TEXT1}>{new Date(item.created_at || '').toLocaleString()}</Text>
      </Box>

      <Box marginBottom={Box.marginBottoms.MEDIUM}>
        <Text type={Text.types.TEXT1} weight={Text.weights.BOLD}>Last Updated: </Text>
        <Text type={Text.types.TEXT1}>{new Date(item.updated_at || '').toLocaleString()}</Text>
      </Box>

      <div style={{ marginBottom: '8px' }}>
        <Heading type={Heading.types.h3} value="Column Values" />
      </div>
      
      {item.column_values && item.column_values.length > 0 ? (
        <Box className="column-values-list" style={{ marginBottom: '24px' }}>
          {item.column_values.map((columnValue: ColumnValue) => (
            <div key={columnValue.id} style={{ marginBottom: '8px' }} className="column-value-item">
              <div style={{ display: 'flex' }}>
                <Box style={{ width: '150px' }}>
                  <Text type={Text.types.TEXT1} weight={Text.weights.BOLD}>{getColumnTitle(columnValue.id)}:</Text>
                </Box>
                <Box>
                  <Text type={Text.types.TEXT1}>{columnValue.text || 'Empty'}</Text>
                </Box>
              </div>
            </div>
          ))}
        </Box>
      ) : (
        <Box marginBottom={Box.marginBottoms.MEDIUM}>
          <Text type={Text.types.TEXT2}>No column values available</Text>
        </Box>
      )}

      <div style={{ marginBottom: '16px' }}>
        <Button
          onClick={fetchItemActivity}
          size={Button.sizes.SMALL}
          kind={Button.kinds.TERTIARY}
          leftIcon={Time}
          disabled={activityLoading}
        >
          {showActivity ? 'Hide Activity' : 'Show Activity History'}
        </Button>
      </div>

      {activityLoading && (
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
          <Loader size={Loader.sizes.SMALL} />
        </div>
      )}

      {showActivity && !activityLoading && (
        <Box className="activity-history" padding={Box.paddings.MEDIUM} style={{ backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <div style={{ marginBottom: '8px' }}>
            <Heading type={Heading.types.h4} value="Activity History" />
          </div>
          {activityData.map(activity => (
            <Box key={activity.id} marginBottom={Box.marginBottoms.SMALL} padding={Box.paddings.SMALL} style={{ backgroundColor: 'white', borderRadius: '4px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type={Text.types.TEXT1} weight={Text.weights.BOLD}>{activity.user}</Text>
                  <Text type={Text.types.TEXT2}>{new Date(activity.date).toLocaleString()}</Text>
                </div>
                <Text type={Text.types.TEXT1}>{activity.action}</Text>
              </div>
            </Box>
          ))}
        </Box>
      )}

      <div style={{ marginTop: '24px' }}>
        <Button onClick={onBack} size={Button.sizes.SMALL}>Back to Items</Button>
      </div>
    </Box>
  );
};

export default ItemDetails;