import Anthropic from '@anthropic-ai/sdk';
import { BoardService } from '../api/boardService';
import { WorkspaceService } from '../api/workspaceService';

// Initialize Anthropic client
let claudeClient: Anthropic | null = null;

// Types
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

// Initialize Claude client
const initializeClient = (apiKey: string): Anthropic => {
  if (!claudeClient) {
    claudeClient = new Anthropic({
      apiKey,
    });
  }
  return claudeClient;
};

// Service methods
export const ClaudeService = {
  // Initialize the client
  initialize: (apiKey: string = process.env.REACT_APP_CLAUDE_API_KEY || ''): Anthropic => {
    return initializeClient(apiKey);
  },

  // Analyze workflow from a board
  analyzeWorkflow: async (
    boardId: string,
    apiKey: string = process.env.REACT_APP_CLAUDE_API_KEY || ''
  ): Promise<AnalysisResult> => {
    try {
      const client = initializeClient(apiKey);
      
      // Get board data
      const boardData = await BoardService.getById(boardId);
      if (!boardData) {
        throw new Error(`Board with ID ${boardId} not found`);
      }
      
      // Get board items
      const items = await BoardService.getItems(boardId);
      
      // Prepare data for analysis
      const { board, groups, columns } = boardData;
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
      const response = await client.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        system: "You are an expert workflow analyst and project management consultant. Analyze the monday.com board data provided and identify process bottlenecks, inefficiencies, and provide actionable recommendations.",
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
      });
      
      // Parse and return the response
      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Failed to parse analysis result from Claude');
      }
      
      return JSON.parse(jsonMatch[0]) as AnalysisResult;
    } catch (error) {
      console.error('Error analyzing workflow:', error);
      throw error;
    }
  },

  // Generate workspace creation plan from text description
  generateWorkspaceFromDescription: async (
    description: string,
    apiKey: string = process.env.REACT_APP_CLAUDE_API_KEY || ''
  ): Promise<WorkspaceCreationResult> => {
    try {
      const client = initializeClient(apiKey);
      
      // Prompt for Claude
      const prompt = `
        Based on the following description, design a monday.com workspace structure:
        "${description}"
        
        Please provide:
        1. A suitable workspace name and description
        2. Recommended boards with their names and descriptions
        3. For each board, suggest appropriate columns with their types
        4. For each board, suggest appropriate groups
        
        Return your design in the following JSON format:
        {
          "name": "Workspace name",
          "description": "Workspace description",
          "boardSuggestions": [
            {
              "name": "Board name",
              "description": "Board description",
              "columnSuggestions": [
                {
                  "title": "Column title",
                  "type": "text|number|status|date|etc."
                }
              ],
              "groupSuggestions": [
                {
                  "title": "Group title"
                }
              ]
            }
          ]
        }
      `;
      
      // Call Claude
      const response = await client.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        system: "You are an expert monday.com consultant who helps clients design optimal workspace structures. Convert business needs into a well-organized monday.com workspace structure.",
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
      });
      
      // Parse and return the response
      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Failed to parse workspace creation plan from Claude');
      }
      
      return JSON.parse(jsonMatch[0]) as WorkspaceCreationResult;
    } catch (error) {
      console.error('Error generating workspace plan:', error);
      throw error;
    }
  },

  // Implement workspace creation plan
  implementWorkspacePlan: async (
    plan: WorkspaceCreationResult
  ): Promise<string> => {
    try {
      // Create workspace
      const workspace = await WorkspaceService.create(
        plan.name,
        'open',
        plan.description
      );
      
      // Create boards
      for (const boardSuggestion of plan.boardSuggestions) {
        const board = await BoardService.create(boardSuggestion.name, {
          workspaceId: workspace.id,
        });
        
        // Create groups
        for (const groupSuggestion of boardSuggestion.groupSuggestions) {
          await BoardService.createGroup(board.id, groupSuggestion.title);
        }
        
        // Note: Column creation would require additional API calls
        // not included in this simplified example
      }
      
      return workspace.id;
    } catch (error) {
      console.error('Error implementing workspace plan:', error);
      throw error;
    }
  },
};

export default ClaudeService;