import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './Authentication/AuthContext';
import Login from './Authentication/Login';
import Dashboard from './Dashboard/Dashboard';
import WorkspaceManagement from './WorkspaceManagement/WorkspaceManagement';
import BoardManagement from './BoardManagement/BoardManagement';
import WorkflowAnalysis from './WorkflowAnalysis/WorkflowAnalysis';
import Layout from './Layout/Layout';
import 'monday-ui-react-core/dist/main.css';
import '../assets/styles/global.css';

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
      <App />
    </AuthProvider>
  );
};

// Main App component
const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  
  // Effect to initialize monday SDK event listeners
  useEffect(() => {
    // Any global initialization can go here
  }, []);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        
        <Route path="/" element={<ProtectedRoute element={<Layout />} />}>
          <Route index element={<Dashboard />} />
          <Route path="workspaces" element={<WorkspaceManagement />} />
          <Route path="boards" element={<BoardManagement />} />
          <Route path="workflow-analysis" element={<WorkflowAnalysis />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default AppContainer;