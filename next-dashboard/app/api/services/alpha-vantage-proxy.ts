/**
 * Alpha Vantage API Proxy Service
 * 
 * Server-side proxy for Alpha Vantage financial and economic data API
 * Handles CORS, rate limiting, and API key security
 */

import {
  ProxyApiResponse,
  StandardDataPoint,
  ProxyError,
  PROXY_API_ENDPOINTS,
} from '../types/proxy';
import {
  checkRateLimit,
  getCachedResponse,
  setCachedResponse,
  generateCacheKey,
  getOptionalEnvVar,
  makeHttpRequest,
  createErrorResponse,
  createSuccessResponse,
  logApiRequest,
} from '../utils/proxy-utils';

/**
 * Alpha Vantage API Response Interfaces
 */
export interface AlphaVantageDataPoint {
  date: string;
  value: string;
}

export interface AlphaVantageResponse {
  name: string;
  interval: string;
  unit: string;
  data: AlphaVantageDataPoint[];
}

export interface TimeSeriesValues {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
}

export interface TimeSeriesData {
  [key: string]: TimeSeriesValues;
}

export interface AlphaVantageTimeSeriesResponse {
  'Meta Data': Record<string, string>;
  'Time Series (Daily)'?: TimeSeriesData;
  'Weekly Time Series'?: TimeSeriesData;
  'Monthly Time Series'?: TimeSeriesData;
}

/**
 * Alpha Vantage API Proxy Service Class
 */
