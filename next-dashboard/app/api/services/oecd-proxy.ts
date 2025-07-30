/**
 * OECD API Proxy Service
 * 
 * Server-side proxy for OECD SDMX API
 * Handles CORS, data transformation, and SDMX format parsing
 * No API key required - completely free access
 */

import {
  ProxyApiResponse,
  StandardDataPoint,
  ProxyError,
  PROXY_API_ENDPOINTS,
} from '../../../lib/shared/types/proxy';
import {
  makeHttpRequest,
  createErrorResponse,
  createSuccessResponse,
  logApiRequest,
} from '../../../lib/shared/utils/proxy-utils';
import { apiCacheService } from '../../../lib/backend/lib/api-cache-service';

/**
 * OECD API Proxy Service Class
 */
export class OECDProxyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://sdmx.oecd.org/public/rest/data';
  }

  /**
   * Fetch series data from OECD API
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
    const { useCache = true, countryCode = 'USA' } = options;

    try {
      // Get endpoint configuration
      const endpointConfig = PROXY_API_ENDPOINTS[dataType];
      if (!endpointConfig || endpointConfig.provider !== 'OECD') {
        const error: ProxyError = {
          type: 'validation',
          message: `Invalid OECD data type: ${dataType}`,
          statusCode: 400,
          retryable: false,
        };
        return createErrorResponse(error, 'OECD API');
      }

      // OECD API has generous rate limits, so we skip rate limiting for now
      // In production, you might want to add rate limiting here

      // Generate cache key with enhanced service
      const cacheParams = {
        dataType,
        countryCode: endpointConfig.countryCode || countryCode || '',
        indicatorId: endpointConfig.indicatorId || '',
        startDate: options.startDate,
        endDate: options.endDate,
      };
      const cacheKey = apiCacheService.generateCacheKey('OECD', dataType, cacheParams);

      // Check cache first
      if (useCache) {
        const cached = await apiCacheService.getCachedApiData<StandardDataPoint[]>(cacheKey);
        if (cached) {
          logApiRequest('OECD', dataType, true, Date.now() - startTime);
          return createSuccessResponse(
            cached,
            'OECD API (Cached)',
            { isFallback: false, totalRecords: cached.length },
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
          message: `OECD API error: ${response.status} ${response.statusText}`,
          statusCode: response.status,
          retryable: response.status >= 500,
        };
        logApiRequest('OECD', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'OECD API');
      }

      const data = await response.json();
      
      // Transform SDMX data to standard format
      const transformedData = this.transformOECDData(data);
      
      if (transformedData.length === 0) {
        const error: ProxyError = {
          type: 'api',
          message: 'No valid data points found after transformation',
          statusCode: 404,
          retryable: false,
        };
        logApiRequest('OECD', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'OECD API');
      }

      // Cache the transformed data with enhanced service
      if (useCache) {
        await apiCacheService.setCachedApiData(cacheKey, transformedData);
      }

      const duration = Date.now() - startTime;
      logApiRequest('OECD', dataType, true, duration);

      return createSuccessResponse(
        transformedData,
        'OECD API',
        {
          isFallback: false,
          totalRecords: transformedData.length,
        },
        duration
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown OECD API error';

      logApiRequest('OECD', dataType, false, duration, errorMessage);

      const proxyError: ProxyError = {
        type: 'network',
        message: errorMessage,
        statusCode: 500,
        retryable: true,
      };
      return createErrorResponse(proxyError, 'OECD API');
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
      
      // OECD uses different date formats for different frequencies
      if (endpointConfig.endpoint?.includes('.M')) {
        // Monthly data
        const startMonth = new Date(options.startDate).getMonth() + 1;
        const endMonth = new Date(options.endDate).getMonth() + 1;
        params.set('startPeriod', `${startYear}-${startMonth.toString().padStart(2, '0')}`);
        params.set('endPeriod', `${endYear}-${endMonth.toString().padStart(2, '0')}`);
      } else {
        // Annual data
        params.set('startPeriod', startYear.toString());
        params.set('endPeriod', endYear.toString());
      }
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Transform OECD SDMX data to standard format
   */
  private transformOECDData(data: any): StandardDataPoint[] {
    try {
      // OECD SDMX JSON format can be complex, handle different structures
      if (data.data && data.data.dataSets && Array.isArray(data.data.dataSets)) {
        const dataSet = data.data.dataSets[0];
        if (dataSet && dataSet.series) {
          const seriesKey = Object.keys(dataSet.series)[0];
          const series = dataSet.series[seriesKey];
          
          if (series && series.observations) {
            const observations = series.observations;
            const points: StandardDataPoint[] = [];
            
            // Get time dimension from structure
            const timeDimension = data.data.structure?.dimensions?.observation?.find(
              (dim: any) => dim.id === 'TIME_PERIOD'
            );
            
            if (timeDimension && timeDimension.values) {
              Object.keys(observations).forEach((key, _index) => {
                const observation = observations[key];
                const timeValue = timeDimension.values[parseInt(key)];
                
                if (timeValue && observation && observation[0] !== null) {
                  const value = parseFloat(observation[0]);
                  if (!isNaN(value)) {
                    points.push({
                      date: this.parseOECDDate(timeValue.id),
                      value: value,
                      label: timeValue.id,
                    });
                  }
                }
              });
            }
            
            return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          }
        }
      }
      
      // Fallback: try to parse as simple array format
      if (Array.isArray(data)) {
        return data
          .filter(point => point.value !== null && point.value !== undefined)
          .map(point => ({
            date: this.parseOECDDate(point.TIME_PERIOD || point.date),
            value: typeof point.OBS_VALUE === 'string' ? parseFloat(point.OBS_VALUE) : point.OBS_VALUE,
            label: point.TIME_PERIOD || point.date,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
      
      return [];
    } catch (error) {
      console.error('Error transforming OECD data:', error);
      return [];
    }
  }

  /**
   * Parse OECD date format to ISO date
   */
  private parseOECDDate(oecdDate: string): string {
    try {
      // Handle different OECD date formats
      if (oecdDate.includes('-')) {
        // Monthly format: 2023-01
        const [year, month] = oecdDate.split('-');
        return `${year}-${month.padStart(2, '0')}-01`;
      } else if (oecdDate.includes('Q')) {
        // Quarterly format: 2023-Q1
        const [year, quarter] = oecdDate.split('-Q');
        const month = (parseInt(quarter) - 1) * 3 + 1;
        return `${year}-${month.toString().padStart(2, '0')}-01`;
      } else {
        // Annual format: 2023
        return `${oecdDate}-12-31`;
      }
    } catch (error) {
      console.error('Error parsing OECD date:', oecdDate, error);
      return `${oecdDate}-12-31`; // Fallback
    }
  }
}

// Export singleton instance
export const oecdProxyService = new OECDProxyService();
