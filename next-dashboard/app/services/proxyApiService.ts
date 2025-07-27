/**
 * Proxy API Service
 * 
 * Frontend service that calls the serverless API proxy instead of external APIs directly
 * This solves CORS issues and provides better security
 */

import { ApiResponse, DataFetchOptions } from '../types/dataSource';

interface ProxyRequestData {
  dataType: string;
  timeRange?: {
    start?: string;
    end?: string;
  };
  useCache: boolean;
}

export interface ProxyApiResponse<T = unknown> {
  data: T | null;
  success: boolean;
  error?: string;
  timestamp: string; // ISO string from server
  source: string;
  metadata?: {
    totalRecords?: number;
    rateLimit?: {
      remaining: number;
      resetTime: string; // ISO string from server
    };
    isFallback?: boolean;
    reason?: string;
  };
}

class ProxyApiService {
  private baseUrl: string;
  private requestCache = new Map<string, Promise<ApiResponse<unknown>>>();

  constructor() {
    // Use relative URL for same-origin requests (works with Vercel deployment)
    this.baseUrl = '/api/proxy';
  }

  /**
   * Fetch data for a specific data type using the API proxy
   */
  async fetchData<T = unknown>(options: DataFetchOptions): Promise<ApiResponse<T>> {
    const { dataType, timeRange, useCache = true } = options;
    
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(dataType, timeRange);
      
      // Check cache if enabled
      if (useCache && this.requestCache.has(cacheKey)) {
        const cachedResponse = await this.requestCache.get(cacheKey);
        return cachedResponse as ApiResponse<T>;
      }

      // Prepare request data
      const requestData = {
        dataType,
        timeRange: timeRange ? {
          start: timeRange.start?.toISOString(),
          end: timeRange.end?.toISOString(),
        } : undefined,
        useCache,
      };

      // Make request to proxy endpoint
      const requestPromise = this.makeProxyRequest<T>(requestData);
      
      if (useCache) {
        this.requestCache.set(cacheKey, requestPromise);
        
        // Clear cache after 15 minutes
        setTimeout(() => {
          this.requestCache.delete(cacheKey);
        }, 15 * 60 * 1000);
      }

      return await requestPromise;

    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        source: 'Proxy API Service',
      };
    }
  }

  /**
   * Make request to the proxy endpoint
   */
  private async makeProxyRequest<T>(requestData: ProxyRequestData): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Ignore JSON parsing errors, use default message
        }
        
        throw new Error(errorMessage);
      }

      const proxyResponse: ProxyApiResponse<T> = await response.json();

      // Convert proxy response to frontend ApiResponse format
      return {
        data: proxyResponse.data as T,
        success: proxyResponse.success,
        error: proxyResponse.error,
        timestamp: new Date(proxyResponse.timestamp),
        source: proxyResponse.source,
        metadata: proxyResponse.metadata ? {
          totalRecords: proxyResponse.metadata.totalRecords,
          rateLimit: proxyResponse.metadata.rateLimit ? {
            remaining: proxyResponse.metadata.rateLimit.remaining,
            resetTime: new Date(proxyResponse.metadata.rateLimit.resetTime),
          } : undefined,
        } : undefined,
      };

    } catch (error) {
      // Handle network and other errors
      let errorMessage = 'Failed to fetch data from proxy';
      let isNetworkError = false;

      if (error instanceof Error) {
        errorMessage = error.message;
        isNetworkError = error.message.includes('fetch') || 
                        error.message.includes('network') ||
                        error.message.includes('Failed to fetch');
      }

      // If it's a network error, provide more helpful message
      if (isNetworkError) {
        errorMessage = 'Network error: Unable to connect to API proxy. Please check your connection.';
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Check API proxy health
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, { configured: boolean; status: string }>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const healthData = await response.json();
      return {
        status: healthData.status,
        services: healthData.services,
      };

    } catch (error) {
      console.warn('API proxy health check failed:', error);
      return {
        status: 'unhealthy',
        services: {},
      };
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(dataType: string, timeRange?: { start: Date; end: Date }): string {
    let key = `proxy-${dataType}`;
    
    if (timeRange) {
      key += `-${timeRange.start.toISOString()}-${timeRange.end.toISOString()}`;
    }
    
    return key;
  }

  /**
   * Clear request cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.requestCache.size,
      keys: Array.from(this.requestCache.keys()),
    };
  }

  /**
   * Check if proxy is available (basic connectivity test)
   */
  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.status !== 'unhealthy';
    } catch {
      return false;
    }
  }

  /**
   * Get available data types from proxy
   */
  getAvailableDataTypes(): string[] {
    // These should match the PROXY_API_ENDPOINTS in the proxy
    return [
      'house-prices',
      'salary-income',
      'cost-of-living',
      'federal-funds-rate',
      'unemployment-rate',
      'inflation-cpi',
      'core-inflation',
      'gdp-growth',
      'money-supply-m1',
      'money-supply-m2',
      'treasury-10y',
      'treasury-2y',
      'fed-balance-sheet',
    ];
  }
}

// Export singleton instance
export const proxyApiService = new ProxyApiService();
export default proxyApiService;
