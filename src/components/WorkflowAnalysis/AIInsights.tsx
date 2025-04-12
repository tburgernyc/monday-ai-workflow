import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { WorkflowAnalysisService } from '../../services/analysis/workflowAnalysisService';
import { PerformanceReport, Bottleneck } from '../../types/analysisTypes';
import {
  Box,
  Flex,
  Heading,
  Text,
  Loader,
  Button,
  Dropdown,
  Divider,
  Toast,
  Icon,
  Tooltip
} from 'monday-ui-react-core';
import { 
  Status, 
  Time, 
  Board, 
  Bolt,
  Idea,
  Check, 
  Info, 
  ThumbsUp
} from 'monday-ui-react-core/icons';
import { useBoards } from '../../hooks/useBoards';
import { useResponsive } from '../../hooks/useResponsive';

interface BoardOption {
  value: string;
  label: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  category: 'process' | 'resource' | 'bottleneck' | 'efficiency';
  applied: boolean;
}

const AIInsights: React.FC = () => {
  const { token } = useAuth();
  const { boards, loading: loadingBoards } = useBoards();
  const { isMobile, isTablet } = useResponsive();
  
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [boardOptions, setBoardOptions] = useState<BoardOption[]>([]);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<boolean>(false);
  const [appliedToast, setAppliedToast] = useState<boolean>(false);

  // Transform boards into dropdown options
  useEffect(() => {
    if (boards && boards.length > 0) {
      const options = boards.map(board => ({
        value: board.id,
        label: board.name
      }));
      
      setBoardOptions(options);
      
      // Auto-select first board if available
      if (options.length > 0 && !selectedBoard) {
        setSelectedBoard(options[0].value);
      }
    }
  }, [boards, selectedBoard]);

  // Handle board selection
  const handleBoardChange = (option: BoardOption | null) => {
    if (option) {
      setSelectedBoard(option.value);
      // Reset analysis results when board changes
      setReport(null);
      setRecommendations([]);
    }
  };

  // Fetch AI insights
  const fetchAIInsights = async () => {
    if (!selectedBoard || !token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const analysisService = new WorkflowAnalysisService();
      
      // Fetch performance report
      const performanceReport = await analysisService.generatePerformanceReport(selectedBoard);
      setReport(performanceReport);
      
      // Generate recommendations from report
      const generatedRecommendations: Recommendation[] = [];
      
      // Add recommendations from issues
      performanceReport.issues.forEach((issue, index) => {
        issue.recommendations.forEach((rec, recIndex) => {
          generatedRecommendations.push({
            id: `issue-${index}-${recIndex}`,
            title: `${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)} Improvement`,
            description: rec,
            impact: issue.impact,
            effort: issue.severity === 'high' ? 'high' : issue.severity === 'medium' ? 'medium' : 'low',
            category: issue.type,
            applied: false
          });
        });
      });
      
      // Add recommendations from bottlenecks
      performanceReport.bottlenecks.forEach((bottleneck, index) => {
        bottleneck.suggestions.forEach((suggestion, sugIndex) => {
          generatedRecommendations.push({
            id: `bottleneck-${index}-${sugIndex}`,
            title: `Resolve "${bottleneck.name}" Bottleneck`,
            description: suggestion,
            impact: `Reduce average time in "${bottleneck.name}" status (currently ${bottleneck.averageTime.toFixed(1)} days)`,
            effort: bottleneck.severity,
            category: 'bottleneck',
            applied: false
          });
        });
      });
      
      // Add general improvement opportunities
      performanceReport.improvementOpportunities.forEach((opportunity, index) => {
        generatedRecommendations.push({
          id: `opportunity-${index}`,
          title: 'Process Improvement',
          description: opportunity,
          impact: 'Improve overall workflow efficiency',
          effort: 'medium',
          category: 'process',
          applied: false
        });
      });
      
      setRecommendations(generatedRecommendations);
      
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      
    } catch (err: unknown) {
      console.error('Error generating AI insights:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI insights';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle applying a recommendation
  const handleApplyRecommendation = (id: string) => {
    setRecommendations(prevRecs => 
      prevRecs.map(rec => 
        rec.id === id ? { ...rec, applied: true } : rec
      )
    );
    
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 3000);
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bottleneck':
        return Status;
      case 'efficiency':
        return Bolt;
      case 'process':
        return Time;
      case 'resource':
        return Board;
      default:
        return Info;
    }
  };

  // Get effort label and color
  const getEffortInfo = (effort: string) => {
    switch (effort) {
      case 'low':
        return { label: 'Low Effort', color: 'var(--positive-color)' };
      case 'medium':
        return { label: 'Medium Effort', color: 'var(--primary-color)' };
      case 'high':
        return { label: 'High Effort', color: 'var(--negative-color)' };
      default:
        return { label: 'Unknown Effort', color: 'var(--primary-color)' };
    }
  };

  // Render loading state
  if (loadingBoards) {
    return (
      <Box className="loading-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <Loader />
        <Text>Loading boards...</Text>
      </Box>
    );
  }

  return (
    <Box className="workflow-analysis">
      <div style={{ marginBottom: '24px' }}>
        <Heading value="AI-Powered Workflow Insights" />
      </div>
      
      {/* Board selector */}
      <Box className="board-selector">
        <div style={{ marginBottom: '16px' }}>
          <Heading value="Select a Board for AI Analysis" />
        </div>
        
        <Flex gap={16} style={{ flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <Box className="board-dropdown">
            <Dropdown
              placeholder="Select a board"
              options={boardOptions}
              onChange={handleBoardChange}
              value={boardOptions.find(option => option.value === selectedBoard) || null}
            />
          </Box>
          
          <Button
            onClick={fetchAIInsights}
            disabled={!selectedBoard || loading}
            loading={loading}
            leftIcon={Idea}
          >
            {loading ? 'Analyzing...' : 'Generate AI Insights'}
          </Button>
        </Flex>
      </Box>
      
      {/* Error message */}
      {error && (
        <Box className="error-message" style={{ padding: '16px', backgroundColor: 'var(--negative-color-selected)', borderRadius: '8px', marginBottom: '24px' }}>
          <Text style={{ color: 'var(--negative-color)' }}>Error: {error}</Text>
        </Box>
      )}
      
      {/* Success toast */}
      {successToast && (
        <Toast
          open={successToast}
          onClose={() => setSuccessToast(false)}
          className="success-toast"
        >
          AI analysis completed successfully!
        </Toast>
      )}
      
      {/* Applied toast */}
      {appliedToast && (
        <Toast
          open={appliedToast}
          onClose={() => setAppliedToast(false)}
          className="success-toast"
        >
          Recommendation applied successfully!
        </Toast>
      )}
      
      {/* AI Insights */}
      {report && (
        <Box className="analysis-results">
          {/* Natural language summary */}
          <Box className="ai-insights" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Flex gap={8} style={{ alignItems: 'center' }}>
                <Icon icon={Idea} />
                <Heading value="Workflow Analysis Summary" />
              </Flex>
            </div>
            
            <Box style={{ marginBottom: '24px' }}>
              <Text>
                Your workflow "{report.boardName}" has a performance score of <strong>{report.performanceScore}/100</strong>.
                The average cycle time is <strong>{report.metrics.averageCycleTime.toFixed(1)} days</strong> with a throughput of <strong>{report.metrics.throughput.toFixed(1)} items per week</strong>.
              </Text>
              
              <div style={{ margin: '16px 0' }}>
                <Text>
                  {report.bottlenecks.length > 0 ? (
                    <>
                      We've identified {report.bottlenecks.length} bottleneck{report.bottlenecks.length > 1 ? 's' : ''} in your workflow, 
                      with the most severe being in the "{report.bottlenecks[0].name}" status where items spend an average of {report.bottlenecks[0].averageTime.toFixed(1)} days.
                    </>
                  ) : (
                    <>
                      No significant bottlenecks were detected in your workflow.
                    </>
                  )}
                </Text>
              </div>
              
              <div style={{ margin: '16px 0' }}>
                <Text>
                  Your workflow's flow efficiency is {(report.metrics.efficiency.flowEfficiency * 100).toFixed(1)}%, 
                  which means that {(report.metrics.efficiency.flowEfficiency * 100).toFixed(1)}% of the total cycle time is spent on value-adding activities.
                  {report.metrics.efficiency.flowEfficiency < 0.4 ? (
                    ' This is below the recommended threshold of 40% and represents an opportunity for improvement.'
                  ) : report.metrics.efficiency.flowEfficiency < 0.6 ? (
                    ' This is within the average range, but there is still room for improvement.'
                  ) : (
                    ' This is above average, indicating a well-optimized workflow.'
                  )}
                </Text>
              </div>
              
              <div style={{ margin: '16px 0' }}>
                <Text>
                  {report.metrics.efficiency.blockedPercentage > 0.2 ? (
                    <>
                      Currently, {(report.metrics.efficiency.blockedPercentage * 100).toFixed(1)}% of your in-progress items are blocked, 
                      which is negatively impacting your throughput and cycle time.
                    </>
                  ) : (
                    <>
                      Only {(report.metrics.efficiency.blockedPercentage * 100).toFixed(1)}% of your in-progress items are blocked, 
                      which is a positive indicator of workflow health.
                    </>
                  )}
                </Text>
              </div>
            </Box>
          </Box>
          
          {/* Actionable recommendation cards */}
          <Box style={{ padding: '0 24px 24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Heading value="Actionable Recommendations" />
            </div>
            
            {recommendations.length > 0 ? (
              <Flex gap={24} style={{ flexWrap: 'wrap' }}>
                {recommendations.map(recommendation => (
                  <Box 
                    key={recommendation.id} 
                    className={`insight-card ${recommendation.category}`}
                    style={{ 
                      flex: '1 0 300px',
                      maxWidth: '100%',
                      padding: '16px',
                      marginBottom: '16px',
                      backgroundColor: 'var(--primary-background-color)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      borderLeft: `4px solid ${
                        recommendation.category === 'bottleneck' ? 'var(--negative-color)' :
                        recommendation.category === 'efficiency' ? 'var(--positive-color)' :
                        recommendation.category === 'process' ? 'var(--primary-color)' :
                        'var(--info-color)'
                      }`,
                      opacity: recommendation.applied ? 0.7 : 1
                    }}
                  >
                    <Flex gap={8} style={{ alignItems: 'center', marginBottom: '12px' }}>
                      <Icon icon={getCategoryIcon(recommendation.category)} />
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                        {recommendation.title}
                      </div>
                      {recommendation.applied && (
                        <div style={{ marginLeft: 'auto', color: 'var(--positive-color)' }}>
                          <Icon icon={Check} />
                        </div>
                      )}
                    </Flex>
                    
                    <Text style={{ marginBottom: '16px' }}>
                      {recommendation.description}
                    </Text>
                    
                    {/* Why it matters */}
                    <Box style={{ 
                      padding: '12px', 
                      backgroundColor: 'var(--primary-selected-color)', 
                      borderRadius: '4px',
                      marginBottom: '16px'
                    }}>
                      <Flex gap={8} style={{ alignItems: 'flex-start' }}>
                        <Icon icon={Info} style={{ marginTop: '2px' }} />
                        <div>
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Why it matters:</div>
                          <Text>{recommendation.impact}</Text>
                        </div>
                      </Flex>
                    </Box>
                    
                    <Flex gap={8} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        backgroundColor: 'var(--primary-background-hover-color)',
                        color: getEffortInfo(recommendation.effort).color,
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {getEffortInfo(recommendation.effort).label}
                      </div>
                      
                      {!recommendation.applied && (
                        <Button
                          size="small"
                          onClick={() => handleApplyRecommendation(recommendation.id)}
                          leftIcon={ThumbsUp}
                        >
                          Apply Recommendation
                        </Button>
                      )}
                    </Flex>
                  </Box>
                ))}
              </Flex>
            ) : (
              <Text>No recommendations available. Run the analysis to generate recommendations.</Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AIInsights;