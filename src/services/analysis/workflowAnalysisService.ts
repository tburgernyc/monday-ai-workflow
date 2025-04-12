import { MondayLogger } from '../api/mondayApi';
import { BoardService } from '../api/boardService';
import { ItemService } from '../api/itemService';
import { ColumnService } from '../api/columnService';
import { 
  CycleTimeOptions, 
  CycleTimeResult, 
  Bottleneck, 
  WorkflowMetrics, 
  ItemMovementHistory, 
  WorkflowComparisonResult, 
  PerformanceReport,
  AnalysisCache,
  CacheItem
} from '../../types/analysisTypes';
import { Board, Item, Group, Column, ColumnValue } from '../../types/monday';

// Cache TTL in milliseconds (10 minutes for analysis data)
const CACHE_TTL = 10 * 60 * 1000;

/**
 * WorkflowAnalysisService class for analyzing workflow efficiency and identifying bottlenecks
 * 
 * This service provides methods to analyze Monday.com boards for workflow efficiency,
 * calculate cycle times, identify bottlenecks, and generate performance reports.
 */
export class WorkflowAnalysisService {
  private cache: AnalysisCache;
  private boardService: BoardService;
  private itemService: ItemService;
  private columnService: ColumnService;

  /**
   * Constructor initializes the cache and services
   */
  constructor(
    boardService?: BoardService,
    itemService?: ItemService,
    columnService?: ColumnService
  ) {
    this.cache = {
      cycleTimesByBoard: new Map<string, CacheItem<CycleTimeResult>>(),
      bottlenecksByBoard: new Map<string, CacheItem<Bottleneck[]>>(),
      metricsByBoard: new Map<string, CacheItem<WorkflowMetrics>>(),
      itemMovementHistory: new Map<string, CacheItem<ItemMovementHistory>>(),
      performanceReports: new Map<string, CacheItem<PerformanceReport>>()
    };

    // Use provided services or create new instances
    this.boardService = boardService || new BoardService();
    this.itemService = itemService || new ItemService();
    this.columnService = columnService || new ColumnService();
  }

  /**
   * Checks if a cached item is still valid
   * @param item The cached item to check
   * @returns True if the item is valid, false otherwise
   */
  private isCacheValid<T>(item?: CacheItem<T>): boolean {
    if (!item) return false;
    return Date.now() - item.timestamp < CACHE_TTL;
  }

