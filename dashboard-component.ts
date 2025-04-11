import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { Button, Box, Flex, Heading, Icon, Loader, Text } from 'monday-ui-react-core';
import { Board, Group, Workflow, Status } from 'monday-ui-react-core/icons';
import { BoardService } from '../../services/api/boardService';
import { WorkspaceService } from '../../services/api/workspaceService';
import { WorkflowAnalysisService } from '../../services/analysis/workflowAnalysis';

const Dashboard: React.FC = () => {
  const { token, boardIds } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    workspaces: 0,
    boards: 0,
    itemsInProgress: 0,
    blockedItems: 0,
    issuesDetected: 0
  });
  const [recentBoards, setRecentBoards] = useState<any[]>([]);
  const [recentIssues, setRecentIssues] = useState<string[]>([]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;
      
      setLoading(true);
      
      try {
        // Fetch workspaces
        const workspaces = await WorkspaceService.getAll();
        
        // Fetch boards
        const boards = await BoardService.getAll();
        
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
            const metrics = await WorkflowAnalysisService.calculateMetrics(board.id);
            inProgressCount += metrics.wip;
            blockedCount += metrics.blockedItems;
            
            // Detect issues
            const boardIssues = await WorkflowAnalysisService.detectIssues(board.id);
            issues = [...issues, ...boardIssues.map(issue => `${board.name}: ${issue}`)];
            issuesCount += boardIssues.length;
          } catch (err) {
            console.error(`Error processing board ${board.id}:`, err);
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
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [token]);

  if (loading) {
    return (
      <div className="loading-container">
        <Loader size="large" />
        <Text>Loading dashboard data...</Text>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Stats Cards */}
      <Flex gap={12} wrap>
        <Box className="stat-card" padding={16} rounded>
          <Flex align="center" gap={8}>
            <Icon icon={Workflow} color="var(--primary-color)" />
            <div>
              <Text type="text2" weight="bold">Workspaces</Text>
              <Heading type="h1">{stats.workspaces}</Heading>
            </div>
          </Flex>
        </Box>
        
        <Box className="stat-card" padding={16} rounded>
          <Flex align="center" gap={8}>
            <Icon icon={Board} color="var(--primary-color)" />
            <div>
              <Text type="text2" weight="bold">Boards</Text>
              <Heading type="h1">{stats.boards}</Heading>
            </div>
          </Flex>
        </Box>
        
        <Box className="stat-card" padding={16} rounded>
          <Flex align="center" gap={8}>
            <Icon icon={Group} color="var(--primary-color)" />
            <div>
              <Text type="text2" weight="bold">Items In Progress</Text>
              <Heading type="h1">{stats.itemsInProgress}</Heading>
            </div>
          </Flex>
        </Box>
        
        <Box className="stat-card" padding={16} rounded>
          <Flex align="center" gap={8}>
            <Icon icon={Status} color="var(--negative-color)" />
            <div>
              <Text type="text2" weight="bold">Blocked Items</Text>
              <Heading type="h1">{stats.blockedItems}</Heading>
            </div>
          </Flex>
        </Box>
      </Flex>

      {/* Recent Boards */}
      <Box className="section" marginTop={24}>
        <Flex justify="between" align="center">
          <Heading type="h2">Recent Boards</Heading>
          <Button size="small" kind="tertiary" onClick={() => window.open('https://monday.com/boards', '_blank')}>
            View All
          </Button>
        </Flex>
        
        <Box className="boards-list" marginTop={16}>
          {recentBoards.length > 0 ? (
            recentBoards.map(board => (
              <Box 
                key={board.id} 
                className="board-item" 
                padding={12} 
                marginBottom={8} 
                rounded
              >
                <Flex align="center" gap={8}>
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
      <Box className="section" marginTop={24}>
        <Flex justify="between" align="center">
          <Heading type="h2">Detected Workflow Issues</Heading>
          <Button 
            size="small" 
            kind="tertiary" 
            onClick={() => window.location.pathname = '/workflow-analysis'}
          >
            View Analysis
          </Button>
        </Flex>
        
        <Box className="issues-list" marginTop={16}>
          {recentIssues.length > 0 ? (
            recentIssues.map((issue, index) => (
              <Box 
                key={index} 
                className="issue-item" 
                padding={12} 
                marginBottom={8} 
                rounded
              >
                <Flex align="center" gap={8}>
                  <Icon icon={Status} color="var(--negative-color)" />
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
      <Box className="section" marginTop={24}>
        <Heading type="h2">AI Workflow Assistant</Heading>
        
        <Box className="ai-assistant" marginTop={16} padding={24} rounded>
          <Text type="text1" weight="bold">
            What would you like to do today?
          </Text>
          
          <Flex marginTop={16} gap={12} wrap>
            <Button onClick={() => window.location.pathname = '/workflow-analysis'}>
              Analyze Workflow Efficiency
            </Button>
            
            <Button onClick={() => window.location.pathname = '/workspaces'}>
              Create New Workspace
            </Button>
            
            <Button onClick={() => window.location.pathname = '/boards'}>
              Optimize Board Structure
            </Button>
          </Flex>
        </Box>
      </Box>
    </div>
  );
};

export default Dashboard;