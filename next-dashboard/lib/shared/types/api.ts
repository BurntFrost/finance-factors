/**
 * Shared API Types
 * 
 * Common API interfaces and types used by both frontend and backend
 */

// Standard data point format that both frontend and backend use
export interface StandardDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
  source?: string;
}

// Proxy API response format
export interface ProxyApiResponse<T = StandardDataPoint[]> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
  source: string;
  cached: boolean;
  lastUpdated?: string;
  totalRecords?: number;
  userExperience?: UserExperienceIndicator;
}

// User experience indicator for API responses
export interface UserExperienceIndicator {
  impact: 'low' | 'medium' | 'high';
  message: string;
  action?: 'none' | 'retry' | 'fallback' | 'notify';
  autoHide?: boolean;
  duration?: number;
}

// API error interface
export interface ProxyError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  source?: string;
}

// API endpoint configuration
export interface ApiEndpointConfig {
  provider: 'FRED' | 'BLS' | 'CENSUS' | 'ALPHA_VANTAGE';
  seriesId?: string;
  endpoint: string;
  params?: Record<string, string>;
}

// Data source types
export type DataSourceType = 'historical' | 'live-api' | 'cached';

// API provider types
export type ApiProvider = 'FRED' | 'BLS' | 'CENSUS' | 'ALPHA_VANTAGE';

// Rate limiting configuration
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

// Cache configuration
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  enabled: boolean;
  prefix?: string;
}

// Health check status
export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'available' | 'unavailable';

// API service health
export interface ApiServiceHealth {
  configured: boolean;
  status: ServiceStatus;
  lastChecked: string;
  responseTime?: number;
  error?: string;
  note?: string;
}

// Performance metrics
export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
  requestCount: number;
  errorCount: number;
  cacheHitRate?: number;
}

// Health check response
export interface ApiHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  performance: PerformanceMetrics;
  services: Record<string, ApiServiceHealth>;
  cache?: {
    enabled: boolean;
    size: number;
    hitRate?: number;
  };
  deployment?: {
    region?: string;
    commit?: string;
    branch?: string;
    buildTime?: string;
  };
}
