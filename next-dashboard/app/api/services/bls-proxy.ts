/**
 * BLS API Proxy Service
 * 
 * Server-side proxy for Bureau of Labor Statistics API
 * Handles CORS, rate limiting, caching, and API key security
 */

import {
  ProxyApiResponse,
  StandardDataPoint,
  ProxyError,
  PROXY_API_ENDPOINTS,
} from '../types/proxy';
import {
  createErrorResponse,
  createSuccessResponse,
  checkRateLimit,
  makeHttpRequest,
} from '../utils/proxy-utils';

export interface BlsDataPoint {
  year: string;
  period: string;
  periodName: string;
  latest: string;
  value: string;
  footnotes: Array<{
    code: string;
    text: string;
  }>;
}

export interface BlsSeries {
  seriesID: string;
  data: BlsDataPoint[];
}

export interface BlsApiResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: BlsSeries[];
  };
}

export interface BlsRequestBody {
  seriesid: string[];
  startyear?: string;
  endyear?: string;
  catalog?: boolean;
  calculations?: boolean;
  annualaverage?: boolean;
  aspects?: boolean;
  disable_ssl?: boolean;
  registrationkey?: string;
}

class BlsProxyService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.BLS_BASE_URL || 'https://api.bls.gov/publicAPI/v2';
    this.apiKey = process.env.BLS_API_KEY || '';
  }

  /**
   * Fetch series data from BLS API
   */
  async fetchSeries(
    dataType: string,
    options: {
      startYear?: number;
      endYear?: number;
      useCache?: boolean;
    } = {}
  ): Promise<ProxyApiResponse<StandardDataPoint[]>> {
    const { startYear, endYear } = options;

    try {
      // Check rate limit
      if (!checkRateLimit('BLS')) {
        const error: ProxyError = {
          type: 'rate_limit',
          message: 'BLS API rate limit exceeded',
          statusCode: 429,
          retryable: true,
        };
        return createErrorResponse(error, 'BLS API Proxy');
      }

      // Get endpoint configuration
      const endpointConfig = PROXY_API_ENDPOINTS[dataType];
      if (!endpointConfig || endpointConfig.provider !== 'BLS') {
        const error: ProxyError = {
          type: 'validation',
          message: `Invalid BLS data type: ${dataType}`,
          statusCode: 400,
          retryable: false,
        };
        return createErrorResponse(error, 'BLS API Proxy');
      }

      if (!endpointConfig.seriesId) {
        const error: ProxyError = {
          type: 'validation',
          message: `Missing series ID for BLS data type: ${dataType}`,
          statusCode: 400,
          retryable: false,
        };
        return createErrorResponse(error, 'BLS API Proxy');
      }

      // Prepare request body
      const requestBody: BlsRequestBody = {
        seriesid: [endpointConfig.seriesId],
        calculations: true,
        annualaverage: true,
      };

      // Add date range if provided
      if (startYear) {
        requestBody.startyear = startYear.toString();
      }
      if (endYear) {
        requestBody.endyear = endYear.toString();
      }

      // Add API key if available
      if (this.apiKey) {
        requestBody.registrationkey = this.apiKey;
      }

      // Make request
      const url = `${this.baseUrl}/timeseries/data/`;
      const response = await makeHttpRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: BlsApiResponse = await response.json();

      // Check for API errors
      if (data.status !== 'REQUEST_SUCCEEDED') {
        const error: ProxyError = {
          type: 'api',
          message: `BLS API error: ${data.message?.join(', ') || 'Unknown error'}`,
          statusCode: 400,
          retryable: false,
        };
        return createErrorResponse(error, 'BLS API Proxy');
      }

      // Transform data to standard format
      const transformedData = this.transformBlsData(data.Results.series);

      return createSuccessResponse(
        transformedData,
        'BLS API Proxy',
        {
          totalRecords: transformedData.length,
          rateLimit: {
            remaining: this.apiKey ? 500 : 25, // Daily limits
            resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset daily
          },
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Handle specific error types
      if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch')) {
        const corsError: ProxyError = {
          type: 'network',
          message: 'Network error accessing BLS API',
          statusCode: 502,
          retryable: true,
        };
        return createErrorResponse(corsError, 'BLS API Proxy');
      }

      const serverError: ProxyError = {
        type: 'unknown',
        message: `BLS API proxy error: ${errorMessage}`,
        statusCode: 500,
        retryable: true,
      };
      return createErrorResponse(serverError, 'BLS API Proxy');
    }
  }

  /**
   * Transform BLS API data to standard format
   */
  private transformBlsData(series: BlsSeries[]): StandardDataPoint[] {
    const allData: StandardDataPoint[] = [];

    for (const seriesData of series) {
      for (const dataPoint of seriesData.data) {
        // Skip invalid data points
        if (!dataPoint.value || dataPoint.value === '.' || dataPoint.value === '') {
          continue;
        }

        // Parse date from year and period
        const date = this.parseBlsDate(dataPoint.year, dataPoint.period);
        if (!date) continue;

        // Parse value
        const value = parseFloat(dataPoint.value);
        if (isNaN(value)) continue;

        allData.push({
          date: date.toISOString().split('T')[0], // YYYY-MM-DD format
          value,
          label: dataPoint.periodName,
        });
      }
    }

    // Sort by date (newest first)
    return allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Parse BLS date format (year + period) to Date object
   */
  private parseBlsDate(year: string, period: string): Date | null {
    const yearNum = parseInt(year);
    if (isNaN(yearNum)) return null;

    // Handle different period formats
    if (period.startsWith('M')) {
      // Monthly data (M01, M02, etc.)
      const month = parseInt(period.substring(1));
      if (isNaN(month) || month < 1 || month > 12) return null;
      return new Date(yearNum, month - 1, 1); // month is 0-indexed
    } else if (period.startsWith('Q')) {
      // Quarterly data (Q01, Q02, etc.)
      const quarter = parseInt(period.substring(1));
      if (isNaN(quarter) || quarter < 1 || quarter > 4) return null;
      const month = (quarter - 1) * 3; // Q1=Jan, Q2=Apr, Q3=Jul, Q4=Oct
      return new Date(yearNum, month, 1);
    } else if (period === 'A01') {
      // Annual data
      return new Date(yearNum, 0, 1); // January 1st
    }

    return null;
  }
}

// Export singleton instance
export const blsProxyService = new BlsProxyService();
