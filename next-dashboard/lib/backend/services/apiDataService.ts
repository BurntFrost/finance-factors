/**
 * API Data Service
 * 
 * This module provides utilities for fetching financial data from external APIs
 * with retry logic, timeout handling, and request deduplication.
 */

import {
  ApiResponse,
  DataFetchOptions,
  DATA_TYPE_MAPPINGS,
} from '@/shared/types/dataSource';
import { realApiService } from './realApiService';

// Request cache for deduplication
const requestCache = new Map<string, Promise<ApiResponse<unknown>>>();

// Rate limiting tracker
const rateLimitTracker = new Map<string, {
  requests: number;
  resetTime: number;
}>();







// Utility function to update rate limits
function updateRateLimit(endpoint: string): void {
  const now = Date.now();
  const tracker = rateLimitTracker.get(endpoint);
  const RATE_LIMIT_WINDOW = 60000; // 1 minute

  if (!tracker || now > tracker.resetTime) {
    rateLimitTracker.set(endpoint, {
      requests: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
  } else {
    tracker.requests++;
  }
}









// Main API service class
export class ApiDataService {
  constructor() {
    // Constructor kept for compatibility but no longer needs configuration
    // All API calls are now delegated to the real API service
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
