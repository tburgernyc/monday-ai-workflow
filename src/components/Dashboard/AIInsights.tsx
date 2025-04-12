import React, { useState, useEffect } from 'react';
import { Box, Heading, Text, Flex, Loader, Button, Icon } from 'monday-ui-react-core';
import Card from '../common/Card';
import { ClaudeService } from '../../services/nlp/claudeService';

interface AIInsightsProps {
  boardId: string;
}

interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'bottleneck' | 'efficiency' | 'improvement';
  impact: 'high' | 'medium' | 'low';
  actionLink?: string;
  actionText?: string;
}

const AIInsights: React.FC<AIInsightsProps> = ({ boardId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, we would fetch insights from the Claude service
        // For now, we'll use mock data
        
        // Mock data
        const mockInsights: Insight[] = [
          {
            id: '1',
            title: 'Task Assignment Bottleneck',
            description: 'Multiple tasks are waiting for assignment in the "To Do" column, causing a workflow bottleneck.',
            type: 'bottleneck',
            impact: 'high',
            actionLink: `/boards/${boardId}?filter=status=To Do`,
            actionText: 'Review unassigned tasks'
          },
          {
            id: '2',
            title: 'Improve Review Process',
            description: 'Tasks spend an average of 3.5 days in the "Review" column, which is 40% longer than other stages.',
            type: 'improvement',
            impact: 'medium',
            actionLink: `/boards/${boardId}?filter=status=Review`,
            actionText: 'Optimize review process'
          },
          {
            id: '3',
            title: 'Resource Allocation Efficiency',
            description: 'Team members Alex and Sarah have 30% more tasks than others. Consider redistributing workload.',
            type: 'efficiency',
            impact: 'medium',
            actionLink: `/boards/${boardId}?filter=person=Alex,Sarah`,
            actionText: 'View workload distribution'
          }
        ];
        
        setInsights(mockInsights);
      } catch (err) {
        console.error('Error fetching AI insights:', err);
        setError('Failed to load AI insights. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [boardId]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'var(--negative-color)';
      case 'medium':
        return 'var(--warning-color)';
      case 'low':
        return 'var(--positive-color)';
      default:
        return 'var(--primary-color)';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bottleneck':
        return '🔍'; // Magnifying glass
      case 'efficiency':
        return '⚡'; // Lightning bolt
      case 'improvement':
        return '💡'; // Light bulb
      default:
        return '📊'; // Chart
    }
  };

  if (loading) {
    return (
      <Box style={{ textAlign: 'center', padding: '16px' }}>
        <Loader size={Loader.sizes.MEDIUM} />
        <Text>Analyzing workflow data...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box style={{ textAlign: 'center', padding: '16px' }}>
        <Text style={{ color: 'var(--negative-color)' }}>{error}</Text>
      </Box>
    );
  }

  return (
    <Box className="ai-insights-section">
      <Heading value="AI Workflow Insights" size={Heading.sizes.MEDIUM} style={{ marginBottom: '16px' }} />
      
      <Flex direction={Flex.directions.COLUMN} gap={16}>
        {insights.map(insight => (
          <Card 
            key={`insight-${insight.id}`}
            className="insight-card"
          >
            <Flex direction={Flex.directions.COLUMN} gap={8}>
              <Flex align={Flex.align.CENTER} gap={8}>
                <Text>{getTypeIcon(insight.type)}</Text>
                <Heading value={insight.title} size={Heading.sizes.SMALL} />
              </Flex>
              
              <Text>{insight.description}</Text>
              
              <Flex align={Flex.align.CENTER} gap={8} style={{ marginTop: '8px' }}>
                <Box 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: getImpactColor(insight.impact) 
                  }} 
                />
                <Text color={Text.colors.SECONDARY}>
                  {`${insight.impact.charAt(0).toUpperCase() + insight.impact.slice(1)} Impact`}
                </Text>
              </Flex>
              
              {insight.actionLink && insight.actionText && (
                <Box style={{ marginTop: '8px' }}>
                  <Button
                    size={Button.sizes.SMALL}
                    kind={Button.kinds.TERTIARY}
                    onClick={() => window.open(insight.actionLink, '_blank')}
                  >
                    {insight.actionText}
                  </Button>
                </Box>
              )}
            </Flex>
          </Card>
        ))}
      </Flex>
      
      <Box style={{ marginTop: '16px', textAlign: 'center' }}>
        <Button
          size={Button.sizes.SMALL}
          kind={Button.kinds.TERTIARY}
          onClick={() => window.open(`/boards/${boardId}/analysis`, '_blank')}
        >
          View detailed workflow analysis
        </Button>
      </Box>
    </Box>
  );
};

export default AIInsights;