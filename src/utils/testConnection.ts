import mondaySdk from 'monday-sdk-js';
import { executeQuery } from '../services/api/mondayApi';
import { User, ConnectionTestResult, RateLimitTestResult } from '../types/monday';

/**
 * Test the connection to monday.com API
 * @param token Optional API token (will use environment variable if not provided)
 * @returns Object containing connection status and user info if successful
 */
export const testMondayConnection = async (token?: string): Promise<ConnectionTestResult> => {
  try {
    // Simple query to get current user info
    const query = `query { me { id name email url account { id name } } }`;
    
    // Execute the query
    const response = await executeQuery(query);
    
    if (response.data && response.data.me) {
      return {
        success: true,
        message: 'Successfully connected to monday.com API',
        data: response.data.me as User
      };
    } else {
      return {
        success: false,
        message: 'Connected to API but failed to retrieve user data'
      };
    }
  } catch (error: unknown) {
    console.error('Connection test failed:', error);
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Test the rate limiting configuration
 * @param requestCount Number of requests to make (default: 10)
 * @returns Object containing test results
 */
export const testRateLimiting = async (requestCount: number = 10): Promise<RateLimitTestResult> => {
  try {
    const query = `query { me { id } }`;
    const results = {
      totalRequests: requestCount,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [] as number[]
    };
    
    // Make multiple requests to test rate limiting
    for (let i = 0; i < requestCount; i++) {
      const startTime = Date.now();
      try {
        await executeQuery(query);
        results.successfulRequests++;
        results.responseTimes.push(Date.now() - startTime);
      } catch (error) {
        results.failedRequests++;
        console.error(`Request ${i + 1} failed:`, error);
      }
    }
    
    const averageResponseTime = results.responseTimes.length > 0
      ? results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length
      : 0;
    
    return {
      success: results.failedRequests === 0,
      message: results.failedRequests === 0
        ? 'Rate limiting test passed successfully'
        : `Rate limiting test completed with ${results.failedRequests} failed requests`,
      data: {
        totalRequests: results.totalRequests,
        successfulRequests: results.successfulRequests,
        failedRequests: results.failedRequests,
        averageResponseTime
      }
    };
  } catch (error: unknown) {
    console.error('Rate limiting test failed:', error);
    return {
      success: false,
      message: `Rate limiting test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export default {
  testMondayConnection,
  testRateLimiting
};