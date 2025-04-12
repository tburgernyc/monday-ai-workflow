import React, { useState } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { ClaudeService } from '../../services/nlp/claudeService';
import { WorkspaceCreationRequest } from '../../types/aiTypes';
import {
  Box,
  Flex,
  Heading,
  Text,
  Loader,
  Button,
  Dropdown,
  TextArea,
  Toast,
  Chips,
  RadioButton
} from 'monday-ui-react-core';
import {
  Bolt,
  Idea,
  Edit,
  Send,
  Replay,
  Workspace
} from 'monday-ui-react-core/icons';
import { useResponsive } from '../../hooks/useResponsive';

interface IndustryOption {
  value: string;
  label: string;
}

interface LanguageInputProps {
  onWorkspaceGenerated: (workspaceData: any) => void;
}

const LanguageInput: React.FC<LanguageInputProps> = ({ onWorkspaceGenerated }) => {
  const { token } = useAuth();
  const { isMobile } = useResponsive();
  
  const [description, setDescription] = useState<string>('');
  const [industry, setIndustry] = useState<string | null>(null);
  const [teamSize, setTeamSize] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<boolean>(false);
  const [examples, setExamples] = useState<string[]>([
    'A project management workspace for a marketing team of 10 people',
    'A software development workspace with agile methodology for tracking sprints and bugs',
    'A creative agency workspace for managing client projects and assets',
    'A sales team workspace for tracking leads, deals, and customer relationships',
    'A product development workspace for managing roadmap, features, and releases'
  ]);
  const [selectedExample, setSelectedExample] = useState<number | null>(null);

  // Industry options
  const industryOptions: IndustryOption[] = [
    { value: 'technology', label: 'Technology & Software' },
    { value: 'marketing', label: 'Marketing & Advertising' },
    { value: 'finance', label: 'Finance & Banking' },
    { value: 'healthcare', label: 'Healthcare & Medical' },
    { value: 'education', label: 'Education & E-Learning' },
    { value: 'retail', label: 'Retail & E-Commerce' },
    { value: 'manufacturing', label: 'Manufacturing & Production' },
    { value: 'consulting', label: 'Consulting & Professional Services' },
    { value: 'nonprofit', label: 'Nonprofit & NGO' },
    { value: 'media', label: 'Media & Entertainment' },
    { value: 'construction', label: 'Construction & Real Estate' },
    { value: 'hospitality', label: 'Hospitality & Tourism' },
    { value: 'other', label: 'Other' }
  ];

  // Team size options
  const teamSizeOptions = [
    { value: 'small', label: 'Small (1-10)', size: 5 },
    { value: 'medium', label: 'Medium (11-50)', size: 25 },
    { value: 'large', label: 'Large (51-200)', size: 100 },
    { value: 'enterprise', label: 'Enterprise (200+)', size: 250 }
  ];

  // Handle industry selection
  const handleIndustryChange = (option: IndustryOption | null) => {
    setIndustry(option ? option.value : null);
  };

  // Handle team size selection
  const handleTeamSizeChange = (value: string) => {
    const option = teamSizeOptions.find(opt => opt.value === value);
    if (option) {
      setTeamSize(option.size);
    }
  };

  // Handle example selection
  const handleExampleClick = (index: number) => {
    setSelectedExample(index);
    setDescription(examples[index]);
  };

  // Generate workspace from description
  const generateWorkspace = async () => {
    if (!description.trim() || !token) {
      setError('Please provide a description of your workspace');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare request
      const request: WorkspaceCreationRequest = {
        description: description.trim(),
        industry: industry || undefined,
        teamSize: teamSize
      };
      
      // Call Claude service
      const workspaceData = await ClaudeService.createWorkspaceFromDescription(
        request.description,
        request
      );
      
      // Pass the generated workspace data to parent component
      onWorkspaceGenerated(workspaceData);
      
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      
    } catch (err: unknown) {
      console.error('Error generating workspace:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate workspace';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Clear form
  const clearForm = () => {
    setDescription('');
    setIndustry(null);
    setTeamSize(10);
    setSelectedExample(null);
  };

  return (
    <Box className="language-input-container">
      <div style={{ marginBottom: '24px' }}>
        <Heading value="Create Workspace from Description" />
        <Text style={{ marginTop: '8px', color: 'var(--text-color-secondary)' }}>
          Describe your ideal workspace in natural language, and our AI will generate a tailored workspace structure for you.
        </Text>
      </div>
      
      {/* Description input */}
      <Box style={{ marginBottom: '24px' }}>
        <Text style={{ marginBottom: '8px', fontWeight: 'bold' }}>Workspace Description</Text>
        <TextArea
          placeholder="Describe your workspace needs, team structure, and workflow requirements..."
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          rows={6}
          style={{ width: '100%' }}
        />
      </Box>
      
      {/* Examples */}
      <Box style={{ marginBottom: '24px' }}>
        <Text style={{ marginBottom: '8px', fontWeight: 'bold' }}>Examples</Text>
        <Flex gap={8} style={{ flexWrap: 'wrap' }}>
          {examples.map((example, index) => (
            <Chips
              key={index}
              label={example.length > 50 ? example.substring(0, 50) + '...' : example}
              onClick={() => handleExampleClick(index)}
              color={selectedExample === index ? Chips.colors.POSITIVE : Chips.colors.PRIMARY}
            />
          ))}
        </Flex>
      </Box>
      
      {/* Additional options */}
      <Flex gap={24} style={{ marginBottom: '24px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        {/* Industry */}
        <Box style={{ flex: '1 0 200px' }}>
          <Text style={{ marginBottom: '8px', fontWeight: 'bold' }}>Industry</Text>
          <Dropdown
            placeholder="Select industry"
            options={industryOptions}
            onChange={handleIndustryChange}
            value={industryOptions.find(option => option.value === industry) || null}
          />
        </Box>
        
        {/* Team size */}
        <Box style={{ flex: '1 0 200px' }}>
          <Text style={{ marginBottom: '8px', fontWeight: 'bold' }}>Team Size</Text>
          <Flex gap={8} style={{ flexDirection: 'column' }}>
            {teamSizeOptions.map(option => (
              <RadioButton
                key={option.value}
                text={option.label}
                name="teamSize"
                checked={teamSize === option.size}
                onSelect={() => handleTeamSizeChange(option.value)}
              />
            ))}
          </Flex>
        </Box>
      </Flex>
      
      {/* Error message */}
      {error && (
        <Box className="error-message" style={{ padding: '16px', backgroundColor: 'var(--negative-color-selected)', borderRadius: '8px', marginBottom: '24px' }}>
          <Text style={{ color: 'var(--negative-color)' }}>Error: {error}</Text>
        </Box>
      )}
      
      {/* Success toast */}
      {successToast && (
        <Toast
          open={successToast}
          onClose={() => setSuccessToast(false)}
          className="success-toast"
        >
          Workspace structure generated successfully!
        </Toast>
      )}
      
      {/* Action buttons */}
      <Flex gap={16} style={{ justifyContent: 'flex-end' }}>
        <Button
          onClick={clearForm}
          leftIcon={Replay}
        >
          Clear
        </Button>
        
        <Button
          onClick={generateWorkspace}
          disabled={!description.trim() || loading}
          loading={loading}
          leftIcon={Workspace}
        >
          {loading ? 'Generating...' : 'Generate Workspace'}
        </Button>
      </Flex>
    </Box>
  );
};

export default LanguageInput;