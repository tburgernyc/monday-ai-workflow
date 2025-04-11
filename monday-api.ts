import mondaySdk from 'monday-sdk-js';
import Bottleneck from 'bottleneck';

// Initialize the SDK
const monday = mondaySdk();

// Configure rate limiting to prevent API throttling
// monday.com has rate limits of 60 requests per minute
const limiter = new Bottleneck({
  maxConcurrent: 10, // Maximum number of requests running at the same time
  minTime: 100, // Minimum time between requests (in ms)
  reservoir: 60, // Number of requests allowed per minute
  reservoirRefreshInterval: 60 * 1000, // Refresh interval in ms (1 minute)
  reservoirRefreshAmount: 60, // Number of requests to add on each refresh
});

// Token setup function
export const initializeMonday = (token: string): mondaySdk.MondayClientSdk => {
  monday.setToken(token);
  return monday;
};

// Set token from environment if available
if (process.env.REACT_APP_MONDAY_API_TOKEN) {
  monday.setToken(process.env.REACT_APP_MONDAY_API_TOKEN);
}

// Create a wrapper for API calls with rate limiting and error handling
export const executeQuery = async (
  query: string, 
  variables: Record<string, any> = {}
): Promise<any> => {
  try {
    // Use the limiter to prevent hitting rate limits
    return await limiter.schedule(() => monday.api(query, { variables }));
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Helper for pagination
export const executeQueryWithPagination = async (
  query: string,
  variables: Record<string, any> = {},
  itemsPath: string, // The path to the items array in the response (e.g., 'data.boards')
  limit: number = 100
): Promise<any[]> => {
  let allItems: any[] = [];
  let page = 1;
  let hasMoreItems = true;

  while (hasMoreItems) {
    const paginatedVariables = {
      ...variables,
      limit,
      page,
    };

    const response = await executeQuery(query, paginatedVariables);
    
    // Navigate to the specified path to get the items
    const pathParts = itemsPath.split('.');
    let items = response;
    
    for (const part of pathParts) {
      items = items?.[part] || [];
    }

    if (Array.isArray(items) && items.length > 0) {
      allItems = [...allItems, ...items];
      page++;
    } else {
      hasMoreItems = false;
    }

    // Safety check - if we've retrieved a lot of pages, break to prevent infinite loops
    if (page > 100) {
      console.warn('Pagination safety limit reached. There might be more items.');
      break;
    }
  }

  return allItems;
};

export default monday;