import React, { useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Icon,
  Tooltip,
  Accordion,
  AccordionItem,
  EditableText,
  Chips
} from 'monday-ui-react-core';
import {
  Board,
  Group,
  Column,
  Edit,
  Delete,
  Add,
  Workspace,
  Info
} from 'monday-ui-react-core/icons';
import { useResponsive } from '../../hooks/useResponsive';

interface ColumnSuggestion {
  title: string;
  type: string;
}

interface GroupSuggestion {
  title: string;
}

interface BoardSuggestion {
  name: string;
  description: string;
  columnSuggestions: ColumnSuggestion[];
  groupSuggestions: GroupSuggestion[];
}

interface WorkspaceStructure {
  name: string;
  description: string;
  boardSuggestions: BoardSuggestion[];
}

interface StructurePreviewProps {
  workspaceStructure: WorkspaceStructure;
  onStructureChange: (updatedStructure: WorkspaceStructure) => void;
  onImplement?: () => void;
  onSaveAsTemplate?: () => void;
}

const StructurePreview: React.FC<StructurePreviewProps> = ({
  workspaceStructure,
  onStructureChange,
  onImplement,
  onSaveAsTemplate
}) => {
  const { isMobile } = useResponsive();
  const [expandedBoards, setExpandedBoards] = useState<string[]>([]);
  
  // Toggle board expansion
  const toggleBoardExpansion = (boardName: string) => {
    setExpandedBoards(prev => 
      prev.includes(boardName)
        ? prev.filter(name => name !== boardName)
        : [...prev, boardName]
    );
  };
  
  // Update workspace name
  const updateWorkspaceName = (newName: string) => {
    onStructureChange({
      ...workspaceStructure,
      name: newName
    });
  };
  
  // Update workspace description
  const updateWorkspaceDescription = (newDescription: string) => {
    onStructureChange({
      ...workspaceStructure,
      description: newDescription
    });
  };
  
  // Update board name
  const updateBoardName = (index: number, newName: string) => {
    const updatedBoards = [...workspaceStructure.boardSuggestions];
    updatedBoards[index] = {
      ...updatedBoards[index],
      name: newName
    };
    
    onStructureChange({
      ...workspaceStructure,
      boardSuggestions: updatedBoards
    });
  };
  
  // Update board description
  const updateBoardDescription = (index: number, newDescription: string) => {
    const updatedBoards = [...workspaceStructure.boardSuggestions];
    updatedBoards[index] = {
      ...updatedBoards[index],
      description: newDescription
    };
    
    onStructureChange({
      ...workspaceStructure,
      boardSuggestions: updatedBoards
    });
  };
  
  // Add a new column to a board
  const addColumn = (boardIndex: number) => {
    const updatedBoards = [...workspaceStructure.boardSuggestions];
    updatedBoards[boardIndex].columnSuggestions.push({
      title: 'New Column',
      type: 'text'
    });
    
    onStructureChange({
      ...workspaceStructure,
      boardSuggestions: updatedBoards
    });
  };
  
  // Update column
  const updateColumn = (boardIndex: number, columnIndex: number, field: 'title' | 'type', value: string) => {
    const updatedBoards = [...workspaceStructure.boardSuggestions];
    updatedBoards[boardIndex].columnSuggestions[columnIndex] = {
      ...updatedBoards[boardIndex].columnSuggestions[columnIndex],
      [field]: value
    };
    
    onStructureChange({
      ...workspaceStructure,
      boardSuggestions: updatedBoards
    });
  };
  
  // Delete column
  const deleteColumn = (boardIndex: number, columnIndex: number) => {
    const updatedBoards = [...workspaceStructure.boardSuggestions];
    updatedBoards[boardIndex].columnSuggestions.splice(columnIndex, 1);
    
    onStructureChange({
      ...workspaceStructure,
      boardSuggestions: updatedBoards
    });
  };
  
  // Add a new group to a board
  const addGroup = (boardIndex: number) => {
    const updatedBoards = [...workspaceStructure.boardSuggestions];
    updatedBoards[boardIndex].groupSuggestions.push({
      title: 'New Group'
    });
    
    onStructureChange({
      ...workspaceStructure,
      boardSuggestions: updatedBoards
    });
  };
  
  // Update group
  const updateGroup = (boardIndex: number, groupIndex: number, title: string) => {
    const updatedBoards = [...workspaceStructure.boardSuggestions];
    updatedBoards[boardIndex].groupSuggestions[groupIndex] = {
      title
    };
    
    onStructureChange({
      ...workspaceStructure,
      boardSuggestions: updatedBoards
    });
  };
  
  // Delete group
  const deleteGroup = (boardIndex: number, groupIndex: number) => {
    const updatedBoards = [...workspaceStructure.boardSuggestions];
    updatedBoards[boardIndex].groupSuggestions.splice(groupIndex, 1);
    
    onStructureChange({
      ...workspaceStructure,
      boardSuggestions: updatedBoards
    });
  };
  
  // Add a new board
  const addBoard = () => {
    onStructureChange({
      ...workspaceStructure,
      boardSuggestions: [
        ...workspaceStructure.boardSuggestions,
        {
          name: 'New Board',
          description: 'Description for the new board',
          columnSuggestions: [
            { title: 'Status', type: 'status' },
            { title: 'Text', type: 'text' }
          ],
          groupSuggestions: [
            { title: 'Group 1' }
          ]
        }
      ]
    });
  };
  
  // Delete board
  const deleteBoard = (boardIndex: number) => {
    const updatedBoards = [...workspaceStructure.boardSuggestions];
    updatedBoards.splice(boardIndex, 1);
    
    onStructureChange({
      ...workspaceStructure,
      boardSuggestions: updatedBoards
    });
  };
  
  // Get column type display name
  const getColumnTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'status': 'Status',
      'text': 'Text',
      'number': 'Number',
      'date': 'Date',
      'people': 'People',
      'dropdown': 'Dropdown',
      'checkbox': 'Checkbox',
      'timeline': 'Timeline',
      'file': 'File',
      'link': 'Link',
      'email': 'Email',
      'phone': 'Phone',
      'rating': 'Rating',
      'color': 'Color',
      'location': 'Location',
      'long_text': 'Long Text',
      'formula': 'Formula',
      'mirror': 'Mirror',
      'dependency': 'Dependency'
    };
    
    return typeMap[type.toLowerCase()] || type;
  };
  
  // Get column type color
  const getColumnTypeColor = (type: string) => {
    const typeColorMap: Record<string, string> = {
      'status': 'var(--positive-color)',
      'text': 'var(--primary-color)',
      'number': 'var(--warning-color)',
      'date': 'var(--purple-color)',
      'people': 'var(--lipstick-color)',
      'dropdown': 'var(--grass-color)',
      'checkbox': 'var(--done-color)',
      'timeline': 'var(--dark-purple-color)',
      'file': 'var(--dark-blue-color)',
      'link': 'var(--link-color)',
      'email': 'var(--indigo-color)',
      'phone': 'var(--aqua-color)',
      'rating': 'var(--yellow-color)',
      'color': 'var(--orange-color)',
      'location': 'var(--bright-blue-color)',
      'long_text': 'var(--bazooka-color)',
      'formula': 'var(--dark-purple-color)',
      'mirror': 'var(--dark-blue-color)',
      'dependency': 'var(--lipstick-color)'
    };
    
    return typeColorMap[type.toLowerCase()] || 'var(--primary-text-color)';
  };
  
  return (
    <Box className="structure-preview-container">
      <div style={{ marginBottom: '24px' }}>
        <Heading value="Workspace Structure Preview" />
        <Text style={{ marginTop: '8px', color: 'var(--text-color-secondary)' }}>
          Review and edit the AI-generated workspace structure before implementation.
        </Text>
      </div>
      
      {/* Workspace header */}
      <Box 
        className="workspace-header" 
        style={{ 
          padding: '16px', 
          backgroundColor: 'var(--primary-selected-color)', 
          borderRadius: '8px',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Icon icon={Workspace} />
          <div style={{ fontSize: '18px', fontWeight: 'bold', width: '100%' }}>
            <EditableText
              value={workspaceStructure.name}
              onChange={updateWorkspaceName}
              placeholder="Workspace Name"
            />
          </div>
        </div>
        
        <div style={{ width: '100%' }}>
          <EditableText
            value={workspaceStructure.description}
            onChange={updateWorkspaceDescription}
            placeholder="Workspace Description"
          />
        </div>
      </Box>
      
      {/* Boards */}
      <Box style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Text style={{ fontWeight: 'bold', fontSize: '16px' }}>Boards</Text>
          <Button size="small" onClick={addBoard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon icon={Add} />
              <span>Add Board</span>
            </div>
          </Button>
        </div>
        
        {workspaceStructure.boardSuggestions.map((board, boardIndex) => (
          <Box 
            key={boardIndex} 
            className="board-item" 
            style={{ 
              marginBottom: '16px', 
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            <div 
              style={{ 
                padding: '16px',
                backgroundColor: 'var(--primary-background-hover-color)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onClick={() => toggleBoardExpansion(board.name)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon icon={Board} />
                <div style={{ fontWeight: 'bold' }} onClick={(e) => e.stopPropagation()}>
                  <EditableText
                    value={board.name}
                    onChange={(value) => updateBoardName(boardIndex, value)}
                    placeholder="Board Name"
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <Tooltip content="Delete Board">
                  <Button 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBoard(boardIndex);
                    }}
                  >
                    <Icon icon={Delete} />
                  </Button>
                </Tooltip>
              </div>
            </div>
            
            {expandedBoards.includes(board.name) && (
              <Box style={{ padding: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <EditableText
                    value={board.description}
                    onChange={(value) => updateBoardDescription(boardIndex, value)}
                    placeholder="Board Description"
                  />
                </div>
                
                {/* Columns */}
                <Box style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Text style={{ fontWeight: 'bold' }}>Columns</Text>
                    <Button size="small" onClick={() => addColumn(boardIndex)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon icon={Add} />
                        <span>Add Column</span>
                      </div>
                    </Button>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {board.columnSuggestions.map((column, columnIndex) => (
                      <Box 
                        key={columnIndex} 
                        style={{ 
                          padding: '8px 12px', 
                          backgroundColor: 'var(--primary-background-color)',
                          border: '1px solid var(--border-color)',
                          borderLeft: `4px solid ${getColumnTypeColor(column.type)}`,
                          borderRadius: '4px',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon icon={Column} />
                            <div style={{ fontWeight: 'bold', minWidth: '100px' }}>
                              <EditableText
                                value={column.title}
                                onChange={(value) => updateColumn(boardIndex, columnIndex, 'title', value)}
                                placeholder="Column Title"
                              />
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Chips
                              label={getColumnTypeDisplay(column.type)}
                              color={Chips.colors.PRIMARY}
                            />
                            <Button 
                              size="small"
                              onClick={() => deleteColumn(boardIndex, columnIndex)}
                            >
                              <Icon icon={Delete} />
                            </Button>
                          </div>
                        </div>
                      </Box>
                    ))}
                  </div>
                </Box>
                
                {/* Groups */}
                <Box>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Text style={{ fontWeight: 'bold' }}>Groups</Text>
                    <Button size="small" onClick={() => addGroup(boardIndex)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon icon={Add} />
                        <span>Add Group</span>
                      </div>
                    </Button>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {board.groupSuggestions.map((group, groupIndex) => (
                      <Box 
                        key={groupIndex} 
                        style={{ 
                          padding: '8px 12px', 
                          backgroundColor: 'var(--primary-background-color)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon icon={Group} />
                            <div style={{ fontWeight: 'bold', minWidth: '100px' }}>
                              <EditableText
                                value={group.title}
                                onChange={(value) => updateGroup(boardIndex, groupIndex, value)}
                                placeholder="Group Title"
                              />
                            </div>
                          </div>
                          
                          <Button 
                            size="small"
                            onClick={() => deleteGroup(boardIndex, groupIndex)}
                          >
                            <Icon icon={Delete} />
                          </Button>
                        </div>
                      </Box>
                    ))}
                  </div>
                </Box>
              </Box>
            )}
          </Box>
        ))}
      </Box>
      
      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
        {onSaveAsTemplate && (
          <Button onClick={onSaveAsTemplate}>
            Save as Template
          </Button>
        )}
        
        {onImplement && (
          <Button onClick={onImplement}>
            Implement Workspace
          </Button>
        )}
      </div>
    </Box>
  );
};

export default StructurePreview;