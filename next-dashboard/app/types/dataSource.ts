/**
 * Data Source Configuration Types
 *
 * This module defines the TypeScript types and interfaces for the data source
 * configuration feature, allowing users to switch between historical and live API data.
 */

// Core data source types
export type DataSourceType = 'historical' | 'live-api';

// Data source configuration interface
export interface DataSourceConfig {
  type: DataSourceType;
  name: string;
  description: string;
  icon: string;
  isDefault?: boolean;
  apiConfig?: {
    baseUrl?: string;
    apiKey?: string;
    endpoints: Record<string, string | ApiEndpoint>;
    rateLimit?: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
    timeout?: number;
    retryAttempts?: number;
  };
}

// API Provider configurations
export interface ApiProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay?: number;
  };
  timeout: number;
  retryAttempts: number;
}

export const API_PROVIDERS: Record<string, ApiProvider> = {
  FRED: {
    name: 'Federal Reserve Economic Data',
    baseUrl: 'https://api.stlouisfed.org/fred',
    rateLimit: { requestsPerMinute: 120 },
    timeout: 10000,
    retryAttempts: 3,
  },
  CENSUS: {
    name: 'U.S. Census Bureau',
    baseUrl: 'https://api.census.gov/data',
    rateLimit: { requestsPerMinute: 100 },
    timeout: 10000,
    retryAttempts: 3,
  },
  BLS: {
    name: 'Bureau of Labor Statistics',
    baseUrl: 'https://api.bls.gov/publicAPI/v2',
    rateLimit: { requestsPerMinute: 10, requestsPerDay: 500 },
    timeout: 15000,
    retryAttempts: 3,
  },
  ALPHA_VANTAGE: {
    name: 'Alpha Vantage',
    baseUrl: 'https://www.alphavantage.co/query',
    rateLimit: { requestsPerMinute: 5, requestsPerDay: 25 },
    timeout: 10000,
    retryAttempts: 2,
  },
};

// Real API endpoint configurations
export interface ApiEndpoint {
  provider: keyof typeof API_PROVIDERS;
  seriesId?: string;
  endpoint: string;
  params?: Record<string, string>;
  transformKey?: string;
}

export const REAL_API_ENDPOINTS: Record<string, ApiEndpoint> = {
  'house-prices': {
    provider: 'FRED',
    seriesId: 'CSUSHPISA', // Case-Shiller U.S. National Home Price Index
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120', // 10 years of monthly data
    },
  },
  'salary-income': {
    provider: 'BLS',
    seriesId: 'CES0500000003', // Average hourly earnings of all employees
    endpoint: '/timeseries/data',
    params: {
      calculations: 'true',
      annualaverage: 'true',
    },
  },
  'cost-of-living': {
    provider: 'BLS',
    seriesId: 'CUUR0000SA0', // Consumer Price Index - All Urban Consumers
    endpoint: '/timeseries/data',
    params: {
      calculations: 'true',
      annualaverage: 'true',
    },
  },
  'interest-rates': {
    provider: 'FRED',
    seriesId: 'FEDFUNDS', // Federal Funds Effective Rate
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'unemployment-rate': {
    provider: 'FRED',
    seriesId: 'UNRATE', // Unemployment Rate
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'inflation-rate': {
    provider: 'ALPHA_VANTAGE',
    endpoint: '',
    params: {
      function: 'INFLATION',
      datatype: 'json',
    },
  },
  'gdp-growth': {
    provider: 'FRED',
    seriesId: 'GDP', // Gross Domestic Product
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '40', // 10 years of quarterly data
    },
  },
};

// Available data source configurations
export const DATA_SOURCE_CONFIGS: Record<DataSourceType, DataSourceConfig> = {
  'historical': {
    type: 'historical',
    name: 'Historical Data',
    description: 'Real historical financial data for demonstration and analysis',
    icon: '📊',
    isDefault: true,
  },
  'live-api': {
    type: 'live-api',
    name: 'Live API Data',
    description: 'Real-time data from government and financial APIs',
    icon: '🌐',
    apiConfig: {
      endpoints: REAL_API_ENDPOINTS,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
      },
      timeout: 10000, // 10 seconds
      retryAttempts: 3,
    },
  },
};

// Data source state interface
export interface DataSourceState {
  currentSource: DataSourceType;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  cache: Record<string, {
    data: unknown;
    timestamp: Date;
    expiresAt: Date;
  }>;
}

