/**
 * API Data Service
 * 
 * This module provides utilities for fetching financial data from external APIs
 * with retry logic, timeout handling, and request deduplication.
 */

import {
  ApiResponse,
  DataSourceError,
  DataFetchOptions,
  DATA_TYPE_MAPPINGS,
} from '../types/dataSource';

// Request cache for deduplication
const requestCache = new Map<string, Promise<ApiResponse<unknown>>>();

// Rate limiting tracker
const rateLimitTracker = new Map<string, {
  requests: number;
  resetTime: number;
}>();

// Configuration
const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com',
  API_KEY: process.env.NEXT_PUBLIC_API_KEY || '',
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_REQUESTS_PER_MINUTE: 60,
};

// Utility function to create delay
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Utility function to check rate limits
function checkRateLimit(endpoint: string): boolean {
  const now = Date.now();
  const tracker = rateLimitTracker.get(endpoint);
  
  if (!tracker || now > tracker.resetTime) {
    // Reset or initialize tracker
    rateLimitTracker.set(endpoint, {
      requests: 1,
      resetTime: now + API_CONFIG.RATE_LIMIT_WINDOW,
    });
    return true;
  }
  
  if (tracker.requests >= API_CONFIG.MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  tracker.requests++;
  return true;
}

// Utility function to create request key for deduplication
function createRequestKey(endpoint: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${endpoint}?${sortedParams}`;
}

// Main API fetch function with retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = API_CONFIG.MAX_RETRIES
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.DEFAULT_TIMEOUT);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    if (retries > 0 && shouldRetry(error)) {
      await delay(API_CONFIG.RETRY_DELAY * (API_CONFIG.MAX_RETRIES - retries + 1));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Determine if error is retryable
function shouldRetry(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors are retryable
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      return true;
    }
    
    // Timeout errors are retryable
    if (error.name === 'AbortError') {
      return true;
    }
    
    // 5xx server errors are retryable
    if (error.message.includes('HTTP 5')) {
      return true;
    }
    
    // 429 rate limit errors are retryable
    if (error.message.includes('HTTP 429')) {
      return true;
    }
  }
  
  return false;
}

// Create error object from various error types
function createDataSourceError(error: unknown): DataSourceError {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return {
        type: 'timeout',
        message: 'Request timed out',
        retryable: true,
        retryAfter: 5,
      };
    }
    
    if (error.message.includes('HTTP 429')) {
      return {
        type: 'rate-limit',
        message: 'Rate limit exceeded',
        retryable: true,
        retryAfter: 60,
      };
    }
    
    if (error.message.includes('HTTP 4')) {
      return {
        type: 'api',
        message: `Client error: ${error.message}`,
        retryable: false,
      };
    }
    
    if (error.message.includes('HTTP 5')) {
      return {
        type: 'api',
        message: `Server error: ${error.message}`,
        retryable: true,
        retryAfter: 10,
      };
    }
    
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      return {
        type: 'network',
        message: 'Network connection failed',
        retryable: true,
        retryAfter: 5,
      };
    }
  }
  
  return {
    type: 'unknown',
    message: 'An unexpected error occurred',
    retryable: true,
    retryAfter: 10,
  };
}

// Main API service class
export class ApiDataService {
  private baseUrl: string;
  private apiKey: string;
  
  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || API_CONFIG.BASE_URL;
    this.apiKey = apiKey || API_CONFIG.API_KEY;
  }
  
  // Fetch data for a specific data type
  async fetchData<T = unknown>(options: DataFetchOptions): Promise<ApiResponse<T>> {
    const { dataType, timeRange, useCache = true } = options;
    
    // Map data type to API endpoint
    const endpoint = DATA_TYPE_MAPPINGS[dataType];
    if (!endpoint) {
      throw new Error(`Unknown data type: ${dataType}`);
    }
    
    // Check rate limits
    if (!checkRateLimit(endpoint)) {
      const error: DataSourceError = {
        type: 'rate-limit',
        message: 'Rate limit exceeded for this endpoint',
        retryable: true,
        retryAfter: 60,
      };
      return {
        data: null as T,
        success: false,
        error: error.message,
        timestamp: new Date(),
        source: 'Live API',
      };
    }
    
    // Build request parameters
    const params: Record<string, unknown> = {
      dataType,
    };
    
    if (timeRange) {
      params.startDate = timeRange.start.toISOString();
      params.endDate = timeRange.end.toISOString();
    }
    
    // Create request key for deduplication
    const requestKey = createRequestKey(endpoint, params);
    
    // Check if request is already in progress
    if (useCache && requestCache.has(requestKey)) {
      return requestCache.get(requestKey)! as Promise<ApiResponse<T>>;
    }
    
    // Create the request promise
    const requestPromise = this.executeRequest<T>(endpoint, params);
    
    // Cache the promise for deduplication
    if (useCache) {
      requestCache.set(requestKey, requestPromise);
      
      // Clean up cache after request completes
      requestPromise.finally(() => {
        requestCache.delete(requestKey);
      });
    }
    
    return requestPromise;
  }
  
  // Execute the actual API request
  private async executeRequest<T>(
    endpoint: string,
    params: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}/${endpoint}`);
      
      // Add query parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
      
      // Prepare request options
      const requestOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
      };
      
      // Make the request
      const response = await fetchWithRetry(url.toString(), requestOptions);
      const data = await response.json();
      
      return {
        data: data as T,
        success: true,
        timestamp: new Date(),
        source: 'Live API',
        metadata: {
          rateLimit: {
            remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
            resetTime: new Date(parseInt(response.headers.get('X-RateLimit-Reset') || '0') * 1000),
          },
        },
      };
      
    } catch (error) {
      const dataSourceError = createDataSourceError(error);
      
      return {
        data: null as T,
        success: false,
        error: dataSourceError.message,
        timestamp: new Date(),
        source: 'Live API',
      };
    }
  }
  
  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetchWithRetry(`${this.baseUrl}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // Clear request cache
  clearCache(): void {
    requestCache.clear();
  }
  
  // Get cache statistics
  getCacheStats() {
    return {
      activeRequests: requestCache.size,
      rateLimitTrackers: rateLimitTracker.size,
    };
  }
}

// Default service instance
export const apiDataService = new ApiDataService();
