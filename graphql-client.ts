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

// Execute a GraphQL query with rate limiting and error handling
export const executeQuery = async <T = any>(
  token: string,
  query: string,
  variables?: Record<string, any>
): Promise<T> => {
  const client = createClient(token);
  
  try {
    return await limiter.schedule(() => client.request<T>(query, variables));
  } catch (error: any) {
    // Enhanced error handling
    if (error.response?.errors) {
      console.error('GraphQL Errors:', error.response.errors);
      throw new Error(
        `GraphQL Error: ${error.response.errors.map((e: any) => e.message).join(', ')}`
      );
    }
    
    if (error.response?.status === 429) {
      console.error('Rate limit exceeded. Please reduce request frequency.');
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    console.error('GraphQL Request Error:', error);
    throw error;
  }
};

// Execute a paginated query
export const executePaginatedQuery = async <T = any[]>(
  token: string,
  query: string,
  variables: Record<string, any> = {},
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
    
    const response: any = await executeQuery(token, query, paginatedVariables);
    
    // Navigate through the response to get the data
    const pathParts = dataPath.split('.');
    let data = response;
    
    for (const part of pathParts) {
      data = data?.[part];
      if (!data) break;
    }
    
    if (Array.isArray(data) && data.length > 0) {
      allData = [...allData, ...data];
      
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