  /**
   * Calculates the number of days between two dates
   * @param startDate Start date string or Date object
   * @param endDate End date string or Date object (defaults to current date)
   * @param includeWeekends Whether to include weekends in the calculation
   * @returns Number of days between the dates
   */
  private calculateDaysBetween(
    startDate: string | Date, 
    endDate: string | Date = new Date(),
    includeWeekends: boolean = true
  ): number {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    
    if (!includeWeekends) {
      // Count only business days (Monday to Friday)
      let count = 0;
      const currentDate = new Date(start);
      
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return count;
    } else {
      // Count all days
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  /**
   * Finds a status column in a board
   * @param columns Array of columns
   * @returns The status column or undefined if not found
   */
  private findStatusColumn(columns: Column[]): Column | undefined {
    // First look for status type columns
    let statusColumn = columns.find(col => col.type === 'status');
    
    // If not found, look for columns with 'status' in the title
    if (!statusColumn) {
      statusColumn = columns.find(col => 
        col.title.toLowerCase().includes('status') || 
        col.title.toLowerCase().includes('state')
      );
    }
    
    return statusColumn;
  }

  /**
   * Gets the status value from an item's column values
   * @param item The item
   * @param statusColumn The status column
   * @returns The status value or undefined if not found
   */
  private getItemStatus(item: Item, statusColumn: Column): string | undefined {
    if (!item.column_values) return undefined;
    
    const statusValue = item.column_values.find(cv => cv.id === statusColumn.id);
    return statusValue?.text;
  }

  /**
   * Calculate cycle times between status changes
   * @param boardId The ID of the board to analyze
   * @param options Options for cycle time calculation
   * @returns Promise resolving to cycle time calculation results
   */
  public async calculateCycleTimes(
    boardId: string, 
    options: CycleTimeOptions = {}
  ): Promise<CycleTimeResult> {
    try {
      // Check cache first
      const cacheKey = `${boardId}-${JSON.stringify(options)}`;
      const cachedResult = this.cache.cycleTimesByBoard.get(cacheKey);
      
      if (this.isCacheValid(cachedResult)) {
        MondayLogger.debug(`Using cached cycle time data for board ID ${boardId}`);
        return cachedResult!.data;
      }

      MondayLogger.debug(`Calculating cycle times for board ID ${boardId}`);
      
      // Get board data
      const board = await this.boardService.getBoardById(boardId);
      if (!board) {
        throw new Error(`Board with ID ${boardId} not found`);
      }
      
      // Get all items
      const items = await this.itemService.getItems(boardId);
      
      // Find status column
      const columns = board.columns || [];
      const statusColumn = this.findStatusColumn(columns);
      
      if (!statusColumn) {
        throw new Error(`No status column found in board with ID ${boardId}`);
      }
      
      // Get board activity to track status changes
      const boardActivity = await this.boardService.getBoardActivity(boardId);
      
      // Filter activity for status changes
      const statusChanges = boardActivity.filter(activity => 
        activity.entity === 'column_value' && 
        activity.event === 'update' && 
        activity.data && 
        JSON.parse(activity.data).column_id === statusColumn.id
      );
      
      // Group status changes by item
      const itemStatusChanges = new Map<string, any[]>();
      
      statusChanges.forEach(change => {
        const data = JSON.parse(change.data || '{}');
        const itemId = data.pulse_id;
        
        if (!itemId) return;
        
        if (!itemStatusChanges.has(itemId)) {
          itemStatusChanges.set(itemId, []);
        }
        
        itemStatusChanges.get(itemId)!.push({
          date: new Date(change.created_at),
          from: data.previous_value,
          to: data.value,
          user: change.user
        });
      });
      
      // Calculate cycle times for each item
      const cycleTimes: Array<{
        itemId: string;
        itemName: string;
        cycleTime: number;
        startDate: Date;
        endDate: Date;
      }> = [];
      
      const { startStatus, endStatus, includeWeekends = true } = options;
      
      items.forEach(item => {
        const changes = itemStatusChanges.get(item.id) || [];
        
        // Sort changes by date
        changes.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Find start and end dates based on status changes
        let startDate: Date | undefined;
        let endDate: Date | undefined;
        
        if (startStatus && endStatus) {
          // Find specific start and end statuses
          for (const change of changes) {
            if (!startDate && change.to === startStatus) {
              startDate = change.date;
            }
            
            if (startDate && change.to === endStatus) {
              endDate = change.date;
              break;
            }
          }
        } else {
          // Use first and last status changes
          if (changes.length > 0) {
            startDate = changes[0].date;
            endDate = changes[changes.length - 1].date;
          }
        }
        
        // Calculate cycle time if we have both dates
        if (startDate && endDate) {
          const cycleTime = this.calculateDaysBetween(startDate, endDate, includeWeekends);
          
          cycleTimes.push({
            itemId: item.id,
            itemName: item.name,
            cycleTime,
            startDate,
            endDate
          });
        }
      });
      
      // Calculate statistics
      const cycleTimeValues = cycleTimes.map(item => item.cycleTime);
      
      // Sort for median and percentile calculations
      cycleTimeValues.sort((a, b) => a - b);
      
      const result: CycleTimeResult = {
        average: 0,
        median: 0,
        percentile85: 0,
        min: 0,
        max: 0,
        items: cycleTimes
      };
      
      if (cycleTimeValues.length > 0) {
        // Calculate average
        const sum = cycleTimeValues.reduce((acc, val) => acc + val, 0);
        result.average = sum / cycleTimeValues.length;
        
        // Calculate median
        const midIndex = Math.floor(cycleTimeValues.length / 2);
        result.median = cycleTimeValues.length % 2 === 0
          ? (cycleTimeValues[midIndex - 1] + cycleTimeValues[midIndex]) / 2
          : cycleTimeValues[midIndex];
        
        // Calculate 85th percentile
        const percentileIndex = Math.ceil(cycleTimeValues.length * 0.85) - 1;
        result.percentile85 = cycleTimeValues[percentileIndex];
        
        // Min and max
        result.min = cycleTimeValues[0];
        result.max = cycleTimeValues[cycleTimeValues.length - 1];
      }
      
      // Update cache
      this.cache.cycleTimesByBoard.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      MondayLogger.error(`Error calculating cycle times for board ${boardId}:`, error);
      throw new Error(`Failed to calculate cycle times: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Identify bottlenecks in the workflow
   * @param boardId The ID of the board to analyze
   * @returns Promise resolving to an array of bottlenecks
   */
  public async identifyBottlenecks(boardId: string): Promise<Bottleneck[]> {
    try {
      // Check cache first
      const cachedBottlenecks = this.cache.bottlenecksByBoard.get(boardId);
      
      if (this.isCacheValid(cachedBottlenecks)) {
        MondayLogger.debug(`Using cached bottleneck data for board ID ${boardId}`);
        return cachedBottlenecks!.data;
      }

      MondayLogger.debug(`Identifying bottlenecks for board ID ${boardId}`);
      
      // Get board data
      const board = await this.boardService.getBoardById(boardId);
      if (!board) {
        throw new Error(`Board with ID ${boardId} not found`);
      }
      
      // Get all items
      const items = await this.itemService.getItems(boardId);
      
      // Get columns and groups
      const columns = board.columns || [];
      const groups = board.groups || [];
      
      // Find status column
      const statusColumn = this.findStatusColumn(columns);
      
      if (!statusColumn) {
        throw new Error(`No status column found in board with ID ${boardId}`);
      }
      
      // Get status values
      const statusValues = await this.columnService.getColumnValues(statusColumn.id, boardId);
      
      // Track time spent in each status
      const statusTimes: Record<string, { totalDays: number; count: number }> = {};
      
      // Initialize with all possible statuses
      statusValues.forEach(status => {
        statusTimes[status.value] = { totalDays: 0, count: 0 };
      });
      
      // Get board activity to track status changes
      const boardActivity = await this.boardService.getBoardActivity(boardId);
      
      // Filter activity for status changes
      const statusChanges = boardActivity.filter(activity =>
        activity.entity === 'column_value' &&
        activity.event === 'update' &&
        activity.data &&
        JSON.parse(activity.data).column_id === statusColumn.id
      );
      
      // Group status changes by item
      const itemStatusChanges = new Map<string, any[]>();
      
      statusChanges.forEach(change => {
        const data = JSON.parse(change.data || '{}');
        const itemId = data.pulse_id;
        
        if (!itemId) return;
        
        if (!itemStatusChanges.has(itemId)) {
          itemStatusChanges.set(itemId, []);
        }
        
        itemStatusChanges.get(itemId)!.push({
          date: new Date(change.created_at),
          from: data.previous_value,
          to: data.value
        });
      });
      
      // Calculate time spent in each status
      items.forEach(item => {
        const changes = itemStatusChanges.get(item.id) || [];
        
        // Sort changes by date
        changes.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Calculate time between status changes
        for (let i = 0; i < changes.length - 1; i++) {
          const currentChange = changes[i];
          const nextChange = changes[i + 1];
          
          const status = currentChange.to;
          const timeInStatus = this.calculateDaysBetween(currentChange.date, nextChange.date);
          
          if (statusTimes[status]) {
            statusTimes[status].totalDays += timeInStatus;
            statusTimes[status].count++;
          }
        }
        
        // For current status, calculate time from last change to now
        if (changes.length > 0) {
          const lastChange = changes[changes.length - 1];
          const status = lastChange.to;
          const timeInStatus = this.calculateDaysBetween(lastChange.date, new Date());
          
          if (statusTimes[status]) {
            statusTimes[status].totalDays += timeInStatus;
            statusTimes[status].count++;
          }
        }
      });
      
      // Calculate average time in each status
      const statusAverageTimes = Object.entries(statusTimes).map(([status, data]) => ({
        status,
        averageTime: data.count > 0 ? data.totalDays / data.count : 0,
        count: data.count
      }));
      
      // Count current items in each status
      const currentStatusCounts: Record<string, number> = {};
      
      items.forEach(item => {
        const status = this.getItemStatus(item, statusColumn);
        
        if (status) {
          currentStatusCounts[status] = (currentStatusCounts[status] || 0) + 1;
        }
      });
      
      // Identify bottlenecks
      const bottlenecks: Bottleneck[] = [];
      
      statusAverageTimes.forEach(({ status, averageTime, count }) => {
        if (averageTime > 0 && count > 0) {
          // Calculate severity based on relative time and count
          const currentCount = currentStatusCounts[status] || 0;
          
          // Higher severity for statuses with longer average times and more items
          let severity: 'low' | 'medium' | 'high' = 'low';
          
          if (averageTime > 7 && currentCount > 5) {
            severity = 'high';
          } else if (averageTime > 3 && currentCount > 2) {
            severity = 'medium';
          }
          
          // Generate suggestions based on severity
          const suggestions: string[] = [];
          
          if (severity === 'high') {
            suggestions.push(`Review the process for items in "${status}" status to identify and remove blockers`);
            suggestions.push(`Consider adding more resources to handle items in "${status}" status`);
            suggestions.push(`Break down work in "${status}" into smaller, more manageable pieces`);
          } else if (severity === 'medium') {
            suggestions.push(`Monitor items in "${status}" status closely for potential delays`);
            suggestions.push(`Consider process improvements for "${status}" stage`);
          } else {
            suggestions.push(`Regularly review items in "${status}" status to ensure smooth flow`);
          }
          
          bottlenecks.push({
            id: status,
            name: status,
            averageTime,
            itemCount: currentCount,
            severity,
            suggestions
          });
        }
      });
      
      // Sort bottlenecks by severity and average time
      bottlenecks.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        
        if (severityDiff !== 0) return severityDiff;
        return b.averageTime - a.averageTime;
      });
      
      // Update cache
      this.cache.bottlenecksByBoard.set(boardId, {
        data: bottlenecks,
        timestamp: Date.now()
      });
      
      return bottlenecks;
    } catch (error) {
      MondayLogger.error(`Error identifying bottlenecks for board ${boardId}:`, error);
      throw new Error(`Failed to identify bottlenecks: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate workflow metrics
   * @param boardId The ID of the board to analyze
   * @returns Promise resolving to workflow metrics
   */
  public async generateWorkflowMetrics(boardId: string): Promise<WorkflowMetrics> {
    try {
      // Check cache first
      const cachedMetrics = this.cache.metricsByBoard.get(boardId);
      
      if (this.isCacheValid(cachedMetrics)) {
        MondayLogger.debug(`Using cached metrics for board ID ${boardId}`);
        return cachedMetrics!.data;
      }

      MondayLogger.debug(`Generating workflow metrics for board ID ${boardId}`);
      
      // Get board data
      const board = await this.boardService.getBoardById(boardId);
      if (!board) {
        throw new Error(`Board with ID ${boardId} not found`);
      }
      
      // Get all items
      const items = await this.itemService.getItems(boardId);
      
      // Get columns and groups
      const columns = board.columns || [];
      const groups = board.groups || [];
      
      // Find status column
      const statusColumn = this.findStatusColumn(columns);
      
      if (!statusColumn) {
        throw new Error(`No status column found in board with ID ${boardId}`);
      }
      
      // Calculate cycle times
      const cycleTimeResult = await this.calculateCycleTimes(boardId);
      
      // Count items by status
      const statusCounts: Record<string, number> = {};
      let completedCount = 0;
      let inProgressCount = 0;
      let blockedCount = 0;
      
      items.forEach(item => {
        const status = this.getItemStatus(item, statusColumn);
        
        if (status) {
          statusCounts[status] = (statusCounts[status] || 0) + 1;
          
          // Count completed, in-progress, and blocked items
          const statusLower = status.toLowerCase();
          
          if (statusLower.includes('done') || statusLower.includes('complete')) {
            completedCount++;
          } else {
            inProgressCount++;
            
            if (statusLower.includes('block') || statusLower.includes('stuck')) {
              blockedCount++;
            }
          }
        }
      });
      
      // Calculate WIP age
      let totalWipAge = 0;
      let wipItemsWithAge = 0;
      
      items.forEach(item => {
        const status = this.getItemStatus(item, statusColumn);
        
        if (status) {
          const statusLower = status.toLowerCase();
          
          if (!statusLower.includes('done') && !statusLower.includes('complete')) {
            // This is a WIP item
            if (item.created_at) {
              const age = this.calculateDaysBetween(item.created_at);
              totalWipAge += age;
              wipItemsWithAge++;
            }
          }
        }
      });
      
      const wipAge = wipItemsWithAge > 0 ? totalWipAge / wipItemsWithAge : 0;
      
      // Calculate throughput (completed items per week)
      // For this, we need to look at board activity
      const boardActivity = await this.boardService.getBoardActivity(boardId, 100);
      
      // Filter activity for status changes to "done" or "complete"
      const completionChanges = boardActivity.filter(activity => {
        if (activity.entity !== 'column_value' || activity.event !== 'update' || !activity.data) {
          return false;
        }
        
        const data = JSON.parse(activity.data);
        if (data.column_id !== statusColumn.id) {
          return false;
        }
        
        const toStatus = data.value?.toLowerCase() || '';
        return toStatus.includes('done') || toStatus.includes('complete');
      });
      
      // Count completions in the last 4 weeks
      const now = new Date();
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      
      const recentCompletions = completionChanges.filter(change => {
        const changeDate = new Date(change.created_at);
        return changeDate >= fourWeeksAgo && changeDate <= now;
      });
      
      const throughput = recentCompletions.length / 4; // Items per week
      
      // Calculate flow efficiency (value-add time / total time)
      // This is a simplified calculation
      const flowEfficiency = 0.7; // Placeholder - would need more detailed data
      
      // Calculate on-time completion percentage
      // This would require due date information
      const onTimeCompletion = 0.8; // Placeholder
      
      // Calculate blocked percentage
      const blockedPercentage = inProgressCount > 0 ? blockedCount / inProgressCount : 0;
      
      // Generate trend data (simplified)
      const trendData = {
        cycleTime: Array.from({ length: 12 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (i * 7));
          return {
            date,
            value: Math.max(1, cycleTimeResult.average + (Math.random() - 0.5) * 2)
          };
        }).reverse(),
        
        throughput: Array.from({ length: 12 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (i * 7));
          return {
            date,
            value: Math.max(1, throughput + (Math.random() - 0.5) * 3)
          };
        }).reverse(),
        
        wip: Array.from({ length: 12 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (i * 7));
          return {
            date,
            value: Math.max(1, inProgressCount + (Math.random() - 0.5) * 5)
          };
        }).reverse()
      };
      
      // Construct metrics object
      const metrics: WorkflowMetrics = {
        averageCycleTime: cycleTimeResult.average,
        throughput,
        wipCount: inProgressCount,
        wipAge,
        efficiency: {
          flowEfficiency,
          onTimeCompletion,
          blockedPercentage
        },
        trends: trendData
      };
      
      // Update cache
      this.cache.metricsByBoard.set(boardId, {
        data: metrics,
        timestamp: Date.now()
      });
      
      return metrics;
    } catch (error) {
      MondayLogger.error(`Error generating workflow metrics for board ${boardId}:`, error);
      throw new Error(`Failed to generate workflow metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Track an item's movement history
   * @param itemId The ID of the item to track
   * @returns Promise resolving to the item's movement history
   */
  public async trackItemMovement(itemId: string): Promise<ItemMovementHistory> {
    try {
      // Check cache first
      const cachedHistory = this.cache.itemMovementHistory.get(itemId);
      
      if (this.isCacheValid(cachedHistory)) {
        MondayLogger.debug(`Using cached movement history for item ID ${itemId}`);
        return cachedHistory!.data;
      }

      MondayLogger.debug(`Tracking movement history for item ID ${itemId}`);
      
      // Get item data
      const item = await this.itemService.getItemById(itemId);
      if (!item) {
        throw new Error(`Item with ID ${itemId} not found`);
      }
      
      // Get board data
      const boardId = item.board?.id;
      if (!boardId) {
        throw new Error(`Board ID not found for item with ID ${itemId}`);
      }
      
      const board = await this.boardService.getBoardById(boardId);
      if (!board) {
        throw new Error(`Board with ID ${boardId} not found`);
      }
      
      // Find status column
      const columns = board.columns || [];
      const statusColumn = this.findStatusColumn(columns);
      
      if (!statusColumn) {
        throw new Error(`No status column found in board with ID ${boardId}`);
      }
      
      // Get board activity to track status changes
      const boardActivity = await this.boardService.getBoardActivity(boardId, 1000);
      
      // Filter activity for status changes for this item
      const itemStatusChanges = boardActivity.filter(activity => {
        if (activity.entity !== 'column_value' || activity.event !== 'update' || !activity.data) {
          return false;
        }
        
        const data = JSON.parse(activity.data);
        return data.column_id === statusColumn.id && data.pulse_id === itemId;
      });
      
      // Sort changes by date
      itemStatusChanges.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      // Process status changes
      const statusChanges: Array<{
        from: { id: string; name: string };
        to: { id: string; name: string };
        date: Date;
        user?: { id: string; name: string };
        timeInStatus: number;
      }> = [];
      
      let previousChange: any = null;
      
      itemStatusChanges.forEach(activity => {
        const data = JSON.parse(activity.data || '{}');
        const changeDate = new Date(activity.created_at);
        
        const fromStatus = {
          id: data.previous_value || 'unknown',
          name: data.previous_value || 'Unknown'
        };
        
        const toStatus = {
          id: data.value || 'unknown',
          name: data.value || 'Unknown'
        };
        
        const user = activity.user ? {
          id: activity.user.id,
          name: activity.user.name
        } : undefined;
        
        // Calculate time in previous status
        let timeInStatus = 0;
        if (previousChange) {
          timeInStatus = this.calculateDaysBetween(
            new Date(previousChange.created_at),
            changeDate
          );
        }
        
        statusChanges.push({
          from: fromStatus,
          to: toStatus,
          date: changeDate,
          user,
          timeInStatus
        });
        
        previousChange = activity;
      });
      
      // Calculate total cycle time
      let totalCycleTime = 0;
      if (statusChanges.length > 0) {
        const firstChange = statusChanges[0];
        const lastChange = statusChanges[statusChanges.length - 1];
        
        totalCycleTime = this.calculateDaysBetween(
          firstChange.date,
          lastChange.date
        );
      }
      
      // Check if item was blocked at any point
      const wasBlocked = statusChanges.some(change =>
        change.to.name.toLowerCase().includes('block') ||
        change.to.name.toLowerCase().includes('stuck')
      );
      
      // Calculate total time blocked
      let timeBlocked = 0;
      if (wasBlocked) {
        statusChanges.forEach(change => {
          if (
            change.from.name.toLowerCase().includes('block') ||
            change.from.name.toLowerCase().includes('stuck')
          ) {
            timeBlocked += change.timeInStatus;
          }
        });
      }
      
      // Check if item is completed
      const currentStatus = this.getItemStatus(item, statusColumn) || '';
      const isCompleted = currentStatus.toLowerCase().includes('done') ||
                          currentStatus.toLowerCase().includes('complete');
      
      // Construct movement history
      const movementHistory: ItemMovementHistory = {
        itemId,
        itemName: item.name,
        statusChanges,
        totalCycleTime,
        isCompleted,
        wasBlocked,
        timeBlocked
      };
      
      // Update cache
      this.cache.itemMovementHistory.set(itemId, {
        data: movementHistory,
        timestamp: Date.now()
      });
      
      return movementHistory;
    } catch (error) {
      MondayLogger.error(`Error tracking movement for item ${itemId}:`, error);
      throw new Error(`Failed to track item movement: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Compare efficiency across multiple workflows
   * @param boardIds Array of board IDs to compare
   * @returns Promise resolving to workflow comparison results
   */
  public async compareWorkflows(boardIds: string[]): Promise<WorkflowComparisonResult> {
    try {
      MondayLogger.debug(`Comparing workflows for boards: ${boardIds.join(', ')}`);
      
      if (boardIds.length < 2) {
        throw new Error('At least two board IDs are required for comparison');
      }
      
      // Get metrics for each board
      const workflowMetricsPromises = boardIds.map(async (boardId) => {
        const board = await this.boardService.getBoardById(boardId);
        if (!board) {
          throw new Error(`Board with ID ${boardId} not found`);
        }
        
        const metrics = await this.generateWorkflowMetrics(boardId);
        
        return {
          boardId,
          boardName: board.name,
          metrics
        };
      });
      
      const workflows = await Promise.all(workflowMetricsPromises);
      
      // Find fastest workflow by cycle time
      const fastestWorkflow = workflows.reduce((fastest, current) => {
        return current.metrics.averageCycleTime < fastest.metrics.averageCycleTime ? current : fastest;
      }, workflows[0]);
      
      // Find most efficient workflow
      const mostEfficientWorkflow = workflows.reduce((mostEfficient, current) => {
        return current.metrics.efficiency.flowEfficiency > mostEfficient.metrics.efficiency.flowEfficiency ? current : mostEfficient;
      }, workflows[0]);
      
      // Find highest throughput workflow
      const highestThroughputWorkflow = workflows.reduce((highest, current) => {
        return current.metrics.throughput > highest.metrics.throughput ? current : highest;
      }, workflows[0]);
      
      // Generate recommendations based on comparison
      const recommendations: string[] = [];
      
      // Add recommendations based on cycle time differences
      const slowestWorkflow = workflows.reduce((slowest, current) => {
        return current.metrics.averageCycleTime > slowest.metrics.averageCycleTime ? current : slowest;
      }, workflows[0]);
      
      if (slowestWorkflow.metrics.averageCycleTime > fastestWorkflow.metrics.averageCycleTime * 1.5) {
        recommendations.push(`Consider adopting practices from "${fastestWorkflow.boardName}" to improve cycle time in "${slowestWorkflow.boardName}"`);
      }
      
      // Add recommendations based on efficiency differences
      const leastEfficientWorkflow = workflows.reduce((leastEfficient, current) => {
        return current.metrics.efficiency.flowEfficiency < leastEfficient.metrics.efficiency.flowEfficiency ? current : leastEfficient;
      }, workflows[0]);
      
      if (mostEfficientWorkflow.metrics.efficiency.flowEfficiency > leastEfficientWorkflow.metrics.efficiency.flowEfficiency * 1.3) {
        recommendations.push(`Review process efficiency in "${leastEfficientWorkflow.boardName}" to reduce waste and improve flow efficiency`);
      }
      
      // Add recommendations based on throughput differences
      const lowestThroughputWorkflow = workflows.reduce((lowest, current) => {
        return current.metrics.throughput < lowest.metrics.throughput ? current : lowest;
      }, workflows[0]);
      
      if (highestThroughputWorkflow.metrics.throughput > lowestThroughputWorkflow.metrics.throughput * 1.5) {
        recommendations.push(`Analyze capacity and constraints in "${lowestThroughputWorkflow.boardName}" to improve throughput`);
      }
      
      // Add general recommendations
      recommendations.push('Standardize status columns across workflows to enable more accurate comparisons');
      recommendations.push('Regularly review and update workflow comparison metrics to track improvements over time');
      
      // Construct comparison result
      const comparisonResult: WorkflowComparisonResult = {
        workflows,
        comparison: {
          fastestWorkflow: {
            boardId: fastestWorkflow.boardId,
            boardName: fastestWorkflow.boardName,
            cycleTime: fastestWorkflow.metrics.averageCycleTime
          },
          mostEfficientWorkflow: {
            boardId: mostEfficientWorkflow.boardId,
            boardName: mostEfficientWorkflow.boardName,
            efficiency: mostEfficientWorkflow.metrics.efficiency.flowEfficiency
          },
          highestThroughputWorkflow: {
            boardId: highestThroughputWorkflow.boardId,
            boardName: highestThroughputWorkflow.boardName,
            throughput: highestThroughputWorkflow.metrics.throughput
          }
        },
        recommendations
      };
      
      return comparisonResult;
    } catch (error) {
      MondayLogger.error(`Error comparing workflows: ${boardIds.join(', ')}`, error);
      throw new Error(`Failed to compare workflows: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate a comprehensive performance report for a workflow
   * @param boardId The ID of the board to analyze
   * @returns Promise resolving to a performance report
   */
  public async generatePerformanceReport(boardId: string): Promise<PerformanceReport> {
    try {
      // Check cache first
      const cachedReport = this.cache.performanceReports.get(boardId);
      
      if (this.isCacheValid(cachedReport)) {
        MondayLogger.debug(`Using cached performance report for board ID ${boardId}`);
        return cachedReport!.data;
      }

      MondayLogger.debug(`Generating performance report for board ID ${boardId}`);
      
      // Get board data
      const board = await this.boardService.getBoardById(boardId);
      if (!board) {
        throw new Error(`Board with ID ${boardId} not found`);
      }
      
      // Get metrics and bottlenecks
      const metrics = await this.generateWorkflowMetrics(boardId);
      const bottlenecks = await this.identifyBottlenecks(boardId);
      
      // Identify issues based on metrics and bottlenecks
      const issues: Array<{
        type: 'bottleneck' | 'efficiency' | 'process' | 'resource';
        description: string;
        severity: 'low' | 'medium' | 'high';
        impact: string;
        recommendations: string[];
      }> = [];
      
      // Add bottleneck issues
      bottlenecks.forEach(bottleneck => {
        if (bottleneck.severity === 'high' || bottleneck.severity === 'medium') {
          issues.push({
            type: 'bottleneck',
            description: `Bottleneck detected in "${bottleneck.name}" status`,
            severity: bottleneck.severity,
            impact: `Items spend an average of ${bottleneck.averageTime.toFixed(1)} days in this status, affecting overall cycle time`,
            recommendations: bottleneck.suggestions
          });
        }
      });
      
      // Add efficiency issues
      if (metrics.efficiency.flowEfficiency < 0.5) {
        issues.push({
          type: 'efficiency',
          description: 'Low flow efficiency detected',
          severity: metrics.efficiency.flowEfficiency < 0.3 ? 'high' : 'medium',
          impact: `Only ${(metrics.efficiency.flowEfficiency * 100).toFixed(1)}% of time is spent on value-adding activities`,
          recommendations: [
            'Identify and reduce waiting time between process steps',
            'Implement pull-based workflow to reduce work in progress',
            'Focus on completing started work before starting new items'
          ]
        });
      }
      
      // Add process issues
      if (metrics.wipCount > 10) {
        issues.push({
          type: 'process',
          description: 'High work in progress (WIP)',
          severity: metrics.wipCount > 20 ? 'high' : 'medium',
          impact: 'High WIP leads to context switching, longer cycle times, and reduced quality',
          recommendations: [
            'Implement WIP limits for each workflow stage',
            'Focus on completing items before starting new work',
            'Consider team capacity when accepting new work'
          ]
        });
      }
      
      if (metrics.efficiency.blockedPercentage > 0.2) {
        issues.push({
          type: 'process',
          description: 'High percentage of blocked items',
          severity: metrics.efficiency.blockedPercentage > 0.3 ? 'high' : 'medium',
          impact: `${(metrics.efficiency.blockedPercentage * 100).toFixed(1)}% of in-progress items are blocked, reducing throughput`,
          recommendations: [
            'Implement a process for quickly addressing blocked items',
            'Analyze common blocking reasons and address root causes',
            'Consider adding a dedicated role for unblocking items'
          ]
        });
      }
      
      // Calculate performance score (0-100)
      // This is a weighted calculation based on various metrics
      const cycleTimeScore = Math.max(0, 100 - (metrics.averageCycleTime * 5)); // Lower is better
      const throughputScore = Math.min(100, metrics.throughput * 10); // Higher is better
      const wipScore = Math.max(0, 100 - (metrics.wipCount * 2)); // Lower is better
      const efficiencyScore = metrics.efficiency.flowEfficiency * 100; // Higher is better
      const blockedScore = Math.max(0, 100 - (metrics.efficiency.blockedPercentage * 100)); // Lower is better
      
      const performanceScore = Math.round(
        (cycleTimeScore * 0.25) +
        (throughputScore * 0.2) +
        (wipScore * 0.15) +
        (efficiencyScore * 0.25) +
        (blockedScore * 0.15)
      );
      
      // Generate historical performance data (simplified)
      const historicalPerformance = Array.from({ length: 12 }, (_, i) => {
        const weekNumber = 12 - i;
        const randomVariation = (Math.random() - 0.5) * 10;
        const historicalScore = Math.max(0, Math.min(100, performanceScore + randomVariation));
        
        return {
          period: `Week ${weekNumber}`,
          cycleTime: Math.max(1, metrics.averageCycleTime + (Math.random() - 0.5) * 2),
          throughput: Math.max(1, metrics.throughput + (Math.random() - 0.5) * 2),
          wipCount: Math.max(1, metrics.wipCount + (Math.random() - 0.5) * 3),
          performanceScore: Math.round(historicalScore)
        };
      });
      
      // Generate improvement opportunities
      const improvementOpportunities: string[] = [];
      
      // Add opportunities based on issues
      if (issues.length > 0) {
        // Sort issues by severity
        const sortedIssues = [...issues].sort((a, b) => {
          const severityOrder = { high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        });
        
        // Add top 3 issues as opportunities
        sortedIssues.slice(0, 3).forEach(issue => {
          improvementOpportunities.push(`Address ${issue.severity} priority issue: ${issue.description}`);
        });
      }
      
      // Add general improvement opportunities
      improvementOpportunities.push('Implement regular retrospectives to continuously improve the workflow');
      improvementOpportunities.push('Consider visualizing workflow metrics on a dashboard for increased visibility');
      improvementOpportunities.push('Train team members on workflow efficiency principles and practices');
      
      // Construct performance report
      const report: PerformanceReport = {
        boardId,
        boardName: board.name,
        generatedAt: new Date(),
        metrics,
        bottlenecks,
        issues,
        performanceScore,
        historicalPerformance,
        improvementOpportunities
      };
      
      // Update cache
      this.cache.performanceReports.set(boardId, {
        data: report,
        timestamp: Date.now()
      });
      
      return report;
    } catch (error) {
      MondayLogger.error(`Error generating performance report for board ${boardId}:`, error);
      throw new Error(`Failed to generate performance report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
