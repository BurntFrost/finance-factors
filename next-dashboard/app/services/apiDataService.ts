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
  API_PROVIDERS,
} from '../types/dataSource';
import { realApiService } from './realApiService';

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

// Utility function to update rate limits
function updateRateLimit(endpoint: string): void {
  const now = Date.now();
  const tracker = rateLimitTracker.get(endpoint);

  if (!tracker || now > tracker.resetTime) {
    rateLimitTracker.set(endpoint, {
      requests: 1,
      resetTime: now + API_CONFIG.RATE_LIMIT_WINDOW,
    });
  } else {
    tracker.requests++;
  }
}

// Legacy function - kept for backward compatibility but not used
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
  
  // Fetch data for a specific data type using real APIs
  async fetchData<T = unknown>(options: DataFetchOptions): Promise<ApiResponse<T>> {
    try {
      // Use the real API service to fetch data
      const response = await realApiService.fetchData<T>(options);

      // Update rate limit tracking
      if (response.success) {
        const endpoint = DATA_TYPE_MAPPINGS[options.dataType] || options.dataType;
        updateRateLimit(endpoint);
      }

      return response;
    } catch (error) {
      const errorResponse: ApiResponse<T> = {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        source: 'API Data Service',
      };

      return errorResponse;
    }
  }

  // Legacy method for backward compatibility - now delegates to real API service
  private async executeRequest<T>(endpoint: string, params: Record<string, unknown>): Promise<ApiResponse<T>> {
    // This method is kept for backward compatibility but now uses real APIs
    const dataType = params.dataType as string;
    const timeRange = params.startDate && params.endDate ? {
      start: new Date(params.startDate as string),
      end: new Date(params.endDate as string),
    } : undefined;

    return this.fetchData<T>({
      dataType,
      timeRange,
      useCache: true,
    });
  }

  // Get health status of all configured APIs
  async getHealthStatus(): Promise<Record<string, { configured: boolean; available: boolean }>> {
    return await realApiService.getHealthStatus();
  }

  // Get available data types and their sources
  getAvailableDataTypes(): Record<string, { provider: string; description: string; configured: boolean }> {
    return realApiService.getAvailableDataTypes();
  }

  // Clear API caches
  clearCache(): void {
    requestCache.clear();
    realApiService.clearCache();
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: requestCache.size,
      keys: Array.from(requestCache.keys()),
    };
  }
}

// Default service instance
export const apiDataService = new ApiDataService();
