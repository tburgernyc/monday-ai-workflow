import Anthropic from '@anthropic-ai/sdk';
import { BoardService } from '../api/boardService';
import { WorkspaceService } from '../api/workspaceService';
import { ItemService } from '../api/itemService';
import { WorkflowAnalysisService } from '../analysis/workflowAnalysisService';
import { CacheService, CacheStorage } from '../cache';
import {
  AIContext,
  WorkflowAnalysisRequest,
  WorkflowAnalysisResponse,
  OptimizationRequest,
  OptimizationResponse,
  WorkspaceSummaryRequest,
  WorkspaceSummaryResponse,
  WorkspaceCreationRequest,
  AIServiceError,
  AIErrorType
} from '../../types/aiTypes';
import { MondayLogger } from '../api/mondayApi';
import { Board, Group, Column, Item } from '../../types/monday';

// Constants
const CLAUDE_API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const CACHE_NAMESPACE = 'claude';

// Initialize cache service
const cacheService = new CacheService({
  ttl: CACHE_TTL,
  storage: CacheStorage.Memory,
  persistOnSet: false
});

// Initialize Anthropic client
let claudeClient: Anthropic | null = null;

// Legacy types (kept for backward compatibility)
export interface AnalysisResult {
  bottlenecks: Array<{
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestions: string[];
  }>;
  efficiencyScore: number;
  generalSuggestions: string[];
}

export interface WorkspaceCreationResult {
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

// Define the generateWorkspaceFromDescription function
async function generateWorkspaceFromDescription(
  description: string,
  apiKey: string = process.env.REACT_APP_CLAUDE_API_KEY || ''
): Promise<WorkspaceCreationResult> {
  try {
    MondayLogger.debug(`Generating workspace from description`);
    
    // Call Claude
    const client = initializeClient(apiKey);
    // For TypeScript compatibility, we need to cast the client to any
    // since the SDK types might not match our usage
    const response = await (client as any).messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4000,
      system: "You are an expert monday.com workspace designer. Your role is to create well-structured workspaces based on natural language descriptions. Focus on creating practical, efficient workspace structures with appropriate boards, columns, and groups.",
      messages: [
        {
          role: 'user',
          content: `Please design a monday.com workspace structure based on this description: "${description}"
          
          Return your design in the following JSON format:
          {
            "name": "Workspace Name",
            "description": "Workspace description",
            "boardSuggestions": [
              {
                "name": "Board Name",
                "description": "Board description",
                "columnSuggestions": [
                  {
                    "title": "Column Title",
                    "type": "status|text|number|date|etc"
                  }
                ],
                "groupSuggestions": [
                  {
                    "title": "Group Title"
                  }
                ]
              }
            ]
          }`,
        }
      ],
    });
    
    // Parse and return the response
    const content = response.content[0].text;
    return extractJsonFromResponse<WorkspaceCreationResult>(content);
  } catch (error) {
    if (error instanceof AIServiceError) {
      throw error;
    }
    throw handleAnthropicError(error);
  }
}

// Initialize Claude client
const initializeClient = (apiKey: string): Anthropic => {
  if (!claudeClient) {
    claudeClient = new Anthropic({
      apiKey
    });
  }
  return claudeClient;
};

/**
 * Generates a cache key from a request object
 * @param request The request object
 * @returns A string cache key
 */
const generateCacheKey = (request: any): string => {
  return JSON.stringify(request);
};

/**
 * Handles errors from the Anthropic API
 * @param error The error to handle
 * @returns An AIServiceError
 */
