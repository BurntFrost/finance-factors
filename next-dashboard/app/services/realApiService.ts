/**
 * Real API Service
 *
 * Unified service that orchestrates all real financial and economic data APIs
 * This service replaces the mock API when live data is needed
 *
 * Updated to use API proxy when available to solve CORS issues
 */

import { ApiResponse, DataFetchOptions, REAL_API_ENDPOINTS } from '../types/dataSource';
import { fredApiService } from './fredApiService';
import { blsApiService } from './blsApiService';
import { censusApiService } from './censusApiService';
import { alphaVantageApiService } from './alphaVantageApiService';
import { proxyApiService } from './proxyApiService';

class RealApiService {
  private requestCache = new Map<string, Promise<ApiResponse<unknown>>>();
  private rateLimitTracker = new Map<string, { requests: number; resetTime: number }>();
  private useProxy = true; // Enable proxy by default
  private proxyAvailable: boolean | null = null; // Cache proxy availability

  constructor() {
    // Force proxy usage in production to avoid CORS issues
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      this.useProxy = true;
      this.proxyAvailable = true; // Assume proxy is available in production
    }
  }

  /**
   * Check if API proxy is available
   */
  private async checkProxyAvailability(): Promise<boolean> {
    if (this.proxyAvailable !== null) {
      return this.proxyAvailable;
    }

    try {
      // For production/Vercel deployment, always assume proxy is available
      // since it's part of the same Next.js application
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        this.proxyAvailable = true;
        return true;
      }

      // For local development, test the proxy
      this.proxyAvailable = await proxyApiService.isAvailable();
      return this.proxyAvailable;
    } catch (error) {
      console.warn('Proxy availability check failed:', error);
      // In production, still try to use proxy even if health check fails
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        this.proxyAvailable = true;
        return true;
      }
      this.proxyAvailable = false;
      return false;
    }
  }

  /**
   * Fetch data for a specific data type using the appropriate API
   * Prioritizes proxy usage to avoid CORS issues
   */
  async fetchData<T = unknown>(options: DataFetchOptions): Promise<ApiResponse<T>> {
    const { dataType, timeRange, useCache = true } = options;

    try {
      // Always try proxy first if enabled
      if (this.useProxy) {
        try {
          console.log(`Attempting to fetch ${dataType} via API proxy...`);
          const proxyResponse = await proxyApiService.fetchData<T>(options);

          if (proxyResponse.success) {
            console.log(`Successfully fetched ${dataType} via API proxy`);
            return proxyResponse;
          } else {
            console.warn(`Proxy failed for ${dataType}:`, proxyResponse.error);
            // For production deployments, don't fall back to direct API calls
            // as they will fail due to CORS
            if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
              return {
                data: null as T,
                success: false,
                error: `API proxy failed: ${proxyResponse.error}. Direct API calls are blocked by CORS in production.`,
                timestamp: new Date(),
                source: 'Real API Service',
              };
            }
          }
        } catch (proxyError) {
          console.warn(`Proxy error for ${dataType}:`, proxyError);

          // For production deployments, don't fall back to direct API calls
          if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
            return {
              data: null as T,
              success: false,
              error: `API proxy error: ${proxyError instanceof Error ? proxyError.message : 'Unknown error'}. Direct API calls are blocked by CORS in production.`,
              timestamp: new Date(),
              source: 'Real API Service',
            };
          }

          // Mark proxy as unavailable temporarily for local development
          this.proxyAvailable = false;
          setTimeout(() => {
            this.proxyAvailable = null; // Reset availability check after 5 minutes
          }, 5 * 60 * 1000);
        }
      }

      // Fallback to direct API calls (only for local development)
      console.log(`Falling back to direct API for ${dataType}... (This may fail due to CORS in production)`);

      // Get endpoint configuration
      const endpoint = REAL_API_ENDPOINTS[dataType];
      if (!endpoint) {
        throw new Error(`Unknown data type: ${dataType}`);
      }

      // Check rate limits
      if (!this.checkRateLimit(endpoint.provider)) {
        return {
          data: null as T,
          success: false,
          error: 'Rate limit exceeded for this provider',
          timestamp: new Date(),
          source: `${endpoint.provider} API`,
        };
      }

      // Generate cache key
      const cacheKey = this.generateCacheKey(dataType, timeRange);

      // Check cache if enabled
      if (useCache && this.requestCache.has(cacheKey)) {
        return await this.requestCache.get(cacheKey) as ApiResponse<T>;
      }

      // Fetch data based on provider
      const requestPromise = this.fetchFromProvider(endpoint, timeRange);

      if (useCache) {
        this.requestCache.set(cacheKey, requestPromise);

        // Clear cache after 30 minutes
        setTimeout(() => {
          this.requestCache.delete(cacheKey);
        }, 30 * 60 * 1000);
      }

      const response = await requestPromise;
      return response as ApiResponse<T>;

    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        source: 'Real API Service',
      };
    }
  }

  /**
   * Fetch data from the appropriate provider
   */
  private async fetchFromProvider(
    endpoint: typeof REAL_API_ENDPOINTS[string],
    timeRange?: { start: Date; end: Date }
  ): Promise<ApiResponse<Array<{ date: string; value: number; label?: string }>>> {
    const { provider, seriesId } = endpoint;

    switch (provider) {
      case 'FRED':
        if (!seriesId) throw new Error('Series ID required for FRED API');
        return await fredApiService.fetchSeries(seriesId, {
          startDate: timeRange?.start ? this.formatDate(timeRange.start) : undefined,
          endDate: timeRange?.end ? this.formatDate(timeRange.end) : undefined,
        });

      case 'BLS':
        if (!seriesId) throw new Error('Series ID required for BLS API');
        return await blsApiService.fetchSeries(seriesId, {
          startYear: timeRange?.start ? timeRange.start.getFullYear() : undefined,
          endYear: timeRange?.end ? timeRange.end.getFullYear() : undefined,
        });

      case 'CENSUS':
        // For Census data, we'll fetch historical ACS data
        if (!seriesId) throw new Error('Variable required for Census API');
        return await censusApiService.fetchHistoricalACS(seriesId, {
          startYear: timeRange?.start ? timeRange.start.getFullYear() : 2015,
          endYear: timeRange?.end ? timeRange.end.getFullYear() : 2023,
        });

      case 'ALPHA_VANTAGE':
        // For Alpha Vantage, we'll use the function from params
        const func = endpoint.params?.function;
        if (!func) throw new Error('Function required for Alpha Vantage API');
        return await alphaVantageApiService.fetchEconomicIndicator(func);

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Check rate limits for a provider
   */
  private checkRateLimit(provider: string): boolean {
    const now = Date.now();
    const tracker = this.rateLimitTracker.get(provider);
    
    // Rate limits per provider (per minute)
    const limits = {
      FRED: 120,
      BLS: 10,
      CENSUS: 100,
      ALPHA_VANTAGE: 5,
    };

    const limit = limits[provider as keyof typeof limits] || 60;
    
    if (!tracker || now > tracker.resetTime) {
      // Reset or initialize tracker
      this.rateLimitTracker.set(provider, {
        requests: 1,
        resetTime: now + 60000, // 1 minute
      });
      return true;
    }
    
    if (tracker.requests >= limit) {
      return false;
    }
    
    tracker.requests++;
    return true;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(dataType: string, timeRange?: { start: Date; end: Date }): string {
    const timeKey = timeRange 
      ? `${timeRange.start.getTime()}-${timeRange.end.getTime()}`
      : 'default';
    return `${dataType}-${timeKey}`;
  }

  /**
   * Format date for API requests
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Get health status of all APIs
   */
  async getHealthStatus(): Promise<Record<string, { configured: boolean; available: boolean }>> {
    const status = {
      FRED: {
        configured: fredApiService.isConfigured(),
        available: false,
      },
      BLS: {
        configured: blsApiService.isConfigured(),
        available: false,
      },
      CENSUS: {
        configured: censusApiService.isConfigured(),
        available: false,
      },
      ALPHA_VANTAGE: {
        configured: alphaVantageApiService.isConfigured(),
        available: false,
      },
    };

    // Test API availability (simple health checks)
    const healthChecks = await Promise.allSettled([
      this.testFredHealth(),
      this.testBlsHealth(),
      this.testCensusHealth(),
      this.testAlphaVantageHealth(),
    ]);

    status.FRED.available = healthChecks[0].status === 'fulfilled';
    status.BLS.available = healthChecks[1].status === 'fulfilled';
    status.CENSUS.available = healthChecks[2].status === 'fulfilled';
    status.ALPHA_VANTAGE.available = healthChecks[3].status === 'fulfilled';

    return status;
  }

  /**
   * Test FRED API health
   */
  private async testFredHealth(): Promise<boolean> {
    try {
      if (!fredApiService.isConfigured()) return false;
      const response = await fredApiService.fetchSeries('GDP', { limit: 1 });
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * Test BLS API health
   */
  private async testBlsHealth(): Promise<boolean> {
    try {
      const response = await blsApiService.fetchSeries('LNS14000000', {
        startYear: new Date().getFullYear(),
        endYear: new Date().getFullYear(),
      });
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * Test Census API health
   */
  private async testCensusHealth(): Promise<boolean> {
    try {
      const response = await censusApiService.fetchACS(['B01003_001E'], {
        year: 2023,
        geography: 'us:*',
      });
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * Test Alpha Vantage API health
   */
  private async testAlphaVantageHealth(): Promise<boolean> {
    try {
      if (!alphaVantageApiService.isConfigured()) return false;
      const response = await alphaVantageApiService.fetchEconomicIndicator('REAL_GDP');
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * Enable or disable proxy usage
   */
  setProxyEnabled(enabled: boolean): void {
    this.useProxy = enabled;
    if (!enabled) {
      this.proxyAvailable = false;
    } else {
      this.proxyAvailable = null; // Reset to trigger availability check
    }
  }

  /**
   * Check if proxy is currently being used
   */
  isProxyEnabled(): boolean {
    return this.useProxy;
  }

  /**
   * Get proxy status
   */
  async getProxyStatus(): Promise<{ enabled: boolean; available: boolean; health?: Record<string, unknown> }> {
    const available = await this.checkProxyAvailability();
    let health: Record<string, unknown> | undefined = undefined;

    if (available) {
      try {
        health = await proxyApiService.checkHealth();
      } catch {
        // Ignore health check errors
      }
    }

    return {
      enabled: this.useProxy,
      available,
      health,
    };
  }

  /**
   * Get available data types and their sources
   */
  getAvailableDataTypes(): Record<string, { provider: string; description: string; configured: boolean }> {
    return {
      'house-prices': {
        provider: 'FRED',
        description: 'Case-Shiller U.S. National Home Price Index',
        configured: fredApiService.isConfigured(),
      },
      'salary-income': {
        provider: 'BLS',
        description: 'Average hourly earnings of all employees',
        configured: blsApiService.isConfigured(),
      },
      'cost-of-living': {
        provider: 'BLS',
        description: 'Consumer Price Index - All Urban Consumers',
        configured: blsApiService.isConfigured(),
      },
      'interest-rates': {
        provider: 'FRED',
        description: 'Federal Funds Effective Rate',
        configured: fredApiService.isConfigured(),
      },
      'unemployment-rate': {
        provider: 'FRED',
        description: 'Unemployment Rate',
        configured: fredApiService.isConfigured(),
      },
      'inflation-rate': {
        provider: 'ALPHA_VANTAGE',
        description: 'Inflation Rate',
        configured: alphaVantageApiService.isConfigured(),
      },
      'gdp-growth': {
        provider: 'FRED',
        description: 'Gross Domestic Product',
        configured: fredApiService.isConfigured(),
      },
      // New Economic Indicators
      'inflation-cpi': {
        provider: 'FRED',
        description: 'Consumer Price Index for All Urban Consumers',
        configured: fredApiService.isConfigured(),
      },
      'core-inflation': {
        provider: 'FRED',
        description: 'Consumer Price Index Less Food and Energy',
        configured: fredApiService.isConfigured(),
      },
      'fed-balance-sheet': {
        provider: 'FRED',
        description: 'All Federal Reserve Banks: Total Assets',
        configured: fredApiService.isConfigured(),
      },
      'federal-funds-rate': {
        provider: 'FRED',
        description: 'Federal Funds Effective Rate',
        configured: fredApiService.isConfigured(),
      },
      'money-supply-m1': {
        provider: 'FRED',
        description: 'M1 Money Stock',
        configured: fredApiService.isConfigured(),
      },
      'money-supply-m2': {
        provider: 'FRED',
        description: 'M2 Money Stock',
        configured: fredApiService.isConfigured(),
      },
      'treasury-10y': {
        provider: 'FRED',
        description: '10-Year Treasury Constant Maturity Rate',
        configured: fredApiService.isConfigured(),
      },
      'treasury-2y': {
        provider: 'FRED',
        description: '2-Year Treasury Constant Maturity Rate',
        configured: fredApiService.isConfigured(),
      },
    };
  }

  /**
   * Clear all caches
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
}

// Export singleton instance
export const realApiService = new RealApiService();
export default realApiService;
