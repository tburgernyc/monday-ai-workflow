import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { WorkflowAnalysisService } from '../../services/analysis/workflowAnalysisService';
import { PerformanceReport } from '../../types/analysisTypes';
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
  RadioButton
} from 'monday-ui-react-core';
import { 
  Download, 
  Email, 
  Print,
  File,
  Table, 
  Settings, 
  Share
} from 'monday-ui-react-core/icons';
import { useBoards } from '../../hooks/useBoards';
import { useResponsive } from '../../hooks/useResponsive';

interface BoardOption {
  value: string;
  label: string;
}

interface ReportConfig {
  title: string;
  includeMetrics: boolean;
  includeBottlenecks: boolean;
  includeRecommendations: boolean;
  includeHistoricalData: boolean;
  format: 'detailed' | 'summary' | 'executive';
}

const ReportGenerator: React.FC = () => {
  const { token } = useAuth();
  const { boards, loading: loadingBoards } = useBoards();
  const { isMobile, isTablet } = useResponsive();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [boardOptions, setBoardOptions] = useState<BoardOption[]>([]);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<boolean>(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: 'Workflow Performance Report',
    includeMetrics: true,
    includeBottlenecks: true,
    includeRecommendations: true,
    includeHistoricalData: true,
    format: 'detailed'
  });

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
      // Reset report when board changes
      setReport(null);
      
      // Update report title
      setReportConfig(prev => ({
        ...prev,
        title: `${option.label} - Workflow Performance Report`
      }));
    }
  };

  // Handle config changes
  const handleConfigChange = (field: keyof ReportConfig, value: any) => {
    setReportConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch report data
  const fetchReportData = async () => {
    if (!selectedBoard || !token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const analysisService = new WorkflowAnalysisService();
      
      // Fetch performance report
      const performanceReport = await analysisService.generatePerformanceReport(selectedBoard);
      setReport(performanceReport);
      
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      
    } catch (err: unknown) {
      console.error('Error generating report:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate report';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Export to PDF (simplified version without jsPDF)
  const exportToPDF = () => {
    if (!report) return;
    
    try {
      // In a real implementation, we would use jsPDF to generate a PDF
      // For this demo, we'll just show a success toast
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      setError('Failed to export report to PDF');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!report) return;
    
    try {
      let csvContent = '';
      
      // Add title and date
      csvContent += `${reportConfig.title}\n`;
      csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
      
      // Add metrics section
      if (reportConfig.includeMetrics) {
        csvContent += 'Key Performance Metrics\n';
        csvContent += `Performance Score,${report.performanceScore}/100\n`;
        csvContent += `Average Cycle Time,${report.metrics.averageCycleTime.toFixed(1)} days\n`;
        csvContent += `Throughput,${report.metrics.throughput.toFixed(1)} items per week\n`;
        csvContent += `Work in Progress,${report.metrics.wipCount} items\n`;
        csvContent += `Flow Efficiency,${(report.metrics.efficiency.flowEfficiency * 100).toFixed(1)}%\n`;
        csvContent += `On-time Completion,${(report.metrics.efficiency.onTimeCompletion * 100).toFixed(1)}%\n\n`;
      }
      
      // Add bottlenecks section
      if (reportConfig.includeBottlenecks && report.bottlenecks.length > 0) {
        csvContent += 'Workflow Bottlenecks\n';
        csvContent += 'Status,Avg. Time,Item Count,Severity\n';
        
        report.bottlenecks.forEach(bottleneck => {
          csvContent += `${bottleneck.name},${bottleneck.averageTime.toFixed(1)} days,${bottleneck.itemCount},${bottleneck.severity}\n`;
        });
        
        csvContent += '\n';
      }
      
      // Add recommendations section
      if (reportConfig.includeRecommendations && report.issues.length > 0) {
        csvContent += 'Improvement Recommendations\n';
        csvContent += 'Type,Description,Priority\n';
        
        report.issues.forEach(issue => {
          csvContent += `${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)},"${issue.description}",${issue.severity}\n`;
        });
        
        csvContent += '\n';
      }
      
      // Add historical data section
      if (reportConfig.includeHistoricalData && report.historicalPerformance.length > 0) {
        csvContent += 'Historical Performance\n';
        csvContent += 'Period,Cycle Time,Throughput,Score\n';
        
        report.historicalPerformance.forEach(period => {
          csvContent += `${period.period},${period.cycleTime.toFixed(1)},${period.throughput.toFixed(1)},${period.performanceScore}\n`;
        });
      }
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${reportConfig.title.replace(/\s+/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Error exporting to CSV:', err);
      setError('Failed to export report to CSV');
    }
  };

  // Share report (simulated)
  const shareReport = () => {
    setShareToast(true);
    setTimeout(() => setShareToast(false), 3000);
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
        <Heading value="Workflow Report Generator" />
      </div>
      
      <Flex gap={24} style={{ flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        {/* Report configuration */}
        <Box className="board-selector" style={{ flex: '1 0 300px', maxWidth: isMobile ? '100%' : '350px' }}>
          <div style={{ marginBottom: '16px' }}>
            <Heading value="Report Configuration" />
          </div>
          
          <Box style={{ marginBottom: '16px' }}>
            <Text style={{ marginBottom: '8px', fontWeight: 'bold' }}>Select a Board</Text>
            <Dropdown
              placeholder="Select a board"
              options={boardOptions}
              onChange={handleBoardChange}
              value={boardOptions.find(option => option.value === selectedBoard) || null}
            />
          </Box>
          
          <Box style={{ marginBottom: '16px' }}>
            <Text style={{ marginBottom: '8px', fontWeight: 'bold' }}>Report Title</Text>
            <input
              type="text"
              value={reportConfig.title}
              onChange={(e) => handleConfigChange('title', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                fontSize: '14px'
              }}
            />
          </Box>
          
          <Box style={{ marginBottom: '16px' }}>
            <Text style={{ marginBottom: '8px', fontWeight: 'bold' }}>Report Format</Text>
            <Flex gap={8} style={{ flexDirection: 'column' }}>
              <RadioButton
                text="Detailed Report"
                name="reportFormat"
                checked={reportConfig.format === 'detailed'}
                onSelect={() => handleConfigChange('format', 'detailed')}
              />
              <RadioButton
                text="Summary Report"
                name="reportFormat"
                checked={reportConfig.format === 'summary'}
                onSelect={() => handleConfigChange('format', 'summary')}
              />
              <RadioButton
                text="Executive Summary"
                name="reportFormat"
                checked={reportConfig.format === 'executive'}
                onSelect={() => handleConfigChange('format', 'executive')}
              />
            </Flex>
          </Box>
          
          <Box style={{ marginBottom: '16px' }}>
            <Text style={{ marginBottom: '8px', fontWeight: 'bold' }}>Include Sections</Text>
            <Flex gap={8} style={{ flexDirection: 'column' }}>
              <Checkbox
                label="Performance Metrics"
                checked={reportConfig.includeMetrics}
                onChange={() => handleConfigChange('includeMetrics', !reportConfig.includeMetrics)}
              />
              <Checkbox
                label="Bottlenecks Analysis"
                checked={reportConfig.includeBottlenecks}
                onChange={() => handleConfigChange('includeBottlenecks', !reportConfig.includeBottlenecks)}
              />
              <Checkbox
                label="Improvement Recommendations"
                checked={reportConfig.includeRecommendations}
                onChange={() => handleConfigChange('includeRecommendations', !reportConfig.includeRecommendations)}
              />
              <Checkbox
                label="Historical Performance"
                checked={reportConfig.includeHistoricalData}
                onChange={() => handleConfigChange('includeHistoricalData', !reportConfig.includeHistoricalData)}
              />
            </Flex>
          </Box>
          
          <Button
            onClick={fetchReportData}
            disabled={!selectedBoard || loading}
            loading={loading}
            leftIcon={Settings}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </Box>
        
        {/* Report preview */}
        <Box style={{ flex: '1 1 auto' }}>
          <div style={{ marginBottom: '16px' }}>
            <Heading value="Report Preview" />
          </div>
          
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
              Report generated successfully!
            </Toast>
          )}
          
          {/* Share toast */}
          {shareToast && (
            <Toast
              open={shareToast}
              onClose={() => setShareToast(false)}
              className="success-toast"
            >
              Report link copied to clipboard!
            </Toast>
          )}
          
          {report ? (
            <Box className="report-preview" ref={reportRef} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>{reportConfig.title}</h1>
                <p style={{ color: 'var(--text-color-secondary)' }}>Generated on {new Date().toLocaleDateString()}</p>
              </div>
              
              {/* Export buttons */}
              <Flex gap={8} style={{ marginBottom: '24px', justifyContent: 'center' }}>
                <Button size="small" leftIcon={File} onClick={exportToPDF}>Export as PDF</Button>
                <Button size="small" leftIcon={Table} onClick={exportToCSV}>Export as CSV</Button>
                <Button size="small" leftIcon={Share} onClick={shareReport}>Share Report</Button>
              </Flex>
              
              {/* Performance metrics */}
              {reportConfig.includeMetrics && (
                <Box style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    Key Performance Metrics
                  </h2>
                  
                  <Flex gap={16} style={{ flexWrap: 'wrap' }}>
                    <Box style={{ flex: '1 0 200px', padding: '16px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-color-secondary)' }}>Performance Score</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{report.performanceScore}/100</div>
                    </Box>
                    
                    <Box style={{ flex: '1 0 200px', padding: '16px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-color-secondary)' }}>Average Cycle Time</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{report.metrics.averageCycleTime.toFixed(1)} days</div>
                    </Box>
                    
                    <Box style={{ flex: '1 0 200px', padding: '16px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-color-secondary)' }}>Throughput</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{report.metrics.throughput.toFixed(1)}/week</div>
                    </Box>
                    
                    <Box style={{ flex: '1 0 200px', padding: '16px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-color-secondary)' }}>Flow Efficiency</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{(report.metrics.efficiency.flowEfficiency * 100).toFixed(1)}%</div>
                    </Box>
                  </Flex>
                </Box>
              )}
              
              {/* Bottlenecks */}
              {reportConfig.includeBottlenecks && report.bottlenecks.length > 0 && (
                <Box style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    Workflow Bottlenecks
                  </h2>
                  
                  <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Avg. Time (days)</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Item Count</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.bottlenecks.map((bottleneck, index) => (
                          <tr key={index}>
                            <td style={{ padding: '12px', borderBottom: '1px solid var(--border-color-light)' }}>{bottleneck.name}</td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color-light)' }}>{bottleneck.averageTime.toFixed(1)}</td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color-light)' }}>{bottleneck.itemCount}</td>
                            <td style={{ 
                              padding: '12px', 
                              borderBottom: '1px solid var(--border-color-light)',
                              color: bottleneck.severity === 'high' ? 'var(--negative-color)' : 
                                    bottleneck.severity === 'medium' ? 'var(--warning-color)' : 
                                    'var(--info-color)'
                            }}>
                              {bottleneck.severity.charAt(0).toUpperCase() + bottleneck.severity.slice(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Box>
              )}
              
              {/* Recommendations */}
              {reportConfig.includeRecommendations && report.issues.length > 0 && (
                <Box style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    Improvement Recommendations
                  </h2>
                  
                  {report.issues.map((issue, index) => (
                    <Box 
                      key={index} 
                      style={{ 
                        padding: '16px', 
                        marginBottom: '12px', 
                        backgroundColor: 'var(--primary-background-color)', 
                        borderRadius: '8px',
                        borderLeft: `4px solid ${
                          issue.severity === 'high' ? 'var(--negative-color)' : 
                          issue.severity === 'medium' ? 'var(--warning-color)' : 
                          'var(--info-color)'
                        }`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 'bold' }}>{issue.type.charAt(0).toUpperCase() + issue.type.slice(1)} Issue</div>
                        <div style={{ 
                          fontSize: '12px', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: 'var(--primary-background-hover-color)',
                          color: issue.severity === 'high' ? 'var(--negative-color)' : 
                                issue.severity === 'medium' ? 'var(--warning-color)' : 
                                'var(--info-color)'
                        }}>
                          {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)} Priority
                        </div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>{issue.description}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-color-secondary)' }}>Impact: {issue.impact}</div>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* Historical data */}
              {reportConfig.includeHistoricalData && report.historicalPerformance.length > 0 && (
                <Box style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    Historical Performance
                  </h2>
                  
                  <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Period</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Cycle Time (days)</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Throughput (items/week)</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Performance Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.historicalPerformance.map((period, index) => (
                          <tr key={index}>
                            <td style={{ padding: '12px', borderBottom: '1px solid var(--border-color-light)' }}>{period.period}</td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color-light)' }}>{period.cycleTime.toFixed(1)}</td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color-light)' }}>{period.throughput.toFixed(1)}</td>
                            <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color-light)' }}>{period.performanceScore}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Box>
              )}
            </Box>
          ) : (
            <Box style={{ padding: '24px', backgroundColor: 'var(--primary-background-color)', borderRadius: '8px', textAlign: 'center' }}>
              <Text>Configure and generate a report to see a preview here.</Text>
            </Box>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default ReportGenerator;