// Data source actions for reducer
export type DataSourceAction =
  | { type: 'SET_SOURCE'; payload: DataSourceType }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAST_UPDATED'; payload: Date }
  | { type: 'SET_CACHE_DATA'; payload: { key: string; data: unknown; ttl?: number } }
  | { type: 'CLEAR_CACHE' }
  | { type: 'REMOVE_CACHE_ITEM'; payload: string };

// Data fetching options
export interface DataFetchOptions {
  dataType: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  useCache?: boolean;
  cacheTTL?: number; // Time to live in milliseconds
  forceRefresh?: boolean;
}

// API response wrapper
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: Date;
  source: string;
  metadata?: {
    totalRecords?: number;
    page?: number;
    hasMore?: boolean;
    rateLimit?: {
      remaining: number;
      resetTime: Date;
    };
    // Additional metadata for fallback scenarios
    isFallback?: boolean;
    reason?: string;
    fromCache?: boolean;
  };
}

// Error types for better error handling
export interface DataSourceError {
  type: 'network' | 'api' | 'timeout' | 'rate-limit' | 'parsing' | 'unknown';
  message: string;
  code?: string | number;
  retryable: boolean;
  retryAfter?: number; // Seconds to wait before retry
}

// Data source context interface
export interface DataSourceContextType {
  state: DataSourceState;
  dispatch: React.Dispatch<DataSourceAction>;
  switchDataSource: (source: DataSourceType) => Promise<void>;
  fetchData: <T = unknown>(options: DataFetchOptions) => Promise<ApiResponse<T>>;
  clearCache: () => void;
  getConfig: (source?: DataSourceType) => DataSourceConfig;
  isSourceAvailable: (source: DataSourceType) => boolean;
}

// Hook return type for useDataSource
export interface UseDataSourceReturn<T = unknown> {
  data: T | null;
  isLoading: boolean;
  error: DataSourceError | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  source: DataSourceType;
  switchSource: (source: DataSourceType) => Promise<void>;
}

// Local storage keys
export const STORAGE_KEYS = {
  DATA_SOURCE_PREFERENCE: 'finance-dashboard-data-source',
  API_CACHE: 'finance-dashboard-api-cache',
  USER_PREFERENCES: 'finance-dashboard-preferences',
} as const;

// Default cache TTL values (in milliseconds)
export const CACHE_TTL = {
  HISTORICAL_DATA: 5 * 60 * 1000, // 5 minutes
  LIVE_DATA: 15 * 60 * 1000, // 15 minutes
  ERROR_CACHE: 2 * 60 * 1000, // 2 minutes
} as const;

// Data type mappings for API endpoints
export const DATA_TYPE_MAPPINGS: Record<string, string> = {
  'house-prices': 'housing',
  'salary-income': 'income',
  'cost-of-living': 'economic',
  'tuition-education': 'education',
  'medical-costs': 'healthcare',
  'childcare-costs': 'childcare',
  'transportation-costs': 'transportation',
  'food-prices': 'food',
  'utilities-costs': 'utilities',
  'investment-returns': 'investments',
};

// Per-chart data source configuration
export interface ChartDataSourceConfig {
  chartId: string;
  dataType: string;
  dataSource: DataSourceType;
  lastUpdated?: Date;
}

// Extended data source state for per-chart management
export interface ExtendedDataSourceState extends DataSourceState {
  chartConfigs: Record<string, ChartDataSourceConfig>;
}

// Additional actions for per-chart data source management
export type ExtendedDataSourceAction = DataSourceAction
  | { type: 'SET_CHART_DATA_SOURCE'; payload: ChartDataSourceConfig }
  | { type: 'REMOVE_CHART_CONFIG'; payload: string }
  | { type: 'CLEAR_CHART_CONFIGS' };

// Extended context type for per-chart management
export interface ExtendedDataSourceContextType extends Omit<DataSourceContextType, 'fetchData'> {
  fetchData: <T = unknown>(options: DataFetchOptions & { chartId?: string }) => Promise<ApiResponse<T>>;
  setChartDataSource: (chartId: string, dataType: string, source: DataSourceType) => Promise<void>;
  getChartDataSource: (chartId: string) => DataSourceType;
  removeChartConfig: (chartId: string) => void;
  clearChartConfigs: () => void;
}
