import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Loader,
  Icon
} from 'monday-ui-react-core';
import {
  Workspace,
  Board,
  Check,
  Close,
  NavigationChevronRight,
  NavigationChevronLeft
} from 'monday-ui-react-core/icons';
import { useAuth } from '../Authentication/AuthContext';
import { ClaudeService } from '../../services/nlp/claudeService';
import { WorkspaceService } from '../../services/api/workspaceService';
import { useResponsive } from '../../hooks/useResponsive';
import LanguageInput from './LanguageInput';
import StructurePreview from './StructurePreview';

interface WorkspaceCreationResult {
  name: string;
  description: string;
  boardSuggestions: Array<{
    name: string;
    description: string;
    columnSuggestions: Array<{
      title: string;
      type: string;
    }>;
    groupSuggestions: Array<{
      title: string;
    }>;
  }>;
}

interface MultiStepWizardProps {
  onComplete?: (workspaceId: string) => void;
  onSaveTemplate?: (template: WorkspaceCreationResult) => void;
}

const MultiStepWizard: React.FC<MultiStepWizardProps> = ({ onComplete, onSaveTemplate }) => {
  const { token } = useAuth();
  const { isMobile } = useResponsive();
  
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [workspaceStructure, setWorkspaceStructure] = useState<WorkspaceCreationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  
  // Steps configuration
  const steps = [
    { id: 'describe', title: 'Describe Workspace', icon: Workspace },
    { id: 'preview', title: 'Preview & Edit', icon: Board },
    { id: 'implement', title: 'Implementation', icon: Check }
  ];
  
  // Handle workspace generation from description
  const handleWorkspaceGenerated = (generatedWorkspace: WorkspaceCreationResult) => {
    setWorkspaceStructure(generatedWorkspace);
    setCurrentStep(1); // Move to preview step
  };
  
  // Handle structure changes in preview
  const handleStructureChange = (updatedStructure: WorkspaceCreationResult) => {
    setWorkspaceStructure(updatedStructure);
  };
  
  // Handle workspace implementation
  const handleImplementWorkspace = async () => {
    if (!workspaceStructure || !token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Implement workspace using Claude service
      const workspaceId = await ClaudeService.implementWorkspacePlan(workspaceStructure);
      
      setCreatedWorkspaceId(workspaceId);
      setSuccess(true);
      setCurrentStep(2); // Move to completion step
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete(workspaceId);
      }
      
    } catch (err: unknown) {
      console.error('Error implementing workspace:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to implement workspace';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle saving as template
  const handleSaveAsTemplate = () => {
    if (!workspaceStructure || !onSaveTemplate) return;
    onSaveTemplate(workspaceStructure);
  };
  
  // Navigate to previous step
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Navigate to next step
  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <LanguageInput onWorkspaceGenerated={handleWorkspaceGenerated} />
        );
      case 1:
        return workspaceStructure ? (
          <StructurePreview 
            workspaceStructure={workspaceStructure}
            onStructureChange={handleStructureChange}
            onImplement={handleImplementWorkspace}
            onSaveAsTemplate={onSaveTemplate ? handleSaveAsTemplate : undefined}
          />
        ) : (
          <Box style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text>No workspace structure generated yet. Please go back and describe your workspace.</Text>
            <Button onClick={goToPreviousStep} style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon icon={NavigationChevronLeft} />
                <span>Back to Description</span>
              </div>
            </Button>
          </Box>
        );
      case 2:
        return (
          <Box style={{ textAlign: 'center', padding: '40px 0' }}>
            {loading ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Loader />
                </div>
                <Text style={{ marginTop: '16px' }}>Implementing workspace...</Text>
              </div>
            ) : error ? (
              <div>
                <Icon icon={Close} style={{ color: 'var(--negative-color)', fontSize: '32px' }} />
                <Heading value="Implementation Failed" style={{ marginTop: '16px', color: 'var(--negative-color)' }} />
                <Text style={{ marginTop: '8px' }}>{error}</Text>
                <Button onClick={goToPreviousStep} style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon icon={NavigationChevronLeft} />
                    <span>Back to Preview</span>
                  </div>
                </Button>
              </div>
            ) : success ? (
              <div>
                <Icon icon={Check} style={{ color: 'var(--positive-color)', fontSize: '32px' }} />
                <Heading value="Workspace Created Successfully!" style={{ marginTop: '16px', color: 'var(--positive-color)' }} />
                <Text style={{ marginTop: '8px' }}>
                  Your workspace "{workspaceStructure?.name}" has been created with {workspaceStructure?.boardSuggestions.length} boards.
                </Text>
                {createdWorkspaceId && (
                  <Button onClick={() => window.open(`https://monday.com/workspaces/${createdWorkspaceId}`, '_blank')} style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon icon={Workspace} />
                      <span>Open Workspace</span>
                    </div>
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <Text>Ready to implement your workspace.</Text>
                <Button onClick={handleImplementWorkspace} style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon icon={Check} />
                    <span>Implement Now</span>
                  </div>
                </Button>
              </div>
            )}
          </Box>
        );
      default:
        return null;
    }
  };
  
  return (
    <Box className="multi-step-wizard">
      {/* Steps indicator */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {/* Progress line */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '40px',
            right: '40px',
            height: '2px',
            backgroundColor: 'var(--ui-border-color)',
            zIndex: 0
          }} />
          
          {/* Completed progress */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '40px',
            width: `${(currentStep / (steps.length - 1)) * 100}%`,
            height: '2px',
            backgroundColor: 'var(--positive-color)',
            zIndex: 1,
            transition: 'width 0.3s ease'
          }} />
          
          {/* Step circles */}
          {steps.map((step, index) => (
            <div
              key={step.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                zIndex: 2
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: index < currentStep ? 'var(--positive-color)' :
                                index === currentStep ? 'var(--primary-color)' :
                                'var(--ui-border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                marginBottom: '8px'
              }}>
                {index < currentStep ? <Icon icon={Check} /> : <span>{index + 1}</span>}
              </div>
              <Text style={{ fontWeight: index === currentStep ? 'bold' : 'normal' }}>
                {step.title}
              </Text>
            </div>
          ))}
        </div>
      </div>
      
      {/* Step content */}
      <Box className="step-content">
        {renderStepContent()}
      </Box>
      
      {/* Navigation buttons (only shown for certain steps) */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <Button onClick={goToPreviousStep}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon icon={NavigationChevronLeft} />
              <span>Back</span>
            </div>
          </Button>
          
          <Button onClick={handleImplementWorkspace}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Implement Workspace</span>
              <Icon icon={NavigationChevronRight} />
            </div>
          </Button>
        </div>
      )}
    </Box>
  );
};

export default MultiStepWizard;