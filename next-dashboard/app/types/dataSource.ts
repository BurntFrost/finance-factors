/**
 * Data Source Configuration Types
 * 
 * This module defines the TypeScript types and interfaces for the data source
 * configuration feature, allowing users to switch between sample and live API data.
 */

// Core data source types
export type DataSourceType = 'sample' | 'live-api';

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
    endpoints: Record<string, string>;
    rateLimit?: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
    timeout?: number;
    retryAttempts?: number;
  };
}

// Available data source configurations
export const DATA_SOURCE_CONFIGS: Record<DataSourceType, DataSourceConfig> = {
  'sample': {
    type: 'sample',
    name: 'Sample Data',
    description: 'Generated sample data for demonstration purposes',
    icon: '🎲',
    isDefault: true,
  },
  'live-api': {
    type: 'live-api',
    name: 'Live API Data',
    description: 'Real-time data from financial APIs',
    icon: '🌐',
    apiConfig: {
      endpoints: {
        'house-prices': '/api/housing/prices',
        'salary-income': '/api/labor/income',
        'cost-of-living': '/api/economic/cost-of-living',
        'investment-returns': '/api/financial/investments',
      },
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
  SAMPLE_DATA: 5 * 60 * 1000, // 5 minutes
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
export interface ExtendedDataSourceContextType extends DataSourceContextType {
  setChartDataSource: (chartId: string, dataType: string, source: DataSourceType) => Promise<void>;
  getChartDataSource: (chartId: string) => DataSourceType;
  removeChartConfig: (chartId: string) => void;
  clearChartConfigs: () => void;
}
