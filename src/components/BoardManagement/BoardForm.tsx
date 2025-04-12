import React, { useState, useEffect } from 'react';
import './BoardForm.css';
import { 
  Box, 
  Button, 
  Flex, 
  Heading, 
  Text, 
  TextField, 
  Dropdown, 
  Menu, 
  MenuItem,
  TextArea
} from 'monday-ui-react-core';
import { Board, BoardKind } from '../../types/monday';

interface BoardFormProps {
  board?: Board;
  workspaceId?: string;
  onSubmit: (data: {
    name: string;
    description?: string;
    boardKind: BoardKind;
    workspaceId?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

const BoardForm: React.FC<BoardFormProps> = ({
  board,
  workspaceId,
  onSubmit,
  onCancel
}) => {
  const [name, setName] = useState<string>(board?.name || '');
  const [description, setDescription] = useState<string>(board?.description || '');
  const [boardKind, setBoardKind] = useState<BoardKind>(
    board?.board_kind as BoardKind || BoardKind.PUBLIC
  );
  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isEditMode = !!board;

  const validateForm = (): boolean => {
    const newErrors: { name?: string; description?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Board name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Board name must be less than 100 characters';
    }
    
    if (description && description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit({
        name,
        description: description || undefined,
        boardKind,
        workspaceId
      });
    } catch (err) {
      console.error('Error submitting board form:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBoardKindLabel = (kind: BoardKind): string => {
    switch (kind) {
      case BoardKind.PUBLIC:
        return 'Public';
      case BoardKind.PRIVATE:
        return 'Private';
      case BoardKind.SHARE:
        return 'Shareable';
      default:
        return kind;
    }
  };

  return (
    <Box className="board-form-container" padding={Box.paddings.LARGE}>
      <form onSubmit={handleSubmit}>
        <Heading type={Heading.types.h2} value={isEditMode ? 'Edit Board' : 'Create New Board'} />
        
        <div className="board-form-field">
          <TextField
            title="Board Name"
            placeholder="Enter board name"
            value={name}
            onChange={(value: string) => setName(value)}
            validation={{
              status: errors.name ? "error" : undefined,
              text: errors.name
            }}
            required
            size={TextField.sizes.MEDIUM}
          />
        </div>
        
        <div className="board-form-field">
          <TextArea
            title="Description"
            placeholder="Enter board description (optional)"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          />
          {errors.description && (
            <div className="form-error-text">{errors.description}</div>
          )}
        </div>
        
        <div className="board-form-field">
          <Text weight={Text.weights.MEDIUM}>Board Type</Text>
          <Dropdown
            className="board-form-dropdown"
            size={Dropdown.sizes.MEDIUM}
            placeholder="Select board type"
            value={getBoardKindLabel(boardKind)}
            insideOverflowContainer
            insideOverflowWithTransformContainer
            openMenuOnFocus
            menuPosition={Dropdown.menuPositions.BOTTOM}
            zIndex={9999}
          >
            <Menu id="board-kind-menu" size={Menu.sizes.MEDIUM}>
              <MenuItem
                onClick={() => setBoardKind(BoardKind.PUBLIC)}
                title="Public"
                selected={boardKind === BoardKind.PUBLIC}
              />
              <MenuItem
                onClick={() => setBoardKind(BoardKind.PRIVATE)}
                title="Private"
                selected={boardKind === BoardKind.PRIVATE}
              />
              <MenuItem
                onClick={() => setBoardKind(BoardKind.SHARE)}
                title="Shareable"
                selected={boardKind === BoardKind.SHARE}
              />
            </Menu>
          </Dropdown>
          <Text color={Text.colors.SECONDARY}>
            {boardKind === BoardKind.PUBLIC && 'Visible to all workspace members'}
            {boardKind === BoardKind.PRIVATE && 'Visible only to board members'}
            {boardKind === BoardKind.SHARE && 'Can be shared with external users'}
          </Text>
        </div>
        
        <Flex className="board-form-actions" justify={Flex.justify.END} gap={Flex.gaps.MEDIUM}>
          <Button
            kind={Button.kinds.TERTIARY}
            size={Button.sizes.MEDIUM}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            kind={Button.kinds.PRIMARY}
            size={Button.sizes.MEDIUM}
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {isEditMode ? 'Update Board' : 'Create Board'}
          </Button>
        </Flex>
      </form>
    </Box>
  );
};

export default BoardForm;