const handleAnthropicError = (error: unknown): AIServiceError => {
  MondayLogger.error('Claude API error:', error);
  
  let type = AIErrorType.UNKNOWN;
  let statusCode: number | undefined;
  let message = 'An unknown error occurred while calling the Claude API';
  
  // Type guard for error with status property
  interface ErrorWithStatus {
    status?: number;
    message?: string;
  }
  
  const isErrorWithStatus = (err: unknown): err is ErrorWithStatus => {
    return typeof err === 'object' && err !== null && ('status' in err || 'message' in err);
  };
  
  if (isErrorWithStatus(error)) {
    if (error.status) {
      statusCode = error.status;
      
      if (error.status === 401 || error.status === 403) {
        type = AIErrorType.AUTHENTICATION;
        message = 'Authentication error with Claude API. Please check your API key.';
      } else if (error.status === 429) {
        type = AIErrorType.RATE_LIMIT;
        message = 'Rate limit exceeded for Claude API. Please try again later.';
      } else if (error.status >= 500) {
        type = AIErrorType.SERVICE_UNAVAILABLE;
        message = 'Claude API service is currently unavailable. Please try again later.';
      }
    }
    
    if (error.message) {
      if (error.message.includes('context window')) {
        type = AIErrorType.CONTEXT_LIMIT;
        message = 'The input exceeds Claude\'s context limit. Please reduce the amount of data.';
      } else if (error.message.includes('invalid')) {
        type = AIErrorType.INVALID_REQUEST;
        message = `Invalid request to Claude API: ${error.message}`;
      }
    }
  }
  
  return new AIServiceError(message, type, statusCode, error);
};

/**
 * Extracts JSON from Claude's response text
 * @param text The response text from Claude
 * @returns Parsed JSON object
 */
const extractJsonFromResponse = <T>(text: string): T => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new AIServiceError(
      'Failed to parse JSON from Claude response',
      AIErrorType.INVALID_REQUEST
    );
  }
  
  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    throw new AIServiceError(
      'Failed to parse JSON from Claude response',
      AIErrorType.INVALID_REQUEST,
      undefined,
      error
    );
  }
};

