# monday-ai-workflow

AI-powered workflow assistant for monday.com

## Overview

This application enhances monday.com workflows with AI-powered features, intelligent automation, and advanced analytics. It provides a seamless integration with monday.com's platform while offering premium features through a subscription model.

## Features

- **Workspace & Board Management**: Create and manage workspaces and boards with an intuitive interface
- **AI-Powered Insights**: Analyze workflow patterns and receive optimization suggestions
- **Comprehensive Icon System**: Consistent visual language with accessibility support
- **Subscription Tiers**: Access premium features through flexible subscription plans
- **Standardized UI Components**: Consistent UI using monday-ui-react-core components
- **Performance Optimizations**: Enhanced caching and request deduplication for improved responsiveness
- **GitHub MCP Integration**: Direct GitHub repository interaction through AI tools

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- monday.com developer account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/monday-ai-workflow.git
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file with your monday.com API credentials.

4. Start the development server:
   ```
   npm run dev
   ```

## UI Components

The application uses standardized UI components based on monday-ui-react-core to ensure a consistent user experience that aligns with monday.com's design system.

### Enhanced Components

- **EnhancedWorkspaceList**: Optimized workspace list with caching and improved accessibility
- **Custom Card Component**: Standardized card component following monday.com design patterns
- **Custom Banner Component**: Notification banner component for status messages

### Using Enhanced Components

```jsx
import EnhancedWorkspaceList from './components/WorkspaceManagement/EnhancedWorkspaceList';

// Basic usage
<EnhancedWorkspaceList />

// With custom properties
<EnhancedWorkspaceList 
  showActions={true}
  prefetchOnHover={true}
  className="custom-class"
/>
```

## Performance Optimizations

The application includes several performance optimizations to improve responsiveness and user experience:

### Enhanced Services with Caching

- **EnhancedWorkspaceService**: Caches workspace data with intelligent invalidation
- **EnhancedBoardService**: Caches board data with support for prefetching
- **EnhancedItemService**: Implements efficient caching for items with query-specific cache keys

### React Hooks for Data Fetching

- **useCachedData**: Generic hook for fetching and caching any data
- **useEnhancedWorkspaces**: Specialized hook for workspace data
- **useEnhancedBoards**: Specialized hook for board data
- **useEnhancedItems**: Specialized hook for item data

### Using Data Hooks

```jsx
import { useEnhancedWorkspaces } from './hooks/useEnhancedWorkspaces';

function WorkspaceComponent() {
  const { 
    workspaces, 
    loading, 
    error, 
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace
  } = useEnhancedWorkspaces();

  // Component logic here
}
```

## Icon System

The application includes a comprehensive icon system that provides:

- Consistent visual language across the application
- Support for different icon categories (Navigation, Action, Status)
- Multiple display options (Outlined, Filled)
- Responsive sizing (Small, Medium, Large)
- Full accessibility compliance

### Using Icons

```jsx
import Icon from './components/common/icons/Icon';
import { IconCategory, IconSize, IconType } from './components/common/icons/IconTypes';

// Basic usage
<Icon name="workspace" />

// With custom properties
<Icon 
  name="add" 
  category={IconCategory.ACTION}
  type={IconType.FILLED}
  size={IconSize.LARGE}
  color="#FF0000"
  ariaLabel="Add new item"
/>
```

## GitHub MCP Integration

The application includes integration with GitHub through the Model Context Protocol (MCP) server, enabling:

- Automated repository management
- Code search and analysis
- Issue tracking and management
- Pull request workflows
- File operations directly from AI interfaces

For more information on the GitHub MCP integration, see [MCP Setup Documentation](./mcp-setup-documentation.md).

## Testing

### Running Tests

Run the test suite:

```
npm test
```

Run specific tests:

```
npm test -- --testPathPattern=src/tests/components/common/icons
```

Run tests with coverage:

```
npm test -- --coverage
```

### Test Categories

- **Component Tests**: Tests for UI components and their behavior
- **Hook Tests**: Tests for custom React hooks
- **Service Tests**: Tests for API services and data fetching
- **Integration Tests**: Tests for component interactions
- **Accessibility Tests**: Tests for accessibility compliance

## Documentation

- [Installation Guide](./docs/installation-guide.md)
- [User Guide](./docs/user-guide.md)
- [Admin Guide](./docs/admin-guide.md)
- [Monetization Architecture](./docs/monetization/architecture.md)
- [Troubleshooting Guide](./docs/monetization/troubleshooting.md)
- [UI Standardization](./docs/ui-standardization-summary.md)
- [Performance Optimizations](./docs/performance-optimization-summary.md)
- [Phase 2 Implementation Summary](./docs/phase2-implementation-summary.md)
- [MCP Setup Documentation](./mcp-setup-documentation.md)

## Repository Organization

The repository is organized into logical groups for easier navigation and maintenance:

- **src/components/**: UI components organized by feature
- **src/services/**: API services and data fetching
- **src/hooks/**: Custom React hooks
- **src/__tests__/**: Test files organized by type
- **docs/**: Documentation files

For more details on repository organization, see [Repository Organization Plan](./docs/repository-organization-plan.md).

## License

This project is licensed under the MIT License - see the LICENSE file for details.