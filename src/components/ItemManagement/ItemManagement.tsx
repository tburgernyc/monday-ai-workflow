import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { boardService } from '../../services/api/boardService';
import { groupService } from '../../services/api/groupService';
import { itemService } from '../../services/api/itemService';
import { Board, Group, Item } from '../../types/monday';
import { 
  Button, 
  Loader, 
  Box, 
  Heading, 
  Dropdown, 
  Flex, 
  Toast, 
  Modal
} from "monday-ui-react-core";
import { Add } from "monday-ui-react-core/icons";
import ItemList from './ItemList';
import ItemDetails from './ItemDetails';
import ItemForm from './ItemForm';

const ItemManagement: React.FC = () => {
  const { token } = useAuth();
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<string>('positive');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showMoveModal, setShowMoveModal] = useState<boolean>(false);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [itemToMove, setItemToMove] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');

  // Fetch boards on component mount
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const fetchedBoards = await boardService.getBoards();
        setBoards(fetchedBoards);
        
        if (fetchedBoards.length > 0 && !selectedBoard) {
          setSelectedBoard(fetchedBoards[0].id);
        }
      } catch (error) {
        console.error('Error fetching boards:', error);
        setError('Failed to load boards. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchBoards();
    }
  }, [token]);

  // Fetch groups when a board is selected
  useEffect(() => {
    const fetchGroups = async () => {
      if (!selectedBoard) {
        setGroups([]);
        setSelectedGroup(null);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const fetchedGroups = await groupService.getGroups(selectedBoard);
        setGroups(fetchedGroups);
        
        if (fetchedGroups.length > 0 && !selectedGroup) {
          setSelectedGroup(fetchedGroups[0].id);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        setError('Failed to load groups. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (token && selectedBoard) {
      fetchGroups();
    }
  }, [selectedBoard, token]);

  // Handle board selection
  const handleBoardChange = (option: { value: string }) => {
    setSelectedBoard(option.value);
    setSelectedGroup(null);
    setSelectedItem(null);
    setViewMode('list');
  };

  // Handle group selection
  const handleGroupChange = (option: { value: string }) => {
    setSelectedGroup(option.value);
    setSelectedItem(null);
    setViewMode('list');
  };

  // Handle item selection
  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setViewMode('details');
  };

  // Handle item creation
  const handleCreateItem = () => {
    setShowCreateModal(true);
  };

  // Handle item edit
  const handleEditItem = (item: Item) => {
    setItemToEdit(item);
    setShowEditModal(true);
  };

  // Handle item deletion
  const handleDeleteItem = async (itemId: string) => {
    try {
      setLoading(true);
      
      await itemService.deleteItem(itemId);
      
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
        setViewMode('list');
      }
      
      setToastMessage('Item deleted successfully');
      setToastType('positive');
      setShowToast(true);
    } catch (error) {
      console.error('Error deleting item:', error);
      setToastMessage('Failed to delete item');
      setToastType('negative');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle item move
  const handleMoveItem = (itemId: string) => {
    setItemToMove(itemId);
    setShowMoveModal(true);
  };

  // Handle move confirmation
  const handleMoveConfirm = async (targetGroupId: string) => {
    if (!itemToMove) return;
    
    try {
      setLoading(true);
      
      await itemService.moveItem(itemToMove, targetGroupId);
      
      setToastMessage('Item moved successfully');
      setToastType('positive');
      setShowToast(true);
      
      // If the moved item is the selected item, update its view
      if (selectedItem?.id === itemToMove) {
        const updatedItem = await itemService.getItemById(itemToMove);
        setSelectedItem(updatedItem);
      }
    } catch (error) {
      console.error('Error moving item:', error);
      setToastMessage('Failed to move item');
      setToastType('negative');
      setShowToast(true);
    } finally {
      setLoading(false);
      setShowMoveModal(false);
      setItemToMove(null);
    }
  };

  // Handle form submission
  const handleFormSubmit = (item: Item) => {
    if (showCreateModal) {
      setShowCreateModal(false);
      setToastMessage('Item created successfully');
    } else if (showEditModal) {
      setShowEditModal(false);
      setItemToEdit(null);
      setToastMessage('Item updated successfully');
      
      // If the edited item is the selected item, update it
      if (selectedItem?.id === item.id) {
        setSelectedItem(item);
      }
    }
    
    setToastType('positive');
    setShowToast(true);
  };

  // Handle back to list
  const handleBackToList = () => {
    setSelectedItem(null);
    setViewMode('list');
  };

  if (loading && !boards.length) {
    return (
      <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader size={Loader.sizes.MEDIUM} />
      </div>
    );
  }

  return (
    <Box className="item-management" padding={Box.paddings.MEDIUM}>
      <Heading type={Heading.types.h1} value="Item Management" />
      
      {error && (
        <div style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#ffebee', borderRadius: '4px', color: '#d32f2f' }}>
          {error}
        </div>
      )}
      
      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <div style={{ width: '250px' }}>
          <Dropdown
            title="Select Board"
            placeholder="Select a board"
            options={boards.map(board => ({ 
              value: board.id, 
              label: board.name 
            }))}
            onChange={handleBoardChange}
            value={selectedBoard || ''}
          />
        </div>
        
        {selectedBoard && (
          <div style={{ width: '250px' }}>
            <Dropdown
              title="Select Group"
              placeholder="Select a group"
              options={groups.map(group => ({ 
                value: group.id, 
                label: group.title 
              }))}
              onChange={handleGroupChange}
              value={selectedGroup || ''}
            />
          </div>
        )}
        
        {selectedBoard && !selectedGroup && (
          <Button
            onClick={handleCreateItem}
            size={Button.sizes.MEDIUM}
            kind={Button.kinds.PRIMARY}
            leftIcon={Add}
          >
            Create Item
          </Button>
        )}
      </div>
      
      {selectedBoard && selectedGroup && viewMode === 'list' && (
        <div style={{ marginTop: '24px' }}>
          <ItemList
            boardId={selectedBoard}
            groupId={selectedGroup}
            onItemSelect={handleItemSelect}
            onItemEdit={handleEditItem}
            onItemDelete={handleDeleteItem}
            onItemMove={handleMoveItem}
            onCreateItem={handleCreateItem}
          />
        </div>
      )}
      
      {selectedBoard && selectedItem && viewMode === 'details' && (
        <div style={{ marginTop: '24px' }}>
          <ItemDetails
            itemId={selectedItem.id}
            boardId={selectedBoard}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onMoveToGroup={handleMoveItem}
            onBack={handleBackToList}
          />
        </div>
      )}
      
      {/* Create Item Modal */}
      {showCreateModal && selectedBoard && (
        <Modal
          title="Create New Item"
          onClose={() => setShowCreateModal(false)}
          show={showCreateModal}
          width="large"
        >
          <ItemForm
            boardId={selectedBoard}
            groupId={selectedGroup || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>
      )}
      
      {/* Edit Item Modal */}
      {showEditModal && selectedBoard && itemToEdit && (
        <Modal
          title="Edit Item"
          onClose={() => {
            setShowEditModal(false);
            setItemToEdit(null);
          }}
          show={showEditModal}
          width="large"
        >
          <ItemForm
            boardId={selectedBoard}
            item={itemToEdit}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowEditModal(false);
              setItemToEdit(null);
            }}
          />
        </Modal>
      )}
      
      {/* Move Item Modal */}
      {showMoveModal && (
        <Modal
          title="Move Item to Group"
          onClose={() => {
            setShowMoveModal(false);
            setItemToMove(null);
          }}
          show={showMoveModal}
        >
          <div style={{ padding: '16px' }}>
            <Heading type={Heading.types.h4} value="Select Target Group" />
            <div style={{ marginTop: '16px' }}>
              <Dropdown
                placeholder="Select a group"
                options={groups
                  .filter(group => group.id !== selectedGroup)
                  .map(group => ({ 
                    value: group.id, 
                    label: group.title 
                  }))}
                onChange={(option: { value: string }) => handleMoveConfirm(option.value)}
              />
            </div>
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                onClick={() => {
                  setShowMoveModal(false);
                  setItemToMove(null);
                }}
                size={Button.sizes.MEDIUM}
                kind={Button.kinds.TERTIARY}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Toast Notification */}
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

export default ItemManagement;