/**
 * World Bank API Proxy Service
 * 
 * Server-side proxy for World Bank Open Data API
 * Handles CORS, rate limiting, and data transformation
 * No API key required - completely free access
 */

import {
  ProxyApiResponse,
  StandardDataPoint,
  WorldBankDataPoint,
  WorldBankApiResponse,
  ProxyError,
  PROXY_API_ENDPOINTS,
} from '../../../lib/shared/types/proxy';
import {
  checkRateLimit,
  getCachedResponse,
  setCachedResponse,
  generateLegacyCacheKey,
  makeHttpRequest,
  createErrorResponse,
  createSuccessResponse,
  logApiRequest,
  transformWorldBankData,
} from '../../../lib/shared/utils/proxy-utils';

/**
 * World Bank API Proxy Service Class
 */
export class WorldBankProxyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://api.worldbank.org/v2';
  }

  /**
   * Fetch series data from World Bank API
   */
  async fetchSeries(
    dataType: string,
    options: {
      startDate?: string;
      endDate?: string;
      useCache?: boolean;
      countryCode?: string;
    } = {}
  ): Promise<ProxyApiResponse<StandardDataPoint[]>> {
    const startTime = Date.now();
    const { useCache = true, countryCode = 'US' } = options;

    try {
      // Get endpoint configuration
      const endpointConfig = PROXY_API_ENDPOINTS[dataType];
      if (!endpointConfig || endpointConfig.provider !== 'WORLD_BANK') {
        const error: ProxyError = {
          type: 'validation',
          message: `Invalid World Bank data type: ${dataType}`,
          statusCode: 400,
          retryable: false,
        };
        return createErrorResponse(error, 'World Bank API');
      }

      // Check rate limits - World Bank API has no rate limits, so we skip this check
      // const rateLimitAllowed = await checkRateLimit('world-bank', 'world-bank-api');
      // if (!rateLimitAllowed) {
      //   const error: ProxyError = {
      //     type: 'rate_limit',
      //     message: 'Rate limit exceeded for World Bank API',
      //     statusCode: 429,
      //     retryable: true,
      //   };
      //   return createErrorResponse(error, 'World Bank API');
      // }

      // Generate cache key
      const cacheKey = generateLegacyCacheKey('world-bank', dataType, {
        countryCode: endpointConfig.countryCode || countryCode || '',
        indicatorId: endpointConfig.indicatorId || '',
        startDate: options.startDate || '',
        endDate: options.endDate || '',
      });

      // Check cache first
      if (useCache) {
        const cachedData = await getCachedResponse<StandardDataPoint[]>(cacheKey);
        if (cachedData) {
          logApiRequest('WORLD_BANK', dataType, true, Date.now() - startTime);
          return createSuccessResponse(
            cachedData,
            'World Bank API (Cached)',
            { isFallback: false },
            Date.now() - startTime
          );
        }
      }

      // Build API URL
      const apiUrl = this.buildApiUrl(endpointConfig, options);

      // Make the API request
      const response = await makeHttpRequest(apiUrl);
      
      if (!response.ok) {
        const error: ProxyError = {
          type: 'api',
          message: `World Bank API error: ${response.status} ${response.statusText}`,
          statusCode: response.status,
          retryable: response.status >= 500,
        };
        logApiRequest('WORLD_BANK', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'World Bank API');
      }

      const data = await response.json();
      
      // World Bank API returns an array with metadata and data
      if (!Array.isArray(data) || data.length < 2) {
        const error: ProxyError = {
          type: 'api',
          message: 'Invalid World Bank API response format',
          statusCode: 500,
          retryable: false,
        };
        logApiRequest('WORLD_BANK', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'World Bank API');
      }

      const [metadata, dataPoints] = data;
      
      if (!Array.isArray(dataPoints)) {
        const error: ProxyError = {
          type: 'api',
          message: 'No data points found in World Bank API response',
          statusCode: 404,
          retryable: false,
        };
        logApiRequest('WORLD_BANK', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'World Bank API');
      }

      // Transform data to standard format
      const transformedData = transformWorldBankData(dataPoints);
      
      if (transformedData.length === 0) {
        const error: ProxyError = {
          type: 'api',
          message: 'No valid data points found after transformation',
          statusCode: 404,
          retryable: false,
        };
        logApiRequest('WORLD_BANK', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'World Bank API');
      }

      // Cache the transformed data
      if (useCache) {
        await setCachedResponse(cacheKey, transformedData, 24 * 60 * 60 * 1000, 'World Bank API');
      }

      const duration = Date.now() - startTime;
      logApiRequest('WORLD_BANK', dataType, true, duration);

      return createSuccessResponse(
        transformedData,
        'World Bank API',
        {
          isFallback: false,
          totalRecords: transformedData.length,
        },
        duration
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown World Bank API error';

      logApiRequest('WORLD_BANK', dataType, false, duration, errorMessage);

      const proxyError: ProxyError = {
        type: 'network',
        message: errorMessage,
        statusCode: 500,
        retryable: true,
      };
      return createErrorResponse(proxyError, 'World Bank API');
    }
  }

  /**
   * Build API URL with parameters
   */
  private buildApiUrl(
    endpointConfig: typeof PROXY_API_ENDPOINTS[string],
    options: { startDate?: string; endDate?: string; countryCode?: string }
  ): string {
    const baseUrl = `${this.baseUrl}${endpointConfig.endpoint}`;
    const params = new URLSearchParams(endpointConfig.params || {});

    // Add date range if provided
    if (options.startDate && options.endDate) {
      const startYear = new Date(options.startDate).getFullYear();
      const endYear = new Date(options.endDate).getFullYear();
      params.set('date', `${startYear}:${endYear}`);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Format date label for display
   */
  private formatDateLabel(date: string): string {
    return new Date(date).getFullYear().toString();
  }
}

// Export singleton instance
export const worldBankProxyService = new WorldBankProxyService();
