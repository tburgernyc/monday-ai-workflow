import React, { useState } from 'react';
import { Box, Heading, Text, Flex, Button, Search, Tooltip } from 'monday-ui-react-core';
import Card from '../common/Card';

interface QuickAccessProps {
  recentBoards: any[];
  recentWorkspaces: any[];
}

const QuickAccess: React.FC<QuickAccessProps> = ({ recentBoards, recentWorkspaces }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pinnedItems, setPinnedItems] = useState<{ id: string; type: string; name: string; description: string }[]>([
    { id: 'board-1', type: 'board', name: 'Product Roadmap', description: 'Q2 2025 Product Roadmap' },
    { id: 'workspace-2', type: 'workspace', name: 'Marketing', description: 'Marketing campaigns and assets' }
  ]);

  // Filter boards and workspaces based on search query
  const filteredBoards = recentBoards.filter(board => 
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    board.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredWorkspaces = recentWorkspaces.filter(workspace => 
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    workspace.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if an item is pinned
  const isPinned = (id: string) => {
    return pinnedItems.some(item => item.id === id);
  };

  // Toggle pin status
  const togglePin = (id: string, type: string, name: string, description: string) => {
    if (isPinned(id)) {
      setPinnedItems(pinnedItems.filter(item => item.id !== id));
    } else {
      setPinnedItems([...pinnedItems, { id, type, name, description }]);
    }
  };

  return (
    <Box className="quick-access-section">
      <Heading value="Quick Access" size={Heading.sizes.MEDIUM} style={{ marginBottom: '16px' }} />
      
      {/* Search */}
      <Box style={{ marginBottom: '16px' }}>
        <Search
          placeholder="Search boards and workspaces"
          onChange={(value: string) => setSearchQuery(value)}
          value={searchQuery}
        />
      </Box>
      
      {/* Pinned Items */}
      {pinnedItems.length > 0 && (
        <Box style={{ marginBottom: '24px' }}>
          <Heading value="Pinned" size={Heading.sizes.SMALL} style={{ marginBottom: '8px' }} />
          <Flex direction={Flex.directions.COLUMN} gap={8}>
            {pinnedItems.map(item => (
              <Card 
                key={`pinned-${item.id}`}
                className="pinned-item-card"
              >
                <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER}>
                  <Box>
                    <Flex align={Flex.align.CENTER} gap={8}>
                      <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                      <Text color={Text.colors.SECONDARY} style={{ fontSize: '12px' }}>
                        {item.type === 'board' ? 'Board' : 'Workspace'}
                      </Text>
                    </Flex>
                    <Text color={Text.colors.SECONDARY}>{item.description}</Text>
                  </Box>
                  <Tooltip content="Unpin">
                    <Button
                      size={Button.sizes.SMALL}
                      kind={Button.kinds.TERTIARY}
                      onClick={() => togglePin(item.id, item.type, item.name, item.description)}
                    >
                      📌
                    </Button>
                  </Tooltip>
                </Flex>
              </Card>
            ))}
          </Flex>
        </Box>
      )}
      
      {/* Recent Boards */}
      <Box style={{ marginBottom: '24px' }}>
        <Heading value="Recent Boards" size={Heading.sizes.SMALL} style={{ marginBottom: '8px' }} />
        {filteredBoards.length > 0 ? (
          <Flex direction={Flex.directions.COLUMN} gap={8}>
            {filteredBoards.map(board => (
              <Card 
                key={`board-${board.id}`}
                className="recent-item-card"
              >
                <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER}>
                  <Box>
                    <Flex align={Flex.align.CENTER} gap={8}>
                      <Text style={{ fontWeight: 'bold' }}>{board.name}</Text>
                      <Text color={Text.colors.SECONDARY} style={{ fontSize: '12px' }}>
                        {board.itemCount} items
                      </Text>
                    </Flex>
                    <Text color={Text.colors.SECONDARY}>{board.description}</Text>
                  </Box>
                  <Tooltip content={isPinned(board.id) ? "Unpin" : "Pin"}>
                    <Button
                      size={Button.sizes.SMALL}
                      kind={Button.kinds.TERTIARY}
                      onClick={() => togglePin(board.id, 'board', board.name, board.description)}
                    >
                      {isPinned(board.id) ? '📌' : '📍'}
                    </Button>
                  </Tooltip>
                </Flex>
              </Card>
            ))}
          </Flex>
        ) : (
          <Text color={Text.colors.SECONDARY}>No boards match your search.</Text>
        )}
      </Box>
      
      {/* Recent Workspaces */}
      <Box>
        <Heading value="Recent Workspaces" size={Heading.sizes.SMALL} style={{ marginBottom: '8px' }} />
        {filteredWorkspaces.length > 0 ? (
          <Flex direction={Flex.directions.COLUMN} gap={8}>
            {filteredWorkspaces.map(workspace => (
              <Card 
                key={`workspace-${workspace.id}`}
                className="recent-item-card"
              >
                <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER}>
                  <Box>
                    <Flex align={Flex.align.CENTER} gap={8}>
                      <Text style={{ fontWeight: 'bold' }}>{workspace.name}</Text>
                      <Text color={Text.colors.SECONDARY} style={{ fontSize: '12px' }}>
                        {workspace.boardCount} boards
                      </Text>
                    </Flex>
                    <Text color={Text.colors.SECONDARY}>{workspace.description}</Text>
                  </Box>
                  <Tooltip content={isPinned(workspace.id) ? "Unpin" : "Pin"}>
                    <Button
                      size={Button.sizes.SMALL}
                      kind={Button.kinds.TERTIARY}
                      onClick={() => togglePin(workspace.id, 'workspace', workspace.name, workspace.description)}
                    >
                      {isPinned(workspace.id) ? '📌' : '📍'}
                    </Button>
                  </Tooltip>
                </Flex>
              </Card>
            ))}
          </Flex>
        ) : (
          <Text color={Text.colors.SECONDARY}>No workspaces match your search.</Text>
        )}
      </Box>
      
      {/* View All Link */}
      <Box style={{ marginTop: '16px', textAlign: 'center' }}>
        <Button
          size={Button.sizes.SMALL}
          kind={Button.kinds.TERTIARY}
          onClick={() => window.open('/boards', '_blank')}
        >
          View all boards and workspaces
        </Button>
      </Box>
    </Box>
  );
};

export default QuickAccess;