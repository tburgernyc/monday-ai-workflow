# File Structure Implementation Plan

This document outlines the detailed steps needed to restructure the project files to match the expected structure.

## 1. Files to Rename

| Current Name | New Name |
|--------------|----------|
| package-json (1).json | package.json |
| tsconfig-json.json | tsconfig.json |
| env-example.txt | .env.example |
| prompts/phase1-prompt.txt | prompts/phase1-setup.md |
| prompts/phase2-prompt.txt | prompts/phase2-core-services.md |
| prompts/phase3-prompt.txt | prompts/phase3-ai-integration.md |
| prompts/phase4-prompt.txt | prompts/phase4-ui-components.md |
| prompts/phase5-prompt.txt | prompts/phase5-testing-deployment.md |

## 2. Files to Move

| Current Location | New Location |
|------------------|--------------|
| index-file.ts | src/index.tsx |
| app-component.ts | src/components/App.tsx |
| auth-context.ts | src/components/Authentication/AuthContext.tsx |
| login-component.txt | src/components/Authentication/Login.tsx |
| layout-component.ts | src/components/Layout/Layout.tsx |
| dashboard-component.ts | src/components/Dashboard/Dashboard.tsx |
| monday-api.ts | src/services/api/mondayApi.ts |
| workspace-service.ts | src/services/api/workspaceService.ts |
| board-service.ts | src/services/api/boardService.ts |
| workflow-analysis.ts | src/services/analysis/workflowAnalysis.ts |
| claude-service.ts | src/services/nlp/claudeService.ts |
| graphql-client.ts | src/utils/graphqlClient.ts |
| global-css.css | src/assets/styles/global.css |

## 3. Directories to Create

- public/
- src/components/GroupManagement/
- src/components/ItemManagement/

## 4. Files to Create

### .gitignore
```
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# production
/build

# misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local
.env

npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### public/index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="AI-powered workflow assistant for monday.com"
    />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <title>Monday.com AI Workflow Assistant</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
```

### public/manifest.json
```json
{
  "short_name": "AI Workflow",
  "name": "Monday.com AI Workflow Assistant",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
```

### src/components/WorkspaceManagement/WorkspaceManagement.tsx
```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { getWorkspaces } from '../../services/api/workspaceService';

const WorkspaceManagement: React.FC = () => {
  const { token } = useAuth();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const workspacesData = await getWorkspaces(token);
        setWorkspaces(workspacesData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching workspaces:', err);
        setError(err.message || 'Failed to fetch workspaces');
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
```

### src/components/BoardManagement/BoardManagement.tsx
```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { getBoards } from '../../services/api/boardService';

const BoardManagement: React.FC = () => {
  const { token } = useAuth();
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBoards = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const boardsData = await getBoards(token);
        setBoards(boardsData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching boards:', err);
        setError(err.message || 'Failed to fetch boards');
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, [token]);

  if (loading) {
    return <div>Loading boards...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="board-management">
      <h1>Board Management</h1>
      
      {boards.length === 0 ? (
        <p>No boards found.</p>
      ) : (
        <div className="board-list">
          {boards.map((board) => (
            <div key={board.id} className="board-item">
              <h2>{board.name}</h2>
              <p>Description: {board.description || 'No description'}</p>
              <p>Items: {board.items_count}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BoardManagement;
```

### src/components/GroupManagement/GroupManagement.tsx
```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';

const GroupManagement: React.FC = () => {
  const { token } = useAuth();
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [boards, setBoards] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch boards on component mount
  useEffect(() => {
    // Implementation will be added later
    setLoading(false);
  }, [token]);

  // Fetch groups when a board is selected
  useEffect(() => {
    if (!selectedBoard) {
      setGroups([]);
      return;
    }
    
    // Implementation will be added later
  }, [selectedBoard, token]);

  return (
    <div className="group-management">
      <h1>Group Management</h1>
      
      <div className="board-selector">
        <h2>Select a Board</h2>
        {/* Board selection UI will be implemented here */}
      </div>
      
      {selectedBoard && (
        <div className="groups-container">
          <h2>Groups</h2>
          {/* Groups display and management UI will be implemented here */}
        </div>
      )}
    </div>
  );
};

export default GroupManagement;
```

