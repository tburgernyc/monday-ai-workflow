import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { WorkflowAnalysisService, WorkflowMetrics, HistoricalData } from '../../services/analysis/workflowAnalysis';
import { BoardService } from '../../services/api/boardService';
import {
  Box,
  Flex,
  Heading,
  Text,
  Loader,
  Button,
  Dropdown,
  LinearProgressBar,
  Divider
} from 'monday-ui-react-core';
import { Board, Status, Group, Time } from 'monday-ui-react-core/icons';

// Define types for component state
interface BoardOption {
  value: string;
  label: string;
}

interface AnalysisTab {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const WorkflowAnalysis: React.FC = () => {
  const { token } = useAuth();
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [boardOptions, setBoardOptions] = useState<BoardOption[]>([]);
  const [analysisResults, setAnalysisResults] = useState<WorkflowMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[] | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Analysis tabs
  const analysisTabs: AnalysisTab[] = [
    { id: 'metrics', title: 'Metrics', icon: <Status /> },
    { id: 'bottlenecks', title: 'Bottlenecks', icon: <Group /> },
    { id: 'trends', title: 'Trends', icon: <Time /> },
    { id: 'ai-insights', title: 'AI Insights', icon: <Board /> }
  ];

  // Fetch boards on component mount
  useEffect(() => {
    const fetchBoards = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const boards = await BoardService.getAll();
        
        // Transform boards into dropdown options
        const options = boards.map(board => ({
          value: board.id,
          label: board.name
        }));
        
        setBoardOptions(options);
        
        // Auto-select first board if available
        if (options.length > 0 && !selectedBoard) {
          setSelectedBoard(options[0].value);
        }
      } catch (err: unknown) {
        console.error('Error fetching boards:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load boards. Please try again.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBoards();
  }, [token, selectedBoard]);

  // Handle board selection
  const handleBoardChange = (option: BoardOption | null) => {
    if (option) {
      setSelectedBoard(option.value);
      // Reset analysis results when board changes
      setAnalysisResults(null);
      setHistoricalData(null);
      setAiAnalysis(null);
    }
  };

  // Handle analyze workflow
  const handleAnalyzeWorkflow = async () => {
    if (!selectedBoard || !token) return;
    
    try {
      setAnalyzing(true);
      setError(null);
      
      // Fetch metrics
      const metrics = await WorkflowAnalysisService.calculateMetrics(selectedBoard);
      setAnalysisResults(metrics);
      
      // Fetch historical data
      const history = await WorkflowAnalysisService.getHistoricalData(selectedBoard);
      setHistoricalData(history);
      
      // Get AI analysis (optional - can be resource intensive)
      try {
        const aiInsights = await WorkflowAnalysisService.getAIAnalysis(selectedBoard);
        setAiAnalysis(aiInsights.summary);
      } catch (aiErr) {
        console.warn('AI analysis failed, but continuing with other metrics:', aiErr);
        setAiAnalysis('AI analysis is currently unavailable. Please try again later.');
      }
      
    } catch (err: unknown) {
      console.error('Error analyzing workflow:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze workflow';
      setError(errorMessage);
      setAnalysisResults(null);
      setHistoricalData(null);
      setAiAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Box className="loading-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <Loader size={Loader.sizes.LARGE} />
        <Text style={{ marginTop: '16px' }}>Loading boards...</Text>
      </Box>
    );
  }

  return (
    <Box className="workflow-analysis" style={{ padding: '24px' }}>
      <Heading element="h1" style={{ marginBottom: '24px' }}>Workflow Analysis</Heading>
      
      <Box className="board-selector" style={{ marginBottom: '32px', padding: '24px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px' }}>
        <Heading element="h2" style={{ marginBottom: '16px' }}>Select a Board to Analyze</Heading>
        
        <Flex gap={16} align="center">
          <Box style={{ width: '300px' }}>
            <Dropdown
              placeholder="Select a board"
              options={boardOptions}
              onChange={handleBoardChange}
              value={boardOptions.find(option => option.value === selectedBoard) || null}
              className="board-dropdown"
            />
          </Box>
          
          <Button
            onClick={handleAnalyzeWorkflow}
            disabled={!selectedBoard || analyzing}
          >
            {analyzing ? 'Analyzing...' : 'Analyze Workflow'}
          </Button>
        </Flex>
      </Box>
      
      {error && (
        <Box className="error-message" style={{ padding: '16px', backgroundColor: 'var(--negative-color-selected)', borderRadius: '8px', marginBottom: '24px' }}>
          <Text style={{ color: 'var(--negative-color)' }}>Error: {error}</Text>
        </Box>
      )}
      
      {analysisResults && (
        <Box className="analysis-results">
          <Heading element="h2" style={{ marginBottom: '16px' }}>Analysis Results</Heading>
          
          {/* Custom Tab Navigation */}
          <Box className="custom-tabs">
            {/* Tab Headers */}
            <Flex className="tab-headers" style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
              {analysisTabs.map((tab, index) => (
                <Button
                  key={tab.id}
                  leftIcon={tab.icon}
                  kind={activeTab === index ? "primary" : "tertiary"}
                  onClick={() => setActiveTab(index)}
                  style={{
                    marginRight: '8px',
                    borderRadius: '4px 4px 0 0',
                    borderBottom: activeTab === index ? '2px solid var(--primary-color)' : 'none'
                  }}
                >
                  {tab.title}
                </Button>
              ))}
            </Flex>
            
            {/* Tab Content */}
            <Box className="tab-content">
              {/* Metrics Tab */}
              {activeTab === 0 && (
                <Box style={{ padding: '24px' }}>
                  <Flex gap={24} wrap>
                    <Box className="metric-card" style={{ padding: '16px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px', flex: '1 0 200px' }}>
                      <Text style={{ fontWeight: 'bold' }}>Work in Progress</Text>
                      <Heading element="h3">{analysisResults.wip}</Heading>
                      <Text>items currently in progress</Text>
                    </Box>
                    
                    <Box className="metric-card" style={{ padding: '16px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px', flex: '1 0 200px' }}>
                      <Text style={{ fontWeight: 'bold' }}>Blocked Items</Text>
                      <Heading element="h3">{analysisResults.blockedItems}</Heading>
                      <Text>items currently blocked</Text>
                    </Box>
                    
                    <Box className="metric-card" style={{ padding: '16px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px', flex: '1 0 200px' }}>
                      <Text style={{ fontWeight: 'bold' }}>Avg. Cycle Time</Text>
                      <Heading element="h3">{analysisResults.averageCycleTime} days</Heading>
                      <Text>from start to completion</Text>
                    </Box>
                    
                    <Box className="metric-card" style={{ padding: '16px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px', flex: '1 0 200px' }}>
                      <Text style={{ fontWeight: 'bold' }}>Throughput</Text>
                      <Heading element="h3">{analysisResults.throughput}</Heading>
                      <Text>items per week</Text>
                    </Box>
                  </Flex>
                </Box>
              )}
              
              {/* Bottlenecks Tab */}
              {activeTab === 1 && (
                <Box style={{ padding: '24px' }}>
                  <Text style={{ marginBottom: '16px' }}>Groups with the highest number of items and longest stagnation times:</Text>
                  
                  {analysisResults.bottlenecks.map((bottleneck, index) => (
                    <Box key={bottleneck.groupId} style={{ marginBottom: '16px' }}>
                      <Flex align="center" gap={8} style={{ marginBottom: '8px' }}>
                        <Text style={{ fontWeight: 'bold' }}>{bottleneck.groupName}</Text>
                        <Text>({bottleneck.count} items, avg. {bottleneck.stagnation.toFixed(1)} days)</Text>
                      </Flex>
                      
                      <LinearProgressBar
                        value={(bottleneck.count / Math.max(...analysisResults.bottlenecks.map(b => b.count))) * 100}
                        indicateProgress
                        barStyle={index === 0 ? { backgroundColor: 'var(--negative-color)' } : {}}
                      />
                      
                      {index < analysisResults.bottlenecks.length - 1 && <Divider style={{ margin: '16px 0' }} />}
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* Trends Tab */}
              {activeTab === 2 && (
                <Box style={{ padding: '24px' }}>
                  {historicalData ? (
                    <div>
                      <Text style={{ marginBottom: '16px' }}>Historical performance over the last {historicalData.length} weeks:</Text>
                      
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Period</th>
                            <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Throughput</th>
                            <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Cycle Time (days)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historicalData.map((period, index) => (
                            <tr key={index}>
                              <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color-light)' }}>{period.period}</td>
                              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border-color-light)' }}>{period.throughput}</td>
                              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border-color-light)' }}>{period.cycleTime}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Text>No historical data available.</Text>
                  )}
                </Box>
              )}
              
              {/* AI Insights Tab */}
              {activeTab === 3 && (
                <Box style={{ padding: '24px' }}>
                  {aiAnalysis ? (
                    <div>
                      <Text style={{ marginBottom: '16px', fontWeight: 'bold' }}>AI-Generated Workflow Insights:</Text>
                      <Text style={{ whiteSpace: 'pre-line' }}>{aiAnalysis}</Text>
                    </div>
                  ) : (
                    <Text>AI analysis not available. Run the analysis to generate AI insights.</Text>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default WorkflowAnalysis;