// Service methods
export const ClaudeService = {
  /**
   * Initialize the Claude client
   * @param apiKey API key for Claude (defaults to environment variable)
   * @returns Initialized Anthropic client
   */
  initialize: (apiKey: string = process.env.REACT_APP_CLAUDE_API_KEY || ''): Anthropic => {
    return initializeClient(apiKey);
  },

  /**
   * Analyze workflow efficiency and provide insights
   * @param boardId ID of the board to analyze
   * @param options Optional analysis options
   * @param apiKey API key for Claude (defaults to environment variable)
   * @returns Promise resolving to workflow analysis response
   */
  analyzeWorkflow: async (
    boardId: string,
    options: Partial<WorkflowAnalysisRequest> = {},
    apiKey: string = process.env.REACT_APP_CLAUDE_API_KEY || ''
  ): Promise<WorkflowAnalysisResponse> => {
    try {
      // Prepare request
      const request: WorkflowAnalysisRequest = {
        boardId,
        depth: options.depth || 'detailed',
        focusAreas: options.focusAreas || ['bottlenecks', 'efficiency', 'resources'],
        context: options.context
      };
      
      // Check cache
      const cacheKey = generateCacheKey(request);
      const cachedResponse = await cacheService.get<WorkflowAnalysisResponse>(cacheKey, CACHE_NAMESPACE);
      
      if (cachedResponse) {
        MondayLogger.debug(`Using cached workflow analysis for board ID ${boardId}`);
        return cachedResponse;
      }
      
      MondayLogger.debug(`Analyzing workflow for board ID ${boardId}`);
      
      // Get board data
      const boardService = new BoardService();
      const boardData = await boardService.getBoardById(boardId);
      if (!boardData) {
        throw new AIServiceError(
          `Board with ID ${boardId} not found`,
          AIErrorType.INVALID_REQUEST
        );
      }
      
      // Get board items
      const itemService = new ItemService();
      const items = await itemService.getItems(boardId);
      
      // Get workflow metrics if available
      let metrics;
      try {
        const workflowAnalysisService = new WorkflowAnalysisService();
        metrics = await workflowAnalysisService.generateWorkflowMetrics(boardId);
      } catch (error) {
        MondayLogger.warn(`Could not get workflow metrics for board ${boardId}:`, error);
        // Continue without metrics
      }
      
      // Prepare data for analysis
      const board = boardData as Board;
      const groups = boardData.groups as Group[] || [];
      const columns = boardData.columns as Column[] || [];
      
      const analysisContext: AIContext = {
        board,
        groups,
        columns,
        items,
        metrics
      };
      
      // Enhance context with provided context
      const context = { ...analysisContext, ...request.context };
      
      // Prepare prompt
      const prompt = `
        Please analyze this workflow data from a monday.com board and provide a comprehensive analysis.
        
        Board Information:
        - Name: ${board.name}
        - ID: ${board.id}
        - Items Count: ${items.length}
        - Groups Count: ${groups.length}
        - Columns Count: ${columns.length}
        
        ${metrics ? `
        Workflow Metrics:
        - Average Cycle Time: ${metrics.averageCycleTime.toFixed(2)} days
        - Throughput: ${metrics.throughput.toFixed(2)} items/week
        - WIP Count: ${metrics.wipCount}
        - WIP Age: ${metrics.wipAge.toFixed(2)} days
        - Flow Efficiency: ${(metrics.efficiency.flowEfficiency * 100).toFixed(2)}%
        - Blocked Percentage: ${(metrics.efficiency.blockedPercentage * 100).toFixed(2)}%
        ` : ''}
        
        Analysis Depth: ${request.depth}
        Focus Areas: ${request.focusAreas?.join(', ')}
        
        Full Board Data:
        ${JSON.stringify({ board, groups, columns, items }, null, 2)}
        
        Please provide your analysis in the following JSON format:
        {
          "summary": "Overall analysis summary",
          "bottlenecks": [
            {
              "id": "unique_id",
              "name": "Bottleneck name",
              "averageTime": 5.2,
              "itemCount": 8,
              "severity": "high|medium|low",
              "suggestions": ["Suggestion 1", "Suggestion 2"]
            }
          ],
          "efficiencyScore": 75,
          "insights": [
            "Key insight 1",
            "Key insight 2"
          ],
          "detailedAnalysis": {
            "process": "Process analysis...",
            "resources": "Resource analysis...",
            "timeline": "Timeline analysis...",
            "quality": "Quality analysis...",
            "collaboration": "Collaboration analysis..."
          }
        }
      `;
      
      // Call Claude
      const client = initializeClient(apiKey);
      // For TypeScript compatibility, we need to cast the client to any
      const response = await (client as any).messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 4000,
        system: "You are an expert workflow analyst and project management consultant specializing in monday.com workflows. Analyze the provided board data and identify process bottlenecks, inefficiencies, and provide actionable recommendations. Your analysis should be data-driven, insightful, and focused on practical improvements.",
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
      });
      
      // Parse and return the response
      const content = response.content[0].text;
      const analysisResponse = extractJsonFromResponse<WorkflowAnalysisResponse>(content);
      
      // Cache the response
      await cacheService.set(cacheKey, analysisResponse, {}, CACHE_NAMESPACE);
      
      return analysisResponse;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw handleAnthropicError(error);
    }
  },

  /**
   * Generate optimization suggestions for a workflow
   * @param boardId ID of the board to optimize
   * @param options Optional optimization options
   * @param apiKey API key for Claude (defaults to environment variable)
   * @returns Promise resolving to optimization suggestions
   */
  suggestOptimizations: async (
    boardId: string,
    options: Partial<OptimizationRequest> = {},
    apiKey: string = process.env.REACT_APP_CLAUDE_API_KEY || ''
  ): Promise<OptimizationResponse> => {
    try {
      // Prepare request
      const request: OptimizationRequest = {
        boardId,
        goals: options.goals || ['speed', 'quality', 'resource_utilization'],
        constraints: options.constraints || [],
        context: options.context
      };
      
      // Check cache
      const cacheKey = generateCacheKey(request);
      const cachedResponse = await cacheService.get<OptimizationResponse>(cacheKey, CACHE_NAMESPACE);
      
      if (cachedResponse) {
        MondayLogger.debug(`Using cached optimization suggestions for board ID ${boardId}`);
        return cachedResponse;
      }
      
      MondayLogger.debug(`Generating optimization suggestions for board ID ${boardId}`);
      
      // Get board data
      const boardService = new BoardService();
      const boardData = await boardService.getBoardById(boardId);
      if (!boardData) {
        throw new AIServiceError(
          `Board with ID ${boardId} not found`,
          AIErrorType.INVALID_REQUEST
        );
      }
      
      // Get board items
      const itemService = new ItemService();
      const items = await itemService.getItems(boardId);
      
      // Get workflow analysis
      const workflowAnalysis = await ClaudeService.analyzeWorkflow(boardId, {
        depth: 'detailed',
        focusAreas: ['bottlenecks', 'efficiency']
      }, apiKey);
      
      // Prepare data for optimization
      const board = boardData as Board;
      const groups = boardData.groups as Group[] || [];
      const columns = boardData.columns as Column[] || [];
      
      const optimizationContext: AIContext = {
        board,
        groups,
        columns,
        items,
        workflowAnalysis
      };
      
      // Enhance context with provided context
      const context = { ...optimizationContext, ...request.context };
      
      // Prepare prompt
      const prompt = `
        Please suggest optimizations for this monday.com board workflow based on the analysis and data provided.
        
        Board Information:
        - Name: ${board.name}
        - ID: ${board.id}
        
        Optimization Goals: ${request.goals?.join(', ')}
        Constraints: ${request.constraints?.join(', ') || 'None specified'}
        
        Current Workflow Analysis:
        - Efficiency Score: ${workflowAnalysis.efficiencyScore}
        - Key Bottlenecks: ${workflowAnalysis.bottlenecks.map((b: any) => b.name).join(', ')}
        
        Please provide optimization suggestions in the following JSON format:
        {
          "summary": "Overall optimization summary",
          "suggestions": [
            {
              "title": "Suggestion title",
              "description": "Detailed description",
              "impact": 8,
              "effort": 5,
              "category": "process|structure|resources|automation|communication",
              "implementationSteps": [
                "Step 1",
                "Step 2"
              ]
            }
          ],
          "longTermRecommendations": [
            "Long-term recommendation 1",
            "Long-term recommendation 2"
          ]
        }
      `;
      
      // Call Claude
      const client = initializeClient(apiKey);
      // For TypeScript compatibility, we need to cast the client to any
      const response = await (client as any).messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 4000,
        system: "You are an expert workflow optimization consultant specializing in monday.com. Your role is to analyze workflows and suggest practical, impactful optimizations that balance effort and impact. Focus on concrete, actionable suggestions that address the specific goals and constraints provided.",
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
      });
      
      // Parse and return the response
      const content = response.content[0].text;
      const optimizationResponse = extractJsonFromResponse<OptimizationResponse>(content);
      
      // Cache the response
      await cacheService.set(cacheKey, optimizationResponse, {}, CACHE_NAMESPACE);
      
      return optimizationResponse;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw handleAnthropicError(error);
    }
  },

  /**
   * Generate a natural language summary of a workspace
   * @param workspaceId ID of the workspace to summarize
   * @param options Optional summary options
   * @param apiKey API key for Claude (defaults to environment variable)
   * @returns Promise resolving to workspace summary
   */
  generateWorkspaceSummary: async (
    workspaceId: string,
    options: Partial<WorkspaceSummaryRequest> = {},
    apiKey: string = process.env.REACT_APP_CLAUDE_API_KEY || ''
  ): Promise<WorkspaceSummaryResponse> => {
    try {
      // Prepare request
      const request: WorkspaceSummaryRequest = {
        workspaceId,
        format: options.format || 'detailed',
        includeStats: options.includeStats !== undefined ? options.includeStats : true,
        context: options.context
      };
      
      // Check cache
      const cacheKey = generateCacheKey(request);
      const cachedResponse = await cacheService.get<WorkspaceSummaryResponse>(cacheKey, CACHE_NAMESPACE);
      
      if (cachedResponse) {
        MondayLogger.debug(`Using cached workspace summary for workspace ID ${workspaceId}`);
        return cachedResponse;
      }
      
      MondayLogger.debug(`Generating workspace summary for workspace ID ${workspaceId}`);
      
      // Get workspace data
      const workspaceService = new WorkspaceService();
      const workspace = await workspaceService.getWorkspaceById(workspaceId);
      if (!workspace) {
        throw new AIServiceError(
          `Workspace with ID ${workspaceId} not found`,
          AIErrorType.INVALID_REQUEST
        );
      }
      
      // Get boards in workspace
      // Use getWorkspaces method and filter by workspaceId
      const allWorkspaces = await workspaceService.getWorkspaces();
      const workspaceData = allWorkspaces.find(w => w.id === workspaceId);
      const boards = workspaceData ? await new BoardService().getBoards(workspaceId) : [];
      
      // Get items for each board
      const boardService = new BoardService();
      const itemService = new ItemService();
      
      const boardsWithItems = await Promise.all(
        boards.map(async (board: any) => {
          const items = await itemService.getItems(board.id);
          const boardData = await boardService.getBoardById(board.id);
          return {
            ...board,
            items,
            groups: boardData?.groups || [],
            columns: boardData?.columns || []
          };
        })
      );
      
      // Calculate statistics
      let totalItems = 0;
      let activeItems = 0;
      let completedItems = 0;
      let totalCycleTime = 0;
      let itemsWithCycleTime = 0;
      
      boardsWithItems.forEach((board: any) => {
        totalItems += board.items.length;
        
        board.items.forEach((item: any) => {
          // Check if item is completed or active based on status column
          const statusColumn = board.columns.find((col: any) => 
            col.type === 'status' || 
            col.title.toLowerCase().includes('status')
          );
          
          if (statusColumn && item.column_values) {
            const statusValue = item.column_values.find((cv: any) => cv.id === statusColumn.id);
            const status = statusValue?.text?.toLowerCase() || '';
            
            if (status.includes('done') || status.includes('complete')) {
              completedItems++;
              
              // Calculate cycle time if possible
              if (item.created_at) {
                const createdDate = new Date(item.created_at);
                const completedDate = new Date(); // Approximation
                const cycleTime = Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                totalCycleTime += cycleTime;
                itemsWithCycleTime++;
              }
            } else {
              activeItems++;
            }
          } else {
            activeItems++; // Default to active if no status
          }
        });
      });
      
      const averageCycleTime = itemsWithCycleTime > 0 ? totalCycleTime / itemsWithCycleTime : undefined;
      
      // Prepare context for summary
      const summaryContext: AIContext = {
        workspace,
        boards: boardsWithItems,
        statistics: {
          totalBoards: boards.length,
          totalItems,
          activeItems,
          completedItems,
          averageCycleTime
        }
      };
      
      // Enhance context with provided context
      const context = { ...summaryContext, ...request.context };
      
      // Prepare prompt
      const prompt = `
        Please generate a ${request.format} summary of this monday.com workspace.
        
        Workspace Information:
        - Name: ${workspace.name}
        - ID: ${workspace.id}
        - Description: ${workspace.description || 'No description'}
        
        Statistics:
        - Total Boards: ${boards.length}
        - Total Items: ${totalItems}
        - Active Items: ${activeItems}
        - Completed Items: ${completedItems}
        ${averageCycleTime ? `- Average Cycle Time: ${averageCycleTime.toFixed(2)} days` : ''}
        
        Boards:
        ${boards.map((board: any) => `- ${board.name} (${boardsWithItems.find((b: any) => b.id === board.id)?.items.length || 0} items)`).join('\n')}
        
        Please provide your workspace summary in the following JSON format:
        {
          "title": "Workspace Summary Title",
          "executiveSummary": "Brief executive summary of the workspace",
          "statistics": {
            "totalBoards": ${boards.length},
            "totalItems": ${totalItems},
            "activeItems": ${activeItems},
            "completedItems": ${completedItems}${averageCycleTime ? `,
            "averageCycleTime": ${averageCycleTime.toFixed(2)}` : ''}
          },
          "boardSummaries": [
            {
              "boardId": "board_id",
              "boardName": "Board Name",
              "description": "Brief description of the board's purpose and content",
              "itemCount": 42,
              "keyMetrics": {
                "cycleTime": 5.2,
                "throughput": 8.5
              }
            }
          ],
          "healthAssessment": "Overall health assessment of the workspace",
          "recommendations": [
            "Recommendation 1",
            "Recommendation 2"
          ]
        }
      `;
      
      // Call Claude
      const client = initializeClient(apiKey);
      // For TypeScript compatibility, we need to cast the client to any
      const response = await (client as any).messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 4000,
        system: "You are an expert monday.com workspace analyst. Your role is to analyze workspace data and provide clear, insightful summaries that highlight key information, patterns, and opportunities for improvement. Focus on creating summaries that are informative, well-structured, and actionable.",
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
      });
      
      // Parse and return the response
      const content = response.content[0].text;
      const summaryResponse = extractJsonFromResponse<WorkspaceSummaryResponse>(content);
      
      // Cache the response
      await cacheService.set(cacheKey, summaryResponse, {}, CACHE_NAMESPACE);
      
      return summaryResponse;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw handleAnthropicError(error);
    }
  },

  /**
   * Create a workspace structure from a natural language description
   * @param description Natural language description of the workspace
   * @param options Optional creation options
   * @param apiKey API key for Claude (defaults to environment variable)
   * @returns Promise resolving to workspace creation result
   */
  createWorkspaceFromDescription: async (
    description: string,
    options: Partial<WorkspaceCreationRequest> = {},
    apiKey: string = process.env.REACT_APP_CLAUDE_API_KEY || ''
  ): Promise<WorkspaceCreationResult> => {
    try {
      MondayLogger.debug(`Creating workspace from description`);
      
      // Call the existing method for backward compatibility
      return await generateWorkspaceFromDescription(description, apiKey);
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw handleAnthropicError(error);
    }
  },

  /**
   * Implement a workspace plan by creating the workspace, boards, and groups
   * @param plan The workspace creation plan to implement
   * @returns Promise resolving to the created workspace ID
   */
  implementWorkspacePlan: async (
    plan: WorkspaceCreationResult
  ): Promise<string> => {
    try {
      MondayLogger.debug(`Implementing workspace plan: ${plan.name}`);
      
      // Create workspace
      const workspaceService = new WorkspaceService();
      const workspace = await workspaceService.createWorkspace(
        plan.name,
        plan.description,
        'open'
      );
      
      // Create boards
      const boardService = new BoardService();
      for (const boardSuggestion of plan.boardSuggestions) {
        // Create board with the correct parameters
        const board = await boardService.createBoard(
          boardSuggestion.name,
          { board_kind: 'public' } as any, // Cast to any to bypass type checking
          workspace.id // Pass workspace ID directly
        );
        
        // Create groups
        for (const groupSuggestion of boardSuggestion.groupSuggestions) {
          await boardService.createGroup(board.id, groupSuggestion.title);
        }
        
        // Note: Column creation would require additional API calls
        // not included in this simplified example
      }
      
      return workspace.id;
    } catch (error) {
      MondayLogger.error('Error implementing workspace plan:', error);
      throw error;
    }
  },

  /**
   * Enhance a prompt with relevant context
   * @param prompt The original prompt
   * @param context The context to add to the prompt
   * @returns Enhanced prompt with context
   */
  enhancePromptWithContext: (prompt: string, context: AIContext): string => {
    let enhancedPrompt = prompt;
    
    // Add board context if available
    if (context.board) {
      enhancedPrompt += `\n\nBoard Information:
- Name: ${context.board.name}
- ID: ${context.board.id}`;
    }
    
    // Add items context if available
    if (context.items && context.items.length > 0) {
      enhancedPrompt += `\n\nItems: ${context.items.length} items`;
    }
    
    // Add groups context if available
    if (context.groups && context.groups.length > 0) {
      enhancedPrompt += `\n\nGroups: ${context.groups.length} groups
${context.groups.map(g => `- ${g.title}`).join('\n')}`;
    }
    
    // Add columns context if available
    if (context.columns && context.columns.length > 0) {
      enhancedPrompt += `\n\nColumns: ${context.columns.length} columns
${context.columns.map(c => `- ${c.title} (${c.type})`).join('\n')}`;
    }
    
    // Add metrics context if available
    if (context.metrics) {
      enhancedPrompt += `\n\nWorkflow Metrics:
- Average Cycle Time: ${context.metrics.averageCycleTime.toFixed(2)} days
- Throughput: ${context.metrics.throughput.toFixed(2)} items/week
- WIP Count: ${context.metrics.wipCount}
- WIP Age: ${context.metrics.wipAge.toFixed(2)} days
- Flow Efficiency: ${(context.metrics.efficiency.flowEfficiency * 100).toFixed(2)}%
- Blocked Percentage: ${(context.metrics.efficiency.blockedPercentage * 100).toFixed(2)}%`;
    }
    
    // Add user context if available
    if (context.user) {
      enhancedPrompt += `\n\nUser: ${context.user.name} (${context.user.id})`;
    }
    
    // Add any additional context
    Object.entries(context).forEach(([key, value]) => {
      if (!['board', 'items', 'groups', 'columns', 'metrics', 'user'].includes(key) && value !== undefined) {
        enhancedPrompt += `\n\n${key}: ${JSON.stringify(value)}`;
      }
    });
    
    return enhancedPrompt;
  },

  /**
   * Clear the response cache
   */
  clearCache: async (): Promise<void> => {
    await cacheService.invalidatePattern('*', CACHE_NAMESPACE);
  },

  // Legacy methods (kept for backward compatibility)

  /**
   * Legacy method: Analyze workflow from a board
   * @deprecated Use analyzeWorkflow instead
   */
  analyzeWorkflowLegacy: async (
    boardId: string,
    apiKey: string = process.env.REACT_APP_CLAUDE_API_KEY || ''
  ): Promise<AnalysisResult> => {
    try {
      const client = initializeClient(apiKey);
      
      // Get board data
      const boardService = new BoardService();
      const boardData = await boardService.getBoardById(boardId);
      if (!boardData) {
        throw new Error(`Board with ID ${boardId} not found`);
      }
      
      // Get board items
      const itemService = new ItemService();
      const items = await itemService.getItems(boardId);
      
      // Prepare data for analysis
      const board = boardData as Board;
      const groups = boardData.groups as Group[] || [];
      const columns = boardData.columns as Column[] || [];
      
      const analysisInput = {
        board,
        groups,
        columns,
        items,
      };
      
      // Prompt for Claude
      const prompt = `
        Please analyze this workflow data from a monday.com board and identify:
        1. Potential bottlenecks and their severity (low, medium, high)
        2. Efficiency improvement suggestions
        3. Overall efficiency score from 0-100

        Board Data:
        ${JSON.stringify(analysisInput, null, 2)}

        Return your analysis in the following JSON format:
        {
          "bottlenecks": [
            {
              "description": "Description of the bottleneck",
              "severity": "low|medium|high",
              "suggestions": ["Suggestion 1", "Suggestion 2"]
            }
          ],
          "efficiencyScore": 75,
          "generalSuggestions": ["Suggestion 1", "Suggestion 2"]
        }
      `;
      
      // Call Claude
      // For TypeScript compatibility, we need to cast the client to any
      const response = await (client as any).messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 4000,
        system: "You are an expert workflow analyst specializing in monday.com. Analyze the provided board data and identify bottlenecks and efficiency improvements.",
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
      });
      
      // Parse and return the response
      const content = response.content[0].text;
      return extractJsonFromResponse<AnalysisResult>(content);
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw handleAnthropicError(error);
    }
  }
};
