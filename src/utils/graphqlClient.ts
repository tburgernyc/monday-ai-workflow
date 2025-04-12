import { GraphQLClient } from 'graphql-request';
import Bottleneck from 'bottleneck';

// monday.com API URL
const MONDAY_API_URL = 'https://api.monday.com/v2';

// Configure rate limiting
const limiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 100,
  reservoir: 60,
  reservoirRefreshInterval: 60 * 1000,
  reservoirRefreshAmount: 60,
});

// Create a GraphQL client instance
const createClient = (token: string): GraphQLClient => {
  const client = new GraphQLClient(MONDAY_API_URL, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
  });
  
  return client;
};

// GraphQL error interface
interface GraphQLResponseError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
  extensions?: Record<string, unknown>;
}

interface GraphQLErrorResponse {
  response: {
    errors?: GraphQLResponseError[];
    status?: number;
  };
}

// Execute a GraphQL query with rate limiting and error handling
export const executeQuery = async <T = unknown>(
  token: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> => {
  const client = createClient(token);
  
  try {
    return await limiter.schedule(() => client.request<T>(query, variables));
  } catch (error) {
    // Enhanced error handling
    if (error instanceof Error && 'response' in error) {
      const graphqlError = error as unknown as GraphQLErrorResponse;
      
      if (graphqlError.response.errors && graphqlError.response.errors.length > 0) {
        console.error('GraphQL Errors:', graphqlError.response.errors);
        throw new Error(
          `GraphQL Error: ${graphqlError.response.errors.map(e => e.message).join(', ')}`
        );
      }
      
      if (graphqlError.response.status === 429) {
        console.error('Rate limit exceeded. Please reduce request frequency.');
        throw new Error('Rate limit exceeded. Please try again later.');
      }
    }
    
    console.error('GraphQL Request Error:', error);
    throw error;
  }
};

// Execute a paginated query
export const executePaginatedQuery = async <T = unknown>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
  dataPath: string,
  pageSize: number = 100
): Promise<T[]> => {
  let allData: T[] = [];
  let hasMore = true;
  let page = 1;
  
  while (hasMore) {
    const paginatedVariables = {
      ...variables,
      limit: pageSize,
      page,
    };
    
    const response = await executeQuery<Record<string, unknown>>(token, query, paginatedVariables);
    
    // Navigate through the response to get the data
    const pathParts = dataPath.split('.');
    let data: unknown = response;
    
    for (const part of pathParts) {
      if (data && typeof data === 'object') {
        data = (data as Record<string, unknown>)[part];
      } else {
        data = undefined;
        break;
      }
    }
    
    if (Array.isArray(data) && data.length > 0) {
      allData = [...allData, ...data as T[]];
      
      // If we got fewer items than the page size, we've reached the end
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
    
    // Safety check to prevent infinite loops
    if (page > 100) {
      console.warn('Pagination safety limit reached. There might be more data.');
      break;
    }
  }
  
  return allData;
};

export default {
  createClient,
  executeQuery,
  executePaginatedQuery,
};