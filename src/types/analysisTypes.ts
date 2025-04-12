/**
 * Type definitions for workflow analysis
 */

import { Item, Group, Column } from './monday';

/**
 * Options for cycle time calculations
 */
export interface CycleTimeOptions {
  /**
   * Start status column ID or name
   */
  startStatus?: string;
  
  /**
   * End status column ID or name
   */
  endStatus?: string;
  
  /**
   * Date range for calculations
   */
  dateRange?: {
    from: Date;
    to: Date;
  };
  
  /**
   * Whether to include weekends in calculations
   */
  includeWeekends?: boolean;
  
  /**
   * Filter by specific groups
   */
  groupIds?: string[];
}

/**
 * Represents a cycle time calculation result
 */
export interface CycleTimeResult {
  /**
   * Average cycle time in days
   */
  average: number;
  
  /**
   * Median cycle time in days
   */
  median: number;
  
  /**
   * 85th percentile cycle time in days
   */
  percentile85: number;
  
  /**
   * Minimum cycle time in days
   */
  min: number;
  
  /**
   * Maximum cycle time in days
   */
  max: number;
  
  /**
   * Detailed cycle time data per item
   */
  items: Array<{
    itemId: string;
    itemName: string;
    cycleTime: number;
    startDate: Date;
    endDate: Date;
  }>;
}

/**
 * Represents a bottleneck in the workflow
 */
export interface Bottleneck {
  /**
   * ID of the status or group
   */
  id: string;
  
  /**
   * Name of the status or group
   */
  name: string;
  
  /**
   * Average time items spend in this status/group (in days)
   */
  averageTime: number;
  
  /**
   * Number of items currently in this status/group
   */
  itemCount: number;
  
  /**
   * Severity of the bottleneck (calculated based on relative time and count)
   */
  severity: 'low' | 'medium' | 'high';
  
  /**
   * Suggested actions to address the bottleneck
   */
  suggestions: string[];
}

/**
 * Workflow metrics for a board
 */
export interface WorkflowMetrics {
  /**
   * Average cycle time in days
   */
  averageCycleTime: number;
  
  /**
   * Throughput (completed items per week)
   */
  throughput: number;
  
  /**
   * Work in progress count
   */
  wipCount: number;
  
  /**
   * WIP age (average days items have been in progress)
   */
  wipAge: number;
  
  /**
   * Efficiency metrics
   */
  efficiency: {
    /**
     * Flow efficiency (value-add time / total time)
     */
    flowEfficiency: number;
    
    /**
     * Percentage of items completed on time
     */
    onTimeCompletion: number;
    
    /**
     * Percentage of items blocked
     */
    blockedPercentage: number;
  };
  
  /**
   * Trend data over time
   */
  trends: {
    cycleTime: Array<{ date: Date; value: number }>;
    throughput: Array<{ date: Date; value: number }>;
    wip: Array<{ date: Date; value: number }>;
  };
}

/**
 * Item movement history
 */
export interface ItemMovementHistory {
  /**
   * Item ID
   */
  itemId: string;
  
  /**
   * Item name
   */
  itemName: string;
  
  /**
   * Status changes
   */
  statusChanges: Array<{
    /**
     * From status
     */
    from: {
      id: string;
      name: string;
    };
    
    /**
     * To status
     */
    to: {
      id: string;
      name: string;
    };
    
    /**
     * When the change occurred
     */
    date: Date;
    
    /**
     * User who made the change
     */
    user?: {
      id: string;
      name: string;
    };
    
    /**
     * Time spent in the previous status (in days)
     */
    timeInStatus: number;
  }>;
  
  /**
   * Total cycle time
   */
  totalCycleTime: number;
  
  /**
   * Whether the item is completed
   */
  isCompleted: boolean;
  
  /**
   * Whether the item was blocked at any point
   */
  wasBlocked: boolean;
  
  /**
   * Total time spent blocked (in days)
   */
  timeBlocked: number;
}

/**
 * Workflow comparison result
 */
export interface WorkflowComparisonResult {
  /**
   * Metrics for each workflow
   */
  workflows: Array<{
    boardId: string;
    boardName: string;
    metrics: WorkflowMetrics;
  }>;
  
  /**
   * Comparison summary
   */
  comparison: {
    /**
     * Fastest workflow by cycle time
     */
    fastestWorkflow: {
      boardId: string;
      boardName: string;
      cycleTime: number;
    };
    
    /**
     * Most efficient workflow
     */
    mostEfficientWorkflow: {
      boardId: string;
      boardName: string;
      efficiency: number;
    };
    
    /**
     * Highest throughput workflow
     */
    highestThroughputWorkflow: {
      boardId: string;
      boardName: string;
      throughput: number;
    };
  };
  
  /**
   * Recommendations based on comparison
   */
  recommendations: string[];
}

/**
 * Performance report for a workflow
 */
export interface PerformanceReport {
  /**
   * Board ID
   */
  boardId: string;
  
  /**
   * Board name
   */
  boardName: string;
  
  /**
   * Report generation date
   */
  generatedAt: Date;
  
  /**
   * Overall workflow metrics
   */
  metrics: WorkflowMetrics;
  
  /**
   * Identified bottlenecks
   */
  bottlenecks: Bottleneck[];
  
  /**
   * Performance issues
   */
  issues: Array<{
    type: 'bottleneck' | 'efficiency' | 'process' | 'resource';
    description: string;
    severity: 'low' | 'medium' | 'high';
    impact: string;
    recommendations: string[];
  }>;
  
  /**
   * Performance score (0-100)
   */
  performanceScore: number;
  
  /**
   * Historical performance
   */
  historicalPerformance: Array<{
    period: string;
    cycleTime: number;
    throughput: number;
    wipCount: number;
    performanceScore: number;
  }>;
  
  /**
   * Improvement opportunities
   */
  improvementOpportunities: string[];
}

/**
 * Cache for workflow analysis data
 */
export interface AnalysisCache {
  cycleTimesByBoard: Map<string, CacheItem<CycleTimeResult>>;
  bottlenecksByBoard: Map<string, CacheItem<Bottleneck[]>>;
  metricsByBoard: Map<string, CacheItem<WorkflowMetrics>>;
  itemMovementHistory: Map<string, CacheItem<ItemMovementHistory>>;
  performanceReports: Map<string, CacheItem<PerformanceReport>>;
}

/**
 * Cache item with timestamp for TTL validation
 */
export interface CacheItem<T> {
  data: T;
  timestamp: number;
}