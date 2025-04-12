import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { WorkflowAnalysisService } from '../../services/analysis/workflowAnalysisService';
import { WorkflowMetrics, Bottleneck } from '../../types/analysisTypes';
import {
  Box,
  Flex,
  Heading,
  Text,
  Loader,
  Button,
  Dropdown,
  Divider,
  Toast
} from 'monday-ui-react-core';
import {
  Status,
  Time,
  Board,
  Warning,
  Bolt,
  Update,
  Calendar
} from 'monday-ui-react-core/icons';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useBoards } from '../../hooks/useBoards';
import { useResponsive } from '../../hooks/useResponsive';

interface BoardOption {
  value: string;
  label: string;
}

const AnalysisDashboard: React.FC = () => {
  const { token } = useAuth();
  const { boards, loading: loadingBoards } = useBoards();
  const { isMobile, isTablet } = useResponsive();
  
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [boardOptions, setBoardOptions] = useState<BoardOption[]>([]);
  const [metrics, setMetrics] = useState<WorkflowMetrics | null>(null);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<boolean>(false);

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
      setMetrics(null);
      setBottlenecks([]);
    }
  };

  // Fetch metrics and bottlenecks
  const fetchAnalysisData = async () => {
    if (!selectedBoard || !token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const analysisService = new WorkflowAnalysisService();
      
      // Fetch metrics
      const workflowMetrics = await analysisService.generateWorkflowMetrics(selectedBoard);
      setMetrics(workflowMetrics);
      
      // Fetch bottlenecks
      const workflowBottlenecks = await analysisService.identifyBottlenecks(selectedBoard);
      setBottlenecks(workflowBottlenecks);
      
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      
    } catch (err: unknown) {
      console.error('Error analyzing workflow:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze workflow';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Format data for cycle time chart
  const formatCycleTimeData = () => {
    if (!metrics) return [];
    return metrics.trends.cycleTime.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: parseFloat(item.value.toFixed(1))
    }));
  };

  // Format data for throughput chart
  const formatThroughputData = () => {
    if (!metrics) return [];
    return metrics.trends.throughput.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(item.value)
    }));
  };

  // Format data for WIP chart
  const formatWipData = () => {
    if (!metrics) return [];
    return metrics.trends.wip.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(item.value)
    }));
  };

  // Get severity color for bottlenecks
  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'var(--negative-color)';
      case 'medium':
        return 'var(--warning-color)';
      case 'low':
        return 'var(--info-color)';
      default:
        return 'var(--primary-color)';
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
        <Heading value="Workflow Analysis Dashboard" />
      </div>
      
      {/* Board selector */}
      <Box className="board-selector">
        <div style={{ marginBottom: '16px' }}>
          <Heading value="Select a Board to Analyze" />
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
            onClick={fetchAnalysisData}
            disabled={!selectedBoard || loading}
            loading={loading}
            leftIcon={Bolt}
          >
            {loading ? 'Analyzing...' : 'Analyze Workflow'}
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
          Analysis completed successfully!
        </Toast>
      )}
      
      {/* Metrics overview */}
      {metrics && (
        <Box className="analysis-results">
          <div style={{ marginBottom: '24px', padding: '0 24px' }}>
            <Heading value="Key Performance Indicators" />
          </div>
          
          <Flex gap={24} style={{ padding: '0 24px 24px', flexWrap: 'wrap' }}>
            <Box className="metric-card">
              <Flex gap={8} style={{ alignItems: 'center' }}>
                <Update size="24" />
                <div style={{ fontWeight: 'bold' }}>Work in Progress</div>
              </Flex>
              <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0', color: 'var(--primary-color)' }}>
                {metrics.wipCount}
              </div>
              <Text>items currently in progress</Text>
            </Box>
            
            <Box className="metric-card">
              <Flex gap={8} style={{ alignItems: 'center' }}>
                <Warning size="24" />
                <div style={{ fontWeight: 'bold' }}>Blocked Items</div>
              </Flex>
              <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0', color: 'var(--primary-color)' }}>
                {Math.round(metrics.wipCount * metrics.efficiency.blockedPercentage)}
              </div>
              <Text>{(metrics.efficiency.blockedPercentage * 100).toFixed(1)}% of items blocked</Text>
            </Box>
            
            <Box className="metric-card">
              <Flex gap={8} style={{ alignItems: 'center' }}>
                <Calendar size="24" />
                <div style={{ fontWeight: 'bold' }}>Avg. Cycle Time</div>
              </Flex>
              <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0', color: 'var(--primary-color)' }}>
                {metrics.averageCycleTime.toFixed(1)} days
              </div>
              <Text>from start to completion</Text>
            </Box>
            
            <Box className="metric-card">
              <Flex gap={8} style={{ alignItems: 'center' }}>
                <Time size="24" />
                <div style={{ fontWeight: 'bold' }}>Throughput</div>
              </Flex>
              <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0', color: 'var(--primary-color)' }}>
                {metrics.throughput.toFixed(1)}
              </div>
              <Text>items per week</Text>
            </Box>
          </Flex>
          
          {/* Cycle time visualization */}
          <Box style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Heading value="Cycle Time Trend" />
            </div>
            
            <Box style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={formatCycleTimeData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name="Cycle Time (days)" 
                    stroke="var(--primary-color)" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
          
          {/* Throughput analysis */}
          <Box style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Heading value="Throughput Analysis" />
            </div>
            
            <Box style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={formatThroughputData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Items per week', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    name="Throughput" 
                    fill="var(--positive-color)" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
          
          {/* Bottleneck identification */}
          <Box style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Heading value="Bottleneck Identification" />
            </div>
            
            {bottlenecks.length > 0 ? (
              <Box>
                <Text style={{ marginBottom: '16px' }}>
                  Statuses with the highest number of items and longest stagnation times:
                </Text>
                
                {bottlenecks.map((bottleneck, index) => (
                  <Box 
                    key={bottleneck.id} 
                    className={`bottleneck-item ${
                      bottleneck.severity === 'high' ? 'critical' : 
                      bottleneck.severity === 'medium' ? 'warning' : 'normal'
                    }`}
                  >
                    <Flex gap={8} style={{ marginBottom: '8px', alignItems: 'center' }}>
                      <div style={{ fontWeight: 'bold' }}>{bottleneck.name}</div>
                      <Text>
                        ({bottleneck.itemCount} items, avg. {bottleneck.averageTime.toFixed(1)} days)
                      </Text>
                    </Flex>
                    
                    <div className="progress-bar-container" style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color-light)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        className="progress-bar" 
                        style={{ 
                          width: `${(bottleneck.averageTime / Math.max(...bottlenecks.map(b => b.averageTime))) * 100}%`, 
                          height: '100%', 
                          backgroundColor: getSeverityColor(bottleneck.severity),
                          borderRadius: '4px'
                        }} 
                      />
                    </div>
                    
                    <Box style={{ marginTop: '8px' }}>
                      <Text style={{ fontStyle: 'italic', fontSize: '14px' }}>
                        {bottleneck.suggestions[0]}
                      </Text>
                    </Box>
                    
                    {index < bottlenecks.length - 1 && (
                      <div style={{ margin: '16px 0', height: '1px', backgroundColor: 'var(--border-color-light)' }} />
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Text>No significant bottlenecks detected.</Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AnalysisDashboard;