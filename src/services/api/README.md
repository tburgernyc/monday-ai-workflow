# Monday.com API Service

This directory contains services for interacting with the monday.com API. The main service is `mondayApi.ts`, which provides a robust, type-safe interface for making API calls to monday.com.

## Features

- **SDK Initialization** with proper error handling
- **Rate Limiting** using Bottleneck to prevent API throttling
- **Pagination Support** for large data sets
- **TypeScript Types** for all methods and responses
- **Token Handling and Authentication**
- **Comprehensive Error Handling** with informative messages
- **Logging** for debugging purposes
- **Wrapper Methods** for common API operations

## Usage

### Basic Usage

```typescript
import { MondayApi, MondayTypes, MondayLogger } from '../services/api/mondayApi';

// Get current user information
const currentUser = await MondayApi.users.me();

// Get all boards
const boards = await MondayApi.boards.getAll({ limit: 10 });

// Get a specific board
const board = await MondayApi.boards.getById('board_id');
```

### Error Handling

The service provides custom error types for better error handling:

```typescript
try {
  const boards = await MondayApi.boards.getAll();
} catch (err) {
  if (err instanceof MondayTypes.RateLimitError) {
    console.log(`Rate limit exceeded. Try again in ${err.retryAfter} seconds.`);
  } else if (err instanceof MondayTypes.AuthenticationError) {
    console.log('Authentication failed. Please check your API token.');
  } else {
    console.log(`API error: ${err.message}`);
  }
}
```

### Pagination

The service automatically handles pagination for large datasets:

```typescript
// This will automatically fetch all items across multiple pages
const allItems = await MondayApi.items.getByBoardId('board_id');

// You can also control pagination manually
const firstPageItems = await MondayApi.items.getByBoardId('board_id', {
  limit: 50,
  page: 1
});
```

### Creating Resources

```typescript
// Create a new board
const newBoard = await MondayApi.boards.create('New Project Board', {
  boardKind: 'public'
});

// Create a new group in a board
const newGroup = await MondayApi.groups.create(boardId, 'New Group');

// Create a new item in a board
const newItem = await MondayApi.items.create(
  boardId,
  groupId,
  'New Task',
  {
    status: { label: "Working on it" },
    date: { date: "2025-04-15" }
  }
);
```

### Logging

The service includes a logger for debugging:

```typescript
// Set log level (debug, info, warn, error)
MondayLogger.setLogLevel('debug');

// Log messages
MondayLogger.debug('Detailed information', { someData: 123 });
MondayLogger.info('General information');
MondayLogger.warn('Warning message');
MondayLogger.error('Error message', error);
```

## Implementation Details

### Rate Limiting

The service uses Bottleneck to implement rate limiting, respecting monday.com's limit of 60 requests per minute:

```typescript
const limiter = new Bottleneck({
  maxConcurrent: 10, // Maximum number of requests running at the same time
  minTime: 100, // Minimum time between requests (in ms)
  reservoir: 60, // Number of requests allowed per minute
  reservoirRefreshInterval: 60 * 1000, // Refresh interval in ms (1 minute)
  reservoirRefreshAmount: 60, // Number of requests to add on each refresh
});
```

### TypeScript Types

The service provides comprehensive TypeScript types for all API responses and parameters:

```typescript
export namespace MondayTypes {
  export interface ApiResponse<T = any> {
    data: T;
    account_id?: number;
    errors?: ApiError[];
  }

  export interface Board {
    id: string;
    name: string;
    description?: string;
    board_kind: string;
    state: string;
    workspace_id?: string;
    created_at?: string;
    updated_at?: string;
    columns?: Column[];
    groups?: Group[];
    items?: Item[];
  }

  // ... more types
}
```

### Error Classes

Custom error classes for better error handling:

```typescript
export class MondayApiError extends Error {
  status?: number;
  errors?: ApiError[];
  query?: string;
  variables?: Record<string, any>;
}

export class RateLimitError extends MondayApiError {
  retryAfter?: number;
}

export class AuthenticationError extends MondayApiError {
  // Authentication-specific error
}

export class NetworkError extends MondayApiError {
  // Network-specific error
}
```

## Best Practices

1. **Always handle errors** using try/catch blocks
2. **Use pagination** for large datasets
3. **Set appropriate log levels** based on your environment
4. **Use the provided wrapper methods** instead of direct API calls
5. **Check rate limits** and implement retry logic for critical operations