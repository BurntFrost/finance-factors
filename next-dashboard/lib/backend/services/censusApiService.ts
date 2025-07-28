/**
 * Census API Service
 * 
 * Service for fetching demographic and housing data from the U.S. Census Bureau API
 * Documentation: https://www.census.gov/data/developers/data-sets.html
 */

import { ApiResponse } from '@/shared/types/dataSource';

export interface CensusDataPoint {
  [key: string]: string | null;
}

export interface CensusVariable {
  name: string;
  label: string;
  concept: string;
  predicateType: string;
  group: string;
  limit: number;
  predicateOnly?: boolean;
}

class CensusApiService {
  private baseUrl: string;
  private apiKey: string;
  private requestCache = new Map<string, Promise<unknown>>();

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_CENSUS_BASE_URL || 'https://api.census.gov/data';
    this.apiKey = process.env.NEXT_PUBLIC_CENSUS_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('Census API key not found. API will work but key is recommended for higher reliability.');
    }
  }

  /**
   * Fetch American Community Survey (ACS) data
   */
  async fetchACS(
    variables: string[],
    options: {
      year?: number;
      survey?: 'acs1' | 'acs5'; // 1-year or 5-year estimates
      geography?: string; // e.g., 'state:*', 'county:*', 'us:*'
      state?: string;
      county?: string;
    } = {}
  ): Promise<ApiResponse<Array<{ date: string; value: number; label?: string }>>> {
    try {
      const {
        year = 2023,
        survey = 'acs5',
        geography = 'us:*',
        state,
        county
      } = options;

      const params = new URLSearchParams({
        get: variables.join(',') + ',NAME',
        for: geography,
      });

      if (state) params.append('in', `state:${state}`);
      if (county) params.append('in', `county:${county}`);
      if (this.apiKey) params.append('key', this.apiKey);

      const cacheKey = `acs-${year}-${survey}-${params.toString()}`;

      // Check cache first
      if (this.requestCache.has(cacheKey)) {
        const cachedData = await this.requestCache.get(cacheKey);
        return cachedData as ApiResponse<Array<{ date: string; value: number; label?: string }>>;
      }

      const url = `${this.baseUrl}/${year}/acs/${survey}?${params}`;
      const requestPromise = this.makeRequest(url);
      this.requestCache.set(cacheKey, requestPromise);

      const data = await requestPromise;
      const transformedData = this.transformCensusData(data as string[][], variables, year);

      const response: ApiResponse<Array<{ date: string; value: number; label?: string }>> = {
        data: transformedData,
        success: true,
        timestamp: new Date(),
        source: 'Census Bureau API',
        metadata: {
          totalRecords: transformedData.length,
          rateLimit: {
            remaining: 100, // Conservative estimate
            resetTime: new Date(Date.now() + 60000),
          },
        },
      };

      // Clear cache after 1 hour
      setTimeout(() => {
        this.requestCache.delete(cacheKey);
      }, 60 * 60 * 1000);

      return response;

    } catch (error) {
      const errorResponse: ApiResponse<Array<{ date: string; value: number; label?: string }>> = {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        source: 'Census Bureau API',
      };

      return errorResponse;
    }
  }

  /**
   * Fetch historical ACS data across multiple years
   */
  async fetchHistoricalACS(
    variable: string,
    options: {
      startYear?: number;
      endYear?: number;
      survey?: 'acs1' | 'acs5';
      geography?: string;
    } = {}
  ): Promise<ApiResponse<Array<{ date: string; value: number; label?: string }>>> {
    try {
      const {
        startYear = 2015,
        endYear = 2023,
        survey = 'acs5',
        geography = 'us:*'
      } = options;

      const allData: Array<{ date: string; value: number; label?: string }> = [];
      const years: number[] = [];

      // Generate year range
      for (let year = startYear; year <= endYear; year++) {
        // ACS 5-year estimates are available from 2009
        // ACS 1-year estimates are available from 2005 but only for areas with 65,000+ population
        if ((survey === 'acs5' && year >= 2009) || (survey === 'acs1' && year >= 2005)) {
          years.push(year);
        }
      }

      // Fetch data for each year
      const promises = years.map(async (year) => {
        try {
          const response = await this.fetchACS([variable], {
            year,
            survey,
            geography,
          });

          if (response.success && response.data.length > 0) {
            return response.data[0]; // Take first result (usually national data)
          }
          return null;
        } catch (error) {
          console.warn(`Failed to fetch Census data for year ${year}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        if (result) {
          allData.push({
            ...result,
            date: `${years[index]}-12-31`,
            label: years[index].toString(),
          });
        }
      });

      return {
        data: allData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        success: true,
        timestamp: new Date(),
        source: 'Census Bureau API',
        metadata: {
          totalRecords: allData.length,
        },
      };

    } catch (error) {
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        source: 'Census Bureau API',
      };
    }
  }

  /**
   * Get available variables for a dataset
   */
  async getVariables(
    year: number,
    survey: 'acs1' | 'acs5' = 'acs5'
  ): Promise<Record<string, CensusVariable>> {
    try {
      const url = `${this.baseUrl}/${year}/acs/${survey}/variables.json`;
      const data = await this.makeRequest(url);
      return (data as { variables?: Record<string, CensusVariable> }).variables || {};
    } catch (error) {
      console.error('Error fetching Census variables:', error);
      return {};
    }
  }

  /**
   * Make HTTP request to Census API
   */
  private async makeRequest(url: string): Promise<unknown> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Census API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Census API returns arrays, check for error messages
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string' && data[0].includes('error')) {
      throw new Error(`Census API error: ${data[0]}`);
    }

    return data;
  }

  /**
   * Transform Census data to our standard format
   */
  private transformCensusData(
    data: string[][],
    variables: string[],
    year: number
  ): Array<{ date: string; value: number; label?: string }> {
    if (!Array.isArray(data) || data.length < 2) {
      return [];
    }

    const headers = data[0];
    const rows = data.slice(1);
    const results: Array<{ date: string; value: number; label?: string }> = [];

    rows.forEach(row => {
      variables.forEach((variable) => {
        const valueIndex = headers.indexOf(variable);
        if (valueIndex !== -1) {
          const value = parseFloat(row[valueIndex]);
          if (!isNaN(value)) {
            results.push({
              date: `${year}-12-31`,
              value,
              label: year.toString(),
            });
          }
        }
      });
    });

    return results;
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get common housing and demographic variables
   */
  getCommonVariables() {
    return {
      // Housing
      medianHomeValue: 'B25077_001E', // Median value (dollars) for owner-occupied housing units
      medianGrossRent: 'B25064_001E', // Median gross rent
      homeownershipRate: 'B25003_002E', // Owner-occupied housing units
      housingUnits: 'B25001_001E', // Total housing units
      
      // Income
      medianHouseholdIncome: 'B19013_001E', // Median household income in the past 12 months
      medianFamilyIncome: 'B19113_001E', // Median family income in the past 12 months
      perCapitaIncome: 'B19301_001E', // Per capita income in the past 12 months
      
      // Demographics
      totalPopulation: 'B01003_001E', // Total population
      medianAge: 'B01002_001E', // Median age
      
      // Education
      bachelorsOrHigher: 'B15003_022E', // Bachelor's degree or higher
      
      // Employment
      unemploymentRate: 'B23025_005E', // Unemployed
      laborForce: 'B23025_002E', // In labor force
      
      // Poverty
      povertyRate: 'B17001_002E', // Income in the past 12 months below poverty level
    };
  }

  /**
   * Get available geographies
   */
  getGeographies() {
    return {
      national: 'us:*',
      states: 'state:*',
      counties: 'county:*',
      places: 'place:*',
      tracts: 'tract:*',
      blockGroups: 'block group:*',
      zipCodes: 'zip code tabulation area:*',
      metros: 'metropolitan statistical area/micropolitan statistical area:*',
    };
  }
}

// Export singleton instance
export const censusApiService = new CensusApiService();
export default censusApiService;
