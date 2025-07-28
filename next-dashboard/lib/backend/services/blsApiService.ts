/**
 * BLS API Service
 * 
 * Service for fetching labor and economic data from the Bureau of Labor Statistics API
 * Documentation: https://www.bls.gov/developers/api_signature_v2.htm
 */

import { ApiResponse } from '@/shared/types/dataSource';

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
}

class BlsApiService {
  private baseUrl: string;
  private apiKey: string;
  private requestCache = new Map<string, Promise<unknown>>();

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BLS_BASE_URL || 'https://api.bls.gov/publicAPI/v2';
    this.apiKey = process.env.NEXT_PUBLIC_BLS_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('BLS API key not found. Using public API with limited requests. Set NEXT_PUBLIC_BLS_API_KEY for higher limits.');
    }
  }

  /**
   * Fetch time series data for one or more series
   */
  async fetchSeries(
    seriesIds: string | string[],
    options: {
      startYear?: number;
      endYear?: number;
      calculations?: boolean;
      annualAverage?: boolean;
    } = {}
  ): Promise<ApiResponse<Array<{ date: string; value: number; label?: string }>>> {
    try {
      const {
        startYear = new Date().getFullYear() - 10,
        endYear = new Date().getFullYear(),
        calculations = true,
        annualAverage = true
      } = options;

      const seriesArray = Array.isArray(seriesIds) ? seriesIds : [seriesIds];
      const cacheKey = `${seriesArray.join(',')}-${startYear}-${endYear}`;

      // Check cache first
      if (this.requestCache.has(cacheKey)) {
        const cachedData = await this.requestCache.get(cacheKey);
        return cachedData as ApiResponse<Array<{ date: string; value: number; label?: string }>>;
      }

      const requestBody = {
        seriesid: seriesArray,
        startyear: startYear.toString(),
        endyear: endYear.toString(),
        calculations: calculations,
        annualaverage: annualAverage,
        ...(this.apiKey && { registrationkey: this.apiKey }),
      };

      const requestPromise = this.makeRequest(requestBody);
      this.requestCache.set(cacheKey, requestPromise);

      const data = await requestPromise;
      
      if (data.status !== 'REQUEST_SUCCEEDED') {
        throw new Error(`BLS API error: ${data.message?.join(', ') || 'Unknown error'}`);
      }

      const transformedData = this.transformSeriesData(data.Results.series);

      const response: ApiResponse<Array<{ date: string; value: number; label?: string }>> = {
        data: transformedData,
        success: true,
        timestamp: new Date(),
        source: 'BLS API',
        metadata: {
          totalRecords: transformedData.length,
          rateLimit: {
            remaining: this.apiKey ? 500 : 25, // Daily limits
            resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset daily
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
        source: 'BLS API',
      };

      return errorResponse;
    }
  }

  /**
   * Fetch latest data point for a series
   */
  async fetchLatest(seriesId: string): Promise<{ value: number; date: string; label: string } | null> {
    try {
      const currentYear = new Date().getFullYear();
      const response = await this.fetchSeries(seriesId, {
        startYear: currentYear - 1,
        endYear: currentYear,
      });

      if (response.success && response.data.length > 0) {
        // Return the most recent data point
        const latest = response.data[response.data.length - 1];
        return {
          value: latest.value,
          date: latest.date,
          label: latest.label || latest.date,
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching latest BLS data:', error);
      return null;
    }
  }

  /**
   * Make HTTP request to BLS API
   */
  private async makeRequest(requestBody: BlsRequestBody): Promise<BlsApiResponse> {
    try {
      const url = this.apiKey
        ? `${this.baseUrl}/timeseries/data/`
        : 'https://api.bls.gov/publicAPI/v1/timeseries/data/';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`BLS API HTTP error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Handle CORS and network errors with more informative messages
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(
          'CORS Error: Cannot access BLS API directly from browser. ' +
          'This is expected for GitHub Pages deployment. ' +
          'Switch to "Sample Data" mode or set up a proper server with API proxies.'
        );
      }
      throw error;
    }
  }

  /**
   * Transform BLS series data to our standard format
   */
  private transformSeriesData(series: BlsSeries[]): Array<{ date: string; value: number; label?: string }> {
    const allData: Array<{ date: string; value: number; label?: string }> = [];

    series.forEach(s => {
      s.data.forEach(dataPoint => {
        // Skip annual averages (period M13) unless it's the only data
        if (dataPoint.period === 'M13' && s.data.some(d => d.period !== 'M13')) {
          return;
        }

        const value = parseFloat(dataPoint.value);
        if (isNaN(value)) return;

        // Create date from year and period
        let date: string;
        if (dataPoint.period === 'M13') {
          // Annual average
          date = `${dataPoint.year}-12-31`;
        } else if (dataPoint.period.startsWith('M')) {
          // Monthly data
          const month = dataPoint.period.substring(1).padStart(2, '0');
          date = `${dataPoint.year}-${month}-01`;
        } else if (dataPoint.period.startsWith('Q')) {
          // Quarterly data
          const quarter = parseInt(dataPoint.period.substring(1));
          const month = (quarter * 3).toString().padStart(2, '0');
          date = `${dataPoint.year}-${month}-01`;
        } else {
          // Annual data
          date = `${dataPoint.year}-12-31`;
        }

        allData.push({
          date,
          value,
          label: this.formatDateLabel(date, dataPoint.periodName),
        });
      });
    });

    // Sort by date
    return allData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Format date for display labels
   */
  private formatDateLabel(dateString: string, periodName?: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    
    if (periodName && periodName !== 'Annual') {
      return `${periodName} ${year}`;
    }
    
    return year.toString();
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get available series for common labor statistics
   */
  getCommonSeries() {
    return {
      // Employment & Unemployment
      unemploymentRate: 'LNS14000000', // Unemployment Rate
      laborForceParticipation: 'LNS11300000', // Labor Force Participation Rate
      employmentPopulationRatio: 'LNS12300000', // Employment-Population Ratio
      
      // Wages & Earnings
      averageHourlyEarnings: 'CES0500000003', // Average Hourly Earnings of All Employees
      averageWeeklyEarnings: 'CES0500000011', // Average Weekly Earnings of All Employees
      
      // Prices & Inflation
      consumerPriceIndex: 'CUUR0000SA0', // Consumer Price Index - All Urban Consumers
      coreInflation: 'CUUR0000SA0L1E', // Core CPI (excluding food and energy)
      producerPriceIndex: 'WPUR0000704', // Producer Price Index
      
      // Productivity
      laborProductivity: 'PRS85006092', // Nonfarm Business Sector: Labor Productivity
      unitLaborCosts: 'PRS85006112', // Nonfarm Business Sector: Unit Labor Costs
      
      // Job Openings & Turnover
      jobOpenings: 'JTS000000000000000JOL', // Job Openings: Total Nonfarm
      quits: 'JTS000000000000000QUR', // Quits: Total Nonfarm
      layoffs: 'JTS000000000000000LDR', // Layoffs and Discharges: Total Nonfarm
    };
  }

  /**
   * Get rate limit information
   */
  getRateLimits() {
    return {
      withKey: {
        daily: 500,
        perQuery: 50, // series per query
        years: 20, // years per query
      },
      withoutKey: {
        daily: 25,
        perQuery: 25, // series per query
        years: 10, // years per query
      },
    };
  }
}

// Export singleton instance
export const blsApiService = new BlsApiService();
export default blsApiService;
