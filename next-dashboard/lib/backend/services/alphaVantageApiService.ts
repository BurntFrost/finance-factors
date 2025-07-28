/**
 * Alpha Vantage API Service
 * 
 * Service for fetching financial and economic data from Alpha Vantage API
 * Documentation: https://www.alphavantage.co/documentation/
 */

import { ApiResponse } from '@/shared/types/dataSource';

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

export interface ForexTimeSeriesResponse {
  'Meta Data': Record<string, string>;
  'Time Series FX (Daily)'?: TimeSeriesData;
  'Time Series FX (Weekly)'?: TimeSeriesData;
  'Time Series FX (Monthly)'?: TimeSeriesData;
}

class AlphaVantageApiService {
  private baseUrl: string;
  private apiKey: string;
  private requestCache = new Map<string, Promise<unknown>>();

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_BASE_URL || 'https://www.alphavantage.co/query';
    this.apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('Alpha Vantage API key not found. Please set NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY environment variable.');
    }
  }

  /**
   * Fetch economic indicator data
   */
  async fetchEconomicIndicator(
    indicator: string,
    options: {
      interval?: 'annual' | 'quarterly' | 'monthly';
      datatype?: 'json' | 'csv';
    } = {}
  ): Promise<ApiResponse<Array<{ date: string; value: number; label?: string }>>> {
    try {
      const {
        interval = 'annual',
        datatype = 'json'
      } = options;

      const params = new URLSearchParams({
        function: indicator,
        interval,
        apikey: this.apiKey,
        datatype,
      });

      const cacheKey = `${indicator}-${params.toString()}`;

      // Check cache first
      if (this.requestCache.has(cacheKey)) {
        const cachedData = await this.requestCache.get(cacheKey);
        return cachedData as ApiResponse<Array<{ date: string; value: number; label?: string }>>;
      }

      const requestPromise = this.makeRequest(`${this.baseUrl}?${params}`);
      this.requestCache.set(cacheKey, requestPromise);

      const data = await requestPromise;
      const transformedData = this.transformEconomicData(data as AlphaVantageResponse);

      const response: ApiResponse<Array<{ date: string; value: number; label?: string }>> = {
        data: transformedData,
        success: true,
        timestamp: new Date(),
        source: 'Alpha Vantage API',
        metadata: {
          totalRecords: transformedData.length,
          rateLimit: {
            remaining: 5, // Free tier: 5 requests per minute
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
        source: 'Alpha Vantage API',
      };

      return errorResponse;
    }
  }

  /**
   * Fetch stock/ETF data (for REITs or housing-related stocks)
   */
  async fetchTimeSeries(
    symbol: string,
    options: {
      function?: 'TIME_SERIES_DAILY' | 'TIME_SERIES_WEEKLY' | 'TIME_SERIES_MONTHLY';
      outputsize?: 'compact' | 'full';
      datatype?: 'json' | 'csv';
    } = {}
  ): Promise<ApiResponse<Array<{ date: string; value: number; label?: string }>>> {
    try {
      const {
        function: func = 'TIME_SERIES_MONTHLY',
        outputsize = 'compact',
        datatype = 'json'
      } = options;

      const params = new URLSearchParams({
        function: func,
        symbol,
        outputsize,
        apikey: this.apiKey,
        datatype,
      });

      const cacheKey = `${symbol}-${params.toString()}`;

      // Check cache first
      if (this.requestCache.has(cacheKey)) {
        const cachedData = await this.requestCache.get(cacheKey);
        return cachedData as ApiResponse<Array<{ date: string; value: number; label?: string }>>;
      }

      const requestPromise = this.makeRequest(`${this.baseUrl}?${params}`);
      this.requestCache.set(cacheKey, requestPromise);

      const data = await requestPromise;
      const transformedData = this.transformTimeSeriesData(data as AlphaVantageTimeSeriesResponse, func);

      const response: ApiResponse<Array<{ date: string; value: number; label?: string }>> = {
        data: transformedData,
        success: true,
        timestamp: new Date(),
        source: 'Alpha Vantage API',
        metadata: {
          totalRecords: transformedData.length,
          rateLimit: {
            remaining: 5,
            resetTime: new Date(Date.now() + 60000),
          },
        },
      };

      // Clear cache after 30 minutes
      setTimeout(() => {
        this.requestCache.delete(cacheKey);
      }, 30 * 60 * 1000);

      return response;

    } catch (error) {
      const errorResponse: ApiResponse<Array<{ date: string; value: number; label?: string }>> = {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        source: 'Alpha Vantage API',
      };

      return errorResponse;
    }
  }

  /**
   * Fetch forex data (for international economic analysis)
   */
  async fetchForex(
    fromSymbol: string,
    toSymbol: string = 'USD',
    options: {
      function?: 'FX_DAILY' | 'FX_WEEKLY' | 'FX_MONTHLY';
      outputsize?: 'compact' | 'full';
      datatype?: 'json' | 'csv';
    } = {}
  ): Promise<ApiResponse<Array<{ date: string; value: number; label?: string }>>> {
    try {
      const {
        function: func = 'FX_MONTHLY',
        outputsize = 'compact',
        datatype = 'json'
      } = options;

      const params = new URLSearchParams({
        function: func,
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        outputsize,
        apikey: this.apiKey,
        datatype,
      });

      const data = await this.makeRequest(`${this.baseUrl}?${params}`);
      const transformedData = this.transformForexData(data as ForexTimeSeriesResponse, func);

      return {
        data: transformedData,
        success: true,
        timestamp: new Date(),
        source: 'Alpha Vantage API',
        metadata: {
          totalRecords: transformedData.length,
        },
      };

    } catch (error) {
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        source: 'Alpha Vantage API',
      };
    }
  }

  /**
   * Make HTTP request to Alpha Vantage API
   */
  private async makeRequest(url: string): Promise<unknown> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for Alpha Vantage specific errors
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage API error: ${data['Error Message']}`);
    }

    if (data['Note']) {
      throw new Error(`Alpha Vantage API rate limit: ${data['Note']}`);
    }

    return data;
  }

  /**
   * Transform economic indicator data to our standard format
   */
  private transformEconomicData(data: AlphaVantageResponse): Array<{ date: string; value: number; label?: string }> {
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data
      .map((item: AlphaVantageDataPoint) => ({
        date: item.date,
        value: parseFloat(item.value),
        label: this.formatDateLabel(item.date),
      }))
      .filter((item: { date: string; value: number; label?: string }) => !isNaN(item.value))
      .sort((a: { date: string; value: number; label?: string }, b: { date: string; value: number; label?: string }) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Transform time series data to our standard format
   */
  private transformTimeSeriesData(data: AlphaVantageTimeSeriesResponse, functionType: string): Array<{ date: string; value: number; label?: string }> {
    let timeSeriesKey: keyof AlphaVantageTimeSeriesResponse = 'Time Series (Daily)';

    // Determine the correct key based on function type
    if (functionType.includes('DAILY')) {
      timeSeriesKey = 'Time Series (Daily)';
    } else if (functionType.includes('WEEKLY')) {
      timeSeriesKey = 'Weekly Time Series';
    } else if (functionType.includes('MONTHLY')) {
      timeSeriesKey = 'Monthly Time Series';
    }

    const timeSeries = data[timeSeriesKey];
    if (!timeSeries) {
      return [];
    }

    return Object.entries(timeSeries)
      .map(([date, values]: [string, TimeSeriesValues]) => ({
        date,
        value: parseFloat(values['4. close']), // Use closing price
        label: this.formatDateLabel(date),
      }))
      .filter(item => !isNaN(item.value))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Transform forex data to our standard format
   */
  private transformForexData(data: ForexTimeSeriesResponse, functionType: string): Array<{ date: string; value: number; label?: string }> {
    let timeSeriesKey: keyof ForexTimeSeriesResponse = 'Time Series FX (Daily)';

    if (functionType === 'FX_DAILY') {
      timeSeriesKey = 'Time Series FX (Daily)';
    } else if (functionType === 'FX_WEEKLY') {
      timeSeriesKey = 'Time Series FX (Weekly)';
    } else if (functionType === 'FX_MONTHLY') {
      timeSeriesKey = 'Time Series FX (Monthly)';
    }

    const timeSeries = data[timeSeriesKey];
    if (!timeSeries) {
      return [];
    }

    return Object.entries(timeSeries)
      .map(([date, values]: [string, TimeSeriesValues]) => ({
        date,
        value: parseFloat(values['4. close']),
        label: this.formatDateLabel(date),
      }))
      .filter(item => !isNaN(item.value))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
   * Get available economic indicators
   */
  getEconomicIndicators() {
    return {
      realGdp: 'REAL_GDP',
      realGdpPerCapita: 'REAL_GDP_PER_CAPITA',
      treasuryYield: 'TREASURY_YIELD',
      federalFundsRate: 'FEDERAL_FUNDS_RATE',
      cpi: 'CPI',
      inflation: 'INFLATION',
      retailSales: 'RETAIL_SALES',
      durableGoods: 'DURABLES',
      unemploymentRate: 'UNEMPLOYMENT',
      nonfarmPayroll: 'NONFARM_PAYROLL',
    };
  }

  /**
   * Get housing-related stock symbols (REITs, homebuilders, etc.)
   */
  getHousingStocks() {
    return {
      // REITs
      vanguardREIT: 'VNQ', // Vanguard Real Estate ETF
      realEstateSelect: 'XLRE', // Real Estate Select Sector SPDR Fund
      
      // Homebuilders
      homeDepot: 'HD', // Home Depot
      lowes: 'LOW', // Lowe's
      pulteGroup: 'PHM', // PulteGroup (homebuilder)
      drHorton: 'DHI', // D.R. Horton (homebuilder)
      
      // Mortgage/Finance
      wellsFargo: 'WFC', // Wells Fargo (major mortgage lender)
      bankOfAmerica: 'BAC', // Bank of America
    };
  }
}

// Export singleton instance
export const alphaVantageApiService = new AlphaVantageApiService();
export default alphaVantageApiService;
