import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { WorkflowAnalysisService } from '../../services/analysis/workflowAnalysisService';
import { WorkflowComparisonResult } from '../../types/analysisTypes';
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
  Checkbox,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell
} from 'monday-ui-react-core';
import { 
  Status, 
  Time, 
  Board, 
  Duplicate,
  Bolt, 
  Update, 
  Calendar
} from 'monday-ui-react-core/icons';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useBoards } from '../../hooks/useBoards';
import { useResponsive } from '../../hooks/useResponsive';

interface BoardOption {
  value: string;
  label: string;
}

const ComparativeAnalysis: React.FC = () => {
  const { token } = useAuth();
  const { boards, loading: loadingBoards } = useBoards();
  const { isMobile, isTablet } = useResponsive();
  
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);
  const [boardOptions, setBoardOptions] = useState<BoardOption[]>([]);
  const [comparisonResult, setComparisonResult] = useState<WorkflowComparisonResult | null>(null);
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
      
      // Auto-select first two boards if available
      if (options.length >= 2 && selectedBoards.length === 0) {
        setSelectedBoards([options[0].value, options[1].value]);
      }
    }
  }, [boards, selectedBoards.length]);

  // Handle board selection
  const handleBoardToggle = (boardId: string) => {
    if (selectedBoards.includes(boardId)) {
      setSelectedBoards(selectedBoards.filter(id => id !== boardId));
    } else {
      setSelectedBoards([...selectedBoards, boardId]);
    }
  };

  // Fetch comparison data
  const fetchComparisonData = async () => {
    if (selectedBoards.length < 2 || !token) {
      setError("Please select at least two boards to compare");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const analysisService = new WorkflowAnalysisService();
      
      // Fetch comparison data
      const result = await analysisService.compareWorkflows(selectedBoards);
      setComparisonResult(result);
      
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      
    } catch (err: unknown) {
      console.error('Error comparing workflows:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to compare workflows';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Format data for timeline comparison
  const formatTimelineData = () => {
    if (!comparisonResult) return [];
    
    // Create data for each workflow's cycle time trend
    const timelineData: any[] = [];
    
    comparisonResult.workflows.forEach(workflow => {
      workflow.metrics.trends.cycleTime.forEach(point => {
        const existingPoint = timelineData.find(p => p.date === new Date(point.date).toLocaleDateString());
        
        if (existingPoint) {
          existingPoint[workflow.boardName] = point.value;
        } else {
          const newPoint: any = {
            date: new Date(point.date).toLocaleDateString(),
            [workflow.boardName]: point.value
          };
          timelineData.push(newPoint);
        }
      });
    });
    
    return timelineData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Format data for efficiency scoring
  const formatEfficiencyData = () => {
    if (!comparisonResult) return [];
    
    return comparisonResult.workflows.map(workflow => ({
      name: workflow.boardName,
      cycleTime: workflow.metrics.averageCycleTime,
      throughput: workflow.metrics.throughput,
      flowEfficiency: workflow.metrics.efficiency.flowEfficiency * 100,
      onTimeCompletion: workflow.metrics.efficiency.onTimeCompletion * 100,
      blockedPercentage: workflow.metrics.efficiency.blockedPercentage * 100
    }));
  };

  // Format data for radar chart
  const formatRadarData = () => {
    if (!comparisonResult) return [];
    
    const maxCycleTime = Math.max(...comparisonResult.workflows.map(w => w.metrics.averageCycleTime));
    const maxThroughput = Math.max(...comparisonResult.workflows.map(w => w.metrics.throughput));
    const maxWip = Math.max(...comparisonResult.workflows.map(w => w.metrics.wipCount));
    
    return comparisonResult.workflows.map(workflow => ({
      name: workflow.boardName,
      // Normalize values to 0-100 scale for radar chart
      "Cycle Time (inv)": 100 - ((workflow.metrics.averageCycleTime / maxCycleTime) * 100),
      "Throughput": (workflow.metrics.throughput / maxThroughput) * 100,
      "Flow Efficiency": workflow.metrics.efficiency.flowEfficiency * 100,
      "On-time Completion": workflow.metrics.efficiency.onTimeCompletion * 100,
      "WIP Control": 100 - ((workflow.metrics.wipCount / maxWip) * 100)
    }));
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
        <Heading value="Comparative Workflow Analysis" />
      </div>
      
      {/* Board selector */}
      <Box className="board-selector">
        <div style={{ marginBottom: '16px' }}>
          <Heading value="Select Boards to Compare" />
        </div>
        
        <Box style={{ marginBottom: '16px' }}>
          <Text>Select at least two boards to compare their workflow efficiency:</Text>
          
          <Flex gap={16} style={{ flexWrap: 'wrap', marginTop: '16px' }}>
            {boardOptions.map(board => (
              <Checkbox
                key={board.value}
                label={board.label}
                checked={selectedBoards.includes(board.value)}
                onChange={() => handleBoardToggle(board.value)}
              />
            ))}
          </Flex>
        </Box>
        
        <Button
          onClick={fetchComparisonData}
          disabled={selectedBoards.length < 2 || loading}
          loading={loading}
          leftIcon={Duplicate}
        >
          {loading ? 'Comparing...' : 'Compare Workflows'}
        </Button>
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
          Comparison completed successfully!
        </Toast>
      )}
      
      {/* Comparison results */}
      {comparisonResult && (
        <Box className="analysis-results">
          <div style={{ marginBottom: '24px', padding: '0 24px' }}>
            <Heading value="Workflow Comparison Results" />
          </div>
          
          {/* Efficiency scoring */}
          <Box style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Heading value="Efficiency Scoring" />
            </div>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Workflow</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Cycle Time (days)</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Throughput (items/week)</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Flow Efficiency (%)</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>On-time Completion (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {formatEfficiencyData().map((workflow, index) => (
                    <tr key={index}>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-color-light)' }}>{workflow.name}</td>
                      <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color-light)' }}>{workflow.cycleTime.toFixed(1)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color-light)' }}>{workflow.throughput.toFixed(1)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color-light)' }}>{workflow.flowEfficiency.toFixed(1)}%</td>
                      <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color-light)' }}>{workflow.onTimeCompletion.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <Box style={{ marginTop: '24px' }}>
              <Flex gap={16} style={{ flexWrap: 'wrap' }}>
                <Box className="metric-card" style={{ flex: '1 0 200px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Fastest Workflow</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--positive-color)' }}>
                    {comparisonResult.comparison.fastestWorkflow.boardName}
                  </div>
                  <Text>{comparisonResult.comparison.fastestWorkflow.cycleTime.toFixed(1)} days cycle time</Text>
                </Box>
                
                <Box className="metric-card" style={{ flex: '1 0 200px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Most Efficient Workflow</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--positive-color)' }}>
                    {comparisonResult.comparison.mostEfficientWorkflow.boardName}
                  </div>
                  <Text>{(comparisonResult.comparison.mostEfficientWorkflow.efficiency * 100).toFixed(1)}% flow efficiency</Text>
                </Box>
                
                <Box className="metric-card" style={{ flex: '1 0 200px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Highest Throughput</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--positive-color)' }}>
                    {comparisonResult.comparison.highestThroughputWorkflow.boardName}
                  </div>
                  <Text>{comparisonResult.comparison.highestThroughputWorkflow.throughput.toFixed(1)} items per week</Text>
                </Box>
              </Flex>
            </Box>
          </Box>
          
          {/* Timeline comparison */}
          <Box style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Heading value="Timeline Comparison" />
            </div>
            
            <Box style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={formatTimelineData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Cycle Time (days)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  {comparisonResult && comparisonResult.workflows.map((workflow, index) => (
                    <Line
                      key={workflow.boardId}
                      type="monotone"
                      dataKey={workflow.boardName}
                      stroke={`hsl(${index * 137.5 % 360}, 70%, 50%)`}
                      activeDot={{ r: 8 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
          
          {/* Trend visualization */}
          <Box style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Heading value="Efficiency Radar" />
            </div>
            
            <Box style={{ height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius={150} data={formatRadarData()}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Cycle Time (inv)" dataKey="Cycle Time (inv)" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} />
                  <Radar name="Throughput" dataKey="Throughput" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.2} />
                  <Radar name="Flow Efficiency" dataKey="Flow Efficiency" stroke="#ffc658" fill="#ffc658" fillOpacity={0.2} />
                  <Radar name="On-time Completion" dataKey="On-time Completion" stroke="#ff8042" fill="#ff8042" fillOpacity={0.2} />
                  <Radar name="WIP Control" dataKey="WIP Control" stroke="#0088fe" fill="#0088fe" fillOpacity={0.2} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
            <Text style={{ textAlign: 'center', marginTop: '8px', fontStyle: 'italic' }}>
              Higher values indicate better performance in each category
            </Text>
          </Box>
          
          {/* Recommendations */}
          <Box style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Heading value="Improvement Recommendations" />
            </div>
            
            <Box>
              {comparisonResult && comparisonResult.recommendations.map((recommendation, index) => (
                <Box 
                  key={index} 
                  className="insight-card suggestion"
                  style={{ marginBottom: '16px' }}
                >
                  <Text>{recommendation}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ComparativeAnalysis;