/**
 * Type definitions for AI analysis and interactions
 */

import { Bottleneck, WorkflowMetrics, PerformanceReport } from './analysisTypes';
import { Board, Item, Group, Column } from './monday';

/**
 * Context for AI prompts
 */
export interface AIContext {
  /**
   * Board data if relevant
   */
  board?: Board;
  
  /**
   * Items data if relevant
   */
  items?: Item[];
  
  /**
   * Groups data if relevant
   */
  groups?: Group[];
  
  /**
   * Columns data if relevant
   */
  columns?: Column[];
  
  /**
   * Workflow metrics if available
   */
  metrics?: WorkflowMetrics;
  
  /**
   * User information if available
   */
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  
  /**
   * Additional context parameters
   */
  [key: string]: any;
}

/**
 * AI workflow analysis request
 */
export interface WorkflowAnalysisRequest {
  /**
   * Board ID to analyze
   */
  boardId: string;
  
  /**
   * Analysis depth level
   */
  depth?: 'basic' | 'detailed' | 'comprehensive';
  
  /**
   * Focus areas for analysis
   */
  focusAreas?: Array<'bottlenecks' | 'efficiency' | 'resources' | 'quality' | 'timeline'>;
  
  /**
   * Additional context
   */
  context?: AIContext;
}

/**
 * AI workflow analysis response
 */
export interface WorkflowAnalysisResponse {
  /**
   * Overall analysis summary
   */
  summary: string;
  
  /**
   * Identified bottlenecks
   */
  bottlenecks: Bottleneck[];
  
  /**
   * Efficiency score (0-100)
   */
  efficiencyScore: number;
  
  /**
   * Key insights from the analysis
   */
  insights: string[];
  
  /**
   * Detailed analysis by category
   */
  detailedAnalysis: {
    process?: string;
    resources?: string;
    timeline?: string;
    quality?: string;
    collaboration?: string;
  };
}

/**
 * AI optimization suggestion request
 */
export interface OptimizationRequest {
  /**
   * Board ID to optimize
   */
  boardId: string;
  
  /**
   * Optimization goals
   */
  goals?: Array<'speed' | 'quality' | 'resource_utilization' | 'collaboration'>;
  
  /**
   * Constraints to consider
   */
  constraints?: string[];
  
  /**
   * Additional context
   */
  context?: AIContext;
}

/**
 * AI optimization suggestion response
 */
export interface OptimizationResponse {
  /**
   * Overall optimization summary
   */
  summary: string;
  
  /**
   * Specific optimization suggestions
   */
  suggestions: Array<{
    /**
     * Title of the suggestion
     */
    title: string;
    
    /**
     * Detailed description
     */
    description: string;
    
    /**
     * Expected impact (1-10)
     */
    impact: number;
    
    /**
     * Implementation difficulty (1-10)
     */
    effort: number;
    
    /**
     * Category of the suggestion
     */
    category: 'process' | 'structure' | 'resources' | 'automation' | 'communication';
    
    /**
     * Implementation steps
     */
    implementationSteps?: string[];
  }>;
  
  /**
   * Long-term recommendations
   */
  longTermRecommendations: string[];
}

/**
 * AI workspace summary request
 */
export interface WorkspaceSummaryRequest {
  /**
   * Workspace ID to summarize
   */
  workspaceId: string;
  
  /**
   * Summary format
   */
  format?: 'brief' | 'detailed' | 'presentation';
  
  /**
   * Include statistics in summary
   */
  includeStats?: boolean;
  
  /**
   * Additional context
   */
  context?: AIContext;
}

/**
 * AI workspace summary response
 */
export interface WorkspaceSummaryResponse {
  /**
   * Title for the workspace summary
   */
  title: string;
  
  /**
   * Executive summary
   */
  executiveSummary: string;
  
  /**
   * Key statistics
   */
  statistics?: {
    totalBoards: number;
    totalItems: number;
    activeItems: number;
    completedItems: number;
    averageCycleTime?: number;
  };
  
  /**
   * Board summaries
   */
  boardSummaries: Array<{
    boardId: string;
    boardName: string;
    description: string;
    itemCount: number;
    keyMetrics?: {
      cycleTime?: number;
      throughput?: number;
    };
  }>;
  
  /**
   * Overall health assessment
   */
  healthAssessment?: string;
  
  /**
   * Recommendations for workspace improvement
   */
  recommendations?: string[];
}

/**
 * AI workspace creation request
 */
export interface WorkspaceCreationRequest {
  /**
   * Natural language description of the workspace
   */
  description: string;
  
  /**
   * Industry or domain context
   */
  industry?: string;
  
  /**
   * Team size
   */
  teamSize?: number;
  
  /**
   * Additional context
   */
  context?: AIContext;
}

/**
 * Cache for AI responses
 */
export interface AIResponseCache {
  /**
   * Workflow analysis cache
   */
  workflowAnalysis: Map<string, CacheItem<WorkflowAnalysisResponse>>;
  
  /**
   * Optimization suggestions cache
   */
  optimizations: Map<string, CacheItem<OptimizationResponse>>;
  
  /**
   * Workspace summaries cache
   */
  workspaceSummaries: Map<string, CacheItem<WorkspaceSummaryResponse>>;
}

/**
 * Cache item with timestamp for TTL validation
 */
export interface CacheItem<T> {
  /**
   * Cached data
   */
  data: T;
  
  /**
   * Timestamp when the item was cached
   */
  timestamp: number;
}

/**
 * AI error types
 */
export enum AIErrorType {
  AUTHENTICATION = 'authentication_error',
  RATE_LIMIT = 'rate_limit_error',
  CONTEXT_LIMIT = 'context_limit_error',
  INVALID_REQUEST = 'invalid_request_error',
  SERVICE_UNAVAILABLE = 'service_unavailable_error',
  UNKNOWN = 'unknown_error'
}

/**
 * AI service error
 */
export class AIServiceError extends Error {
  /**
   * Error type
   */
  type: AIErrorType;
  
  /**
   * HTTP status code if applicable
   */
  statusCode?: number;
  
  /**
   * Raw error response
   */
  rawError?: any;
  
  constructor(message: string, type: AIErrorType, statusCode?: number, rawError?: any) {
    super(message);
    this.name = 'AIServiceError';
    this.type = type;
    this.statusCode = statusCode;
    this.rawError = rawError;
  }
}