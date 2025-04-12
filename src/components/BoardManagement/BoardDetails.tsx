import React, { useState, useEffect } from 'react';
import './BoardDetails.css';
import { 
  Box, 
  Button, 
  Flex, 
  Heading, 
  Text, 
  Loader, 
  Icon, 
  TabList, 
  Tab, 
  TabsContext, 
  Divider 
} from 'monday-ui-react-core';
import { Edit, Delete, Share, Person, Group } from 'monday-ui-react-core/icons';
import { Board } from '../../types/monday';
import { useBoards } from '../../hooks/useBoards';
import { useNavigate, useParams } from 'react-router-dom';

const BoardDetails: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { getBoardById, deleteBoard, loading, error } = useBoards();
  const [board, setBoard] = useState<Board | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    const fetchBoard = async () => {
      if (boardId) {
        try {
          const boardData = await getBoardById(boardId);
          setBoard(boardData);
        } catch (err) {
          console.error('Error fetching board details:', err);
        }
      }
    };

    fetchBoard();
  }, [boardId, getBoardById]);

  const handleEdit = () => {
    if (board) {
      navigate(`/boards/${board.id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (board && window.confirm('Are you sure you want to delete this board?')) {
      setIsDeleting(true);
      try {
        await deleteBoard(board.id);
        navigate('/boards');
      } catch (err) {
        console.error('Error deleting board:', err);
        setIsDeleting(false);
      }
    }
  };

  const handleShare = () => {
    // Implement share functionality
    alert('Share functionality will be implemented in the future');
  };

  const getBoardKindLabel = (kind: string): string => {
    switch (kind) {
      case 'public':
        return 'Public';
      case 'private':
        return 'Private';
      case 'share':
        return 'Shareable';
      default:
        return kind;
    }
  };

  if (loading) {
    return (
      <Box className="board-details-loading" padding={Box.paddings.LARGE}>
        <Loader size={Loader.sizes.LARGE} />
        <Text>Loading board details...</Text>
      </Box>
    );
  }

  if (error || !board) {
    return (
      <Box className="board-details-error" padding={Box.paddings.LARGE}>
        <Icon icon={Delete} iconSize={40} />
        <Heading type={Heading.types.h2} value="Board Not Found" />
        <Text>The board you're looking for doesn't exist or you don't have access to it.</Text>
        <Button onClick={() => navigate('/boards')}>Back to Boards</Button>
      </Box>
    );
  }

  return (
    <Box className="board-details-container" padding={Box.paddings.LARGE}>
      <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER} className="board-details-header">
        <div>
          <Heading type={Heading.types.h1} value={board.name} />
          <Flex gap={Flex.gaps.SMALL} align={Flex.align.CENTER}>
            <Text weight={Text.weights.MEDIUM}>
              {getBoardKindLabel(board.board_kind)}
            </Text>
            <Text color={Text.colors.SECONDARY}>
              Created {board.created_at ? new Date(board.created_at).toLocaleDateString() : 'N/A'}
            </Text>
          </Flex>
        </div>
        <Flex gap={Flex.gaps.SMALL}>
          <Button
            kind={Button.kinds.TERTIARY}
            onClick={handleEdit}
            leftIcon={Edit}
          >
            Edit
          </Button>
          <Button
            kind={Button.kinds.TERTIARY}
            onClick={handleShare}
            leftIcon={Share}
          >
            Share
          </Button>
          <Button
            kind={Button.kinds.TERTIARY}
            onClick={handleDelete}
            leftIcon={Delete}
            loading={isDeleting}
            disabled={isDeleting}
            className="delete-button"
          >
            Delete
          </Button>
        </Flex>
      </Flex>

      <Divider className="board-details-divider" />

      {board.description && (
        <Box className="board-details-description" padding={Box.paddings.MEDIUM}>
          <Text>{board.description}</Text>
        </Box>
      )}

      <TabsContext activeTabId={activeTab}>
        <TabList onTabChange={(tabId: number) => setActiveTab(tabId)}>
          <Tab icon={Group}>Groups</Tab>
          <Tab icon={Person}>Members</Tab>
          <Tab>Activity</Tab>
          <Tab>Settings</Tab>
        </TabList>
      </TabsContext>

      <Box className="board-details-content" padding={Box.paddings.MEDIUM}>
        {activeTab === 0 && (
          <div className="board-groups">
            <Heading type={Heading.types.h3} value="Groups" />
            <Text>Groups will be displayed here</Text>
          </div>
        )}
        {activeTab === 1 && (
          <div className="board-members">
            <Heading type={Heading.types.h3} value="Members" />
            <Text>Board members will be displayed here</Text>
          </div>
        )}
        {activeTab === 2 && (
          <div className="board-activity">
            <Heading type={Heading.types.h3} value="Activity" />
            <Text>Recent activity will be displayed here</Text>
          </div>
        )}
        {activeTab === 3 && (
          <div className="board-settings">
            <Heading type={Heading.types.h3} value="Settings" />
            <Text>Board settings will be displayed here</Text>
          </div>
        )}
      </Box>
    </Box>
  );
};

export default BoardDetails;