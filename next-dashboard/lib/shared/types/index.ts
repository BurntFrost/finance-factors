/**
 * Shared Types Index
 * 
 * Barrel export for all shared types
 */

// API types
export type {
  StandardDataPoint,
  ApiResponse,
  ProxyApiResponse,
  UserExperienceIndicator,
  ProxyError,
  ApiEndpointConfig,
  DataSourceType,
  ApiProvider,
  RateLimitConfig,
  CacheConfig,
  ServiceStatus,
  ApiServiceHealth,
  PerformanceMetrics,
  ApiHealthCheck,
} from './api';

// Dashboard types
export type {
  ChartData,
  TableData,
  SummaryCardData,
  DataType,
  VisualizationType,
  DashboardElement,
  DashboardState,
  ViewMode,
  ChartType,
  DataStatus,
  ExportOptions,
  ExportData,
} from './dashboard';

// Data source types
export type {
  DataSourceType as DataSourceTypeEnum,
  ApiEndpoint,
  DataSourceConfig,
  DataSourceError,
  DataSourceStatus,
  DataSourceState,
  DataFetchOptions,
  UseDataSourceReturn,
  AutomaticDataSourceOptions,
  DataTransformer,
  DataValidator,
  CacheStrategy,
} from './data-source';

// Constants
export { STORAGE_KEYS } from './data-source';
