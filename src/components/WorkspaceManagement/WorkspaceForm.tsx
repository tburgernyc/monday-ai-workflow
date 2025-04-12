import React, { useState, useEffect } from 'react';
import './WorkspaceForm.css';
import {
  Box,
  Button,
  TextField,
  TextArea,
  Dropdown,
  Flex,
  Heading
} from 'monday-ui-react-core';
import {
  Add,
  Edit,
  Close
} from 'monday-ui-react-core/icons';
import { Workspace } from '../../types/monday';

// Define workspace kind types
type WorkspaceKind = 'open' | 'closed' | 'private';

interface WorkspaceFormProps {
  workspace?: Workspace | null;
  onSubmit: (data: Partial<Workspace>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const WorkspaceForm: React.FC<WorkspaceFormProps> = ({
  workspace,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<WorkspaceKind>('open');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with workspace data if editing
  useEffect(() => {
    if (workspace) {
      setName(workspace.name || '');
      setDescription(workspace.description || '');
      setKind((workspace.kind as WorkspaceKind) || 'open');
    }
  }, [workspace]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Workspace name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const workspaceData: Partial<Workspace> = {
      name,
      description,
      kind
    };
    
    if (workspace?.id) {
      workspaceData.id = workspace.id;
    }
    
    await onSubmit(workspaceData);
  };

  const kindOptions = [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
    { value: 'private', label: 'Private' }
  ];

  return (
    <Box className="workspace-form-container" padding={Box.paddings.LARGE}>
      <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER} className="form-header">
        <Heading type={Heading.types.h2} value={workspace ? 'Edit Workspace' : 'Create Workspace'} />
        <Button
          kind={Button.kinds.TERTIARY}
          size={Button.sizes.SMALL}
          onClick={onCancel}
          ariaLabel="Close form"
        >
          <Close />
        </Button>
      </Flex>
      
      <form onSubmit={handleSubmit} className="workspace-form">
        <div className="form-group">
          <TextField
            title="Workspace Name"
            placeholder="Enter workspace name"
            value={name}
            onChange={(value: string) => setName(value)}
            validation={{
              status: errors.name ? 'error' : undefined,
              text: errors.name
            }}
            required
          />
        </div>
        
        <div className="form-group">
          <TextArea
            title="Description"
            placeholder="Enter workspace description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        
        <div className="form-group">
          <Dropdown
            title="Workspace Type"
            placeholder="Select workspace type"
            options={kindOptions}
            value={kind}
            onChange={(option: any) => setKind(option.value as WorkspaceKind)}
            className="workspace-kind-dropdown"
          />
        </div>
        
        <Flex justify={Flex.justify.END} align={Flex.align.CENTER} gap={Flex.gaps.MEDIUM} className="form-actions">
          <Button
            kind={Button.kinds.TERTIARY}
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          
          <Button
            kind={Button.kinds.PRIMARY}
            onClick={handleSubmit}
            disabled={isLoading}
            loading={isLoading}
            leftIcon={workspace ? Edit : Add}
          >
            {workspace ? 'Update Workspace' : 'Create Workspace'}
          </Button>
        </Flex>
      </form>
    </Box>
  );
};

export default WorkspaceForm;