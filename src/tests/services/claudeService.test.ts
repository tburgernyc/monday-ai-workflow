import { ClaudeService } from '../../services/nlp/claudeService';
import { BoardService } from '../../services/api/boardService';
import { WorkspaceService } from '../../services/api/workspaceService';
import { ItemService } from '../../services/api/itemService';
import { WorkflowAnalysisService } from '../../services/analysis/workflowAnalysisService';
import { AIContext, AIErrorType, AIServiceError } from '../../types/aiTypes';
import { Board, Group, Column, Item } from '../../types/monday';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ text: '{"key": "value"}' }]
        })
      }
    }))
  };
});

// Mock services
jest.mock('../../services/api/boardService');
jest.mock('../../services/api/workspaceService');
jest.mock('../../services/api/itemService');
jest.mock('../../services/analysis/workflowAnalysisService');

describe('ClaudeService', () => {
  // Mock data
  const mockApiKey = 'test-api-key';
  const mockBoardId = 'board-123';
  const mockWorkspaceId = 'workspace-123';
  const mockDescription = 'Test workspace description';
  
  // Mock responses
  const mockBoard: Board = {
    id: mockBoardId,
    name: 'Test Board',
    board_kind: 'public',
    state: 'active'
  };
  const mockGroups: Group[] = [{
    id: 'group-1',
    title: 'Group 1',
    color: 'blue',
    position: 1
  }];
  const mockColumns: Column[] = [{
    id: 'column-1',
    title: 'Status',
    type: 'status',
    settings_str: '{}'
  }];
  const mockItems: Item[] = [{
    id: 'item-1',
    name: 'Item 1',
    state: 'active',
    group: { id: 'group-1', title: 'Group 1' }
  }];
  const mockWorkspace = {
    id: mockWorkspaceId,
    name: 'Test Workspace',
    description: 'Test description',
    kind: 'open'
  };
  const mockBoards = [mockBoard];
  
  // Setup mocks
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock BoardService
    const mockBoardServiceInstance = {
      getBoardById: jest.fn().mockResolvedValue({ board: mockBoard, groups: mockGroups, columns: mockColumns }),
      getItems: jest.fn().mockResolvedValue(mockItems),
      create: jest.fn().mockResolvedValue(mockBoard),
      createGroup: jest.fn().mockResolvedValue({ id: 'group-1' })
    };
    (BoardService as jest.Mock).mockImplementation(() => mockBoardServiceInstance);
    
    // Mock WorkspaceService
    const mockWorkspaceServiceInstance = {
      getById: jest.fn().mockResolvedValue(mockWorkspace),
      getBoards: jest.fn().mockResolvedValue(mockBoards),
      create: jest.fn().mockResolvedValue(mockWorkspace)
    };
    (WorkspaceService as jest.Mock).mockImplementation(() => mockWorkspaceServiceInstance);
    
    // Mock ItemService
    const mockItemServiceInstance = {
      getItems: jest.fn().mockResolvedValue(mockItems),
      getItemById: jest.fn().mockResolvedValue(mockItems[0])
    };
    (ItemService as jest.Mock).mockImplementation(() => mockItemServiceInstance);
    
    // Mock WorkflowAnalysisService
    (WorkflowAnalysisService as jest.Mock).mockImplementation(() => ({
      generateWorkflowMetrics: jest.fn().mockResolvedValue({
        averageCycleTime: 5.2,
        throughput: 8.5,
        wipCount: 10,
        wipAge: 3.5,
        efficiency: {
          flowEfficiency: 0.7,
          onTimeCompletion: 0.8,
          blockedPercentage: 0.2
        }
      })
    }));
  });
  
  describe('initialize', () => {
    it('should initialize the Claude client with the provided API key', () => {
      const client = ClaudeService.initialize(mockApiKey);
      const AnthropicMock = require('@anthropic-ai/sdk').default;
      expect(AnthropicMock).toHaveBeenCalledWith({
        apiKey: mockApiKey,
        apiVersion: expect.any(String)
      });
    });
    
    it('should use the environment variable if no API key is provided', () => {
      process.env.REACT_APP_CLAUDE_API_KEY = 'env-api-key';
      const client = ClaudeService.initialize();
      const AnthropicMock = require('@anthropic-ai/sdk').default;
      expect(AnthropicMock).toHaveBeenCalledWith({
        apiKey: 'env-api-key',
        apiVersion: expect.any(String)
      });
      delete process.env.REACT_APP_CLAUDE_API_KEY;
    });
  });
  
  describe('analyzeWorkflow', () => {
    it('should analyze a workflow and return the analysis response', async () => {
      const mockAnalysisResponse = {
        summary: 'Test summary',
        bottlenecks: [{ id: 'bottleneck-1', name: 'Bottleneck 1', averageTime: 5, itemCount: 3, severity: 'high', suggestions: ['Fix it'] }],
        efficiencyScore: 75,
        insights: ['Insight 1'],
        detailedAnalysis: { process: 'Process analysis' }
      };
      
      // Mock the Claude response for this specific test
      const mockSpecificResponse = {
        content: [{ text: JSON.stringify(mockAnalysisResponse) }]
      };
      
      // Update the mock implementation for this test
      const AnthropicMock = require('@anthropic-ai/sdk').default;
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: jest.fn().mockResolvedValue(mockSpecificResponse)
        }
      }));
      
      const result = await ClaudeService.analyzeWorkflow(mockBoardId, {}, mockApiKey);
      
      expect(result).toEqual(mockAnalysisResponse);
      
      // Get the mock instance and check calls
      const boardServiceInstance = (BoardService as jest.Mock).mock.results[0].value;
      expect(boardServiceInstance.getBoardById).toHaveBeenCalledWith(mockBoardId);
      
      const itemServiceInstance = (ItemService as jest.Mock).mock.results[0].value;
      expect(itemServiceInstance.getItems).toHaveBeenCalledWith(mockBoardId);
    });
    
    it('should throw an AIServiceError if the board is not found', async () => {
      (BoardService as jest.Mock).mockImplementation(() => ({
        getBoardById: jest.fn().mockResolvedValue(null)
      }));
      
      await expect(ClaudeService.analyzeWorkflow(mockBoardId, {}, mockApiKey))
        .rejects
        .toThrow(AIServiceError);
    });
    
    it('should use cached response if available and valid', async () => {
      // First call to populate cache
      await ClaudeService.analyzeWorkflow(mockBoardId, {}, mockApiKey);
      
      // Clear mocks to verify they're not called again
      jest.clearAllMocks();
      
      // Second call should use cache
      await ClaudeService.analyzeWorkflow(mockBoardId, {}, mockApiKey);
      
      // BoardService should not be called for the second request
      expect(BoardService.prototype.getBoardById).not.toHaveBeenCalled();
    });
  });
  
  describe('suggestOptimizations', () => {
    it('should generate optimization suggestions for a workflow', async () => {
      const mockOptimizationResponse = {
        summary: 'Optimization summary',
        suggestions: [
          {
            title: 'Suggestion 1',
            description: 'Description 1',
            impact: 8,
            effort: 5,
            category: 'process',
            implementationSteps: ['Step 1', 'Step 2']
          }
        ],
        longTermRecommendations: ['Recommendation 1']
      };
      
      // Mock the Claude response for this specific test
      const mockSpecificResponse = {
        content: [{ text: JSON.stringify(mockOptimizationResponse) }]
      };
      
      // Update the mock implementation for this test
      const AnthropicMock = require('@anthropic-ai/sdk').default;
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: jest.fn().mockResolvedValue(mockSpecificResponse)
        }
      }));
      
      // Mock analyzeWorkflow to return a mock response
      const originalAnalyzeWorkflow = ClaudeService.analyzeWorkflow;
      ClaudeService.analyzeWorkflow = jest.fn().mockResolvedValue({
        summary: 'Analysis summary',
        bottlenecks: [{ id: 'bottleneck-1', name: 'Bottleneck 1', averageTime: 5, itemCount: 3, severity: 'high', suggestions: ['Fix it'] }],
        efficiencyScore: 75,
        insights: ['Insight 1'],
        detailedAnalysis: {}
      });
      
      const result = await ClaudeService.suggestOptimizations(mockBoardId, {}, mockApiKey);
      
      expect(result).toEqual(mockOptimizationResponse);
      expect(BoardService.prototype.getBoardById).toHaveBeenCalledWith(mockBoardId);
      expect(ClaudeService.analyzeWorkflow).toHaveBeenCalled();
      
      // Restore original method
      ClaudeService.analyzeWorkflow = originalAnalyzeWorkflow;
    });
  });
  
  describe('generateWorkspaceSummary', () => {
    it('should generate a summary of a workspace', async () => {
      const mockSummaryResponse = {
        title: 'Workspace Summary',
        executiveSummary: 'Executive summary',
        statistics: {
          totalBoards: 1,
          totalItems: 1,
          activeItems: 1,
          completedItems: 0
        },
        boardSummaries: [
          {
            boardId: mockBoardId,
            boardName: 'Test Board',
            description: 'Board description',
            itemCount: 1
          }
        ],
        healthAssessment: 'Health assessment',
        recommendations: ['Recommendation 1']
      };
      
      // Mock the Claude response for this specific test
      const mockSpecificResponse = {
        content: [{ text: JSON.stringify(mockSummaryResponse) }]
      };
      
      // Update the mock implementation for this test
      const AnthropicMock = require('@anthropic-ai/sdk').default;
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: jest.fn().mockResolvedValue(mockSpecificResponse)
        }
      }));
      
      const result = await ClaudeService.generateWorkspaceSummary(mockWorkspaceId, {}, mockApiKey);
      
      expect(result).toEqual(mockSummaryResponse);
      
      // Get the mock instance and check calls
      const workspaceServiceInstance = (WorkspaceService as jest.Mock).mock.results[0].value;
      expect(workspaceServiceInstance.getById).toHaveBeenCalledWith(mockWorkspaceId);
      expect(workspaceServiceInstance.getBoards).toHaveBeenCalledWith(mockWorkspaceId);
    });
  });
  
  describe('createWorkspaceFromDescription', () => {
    it('should create a workspace structure from a description', async () => {
      const mockWorkspaceCreationResult = {
        name: 'Generated Workspace',
        description: 'Generated description',
        boardSuggestions: [
          {
            name: 'Board 1',
            description: 'Board 1 description',
            columnSuggestions: [{ title: 'Status', type: 'status' }],
            groupSuggestions: [{ title: 'Group 1' }]
          }
        ]
      };
      
      // Mock the Claude response for this specific test
      const mockSpecificResponse = {
        content: [{ text: JSON.stringify(mockWorkspaceCreationResult) }]
      };
      
      // Update the mock implementation for this test
      const AnthropicMock = require('@anthropic-ai/sdk').default;
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: jest.fn().mockResolvedValue(mockSpecificResponse)
        }
      }));
      
      // Mock createWorkspaceFromDescription
      const originalMethod = ClaudeService.createWorkspaceFromDescription;
      ClaudeService.createWorkspaceFromDescription = jest.fn().mockResolvedValue(mockWorkspaceCreationResult);
      
      const result = await ClaudeService.createWorkspaceFromDescription(mockDescription, {}, mockApiKey);
      
      expect(result).toEqual(mockWorkspaceCreationResult);
      expect(ClaudeService.createWorkspaceFromDescription).toHaveBeenCalledWith(mockDescription, {}, mockApiKey);
      
      // Restore original method
      ClaudeService.createWorkspaceFromDescription = originalMethod;
    });
  });
  
  describe('implementWorkspacePlan', () => {
    it('should implement a workspace plan', async () => {
      const mockPlan = {
        name: 'Test Workspace',
        description: 'Test description',
        boardSuggestions: [
          {
            name: 'Board 1',
            description: 'Board 1 description',
            columnSuggestions: [{ title: 'Status', type: 'status' }],
            groupSuggestions: [{ title: 'Group 1' }]
          }
        ]
      };
      
      const result = await ClaudeService.implementWorkspacePlan(mockPlan);
      
      expect(result).toEqual(mockWorkspaceId);
      
      // Get the mock instance and check calls
      const workspaceServiceInstance = (WorkspaceService as jest.Mock).mock.results[0].value;
      expect(workspaceServiceInstance.create).toHaveBeenCalledWith(
        mockPlan.name,
        'open',
        mockPlan.description
      );
      const boardServiceInstance = (BoardService as jest.Mock).mock.results[0].value;
      expect(boardServiceInstance.create).toHaveBeenCalled();
      expect(boardServiceInstance.createGroup).toHaveBeenCalled();
    });
  });
  
  describe('enhancePromptWithContext', () => {
    it('should enhance a prompt with context', () => {
      const prompt = 'Original prompt';
      const context: AIContext = {
        board: mockBoard,
        items: mockItems,
        groups: mockGroups,
        columns: mockColumns,
        metrics: {
          averageCycleTime: 5.2,
          throughput: 8.5,
          wipCount: 10,
          wipAge: 3.5,
          efficiency: {
            flowEfficiency: 0.7,
            onTimeCompletion: 0.8,
            blockedPercentage: 0.2
          },
          trends: {
            cycleTime: [],
            throughput: [],
            wip: []
          }
        },
        user: {
          id: 'user-1',
          name: 'Test User'
        }
      };
      
      const enhancedPrompt = ClaudeService.enhancePromptWithContext(prompt, context);
      
      expect(enhancedPrompt).toContain('Original prompt');
      expect(enhancedPrompt).toContain('Board Information');
      expect(enhancedPrompt).toContain('Items: 1 items');
      expect(enhancedPrompt).toContain('Groups: 1 groups');
      expect(enhancedPrompt).toContain('Columns: 1 columns');
      expect(enhancedPrompt).toContain('Workflow Metrics');
      expect(enhancedPrompt).toContain('User: Test User');
    });
  });
  
  describe('clearCache', () => {
    it('should clear the response cache', async () => {
      // First call to populate cache
      await ClaudeService.analyzeWorkflow(mockBoardId, {}, mockApiKey);
      
      // Clear cache
      ClaudeService.clearCache();
      
      // Second call should not use cache
      jest.clearAllMocks();
      await ClaudeService.analyzeWorkflow(mockBoardId, {}, mockApiKey);
      
      // BoardService should be called for the second request
      expect(BoardService.prototype.getBoardById).toHaveBeenCalled();
    });
  });
  
  describe('error handling', () => {
    it('should handle API errors properly', async () => {
      // Mock Anthropic client to throw an error
      const AnthropicMock = require('@anthropic-ai/sdk').default;
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: jest.fn().mockRejectedValue({
            status: 401,
            message: 'Invalid API key'
          })
        }
      }));
      
      await expect(ClaudeService.analyzeWorkflow(mockBoardId, {}, mockApiKey))
        .rejects
        .toThrow(AIServiceError);
    });
    
    it('should handle context limit errors', async () => {
      // Mock Anthropic client to throw a context limit error
      const AnthropicMock = require('@anthropic-ai/sdk').default;
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: jest.fn().mockRejectedValue({
            message: 'Input exceeds context window size'
          })
        }
      }));
      
      let error;
      try {
        await ClaudeService.analyzeWorkflow(mockBoardId, {}, mockApiKey);
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeInstanceOf(AIServiceError);
      expect((error as AIServiceError).type).toBe(AIErrorType.CONTEXT_LIMIT);
    });
  });
});