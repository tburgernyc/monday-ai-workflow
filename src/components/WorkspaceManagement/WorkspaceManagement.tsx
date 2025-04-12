import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { workspaceService } from '../../services/api/workspaceService';
import { Workspace } from '../../types/monday';
import { AppError } from '../../types/errors';

const WorkspaceManagement: React.FC = () => {
  const { token } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const workspacesData = await workspaceService.getWorkspaces();
        setWorkspaces(workspacesData);
        setError(null);
      } catch (err: unknown) {
        console.error('Error fetching workspaces:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch workspaces';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [token]);

  if (loading) {
    return <div>Loading workspaces...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="workspace-management">
      <h1>Workspace Management</h1>
      
      {workspaces.length === 0 ? (
        <p>No workspaces found.</p>
      ) : (
        <div className="workspace-list">
          {workspaces.map((workspace) => (
            <div key={workspace.id} className="workspace-item">
              <h2>{workspace.name}</h2>
              <p>Description: {workspace.description || 'No description'}</p>
              <p>Members: {workspace.members_count}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkspaceManagement;