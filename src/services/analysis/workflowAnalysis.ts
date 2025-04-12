import { BoardService, Item, Board, Group, Column } from '../api/boardService';
import { ClaudeService, AnalysisResult } from '../nlp/claudeService';

// Types
export interface WorkflowMetrics {
  averageCycleTime: number; // in days
  throughput: number; // items per week
  wip: number; // work in progress count
  blockedItems: number;
  readyItems: number;
  completedItems: number;
  bottlenecks: Array<{
    groupId: string;
    groupName: string;
    count: number;
    stagnation: number; // average days in group
  }>;
}

export interface HistoricalData {
  period: string;
  throughput: number;
  cycleTime: number;
}

// Helper functions
const calculateDaysBetween = (startDate: string, endDate: string = new Date().toISOString()): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Service methods
export const WorkflowAnalysisService = {
  // Calculate metrics from board data
  calculateMetrics: async (boardId: string): Promise<WorkflowMetrics> => {
    try {
      // Get board data
      const boardData = await BoardService.getById(boardId);
      if (!boardData) {
        throw new Error(`Board with ID ${boardId} not found`);
      }
      
      // Get all items
      const items = await BoardService.getItems(boardId);
      
      // Calculate metrics
      const { board, groups } = boardData;
      
      // Define status groups
      const groupMap = groups.reduce((acc, group) => {
        acc[group.id] = group;
        return acc;
      }, {} as Record<string, Group>);
      
      // Count items per group
      const itemsPerGroup = items.reduce((acc, item) => {
        const groupId = item.group?.id;
        if (!acc[groupId]) {
          acc[groupId] = [];
        }
        acc[groupId].push(item);
        return acc;
      }, {} as Record<string, Item[]>);
      
      // Identify workflow stages
      let readyItems = 0;
      let blockedItems = 0;
      let completedItems = 0;
      
      // Look for status columns
      const statusColumn = boardData.columns.find(col => 
        col.type === 'status' || col.title.toLowerCase().includes('status')
      );
      
      if (statusColumn) {
        // Count based on status
        items.forEach(item => {
          const statusValue = item.column_values.find(cv => cv.id === statusColumn.id);
          const status = statusValue?.text?.toLowerCase() || '';
          
          if (status.includes('block') || status.includes('stuck')) {
            blockedItems++;
          } else if (status.includes('done') || status.includes('complete')) {
            completedItems++;
          } else if (status.includes('ready') || status.includes('to do')) {
            readyItems++;
          }
        });
      } else {
        // Assume first group is backlog/ready, last is completed
        const groupIds = groups.sort((a, b) => a.position - b.position).map(g => g.id);
        
        if (groupIds.length > 0) {
          readyItems = itemsPerGroup[groupIds[0]]?.length || 0;
          completedItems = itemsPerGroup[groupIds[groupIds.length - 1]]?.length || 0;
        }
        
        // Look for blocked in group titles
        groups.forEach(group => {
          if (group.title.toLowerCase().includes('block') || group.title.toLowerCase().includes('stuck')) {
            blockedItems += itemsPerGroup[group.id]?.length || 0;
          }
        });
      }
      
      // WIP calculation
      const wip = items.length - completedItems;
      
      // Bottleneck analysis
      const bottlenecks = groups.map(group => {
        const groupItems = itemsPerGroup[group.id] || [];
        let totalStagnation = 0;
        
        // Calculate stagnation if we have dates
        if (groupItems.length > 0) {
          // This is a simplified approach - in real app, you'd need to track when items enter each state
          const dateColumn = boardData.columns.find(col => col.type === 'date');
          
          if (dateColumn) {
            groupItems.forEach(item => {
              const dateValue = item.column_values.find(cv => cv.id === dateColumn.id);
              if (dateValue?.text) {
                totalStagnation += calculateDaysBetween(dateValue.text);
              }
            });
          }
        }
        
        return {
          groupId: group.id,
          groupName: group.title,
          count: groupItems.length,
          stagnation: groupItems.length > 0 ? totalStagnation / groupItems.length : 0,
        };
      }).sort((a, b) => b.count - a.count); // Sort by count desc
      
      // Throughput and cycle time calculation (simplified)
      // In a real app, you'd need historical data
      const averageCycleTime = 7; // Placeholder
      const throughput = 10; // Placeholder
      
      return {
        averageCycleTime,
        throughput,
        wip,
        blockedItems,
        readyItems,
        completedItems,
        bottlenecks,
      };
    } catch (error) {
      console.error('Error calculating workflow metrics:', error);
      throw error;
    }
  },

  // Get AI-powered analysis
  getAIAnalysis: async (boardId: string): Promise<AnalysisResult> => {
    try {
      return await ClaudeService.analyzeWorkflow(boardId);
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      throw error;
    }
  },

  // Get historical data (mock implementation)
  getHistoricalData: async (boardId: string, weeks: number = 12): Promise<HistoricalData[]> => {
    try {
      // In a real app, you'd fetch this from actual board data
      // This is a mock implementation
      const data: HistoricalData[] = [];
      
      const now = new Date();
      let throughput = 8 + Math.random() * 4; // Start around 8-12
      let cycleTime = 5 + Math.random() * 3; // Start around 5-8 days
      
      for (let i = 0; i < weeks; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7));
        
        // Add some variation
        throughput = Math.max(1, throughput + (Math.random() - 0.5) * 3);
        cycleTime = Math.max(1, cycleTime + (Math.random() - 0.5) * 2);
        
        data.push({
          period: `Week ${weeks - i}`,
          throughput: Math.round(throughput * 10) / 10,
          cycleTime: Math.round(cycleTime * 10) / 10,
        });
      }
      
      return data.reverse(); // Chronological order
    } catch (error) {
      console.error('Error getting historical data:', error);
      throw error;
    }
  },

  // Detect process health issues
  detectIssues: async (boardId: string): Promise<string[]> => {
    try {
      const metrics = await this.calculateMetrics(boardId);
      const issues: string[] = [];
      
      // Check for high WIP
      if (metrics.wip > 20) {
        issues.push('High work in progress may be causing context switching and delays');
      }
      
      // Check for blocked items
      if (metrics.blockedItems > metrics.wip * 0.2) {
        issues.push('High number of blocked items detected - more than 20% of in-progress work is blocked');
      }
      
      // Check for bottlenecks
      const worstBottleneck = metrics.bottlenecks[0];
      if (worstBottleneck && worstBottleneck.count > metrics.wip * 0.3) {
        issues.push(`Bottleneck detected in "${worstBottleneck.groupName}" with ${worstBottleneck.count} items`);
      }
      
      // Check for long cycle times
      if (metrics.averageCycleTime > 14) {
        issues.push('Long average cycle time of more than 2 weeks detected');
      }
      
      return issues;
    } catch (error) {
      console.error('Error detecting workflow issues:', error);
      throw error;
    }
  },
};

export default WorkflowAnalysisService;