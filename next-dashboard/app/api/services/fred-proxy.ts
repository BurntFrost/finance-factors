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
} from '../types/proxy';
import {
  checkRateLimit,
  getCachedResponse,
  setCachedResponse,
  generateLegacyCacheKey,
  transformFredData,
  getRequiredEnvVar,
  makeHttpRequest,
  createErrorResponse,
  createSuccessResponse,
  logApiRequest,
} from '../utils/proxy-utils';

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

      // Check rate limits
      if (!(await checkRateLimit('FRED'))) {
        const error: ProxyError = {
          type: 'rate_limit',
          message: 'FRED API rate limit exceeded',
          statusCode: 429,
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

      // Generate cache key
      const cacheKey = generateLegacyCacheKey('FRED', seriesId, Object.fromEntries(params));

      // Check cache if enabled
      if (options.useCache !== false) {
        const cached = await getCachedResponse<StandardDataPoint[]>(cacheKey);
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

      // Cache the response
      if (options.useCache !== false) {
        await setCachedResponse(cacheKey, transformedData, undefined, 'FRED API');
      }

      const duration = Date.now() - startTime;
      logApiRequest('FRED', dataType, true, duration);

      return createSuccessResponse(
        transformedData,
        'FRED API',
        {
          totalRecords: data.count,
          rateLimit: {
            remaining: 120, // FRED allows 120 requests per minute
            resetTime: new Date(Date.now() + 60000),
          },
        }
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logApiRequest('FRED', dataType, false, duration, errorMessage);

      // Determine error type based on error message
      let errorType: ProxyError['type'] = 'unknown';
      let statusCode = 500;
      let retryable = true;

      if (errorMessage.includes('timeout') || errorMessage.includes('ECONNRESET')) {
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

      const proxyError: ProxyError = {
        type: errorType,
        message: `FRED API request failed: ${errorMessage}`,
        statusCode,
        retryable,
      };

      return createErrorResponse(proxyError, 'FRED API Proxy');
    }
  }

  /**
   * Get series information/metadata
   */
  async getSeriesInfo(seriesId: string): Promise<ProxyApiResponse<Record<string, unknown>>> {
    const startTime = Date.now();
    
    try {
      if (!checkRateLimit('FRED')) {
        const error: ProxyError = {
          type: 'rate_limit',
          message: 'FRED API rate limit exceeded',
          statusCode: 429,
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

      return createSuccessResponse(seriesInfo, 'FRED API');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logApiRequest('FRED', `info-${seriesId}`, false, Date.now() - startTime, errorMessage);

      const proxyError: ProxyError = {
        type: 'unknown',
        message: `FRED API request failed: ${errorMessage}`,
        statusCode: 500,
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
