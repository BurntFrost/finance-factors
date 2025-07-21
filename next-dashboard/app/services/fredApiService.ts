/**
 * FRED API Service
 * 
 * Service for fetching economic data from the Federal Reserve Economic Data (FRED) API
 * Documentation: https://fred.stlouisfed.org/docs/api/fred/
 */

import { ApiResponse } from '../types/dataSource';

export interface FredObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

export interface FredApiResponse {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: FredObservation[];
}

export interface FredSeriesInfo {
  id: string;
  realtime_start: string;
  realtime_end: string;
  title: string;
  observation_start: string;
  observation_end: string;
  frequency: string;
  frequency_short: string;
  units: string;
  units_short: string;
  seasonal_adjustment: string;
  seasonal_adjustment_short: string;
  last_updated: string;
  popularity: number;
  notes: string;
}

class FredApiService {
  private baseUrl: string;
  private apiKey: string;
  private requestCache = new Map<string, Promise<unknown>>();

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_FRED_BASE_URL || 'https://api.stlouisfed.org/fred';
    this.apiKey = process.env.NEXT_PUBLIC_FRED_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('FRED API key not found. Please set NEXT_PUBLIC_FRED_API_KEY environment variable.');
    }
  }

  /**
   * Fetch observations for a specific series
   */
  async fetchSeries(
    seriesId: string, 
    options: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<ApiResponse<Array<{ date: string; value: number; label?: string }>>> {
    try {
      const {
        startDate,
        endDate,
        limit = 120,
        sortOrder = 'desc'
      } = options;

      const params = new URLSearchParams({
        series_id: seriesId,
        api_key: this.apiKey,
        file_type: 'json',
        sort_order: sortOrder,
        limit: limit.toString(),
      });

      if (startDate) params.append('observation_start', startDate);
      if (endDate) params.append('observation_end', endDate);

      const cacheKey = `${seriesId}-${params.toString()}`;
      
      // Check cache first
      if (this.requestCache.has(cacheKey)) {
        const cachedData = await this.requestCache.get(cacheKey);
        return cachedData as ApiResponse<Array<{ date: string; value: number; label?: string }>>;
      }

      const requestPromise = this.makeRequest(
        `${this.baseUrl}/series/observations?${params}`
      );
      
      this.requestCache.set(cacheKey, requestPromise);

      const data = await requestPromise;
      const transformedData = this.transformObservations((data as FredApiResponse).observations);

      const response: ApiResponse<Array<{ date: string; value: number; label?: string }>> = {
        data: transformedData,
        success: true,
        timestamp: new Date(),
        source: 'FRED API',
        metadata: {
          totalRecords: (data as FredApiResponse).count,
          rateLimit: {
            remaining: 120, // FRED allows 120 requests per minute
            resetTime: new Date(Date.now() + 60000),
          },
        },
      };

      // Clear cache after 5 minutes
      setTimeout(() => {
        this.requestCache.delete(cacheKey);
      }, 5 * 60 * 1000);

      return response;

    } catch (error) {
      const errorResponse: ApiResponse<Array<{ date: string; value: number; label?: string }>> = {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        source: 'FRED API',
      };

      return errorResponse;
    }
  }

  /**
   * Get series information/metadata
   */
  async getSeriesInfo(seriesId: string): Promise<FredSeriesInfo | null> {
    try {
      const params = new URLSearchParams({
        series_id: seriesId,
        api_key: this.apiKey,
        file_type: 'json',
      });

      const data = await this.makeRequest(
        `${this.baseUrl}/series?${params}`
      );

      return (data as { seriess?: FredSeriesInfo[] }).seriess?.[0] || null;
    } catch (error) {
      console.error('Error fetching FRED series info:', error);
      return null;
    }
  }

  /**
   * Search for series by keywords
   */
  async searchSeries(
    searchText: string,
    options: {
      limit?: number;
      orderBy?: 'search_rank' | 'series_id' | 'title' | 'units' | 'frequency' | 'seasonal_adjustment' | 'realtime_start' | 'realtime_end' | 'last_updated' | 'observation_start' | 'observation_end' | 'popularity';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    try {
      const {
        limit = 20,
        orderBy = 'search_rank',
        sortOrder = 'desc'
      } = options;

      const params = new URLSearchParams({
        search_text: searchText,
        api_key: this.apiKey,
        file_type: 'json',
        limit: limit.toString(),
        order_by: orderBy,
        sort_order: sortOrder,
      });

      const data = await this.makeRequest(
        `${this.baseUrl}/series/search?${params}`
      );

      return (data as { seriess?: FredSeriesInfo[] }).seriess || [];
    } catch (error) {
      console.error('Error searching FRED series:', error);
      return [];
    }
  }

  /**
   * Make HTTP request with error handling
   */
  private async makeRequest(url: string): Promise<unknown> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for FRED API specific errors
    if (data.error_code) {
      throw new Error(`FRED API error: ${data.error_message}`);
    }

    return data;
  }

  /**
   * Transform FRED observations to our standard format
   */
  private transformObservations(observations: FredObservation[]): Array<{ date: string; value: number; label?: string }> {
    return observations
      .filter(obs => obs.value !== '.' && obs.value !== '') // Filter out missing values
      .map(obs => ({
        date: obs.date,
        value: parseFloat(obs.value),
        label: this.formatDateLabel(obs.date),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort chronologically
  }

  /**
   * Format date for display labels
   */
  private formatDateLabel(dateString: string): string {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get available series for common economic indicators
   */
  getCommonSeries() {
    return {
      housePrices: 'CSUSHPISA', // Case-Shiller U.S. National Home Price Index
      federalFunds: 'FEDFUNDS', // Federal Funds Effective Rate
      unemployment: 'UNRATE', // Unemployment Rate
      gdp: 'GDP', // Gross Domestic Product
      cpi: 'CPIAUCSL', // Consumer Price Index for All Urban Consumers
      realGdp: 'GDPC1', // Real Gross Domestic Product
      treasuryYield10Y: 'GS10', // 10-Year Treasury Constant Maturity Rate
      treasuryYield30Y: 'GS30', // 30-Year Treasury Constant Maturity Rate
      personalIncome: 'PI', // Personal Income
      disposableIncome: 'DSPI', // Disposable Personal Income
    };
  }
}

// Export singleton instance
export const fredApiService = new FredApiService();
export default fredApiService;
