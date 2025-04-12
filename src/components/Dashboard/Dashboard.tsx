// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import {
  Button,
  Box,
  Flex,
  Heading,
  Icon,
  Loader,
  Text
} from 'monday-ui-react-core';
import {
  FlexAlign,
  FlexJustify,
  HeadingType,
  TextType,
  ButtonType,
  LoaderSize
} from '../../types/mondayTypes';
import { Board, Group, Workflow, Status } from 'monday-ui-react-core/icons';
import { BoardService } from '../../services/api/boardService';
import { WorkspaceService } from '../../services/api/workspaceService';
import { WorkflowAnalysisService } from '../../services/analysis/workflowAnalysisService';
import { useNavigate } from 'react-router-dom';

// Define types for component state
interface DashboardStats {
  workspaces: number;
  boards: number;
  itemsInProgress: number;
  blockedItems: number;
  issuesDetected: number;
}

interface BoardData {
  id: string;
  name: string;
  description?: string;
  board_kind?: string;
  state?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    workspaces: 0,
    boards: 0,
    itemsInProgress: 0,
    blockedItems: 0,
    issuesDetected: 0
  });
  const [recentBoards, setRecentBoards] = useState<BoardData[]>([]);
  const [recentIssues, setRecentIssues] = useState<string[]>([]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch workspaces
        const workspaceService = new WorkspaceService();
        const workspaces = await workspaceService.getWorkspaces();
        
        // Fetch boards
        const boardService = new BoardService();
        const boards = await boardService.getBoards();
        
        // Get recent boards (up to 5)
        const recent = boards.slice(0, 5);
        setRecentBoards(recent);
        
        // Calculate stats for items in progress and blocked items
        let inProgressCount = 0;
        let blockedCount = 0;
        let issuesCount = 0;
        let issues: string[] = [];
        
        // Process each board (limit to 5 to avoid too many API calls)
        for (const board of recent) {
          try {
            // Get board metrics
            const workflowAnalysisService = new WorkflowAnalysisService();
            const workflowMetrics = await workflowAnalysisService.generateWorkflowMetrics(board.id);
            
            // Map the metrics to the format expected by the dashboard
            const metrics = {
              wip: workflowMetrics.wipCount,
              blockedItems: Math.round(workflowMetrics.wipCount * workflowMetrics.efficiency.blockedPercentage)
            };
            inProgressCount += metrics.wip;
            blockedCount += metrics.blockedItems;
            
            // Detect issues
            // Use the same workflowAnalysisService instance
            const boardBottlenecks = await workflowAnalysisService.identifyBottlenecks(board.id);
            // Map bottlenecks to issues
            const boardIssues = boardBottlenecks.map(bottleneck =>
              `${bottleneck.name}: ${bottleneck.severity} severity (${bottleneck.averageTime.toFixed(1)} days avg)`
            );
            issues = [...issues, ...boardIssues.map(issue => `${board.name}: ${issue}`)];
            issuesCount += boardIssues.length;
          } catch (err: any) {
            console.error(`Error processing board ${board.id}:`, err);
            // Don't fail the entire dashboard if one board fails
          }
        }
        
        // Update stats
        setStats({
          workspaces: workspaces.length,
          boards: boards.length,
          itemsInProgress: inProgressCount,
          blockedItems: blockedCount,
          issuesDetected: issuesCount
        });
        
        // Set recent issues (up to 5)
        setRecentIssues(issues.slice(0, 5));
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [token]);

  // Navigation handler
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        {/* @ts-ignore */}
        <Loader size="large" />
        <Text>Loading dashboard data...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container" style={{ padding: '20px', color: 'var(--negative-color)', textAlign: 'center' }}>
        {/* @ts-ignore */}
        <Heading type={HeadingType.h2}>Error Loading Dashboard</Heading>
        <Text>{error}</Text>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="dashboard" style={{ padding: '24px' }}>
      {/* Stats Cards */}
      <Flex gap={12} wrap>
        <Box className="stat-card" style={{ padding: '16px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px', flex: '1 0 200px' }}>
          {/* @ts-ignore */}
          <Flex align={FlexAlign.CENTER} gap={8}>
            <Icon icon={Workflow} />
            <div>
              {/* @ts-ignore */}
              <Text type={TextType.TEXT2} weight="bold">Workspaces</Text>
              {/* @ts-ignore */}
              <Heading type={HeadingType.h1} value={stats.workspaces.toString()} />
            </div>
          </Flex>
        </Box>
        
        <Box className="stat-card" style={{ padding: '16px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px', flex: '1 0 200px' }}>
          {/* @ts-ignore */}
          <Flex align={FlexAlign.CENTER} gap={8}>
            <Icon icon={Board} />
            <div>
              {/* @ts-ignore */}
              <Text type={TextType.TEXT2} weight="bold">Boards</Text>
              {/* @ts-ignore */}
              <Heading type={HeadingType.h1} value={stats.boards.toString()} />
            </div>
          </Flex>
        </Box>
        
        <Box className="stat-card" style={{ padding: '16px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px', flex: '1 0 200px' }}>
          {/* @ts-ignore */}
          <Flex align={FlexAlign.CENTER} gap={8}>
            <Icon icon={Group} />
            <div>
              {/* @ts-ignore */}
              <Text type={TextType.TEXT2} weight="bold">Items In Progress</Text>
              {/* @ts-ignore */}
              <Heading type={HeadingType.h1} value={stats.itemsInProgress.toString()} />
            </div>
          </Flex>
        </Box>
        
        <Box className="stat-card" style={{ padding: '16px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px', flex: '1 0 200px' }}>
          {/* @ts-ignore */}
          <Flex align={FlexAlign.CENTER} gap={8}>
            <Icon icon={Status} />
            <div>
              {/* @ts-ignore */}
              <Text type={TextType.TEXT2} weight="bold">Blocked Items</Text>
              {/* @ts-ignore */}
              <Heading type={HeadingType.h1} value={stats.blockedItems.toString()} />
            </div>
          </Flex>
        </Box>
      </Flex>

      {/* Recent Boards */}
      <Box className="section" style={{ marginTop: '24px' }}>
        {/* @ts-ignore */}
        <Flex justify={FlexJustify.SPACE_BETWEEN} align={FlexAlign.CENTER} style={{ marginBottom: '16px' }}>
          {/* @ts-ignore */}
          <Heading type={HeadingType.h2} value="Recent Boards" />
          {/* @ts-ignore */}
          <Button size="small" type={ButtonType.TERTIARY} onClick={() => window.open('https://monday.com/boards', '_blank')}>
            View All
          </Button>
        </Flex>
        
        <Box className="boards-list" style={{ marginTop: '16px' }}>
          {recentBoards.length > 0 ? (
            recentBoards.map(board => (
              <Box
                key={board.id}
                className="board-item"
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: 'var(--primary-background-color)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                // @ts-ignore
                onClick={() => window.open(`https://monday.com/boards/${board.id}`, '_blank')}
              >
                {/* @ts-ignore */}
                <Flex align={FlexAlign.CENTER} gap={8}>
                  <Icon icon={Board} />
                  <Text>{board.name}</Text>
                </Flex>
              </Box>
            ))
          ) : (
            <Text>No boards found.</Text>
          )}
        </Box>
      </Box>

      {/* Workflow Issues */}
      <Box className="section" style={{ marginTop: '24px' }}>
        {/* @ts-ignore */}
        <Flex justify={FlexJustify.SPACE_BETWEEN} align={FlexAlign.CENTER} style={{ marginBottom: '16px' }}>
          {/* @ts-ignore */}
          <Heading type={HeadingType.h2} value="Detected Workflow Issues" />
          {/* @ts-ignore */}
          <Button
            size="small"
            type="tertiary"
            onClick={() => handleNavigation('/workflow-analysis')}
          >
            View Analysis
          </Button>
        </Flex>
        
        <Box className="issues-list" style={{ marginTop: '16px' }}>
          {recentIssues.length > 0 ? (
            recentIssues.map((issue, index) => (
              <Box
                key={index}
                className="issue-item"
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: 'var(--primary-background-color)',
                  borderRadius: '8px'
                }}
              >
                {/* @ts-ignore */}
                <Flex align={FlexAlign.CENTER} gap={8}>
                  <Icon icon={Status} />
                  <Text>{issue}</Text>
                </Flex>
              </Box>
            ))
          ) : (
            <Text>No workflow issues detected.</Text>
          )}
        </Box>
      </Box>

      {/* AI Assistant */}
      <Box className="section" style={{ marginTop: '24px' }}>
        {/* @ts-ignore */}
        <Heading type={HeadingType.h2} value="AI Workflow Assistant" style={{ marginBottom: '16px' }} />
        
        <Box
          className="ai-assistant"
          style={{
            marginTop: '16px',
            padding: '24px',
            backgroundColor: 'var(--primary-selected-color)',
            borderRadius: '8px'
          }}
        >
          {/* @ts-ignore */}
          <Text type={TextType.TEXT1} weight="bold">
            What would you like to do today?
          </Text>
          
          <Flex style={{ marginTop: '16px' }} gap={12} wrap>
            <Button onClick={() => handleNavigation('/workflow-analysis')}>
              Analyze Workflow Efficiency
            </Button>
            
            <Button onClick={() => handleNavigation('/workspaces')}>
              Create New Workspace
            </Button>
            
            <Button onClick={() => handleNavigation('/boards')}>
              Optimize Board Structure
            </Button>
          </Flex>
        </Box>
      </Box>
    </div>
  );
};

export default Dashboard;