### src/components/ItemManagement/ItemManagement.tsx
```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';

const ItemManagement: React.FC = () => {
  const { token } = useAuth();
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [boards, setBoards] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch boards on component mount
  useEffect(() => {
    // Implementation will be added later
    setLoading(false);
  }, [token]);

  // Fetch groups when a board is selected
  useEffect(() => {
    if (!selectedBoard) {
      setGroups([]);
      setSelectedGroup(null);
      return;
    }
    
    // Implementation will be added later
  }, [selectedBoard, token]);

  // Fetch items when a group is selected
  useEffect(() => {
    if (!selectedBoard || !selectedGroup) {
      setItems([]);
      return;
    }
    
    // Implementation will be added later
  }, [selectedBoard, selectedGroup, token]);

  return (
    <div className="item-management">
      <h1>Item Management</h1>
      
      <div className="board-group-selector">
        <h2>Select a Board and Group</h2>
        {/* Board and group selection UI will be implemented here */}
      </div>
      
      {selectedBoard && selectedGroup && (
        <div className="items-container">
          <h2>Items</h2>
          {/* Items display and management UI will be implemented here */}
        </div>
      )}
    </div>
  );
};

export default ItemManagement;
```

### src/components/WorkflowAnalysis/WorkflowAnalysis.tsx
```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Authentication/AuthContext';
import { analyzeWorkflow } from '../../services/analysis/workflowAnalysis';

const WorkflowAnalysis: React.FC = () => {
  const { token } = useAuth();
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [boards, setBoards] = useState<any[]>([]);
  const [analysisResults, setAnalysisResults] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch boards on component mount
  useEffect(() => {
    // Implementation will be added later
    setLoading(false);
  }, [token]);

  const handleAnalyzeWorkflow = async () => {
    if (!selectedBoard || !token) return;
    
    try {
      setAnalyzing(true);
      const results = await analyzeWorkflow(token, selectedBoard);
      setAnalysisResults(results);
      setError(null);
    } catch (err: any) {
      console.error('Error analyzing workflow:', err);
      setError(err.message || 'Failed to analyze workflow');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="workflow-analysis">
      <h1>Workflow Analysis</h1>
      
      <div className="board-selector">
        <h2>Select a Board to Analyze</h2>
        {/* Board selection UI will be implemented here */}
        
        <button 
          onClick={handleAnalyzeWorkflow} 
          disabled={!selectedBoard || analyzing}
        >
          {analyzing ? 'Analyzing...' : 'Analyze Workflow'}
        </button>
      </div>
      
      {error && <div className="error-message">Error: {error}</div>}
      
      {analysisResults && (
        <div className="analysis-results">
          <h2>Analysis Results</h2>
          {/* Analysis results display will be implemented here */}
        </div>
      )}
    </div>
  );
};

export default WorkflowAnalysis;
```

### public/favicon.ico
This is a binary file and will need to be created or downloaded separately.

## 5. Implementation Steps

1. Switch to code mode to implement these changes
2. Create missing directories
3. Create missing files with the template content provided above
4. Move existing files to their correct locations
5. Rename files to match the expected structure
6. Verify the final structure matches the expected structure

## 6. Implementation Commands

Here are the commands that can be used to implement these changes:

```bash
# Create missing directories
mkdir -p public src/components/GroupManagement src/components/ItemManagement

# Rename files
mv package-json\ \(1\).json package.json
mv tsconfig-json.json tsconfig.json
mv env-example.txt .env.example
mv prompts/phase1-prompt.txt prompts/phase1-setup.md
mv prompts/phase2-prompt.txt prompts/phase2-core-services.md
mv prompts/phase3-prompt.txt prompts/phase3-ai-integration.md
mv prompts/phase4-prompt.txt prompts/phase4-ui-components.md
mv prompts/phase5-prompt.txt prompts/phase5-testing-deployment.md

# Move files
mv index-file.ts src/index.tsx
mv app-component.ts src/components/App.tsx
mv auth-context.ts src/components/Authentication/AuthContext.tsx
mv login-component.txt src/components/Authentication/Login.tsx
mv layout-component.ts src/components/Layout/Layout.tsx
mv dashboard-component.ts src/components/Dashboard/Dashboard.tsx
mv monday-api.ts src/services/api/mondayApi.ts
mv workspace-service.ts src/services/api/workspaceService.ts
mv board-service.ts src/services/api/boardService.ts
mv workflow-analysis.ts src/services/analysis/workflowAnalysis.ts
mv claude-service.ts src/services/nlp/claudeService.ts
mv graphql-client.ts src/utils/graphqlClient.ts
mv global-css.css src/assets/styles/global.css

# Create missing files
# (Use the template content provided above for each file)