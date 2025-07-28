/**
 * Shared Data Source Types
 * 
 * Common data source interfaces and types used by both frontend and backend
 */

// Core data source types
export type DataSourceType = 'historical' | 'live-api' | 'cached';

// API endpoint interface
export interface ApiEndpoint {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
}

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

// Data source error types
export interface DataSourceError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  source: string;
  retryable: boolean;
}

// Data source status
export type DataSourceStatus = 
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'retrying'
  | 'fallback';

// Data source state
export interface DataSourceState {
  status: DataSourceStatus;
  data: unknown | null;
  error: DataSourceError | null;
  lastUpdated: Date | null;
  lastLiveAttempt: Date | null;
  retryCount: number;
  source: DataSourceType;
}

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

// Automatic data source hook options
export interface AutomaticDataSourceOptions {
  dataType: string;
  autoFetch?: boolean;
  refreshInterval?: number;
  retryOnError?: boolean;
  maxRetries?: number;
  fallbackDelay?: number;
}

// Data transformation function type
export type DataTransformer<TInput, TOutput> = (input: TInput) => TOutput;

// Data validator function type
export type DataValidator<T> = (data: unknown) => data is T;

// Cache strategy
export type CacheStrategy = 'memory' | 'localStorage' | 'sessionStorage' | 'redis';

// Local storage keys
export const STORAGE_KEYS = {
  DATA_SOURCE_PREFERENCE: 'finance-dashboard-data-source',
  API_CACHE: 'finance-dashboard-api-cache',
  USER_PREFERENCES: 'finance-dashboard-preferences',
  VISUALIZATION_PREFERENCES: 'finance-dashboard-viz-preferences',
  DASHBOARD_LAYOUTS: 'finance-dashboard-layouts',
  CHART_DIMENSIONS: 'finance-dashboard-chart-dimensions',
} as const;
