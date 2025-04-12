import React, { useState, useEffect } from 'react';
import './BoardList.css';
import { 
  Box, 
  Button, 
  Search, 
  Table, 
  Text, 
  Dropdown, 
  Menu, 
  MenuItem,
  Loader
} from 'monday-ui-react-core';
import { 
  Add, 
  Filter, 
  Sort, 
  Board, 
  Delete, 
  Edit, 
  Duplicate 
} from 'monday-ui-react-core/icons';
import { Board as BoardType, BoardKind } from '../../types/monday';
import { useBoards } from '../../hooks/useBoards';
import { formatDistanceToNow } from 'date-fns';

interface BoardListProps {
  workspaceId?: string;
  onCreateBoard: () => void;
  onEditBoard: (board: BoardType) => void;
  onViewBoard: (board: BoardType) => void;
}

const BoardList: React.FC<BoardListProps> = ({
  workspaceId,
  onCreateBoard,
  onEditBoard,
  onViewBoard
}) => {
  const { 
    boards, 
    loading, 
    error, 
    fetchBoards, 
    deleteBoard, 
    duplicateBoard,
    sortBoards, 
    filterBoards 
  } = useBoards({ initialLoad: true, workspaceId });
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<'name' | 'created_at' | 'updated_at' | 'items_count'>('name');
  const [sortDirection, setSortDirection] = useState<boolean>(true); // true = ascending
  
  useEffect(() => {
    fetchBoards(workspaceId);
  }, [workspaceId, fetchBoards]);
  
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    filterBoards(value);
  };
  
  const handleSort = (field: 'name' | 'created_at' | 'updated_at' | 'items_count') => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(!sortDirection);
      sortBoards(field, !sortDirection);
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection(true);
      sortBoards(field, true);
    }
  };
  
  const handleDeleteBoard = async (boardId: string) => {
    if (window.confirm('Are you sure you want to delete this board?')) {
      try {
        await deleteBoard(boardId);
      } catch (err) {
        console.error('Error deleting board:', err);
      }
    }
  };
  
  const handleDuplicateBoard = async (board: BoardType) => {
    try {
      const newName = `${board.name} (Copy)`;
      await duplicateBoard(board.id, newName);
    } catch (err) {
      console.error('Error duplicating board:', err);
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };
  
  const getBoardKindLabel = (kind?: string) => {
    switch (kind) {
      case BoardKind.PUBLIC:
        return 'Public';
      case BoardKind.PRIVATE:
        return 'Private';
      case BoardKind.SHARE:
        return 'Shareable';
      default:
        return kind || 'Unknown';
    }
  };
  
  if (loading && boards.length === 0) {
    return (
      <Box className="board-list-loading" padding={Box.paddings.LARGE}>
        <Loader size={Loader.sizes.MEDIUM} />
        <Text>Loading boards...</Text>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box className="board-list-error" padding={Box.paddings.LARGE}>
        <Text weight={Text.weights.BOLD} color={Text.colors.NEGATIVE}>Error loading boards</Text>
        <Text>{error}</Text>
      </Box>
    );
  }
  
  return (
    <div className="board-list-container">
      <div className="board-list-header">
        <Text type={Text.types.H1} weight={Text.weights.BOLD}>Boards</Text>
        <Button
          kind={Button.kinds.PRIMARY}
          size={Button.sizes.MEDIUM}
          onClick={onCreateBoard}
          leftIcon={Add}
        >
          Create Board
        </Button>
      </div>
      
      <div className="board-list-filters">
        <Search
          placeholder="Search boards..."
          value={searchTerm}
          onChange={handleSearch}
          size={Search.sizes.MEDIUM}
        />
        
        <Dropdown
          className="board-list-sort-dropdown"
          size={Dropdown.sizes.MEDIUM}
          placeholder="Sort by"
          insideOverflowContainer
          insideOverflowWithTransformContainer
          openMenuOnFocus
          menuPosition={Dropdown.menuPositions.BOTTOM}
          zIndex={9999}
        >
          <Menu id="sort-menu" size={Menu.sizes.MEDIUM}>
            <MenuItem
              icon={Sort}
              iconType={MenuItem.iconTypes.ICON}
              onClick={() => handleSort('name')}
              title={`Name (${sortField === 'name' ? (sortDirection ? '↑' : '↓') : ''}`}
            />
            <MenuItem
              icon={Sort}
              iconType={MenuItem.iconTypes.ICON}
              onClick={() => handleSort('created_at')}
              title={`Created (${sortField === 'created_at' ? (sortDirection ? '↑' : '↓') : ''}`}
            />
            <MenuItem
              icon={Sort}
              iconType={MenuItem.iconTypes.ICON}
              onClick={() => handleSort('updated_at')}
              title={`Updated (${sortField === 'updated_at' ? (sortDirection ? '↑' : '↓') : ''}`}
            />
            <MenuItem
              icon={Sort}
              iconType={MenuItem.iconTypes.ICON}
              onClick={() => handleSort('items_count')}
              title={`Items (${sortField === 'items_count' ? (sortDirection ? '↑' : '↓') : ''}`}
            />
          </Menu>
        </Dropdown>
      </div>
      
      {boards.length === 0 ? (
        <div className="board-list-empty">
          <Board size="large" />
          <Text>No boards found</Text>
          <Button
            kind={Button.kinds.PRIMARY}
            size={Button.sizes.MEDIUM}
            onClick={onCreateBoard}
          >
            Create your first board
          </Button>
        </div>
      ) : (
        <Table className="board-list-table">
          <Table.Header>
            <Table.HeaderCell title="Name" />
            <Table.HeaderCell title="Type" />
            <Table.HeaderCell title="Items" />
            <Table.HeaderCell title="Created" />
            <Table.HeaderCell title="Updated" />
            <Table.HeaderCell title="Actions" />
          </Table.Header>
          <Table.Body>
            {boards.map(board => (
              <Table.Row key={board.id} className="board-list-row">
                <Table.Cell>
                  <div className="board-name-cell" onClick={() => onViewBoard(board)}>
                    <Board />
                    <Text>{board.name}</Text>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Text>{getBoardKindLabel(board.board_kind)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text>{board.items_count || 0}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text>{formatDate(board.created_at)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text>{formatDate(board.updated_at)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <div className="board-actions">
                    <Button
                      kind={Button.kinds.TERTIARY}
                      size={Button.sizes.SMALL}
                      onClick={() => onEditBoard(board)}
                      iconButton
                      ariaLabel="Edit board"
                    >
                      <Edit />
                    </Button>
                    <Button
                      kind={Button.kinds.TERTIARY}
                      size={Button.sizes.SMALL}
                      onClick={() => handleDuplicateBoard(board)}
                      iconButton
                      ariaLabel="Duplicate board"
                    >
                      <Duplicate />
                    </Button>
                    <Button
                      kind={Button.kinds.TERTIARY}
                      size={Button.sizes.SMALL}
                      onClick={() => handleDeleteBoard(board.id)}
                      iconButton
                      ariaLabel="Delete board"
                      className="delete-button"
                    >
                      <Delete />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  );
};

export default BoardList;