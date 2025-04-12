import React, { useEffect, useState } from 'react';
import '../assets/styles/workflowAnalysis.css';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { WorkflowAnalysisService } from '../services/analysis/workflowAnalysisService';
import { 
  WorkflowMetrics, 
  Bottleneck, 
  PerformanceReport 
} from '../types/analysisTypes';

/**
 * Example component demonstrating the usage of WorkflowAnalysisService
 */
const WorkflowAnalysisExample: React.FC = () => {
  const [boardId, setBoardId] = useState<string>('123456789'); // Replace with actual board ID
  const [metrics, setMetrics] = useState<WorkflowMetrics | null>(null);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize the service
        const workflowAnalysisService = new WorkflowAnalysisService();

        // Get workflow metrics
        const metricsData = await workflowAnalysisService.generateWorkflowMetrics(boardId);
        setMetrics(metricsData);

        // Identify bottlenecks
        const bottlenecksData = await workflowAnalysisService.identifyBottlenecks(boardId);
        setBottlenecks(bottlenecksData);

        // Generate performance report
        const reportData = await workflowAnalysisService.generatePerformanceReport(boardId);
        setReport(reportData);

        setLoading(false);
      } catch (err) {
        setError(`Error fetching workflow analysis data: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };

    fetchData();
  }, [boardId]);

  if (loading) {
    return <div>Loading workflow analysis data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="workflow-analysis-example">
      <h1>Workflow Analysis Dashboard</h1>
      
      {/* Performance Score */}
      {report && (
        <div className="performance-score-container">
          <h2>Performance Score</h2>
          <div className="score-circle" style={{ 
            backgroundColor: `rgba(${255 - report.performanceScore * 2.55}, ${report.performanceScore * 2.55}, 0, 0.8)` 
          }}>
            <span className="score-value">{report.performanceScore}</span>
          </div>
          <div className="score-label">
            {report.performanceScore >= 80 ? 'Excellent' : 
             report.performanceScore >= 60 ? 'Good' : 
             report.performanceScore >= 40 ? 'Average' : 
             report.performanceScore >= 20 ? 'Poor' : 'Critical'}
          </div>
        </div>
      )}

      {/* Cycle Time Trend */}
      {metrics && (
        <div className="chart-container">
          <h2>Cycle Time Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={metrics.trends.cycleTime}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                formatter={(value) => [`${Number(value).toFixed(1)} days`, 'Cycle Time']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                name="Cycle Time" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Throughput Trend */}
      {metrics && (
        <div className="chart-container">
          <h2>Throughput Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={metrics.trends.throughput}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <YAxis label={{ value: 'Items/Week', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                formatter={(value) => [`${Number(value).toFixed(1)} items/week`, 'Throughput']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                name="Throughput" 
                stroke="#00C49F" 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <div className="chart-container">
          <h2>Bottlenecks</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={bottlenecks}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: 'Avg. Days', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value, name, props) => {
                  if (name === 'averageTime') return [`${Number(value).toFixed(1)} days`, 'Average Time'];
                  if (name === 'itemCount') return [value, 'Item Count'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar 
                dataKey="averageTime" 
                name="Average Time (days)" 
                fill="#FF8042"
              >
                {bottlenecks.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.severity === 'high' ? '#FF0000' : 
                          entry.severity === 'medium' ? '#FFBB28' : 
                          '#00C49F'} 
                  />
                ))}
              </Bar>
              <Bar dataKey="itemCount" name="Item Count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Efficiency Metrics */}
      {metrics && (
        <div className="chart-container">
          <h2>Efficiency Metrics</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Flow Efficiency', value: metrics.efficiency.flowEfficiency * 100 },
                  { name: 'On-Time Completion', value: metrics.efficiency.onTimeCompletion * 100 },
                  { name: 'Non-Blocked Items', value: (1 - metrics.efficiency.blockedPercentage) * 100 }
                ]}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
              >
                {[0, 1, 2].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Issues and Recommendations */}
      {report && (
        <div className="issues-container">
          <h2>Issues and Recommendations</h2>
          <div className="issues-list">
            {report.issues.map((issue, index) => (
              <div 
                key={index} 
                className={`issue-card ${issue.severity}`}
              >
                <h3>{issue.description}</h3>
                <p><strong>Impact:</strong> {issue.impact}</p>
                <p><strong>Recommendations:</strong></p>
                <ul>
                  {issue.recommendations.map((rec, recIndex) => (
                    <li key={recIndex}>{rec}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Opportunities */}
      {report && (
        <div className="opportunities-container">
          <h2>Improvement Opportunities</h2>
          <ul className="opportunities-list">
            {report.improvementOpportunities.map((opportunity, index) => (
              <li key={index} className="opportunity-item">{opportunity}</li>
            ))}
          </ul>
        </div>
      )}

      {/* CSS styles are defined in a separate CSS file or using a CSS-in-JS library */}
    </div>
  );
};

export default WorkflowAnalysisExample;