export class AlphaVantageProxyService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = 'https://www.alphavantage.co/query';
    this.apiKey = getOptionalEnvVar('ALPHA_VANTAGE_API_KEY') || '';
  }

  /**
   * Fetch series data from Alpha Vantage API
   */
  async fetchSeries(
    dataType: string,
    options: {
      startDate?: string;
      endDate?: string;
      useCache?: boolean;
    } = {}
  ): Promise<ProxyApiResponse<StandardDataPoint[]>> {
    const { useCache = true } = options;
    const startTime = Date.now();

    try {
      // Check if API key is configured
      if (!this.apiKey) {
        const error: ProxyError = {
          type: 'validation',
          message: 'Alpha Vantage API key not configured',
          statusCode: 503,
          retryable: false,
        };
        logApiRequest('ALPHA_VANTAGE', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'Alpha Vantage API Proxy');
      }

      // Get endpoint configuration
      const endpointConfig = PROXY_API_ENDPOINTS[dataType];
      if (!endpointConfig || endpointConfig.provider !== 'ALPHA_VANTAGE') {
        const error: ProxyError = {
          type: 'validation',
          message: `No Alpha Vantage endpoint configured for data type: ${dataType}`,
          statusCode: 400,
          retryable: false,
        };
        logApiRequest('ALPHA_VANTAGE', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'Alpha Vantage API Proxy');
      }

      // Check rate limits (Alpha Vantage has strict limits)
      if (!checkRateLimit('ALPHA_VANTAGE')) {
        const error: ProxyError = {
          type: 'rate_limit',
          message: 'Alpha Vantage API rate limit exceeded',
          statusCode: 429,
          retryable: true,
        };
        logApiRequest('ALPHA_VANTAGE', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'Alpha Vantage API Proxy');
      }

      // Generate cache key
      const cacheKey = generateCacheKey('ALPHA_VANTAGE', dataType, {
        startDate: options.startDate || '',
        endDate: options.endDate || '',
        useCache: useCache.toString()
      });

      // Check cache if enabled (important for Alpha Vantage due to rate limits)
      if (useCache) {
        const cachedResponse = getCachedResponse<ProxyApiResponse<StandardDataPoint[]>>(cacheKey);
        if (cachedResponse) {
          logApiRequest('ALPHA_VANTAGE', dataType, true, Date.now() - startTime, 'Cache hit');
          return cachedResponse;
        }
      }

      // Get function and parameters for Alpha Vantage
      const functionName = this.getAlphaVantageFunction(dataType);
      if (!functionName) {
        const error: ProxyError = {
          type: 'validation',
          message: `No Alpha Vantage function mapping found for data type: ${dataType}`,
          statusCode: 400,
          retryable: false,
        };
        logApiRequest('ALPHA_VANTAGE', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'Alpha Vantage API Proxy');
      }

      // Build request parameters
      const params = new URLSearchParams({
        function: functionName,
        apikey: this.apiKey,
        datatype: 'json',
        ...endpointConfig.params,
      });

      // Make API request
      const url = `${this.baseUrl}?${params}`;
      const response = await makeHttpRequest(url);
      const data = await response.json();

      // Check for Alpha Vantage specific errors
      if (data['Error Message']) {
        const error: ProxyError = {
          type: 'api',
          message: `Alpha Vantage API error: ${data['Error Message']}`,
          statusCode: 400,
          retryable: false,
        };
        logApiRequest('ALPHA_VANTAGE', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'Alpha Vantage API Proxy');
      }

      if (data['Note']) {
        const error: ProxyError = {
          type: 'rate_limit',
          message: `Alpha Vantage rate limit: ${data['Note']}`,
          statusCode: 429,
          retryable: true,
        };
        logApiRequest('ALPHA_VANTAGE', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'Alpha Vantage API Proxy');
      }

      // Transform data based on function type
      const transformedData = this.transformAlphaVantageData(data, functionName);

      const successResponse = createSuccessResponse(
        transformedData,
        'Alpha Vantage API Proxy',
        {
          totalRecords: transformedData.length,
          rateLimit: {
            remaining: 4, // Conservative estimate (5 requests per minute)
            resetTime: new Date(Date.now() + 60000),
          },
        }
      );

      // Cache the response for longer due to rate limits
      if (useCache) {
        setCachedResponse(cacheKey, successResponse, 4 * 60 * 60 * 1000); // Cache for 4 hours
      }

      logApiRequest('ALPHA_VANTAGE', dataType, true, Date.now() - startTime);
      return successResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Handle specific error types
      if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch')) {
        const corsError: ProxyError = {
          type: 'network',
          message: 'Network error accessing Alpha Vantage API',
          statusCode: 502,
          retryable: true,
        };
        logApiRequest('ALPHA_VANTAGE', dataType, false, Date.now() - startTime, corsError.message);
        return createErrorResponse(corsError, 'Alpha Vantage API Proxy');
      }

      const serverError: ProxyError = {
        type: 'unknown',
        message: `Alpha Vantage API proxy error: ${errorMessage}`,
        statusCode: 500,
        retryable: true,
      };
      logApiRequest('ALPHA_VANTAGE', dataType, false, Date.now() - startTime, serverError.message);
      return createErrorResponse(serverError, 'Alpha Vantage API Proxy');
    }
  }

  /**
   * Transform Alpha Vantage data to standard format
   */
  private transformAlphaVantageData(data: unknown, _functionName: string): StandardDataPoint[] {
    try {
      // Handle economic indicator data
      const dataObj = data as Record<string, unknown>;
      if (dataObj.data && Array.isArray(dataObj.data)) {
        return dataObj.data
          .map((item: AlphaVantageDataPoint) => ({
            date: item.date,
            value: parseFloat(item.value),
            label: this.formatDateLabel(item.date),
          }))
          .filter((item: StandardDataPoint) => !isNaN(item.value))
          .sort((a: StandardDataPoint, b: StandardDataPoint) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }

      // Handle time series data
      const timeSeriesKey = this.getTimeSeriesKey(dataObj);
      if (timeSeriesKey && dataObj[timeSeriesKey]) {
        const timeSeries = dataObj[timeSeriesKey];
        return Object.entries(timeSeries)
          .map(([date, values]: [string, Record<string, string>]) => ({
            date,
            value: parseFloat(values['4. close'] || values['1. open'] || '0'),
            label: this.formatDateLabel(date),
          }))
          .filter((item: StandardDataPoint) => !isNaN(item.value))
          .sort((a: StandardDataPoint, b: StandardDataPoint) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }

      return [];
    } catch (error) {
      console.error('Error transforming Alpha Vantage data:', error);
      return [];
    }
  }

  /**
   * Get Alpha Vantage function for data type
   */
  private getAlphaVantageFunction(dataType: string): string | null {
    const functionMap: Record<string, string> = {
      'investment-returns': 'TIME_SERIES_MONTHLY',
      'interest-rates': 'FEDERAL_FUNDS_RATE',
      'inflation-cpi': 'CPI',
      'gdp-growth': 'REAL_GDP',
      'unemployment-rate': 'UNEMPLOYMENT',
    };

    return functionMap[dataType] || null;
  }

  /**
   * Get time series key from response
   */
  private getTimeSeriesKey(data: Record<string, unknown>): string | null {
    const keys = [
      'Time Series (Daily)',
      'Weekly Time Series',
      'Monthly Time Series',
      'Time Series FX (Daily)',
      'Time Series FX (Weekly)',
      'Time Series FX (Monthly)',
    ];

    return keys.find(key => data[key]) || null;
  }

  /**
   * Format date label for display
   */
  private formatDateLabel(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return dateString;
    }
  }

  /**
   * Get available Alpha Vantage functions
   */
  getCommonFunctions(): Record<string, string> {
    return {
      realGdp: 'REAL_GDP',
      cpi: 'CPI',
      federalFundsRate: 'FEDERAL_FUNDS_RATE',
      unemployment: 'UNEMPLOYMENT',
      treasuryYield: 'TREASURY_YIELD',
      retailSales: 'RETAIL_SALES',
      durableGoods: 'DURABLES',
      consumerSentiment: 'CONSUMER_SENTIMENT',
    };
  }
}

// Export singleton instance
export const alphaVantageProxyService = new AlphaVantageProxyService();
export default alphaVantageProxyService;
