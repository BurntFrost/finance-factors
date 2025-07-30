/**
 * FRED API Proxy Service
 * 
 * Server-side proxy for Federal Reserve Economic Data (FRED) API
 * Handles CORS, rate limiting, and API key security
 */

import {
  ProxyApiResponse,
  StandardDataPoint,
  FredApiResponse,
  ProxyError,
  PROXY_API_ENDPOINTS,
} from '@/shared/types/proxy';
import {
  checkRateLimit,
  transformFredData,
  getRequiredEnvVar,
  makeHttpRequest,
  createErrorResponse,
  createSuccessResponse,
  logApiRequest,
} from '@/shared/utils/proxy-utils';
import { apiCacheService } from '@/backend/lib/api-cache-service';
import { enhancedCircuitBreaker } from '@/backend/lib/enhanced-circuit-breaker';
import { rateLimitTracker } from '@/backend/lib/rate-limit-tracker';

/**
 * FRED API Proxy Service Class
 */
export class FredProxyService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = 'https://api.stlouisfed.org/fred';
    this.apiKey = getRequiredEnvVar('FRED_API_KEY');
  }

  /**
   * Fetch series data from FRED API
   */
  async fetchSeries(
    dataType: string,
    options: {
      startDate?: string;
      endDate?: string;
      useCache?: boolean;
    } = {}
  ): Promise<ProxyApiResponse<StandardDataPoint[]>> {
    const startTime = Date.now();

    try {
      // Get endpoint configuration
      const endpointConfig = PROXY_API_ENDPOINTS[dataType];
      if (!endpointConfig || endpointConfig.provider !== 'FRED') {
        const error: ProxyError = {
          type: 'validation',
          message: `Invalid FRED data type: ${dataType}`,
          statusCode: 400,
          retryable: false,
        };
        return createErrorResponse(error, 'FRED API Proxy');
      }

      const { seriesId, params: defaultParams } = endpointConfig;
      if (!seriesId) {
        const error: ProxyError = {
          type: 'validation',
          message: 'Series ID is required for FRED API',
          statusCode: 400,
          retryable: false,
        };
        return createErrorResponse(error, 'FRED API Proxy');
      }

      // Check enhanced circuit breaker (includes rate limit checking)
      const shouldAllow = await enhancedCircuitBreaker.shouldAllowRequest('FRED', dataType);
      if (!shouldAllow) {
        const circuitState = await enhancedCircuitBreaker.getCircuitBreakerState('FRED', dataType);

        let errorMessage = 'FRED API circuit breaker is open';
        if (circuitState.state === 'rate-limited') {
          errorMessage = 'FRED API rate limit exceeded';
          if (circuitState.rateLimitStatus?.cooldownExpiresAt) {
            const timeUntilReset = Math.ceil((circuitState.rateLimitStatus.cooldownExpiresAt.getTime() - Date.now()) / 1000);
            errorMessage += ` - cooldown expires in ${timeUntilReset}s`;
          }
        }

        const error: ProxyError = {
          type: circuitState.state === 'rate-limited' ? 'rate_limit' : 'circuit_breaker',
          message: errorMessage,
          statusCode: circuitState.state === 'rate-limited' ? 429 : 503,
          retryable: true,
        };

        logApiRequest('FRED', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'FRED API Proxy');
      }

      // Build request parameters
      const params = new URLSearchParams({
        series_id: seriesId,
        api_key: this.apiKey,
        ...defaultParams,
      });

      if (options.startDate) {
        params.append('observation_start', options.startDate);
      }
      if (options.endDate) {
        params.append('observation_end', options.endDate);
      }

      // Generate cache key with enhanced service
      const cacheParams = {
        seriesId,
        startDate: options.startDate,
        endDate: options.endDate,
        ...Object.fromEntries(params),
      };
      const cacheKey = apiCacheService.generateCacheKey('FRED', dataType, cacheParams);

      // Check cache if enabled
      if (options.useCache !== false) {
        const cached = await apiCacheService.getCachedApiData<StandardDataPoint[]>(cacheKey);
        if (cached) {
          logApiRequest('FRED', dataType, true, Date.now() - startTime);
          return createSuccessResponse(
            cached,
            'FRED API (Cached)',
            {
              totalRecords: cached.length,
              rateLimit: {
                remaining: 120, // FRED allows 120 requests per minute
                resetTime: new Date(Date.now() + 60000),
              },
            }
          );
        }
      }

      // Make API request
      const url = `${this.baseUrl}/series/observations?${params}`;
      const response = await makeHttpRequest(url);
      const data: FredApiResponse = await response.json();

      // Check for FRED API specific errors
      if ('error_code' in data) {
        const error: ProxyError = {
          type: 'api',
          message: `FRED API error: ${(data as unknown as { error_message: string }).error_message}`,
          statusCode: 400,
          retryable: false,
        };
        logApiRequest('FRED', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'FRED API Proxy');
      }

      if (!data.observations || !Array.isArray(data.observations)) {
        const error: ProxyError = {
          type: 'api',
          message: 'Invalid response format from FRED API',
          statusCode: 502,
          retryable: true,
        };
        logApiRequest('FRED', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'FRED API Proxy');
      }

      // Transform data to standard format
      const transformedData = transformFredData(data.observations);

      if (transformedData.length === 0) {
        const error: ProxyError = {
          type: 'api',
          message: 'No valid data points found in FRED response',
          statusCode: 404,
          retryable: false,
        };
        logApiRequest('FRED', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'FRED API Proxy');
      }

      // Cache the response with enhanced service
      if (options.useCache !== false) {
        await apiCacheService.setCachedApiData(cacheKey, transformedData);
      }

      const duration = Date.now() - startTime;
      logApiRequest('FRED', dataType, true, duration);

      // Record successful request in circuit breaker
      await enhancedCircuitBreaker.recordSuccess('FRED', dataType);

      return createSuccessResponse(
        transformedData,
        'FRED API',
        {
          totalRecords: data.count,
          rateLimit: {
            remaining: 120, // FRED allows 120 requests per minute
            resetTime: new Date(Date.now() + 60000),
          },
        },
        duration
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      logApiRequest('FRED', dataType, false, duration, errorMessage);

      // Determine error type and check for rate limiting
      let errorType: ProxyError['type'] = 'unknown';
      let statusCode = 500;
      let retryable = true;
      let isRateLimit = false;

      // Check for rate limit indicators
      if (errorMessage.includes('rate limit') ||
          errorMessage.includes('too many requests') ||
          errorMessage.includes('429') ||
          statusCode === 429) {
        errorType = 'rate_limit';
        statusCode = 429;
        isRateLimit = true;
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNRESET')) {
        errorType = 'network';
        statusCode = 504;
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
        errorType = 'network';
        statusCode = 503;
      } else if (errorMessage.includes('HTTP 4')) {
        errorType = 'api';
        statusCode = 400;
        retryable = false;
      }

      // Record failure in circuit breaker
      await enhancedCircuitBreaker.recordFailure('FRED', dataType, errorMessage, isRateLimit);

      const proxyError: ProxyError = {
        type: errorType,
        message: `FRED API request failed: ${errorMessage}`,
        statusCode,
        retryable,
      };

      return createErrorResponse(proxyError, 'FRED API Proxy', duration);
    }
  }

  /**
   * Get series information/metadata
   */
  async getSeriesInfo(seriesId: string): Promise<ProxyApiResponse<Record<string, unknown>>> {
    const startTime = Date.now();
    const dataType = 'series-info'; // Generic data type for series info requests

    try {
      // Check enhanced circuit breaker
      const shouldAllow = await enhancedCircuitBreaker.shouldAllowRequest('FRED', dataType);
      if (!shouldAllow) {
        const circuitState = await enhancedCircuitBreaker.getCircuitBreakerState('FRED', dataType);

        let errorMessage = 'FRED API circuit breaker is open';
        if (circuitState.state === 'rate-limited') {
          errorMessage = 'FRED API rate limit exceeded';
        }

        const error: ProxyError = {
          type: circuitState.state === 'rate-limited' ? 'rate_limit' : 'circuit_breaker',
          message: errorMessage,
          statusCode: circuitState.state === 'rate-limited' ? 429 : 503,
          retryable: true,
        };
        return createErrorResponse(error, 'FRED API Proxy');
      }

      const params = new URLSearchParams({
        series_id: seriesId,
        api_key: this.apiKey,
        file_type: 'json',
      });

      const url = `${this.baseUrl}/series?${params}`;
      const response = await makeHttpRequest(url);
      const data = await response.json();

      if ('error_code' in data) {
        const error: ProxyError = {
          type: 'api',
          message: `FRED API error: ${data.error_message}`,
          statusCode: 400,
          retryable: false,
        };
        return createErrorResponse(error, 'FRED API Proxy');
      }

      const seriesInfo = data.seriess?.[0] || null;

      logApiRequest('FRED', `info-${seriesId}`, true, Date.now() - startTime);

      // Record successful request in circuit breaker
      await enhancedCircuitBreaker.recordSuccess('FRED', dataType);

      return createSuccessResponse(seriesInfo, 'FRED API');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logApiRequest('FRED', `info-${seriesId}`, false, Date.now() - startTime, errorMessage);

      // Check for rate limit and record failure
      const isRateLimit = errorMessage.includes('rate limit') ||
                         errorMessage.includes('too many requests') ||
                         errorMessage.includes('429');

      await enhancedCircuitBreaker.recordFailure('FRED', dataType, errorMessage, isRateLimit);

      const proxyError: ProxyError = {
        type: isRateLimit ? 'rate_limit' : 'unknown',
        message: `FRED API request failed: ${errorMessage}`,
        statusCode: isRateLimit ? 429 : 500,
        retryable: true,
      };

      return createErrorResponse(proxyError, 'FRED API Proxy');
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get available series for common economic indicators
   */
  getCommonSeries(): Record<string, string> {
    return {
      housePrices: 'CSUSHPISA', // Case-Shiller U.S. National Home Price Index
      federalFunds: 'FEDFUNDS', // Federal Funds Effective Rate
      unemployment: 'UNRATE', // Unemployment Rate
      gdp: 'GDP', // Gross Domestic Product
      cpi: 'CPIAUCSL', // Consumer Price Index for All Urban Consumers
      realGdp: 'GDPC1', // Real Gross Domestic Product
      treasuryYield10Y: 'GS10', // 10-Year Treasury Constant Maturity Rate
      treasuryYield2Y: 'GS2', // 2-Year Treasury Constant Maturity Rate
      personalIncome: 'PI', // Personal Income
      disposableIncome: 'DSPI', // Disposable Personal Income
      coreInflation: 'CPILFESL', // Core CPI
      moneySupplyM1: 'M1SL', // M1 Money Stock
      moneySupplyM2: 'M2SL', // M2 Money Stock
      fedBalanceSheet: 'WALCL', // All Federal Reserve Banks: Total Assets
    };
  }
}

// Export singleton instance
export const fredProxyService = new FredProxyService();
