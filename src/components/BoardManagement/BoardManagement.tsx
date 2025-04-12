import React, { useState } from 'react';
import './BoardManagement.css';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Flex, 
  Heading, 
  Loader, 
  Text,
  TabsContext,
  TabList,
  Tab
} from 'monday-ui-react-core';
import { Add } from 'monday-ui-react-core/icons';
import { useBoards } from '../../hooks/useBoards';
import BoardList from './BoardList';
import BoardDetails from './BoardDetails';
import BoardForm from './BoardForm';
import './BoardManagement.css';

const BoardManagement: React.FC = () => {
  const navigate = useNavigate();
  const { boards, loading, error, fetchBoards } = useBoards({ initialLoad: true });
  const [activeTab, setActiveTab] = useState<number>(0);

  const handleCreateBoard = () => {
    navigate('/boards/new');
  };

  const handleTabChange = (tabId: number) => {
    setActiveTab(tabId);
    
    if (tabId === 0) {
      // All boards
      fetchBoards();
    } else if (tabId === 1) {
      // My boards
      // This would filter for boards the user owns or is a member of
      // For now, we'll just show all boards
      fetchBoards();
    } else if (tabId === 2) {
      // Recent boards
      // This would sort boards by recently accessed
      // For now, we'll just show all boards
      fetchBoards();
    }
  };

  if (loading && boards.length === 0) {
    return (
      <Box className="board-management-loading" padding={Box.paddings.LARGE}>
        <Loader size={Loader.sizes.LARGE} />
        <Text>Loading boards...</Text>
      </Box>
    );
  }

  return (
    <Box className="board-management-container">
      <Routes>
        <Route path="/" element={
          <>
            <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER} className="board-management-header">
              <Heading type={Heading.types.h1} value="Boards" />
              <Button onClick={handleCreateBoard} leftIcon={Add}>Create Board</Button>
            </Flex>
            
            <TabsContext activeTabId={activeTab}>
              <TabList onTabChange={handleTabChange}>
                <Tab>All Boards</Tab>
                <Tab>My Boards</Tab>
                <Tab>Recent</Tab>
              </TabList>
            </TabsContext>
            
            {error ? (
              <Box className="board-management-error" padding={Box.paddings.MEDIUM}>
                <Text type={Text.types.TEXT1} color={Text.colors.PRIMARY}>
                  Error loading boards: {error}
                </Text>
                <Button onClick={() => fetchBoards()}>Retry</Button>
              </Box>
            ) : (
              <div className="board-list-container">
                {boards.map((board) => (
                  <div
                    key={board.id}
                    className="board-item"
                    onClick={() => navigate(`/boards/${board.id}`)}
                  >
                    <h3>{board.name}</h3>
                    <p>{board.description || 'No description'}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        } />
        <Route path="/new" element={
          <BoardForm
            onSubmit={async (data) => {
              await Promise.resolve();
              navigate('/boards');
            }}
            onCancel={() => navigate('/boards')}
          />
        } />
        <Route path="/:boardId" element={<BoardDetails />} />
        <Route path="/:boardId/edit" element={
          <BoardForm
            onSubmit={async (data) => {
              await Promise.resolve();
              navigate('/boards');
            }}
            onCancel={() => navigate('/boards')}
          />
        } />
      </Routes>
    </Box>
  );
};

export default BoardManagement;