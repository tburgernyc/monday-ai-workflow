import React, { useState, useEffect } from 'react';
import { Box, Flex, Heading, Text, Loader } from 'monday-ui-react-core';
import MetricsSection from './MetricsSection';
import AIInsights from './AIInsights';
import QuickAccess from './QuickAccess';
import NotificationCenter from './NotificationCenter';
import { WorkspaceService } from '../../services/api/workspaceService';
import { BoardService } from '../../services/api/boardService';
import { ItemService } from '../../services/api/itemService';

interface DashboardPageProps {
  userId?: string;
}

interface DashboardData {
  workspaceCount: number;
  boardCount: number;
  itemCount: number;
  completedItemCount: number;
  recentBoards: any[];
  recentWorkspaces: any[];
}

const DashboardPage: React.FC<DashboardPageProps> = ({ userId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    workspaceCount: 0,
    boardCount: 0,
    itemCount: 0,
    completedItemCount: 0,
    recentBoards: [],
    recentWorkspaces: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, we would fetch this data from the API
        // For now, we'll use mock data
        
        // Mock data
        const mockDashboardData: DashboardData = {
          workspaceCount: 5,
          boardCount: 12,
          itemCount: 87,
          completedItemCount: 42,
          recentBoards: [
            { id: 'board-1', name: 'Product Roadmap', description: 'Q2 2025 Product Roadmap', itemCount: 24 },
            { id: 'board-2', name: 'Marketing Campaign', description: 'Summer Marketing Campaign', itemCount: 18 },
            { id: 'board-3', name: 'Development Sprint', description: 'Sprint 23', itemCount: 15 }
          ],
          recentWorkspaces: [
            { id: 'workspace-1', name: 'Product Team', description: 'Product development and roadmap', boardCount: 5 },
            { id: 'workspace-2', name: 'Marketing', description: 'Marketing campaigns and assets', boardCount: 3 },
            { id: 'workspace-3', name: 'Engineering', description: 'Engineering projects and sprints', boardCount: 4 }
          ]
        };
        
        setDashboardData(mockDashboardData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userId]);

  if (loading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader size={Loader.sizes.LARGE} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box style={{ textAlign: 'center', padding: '32px' }}>
        <Text style={{ color: 'var(--negative-color)' }}>{error}</Text>
      </Box>
    );
  }

  const { 
    workspaceCount, 
    boardCount, 
    itemCount, 
    completedItemCount, 
    recentBoards, 
    recentWorkspaces 
  } = dashboardData;

  return (
    <Box className="dashboard-page" style={{ padding: '24px' }}>
      <Heading value="Dashboard" size={Heading.sizes.LARGE} style={{ marginBottom: '24px' }} />
      
      <Flex gap={24} direction={Flex.directions.COLUMN}>
        {/* Metrics Section */}
        <MetricsSection 
          workspaceCount={workspaceCount}
          boardCount={boardCount}
          itemCount={itemCount}
          completedItemCount={completedItemCount}
        />
        
        {/* Main Content */}
        <Flex gap={24} wrap>
          <Box style={{ flex: '2', minWidth: '300px' }}>
            {/* AI Insights */}
            <AIInsights boardId="board-1" />
            
            {/* Quick Access */}
            <Box style={{ marginTop: '24px' }}>
              <QuickAccess 
                recentBoards={recentBoards}
                recentWorkspaces={recentWorkspaces}
              />
            </Box>
          </Box>
          
          {/* Notifications */}
          <Box style={{ flex: '1', minWidth: '300px' }}>
            <NotificationCenter limit={5} />
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
};

export default DashboardPage;