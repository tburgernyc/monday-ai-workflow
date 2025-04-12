import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './Authentication/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import NotificationsContainer from './common/NotificationsContainer';
import Login from './Authentication/Login';
import Dashboard from './Dashboard/Dashboard';
import WorkspaceManagement from './WorkspaceManagement/WorkspaceManagement';
import BoardManagement from './BoardManagement/BoardManagement';
import GroupManagement from './GroupManagement/GroupManagement';
import ItemManagement from './ItemManagement/ItemManagement';
import WorkflowAnalysis from './WorkflowAnalysis/WorkflowAnalysis';
import ConnectionTest from './Test/ConnectionTest';
import PageLayout from './Layout/PageLayout';
import mondaySdk from 'monday-sdk-js';
import 'monday-ui-react-core/dist/main.css';
import '../assets/styles/global.css';
import '../assets/styles/layout.css';
import '../assets/styles/workflowAnalysis.css';

// Initialize monday SDK
const monday = mondaySdk();

// ProtectedRoute component
const ProtectedRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? element : <Navigate to="/login" />;
};

// App container component
const AppContainer: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationsProvider>
          <App />
        </NotificationsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};
// Main App component
const App: React.FC = () => {
  const { isAuthenticated, loading, setToken } = useAuth();
  const [sdkInitialized, setSdkInitialized] = useState<boolean>(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  
  // Effect to initialize monday SDK event listeners
  useEffect(() => {
    try {
      // Initialize the SDK
      monday.listen('context', (res: { data: { token?: string; boardIds?: string | string[]; workspaceIds?: string | string[] } }) => {
        if (res.data.token) {
          setToken(res.data.token);
        }
        setSdkInitialized(true);
      });
      
      // Trigger get_context
      monday.execute('get_context');
    } catch (error) {
      console.error('Failed to initialize Monday SDK:', error);
      setSdkError(error instanceof Error ? error.message : 'Unknown error initializing Monday SDK');
    }
  }, [setToken]);
  
  if (loading) {
    return (
      <div className="loading-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="loading-spinner"></div>
        <p>Loading application...</p>
      </div>
    );
  }
  
  if (sdkError) {
    return (
      <div className="error-container" style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
        <h2>Error Initializing Application</h2>
        <p>{sdkError}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  
  
  return (
    <Router>
      <NotificationsContainer position="top-right" />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        
        <Route path="/" element={
          <ProtectedRoute element={
            <PageLayout>
              <Outlet />
            </PageLayout>
          } />
        }>
          <Route index element={<Dashboard />} />
          <Route path="test" element={<ConnectionTest />} />
          
          {/* Workspace routes */}
          <Route path="workspaces" element={<WorkspaceManagement />} />
          <Route path="workspaces/create" element={<WorkspaceManagement />} />
          <Route path="workspaces/manage" element={<WorkspaceManagement />} />
          <Route path="workspaces/:id" element={<WorkspaceManagement />} />
          
          {/* Board routes */}
          <Route path="boards" element={<BoardManagement />} />
          <Route path="boards/create" element={<BoardManagement />} />
          <Route path="boards/manage" element={<BoardManagement />} />
          <Route path="boards/:id" element={<BoardManagement />} />
          
          {/* Group routes */}
          <Route path="boards/:boardId/groups" element={<GroupManagement />} />
          <Route path="boards/:boardId/groups/:groupId" element={<GroupManagement />} />
          
          {/* Item routes */}
          <Route path="boards/:boardId/items" element={<ItemManagement />} />
          <Route path="boards/:boardId/items/:itemId" element={<ItemManagement />} />
          
          {/* Workflow Analysis routes */}
          <Route path="workflow-analysis" element={<WorkflowAnalysis />} />
          <Route path="workflow-analysis/metrics" element={<WorkflowAnalysis />} />
          <Route path="workflow-analysis/bottlenecks" element={<WorkflowAnalysis />} />
          <Route path="workflow-analysis/ai-insights" element={<WorkflowAnalysis />} />
          
          {/* Settings route */}
          <Route path="settings" element={<div>Settings Page</div>} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default AppContainer;