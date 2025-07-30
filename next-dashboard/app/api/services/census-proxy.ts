/**
 * Census API Proxy Service
 * 
 * Server-side proxy for U.S. Census Bureau API
 * Handles CORS, rate limiting, and API key security
 */

import {
  ProxyApiResponse,
  StandardDataPoint,
  ProxyError,
  PROXY_API_ENDPOINTS,
} from '@/shared/types/proxy';
import {
  checkRateLimit,
  getOptionalEnvVar,
  makeHttpRequest,
  createErrorResponse,
  createSuccessResponse,
  logApiRequest,
} from '@/shared/utils/proxy-utils';
import { apiCacheService } from '@/backend/lib/api-cache-service';

/**
 * Census API Response Interface
 */
export type CensusApiResponse = string[][];

/**
 * Census API Proxy Service Class
 */
export class CensusProxyService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = 'https://api.census.gov/data';
    this.apiKey = getOptionalEnvVar('CENSUS_API_KEY') || '';
  }

  /**
   * Fetch series data from Census API
   */
  async fetchSeries(
    dataType: string,
    options: {
      startYear?: number;
      endYear?: number;
      useCache?: boolean;
    } = {}
  ): Promise<ProxyApiResponse<StandardDataPoint[]>> {
    const { startYear, endYear, useCache = true } = options;
    const startTime = Date.now();

    try {
      // Get endpoint configuration
      const endpointConfig = PROXY_API_ENDPOINTS[dataType];
      if (!endpointConfig || endpointConfig.provider !== 'CENSUS') {
        const error: ProxyError = {
          type: 'validation',
          message: `No Census endpoint configured for data type: ${dataType}`,
          statusCode: 400,
          retryable: false,
        };
        logApiRequest('CENSUS', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'Census API Proxy');
      }

      // Check rate limits
      if (!(await checkRateLimit('CENSUS'))) {
        const error: ProxyError = {
          type: 'rate_limit',
          message: 'Census API rate limit exceeded',
          statusCode: 429,
          retryable: true,
        };
        logApiRequest('CENSUS', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'Census API Proxy');
      }

      // Generate cache key with enhanced service
      const cacheParams = {
        dataType,
        startYear: startYear || 2015,
        endYear: endYear || 2023,
      };
      const cacheKey = apiCacheService.generateCacheKey('CENSUS', dataType, cacheParams);

      // Check cache if enabled
      if (useCache) {
        const cached = await apiCacheService.getCachedApiData<StandardDataPoint[]>(cacheKey);
        if (cached) {
          logApiRequest('CENSUS', dataType, true, Date.now() - startTime, 'Cache hit');
          return createSuccessResponse(
            cached,
            'Census API (Cached)',
            {
              totalRecords: cached.length,
              rateLimit: {
                remaining: 450, // Conservative estimate based on Census rate limits
                resetTime: new Date(Date.now() + 60000),
              },
            }
          );
        }
      }

      // Get Census variable and configuration
      const variable = this.getCensusVariable(dataType);
      if (!variable) {
        const error: ProxyError = {
          type: 'validation',
          message: `No Census variable mapping found for data type: ${dataType}`,
          statusCode: 400,
          retryable: false,
        };
        logApiRequest('CENSUS', dataType, false, Date.now() - startTime, error.message);
        return createErrorResponse(error, 'Census API Proxy');
      }

      // Fetch historical data across multiple years
      const data = await this.fetchHistoricalData(variable, {
        startYear: startYear || 2015,
        endYear: endYear || 2023,
      });

      // Transform data to standard format
      const transformedData = this.transformCensusData(data, variable);

      // Cache the response with enhanced service
      if (useCache) {
        await apiCacheService.setCachedApiData(cacheKey, transformedData);
      }

      const duration = Date.now() - startTime;
      logApiRequest('CENSUS', dataType, true, duration);

      return createSuccessResponse(
        transformedData,
        'Census API Proxy',
        {
          totalRecords: transformedData.length,
          rateLimit: {
            remaining: 450, // Conservative estimate based on Census rate limits
            resetTime: new Date(Date.now() + 60000),
          },
        },
        duration
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Handle specific error types
      if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch')) {
        const corsError: ProxyError = {
          type: 'network',
          message: 'Network error accessing Census API',
          statusCode: 502,
          retryable: true,
        };
        logApiRequest('CENSUS', dataType, false, duration, corsError.message);
        return createErrorResponse(corsError, 'Census API Proxy', duration);
      }

      const serverError: ProxyError = {
        type: 'unknown',
        message: `Census API proxy error: ${errorMessage}`,
        statusCode: 500,
        retryable: true,
      };
      logApiRequest('CENSUS', dataType, false, Date.now() - startTime, serverError.message);
      return createErrorResponse(serverError, 'Census API Proxy');
    }
  }

  /**
   * Fetch historical data across multiple years
   */
  private async fetchHistoricalData(
    variable: string,
    options: {
      startYear: number;
      endYear: number;
      survey?: 'acs1' | 'acs5';
      geography?: string;
    }
  ): Promise<Array<{ year: number; value: number }>> {
    const { startYear, endYear, survey = 'acs5', geography = 'us:*' } = options;
    const results: Array<{ year: number; value: number }> = [];

    // Generate year range (ACS 5-year estimates available from 2009)
    const years: number[] = [];
    for (let year = Math.max(startYear, 2009); year <= endYear; year++) {
      years.push(year);
    }

    // Fetch data for each year
    const promises = years.map(async (year) => {
      try {
        const params = new URLSearchParams({
          get: `${variable},NAME`,
          for: geography,
        });

        if (this.apiKey) {
          params.append('key', this.apiKey);
        }

        const url = `${this.baseUrl}/${year}/acs/${survey}?${params}`;
        const response = await makeHttpRequest(url);
        const data: CensusApiResponse = await response.json();

        // Census API returns arrays, check for errors
        if (Array.isArray(data) && data.length > 1) {
          const headers = data[0];
          const row = data[1];
          const valueIndex = headers.indexOf(variable);
          
          if (valueIndex !== -1) {
            const value = parseFloat(row[valueIndex]);
            if (!isNaN(value)) {
              return { year, value };
            }
          }
        }
        return null;
      } catch (error) {
        console.warn(`Failed to fetch Census data for year ${year}:`, error);
        return null;
      }
    });

    const yearResults = await Promise.all(promises);
    yearResults.forEach((result) => {
      if (result) {
        results.push(result);
      }
    });

    return results.sort((a, b) => a.year - b.year);
  }

  /**
   * Transform Census data to standard format
   */
  private transformCensusData(
    data: Array<{ year: number; value: number }>,
    _variable: string
  ): StandardDataPoint[] {
    return data.map(({ year, value }) => ({
      date: `${year}-12-31`,
      value,
      label: year.toString(),
    }));
  }

  /**
   * Get Census variable for data type
   */
  private getCensusVariable(dataType: string): string | null {
    const variableMap: Record<string, string> = {
      'house-prices': 'B25077_001E', // Median value (dollars) for owner-occupied housing units
      'salary-income': 'B19013_001E', // Median household income in the past 12 months
      'cost-of-living': 'B19301_001E', // Per capita income (proxy for cost of living)
      'tuition-education': 'B15003_022E', // Bachelor's degree or higher (education proxy)
      'medical-costs': 'B19301_001E', // Per capita income (healthcare affordability proxy)
      'childcare-costs': 'B19301_001E', // Per capita income (childcare affordability proxy)
      'transportation-costs': 'B19301_001E', // Per capita income (transportation affordability proxy)
      'utilities-costs': 'B25064_001E', // Median gross rent (includes utilities)
    };

    return variableMap[dataType] || null;
  }

  /**
   * Get available Census variables
   */
  getCommonVariables(): Record<string, string> {
    return {
      medianHomeValue: 'B25077_001E', // Median value (dollars) for owner-occupied housing units
      medianGrossRent: 'B25064_001E', // Median gross rent
      medianHouseholdIncome: 'B19013_001E', // Median household income in the past 12 months
      medianFamilyIncome: 'B19113_001E', // Median family income in the past 12 months
      perCapitaIncome: 'B19301_001E', // Per capita income in the past 12 months
      totalPopulation: 'B01003_001E', // Total population
      medianAge: 'B01002_001E', // Median age
      bachelorsOrHigher: 'B15003_022E', // Bachelor's degree or higher
      unemploymentRate: 'B23025_005E', // Unemployed
      povertyRate: 'B17001_002E', // Income below poverty level
    };
  }
}

// Export singleton instance
export const censusProxyService = new CensusProxyService();
export default censusProxyService;
