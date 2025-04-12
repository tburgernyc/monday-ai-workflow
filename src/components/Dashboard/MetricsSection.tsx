import React from 'react';
import { Box, Flex, Heading, Text } from 'monday-ui-react-core';
import Card from '../common/Card';

interface MetricsSectionProps {
  workspaceCount: number;
  boardCount: number;
  itemCount: number;
  completedItemCount: number;
}

const MetricsSection: React.FC<MetricsSectionProps> = ({
  workspaceCount,
  boardCount,
  itemCount,
  completedItemCount
}) => {
  // Calculate completion rate
  const completionRate = itemCount > 0 
    ? Math.round((completedItemCount / itemCount) * 100) 
    : 0;

  // Calculate average cycle time (mock data)
  const averageCycleTime = 3.2; // days

  return (
    <Box className="metrics-section">
      <Heading value="Key Metrics" size={Heading.sizes.MEDIUM} style={{ marginBottom: '16px' }} />
      
      <Flex gap={16} wrap>
        {/* Summary Metrics */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <Card className="metric-card">
            <Flex direction={Flex.directions.COLUMN} gap={8}>
              <Text color={Text.colors.SECONDARY}>Workspaces</Text>
              <Heading value={workspaceCount.toString()} size={Heading.sizes.LARGE} />
            </Flex>
          </Card>
        </div>
        
        <div style={{ flex: '1', minWidth: '200px' }}>
          <Card className="metric-card">
            <Flex direction={Flex.directions.COLUMN} gap={8}>
              <Text color={Text.colors.SECONDARY}>Boards</Text>
              <Heading value={boardCount.toString()} size={Heading.sizes.LARGE} />
            </Flex>
          </Card>
        </div>
        
        <div style={{ flex: '1', minWidth: '200px' }}>
          <Card className="metric-card">
            <Flex direction={Flex.directions.COLUMN} gap={8}>
              <Text color={Text.colors.SECONDARY}>Items</Text>
              <Heading value={itemCount.toString()} size={Heading.sizes.LARGE} />
            </Flex>
          </Card>
        </div>
        
        <div style={{ flex: '1', minWidth: '200px' }}>
          <Card className="metric-card">
            <Flex direction={Flex.directions.COLUMN} gap={8}>
              <Text color={Text.colors.SECONDARY}>Completion Rate</Text>
              <Heading value={`${completionRate}%`} size={Heading.sizes.LARGE} />
            </Flex>
          </Card>
        </div>
      </Flex>
      
      {/* Cycle Time Visualization */}
      <Box style={{ marginTop: '24px' }}>
        <Card className="cycle-time-card">
          <Flex direction={Flex.directions.COLUMN} gap={8}>
            <Text color={Text.colors.SECONDARY}>Average Cycle Time</Text>
            <Flex align={Flex.align.CENTER} gap={8}>
              <Heading value={averageCycleTime.toString()} size={Heading.sizes.LARGE} />
              <Text>days</Text>
            </Flex>
            
            {/* Simple visualization */}
            <Box style={{ marginTop: '16px' }}>
              <Text color={Text.colors.SECONDARY} style={{ marginBottom: '8px' }}>
                Cycle Time Trend (Last 30 Days)
              </Text>
              <Box className="cycle-time-chart" style={{ 
                height: '40px', 
                background: 'var(--primary-background-hover-color)',
                borderRadius: '4px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Mock chart bars */}
                {Array.from({ length: 30 }).map((_, index) => {
                  // Generate random heights for the bars
                  const height = 10 + Math.random() * 25;
                  return (
                    <Box 
                      key={`bar-${index}`}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: `${index * 3.33}%`,
                        width: '2%',
                        height: `${height}px`,
                        backgroundColor: 'var(--primary-color)',
                        borderRadius: '2px 2px 0 0'
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          </Flex>
        </Card>
      </Box>
    </Box>
  );
};

export default MetricsSection;