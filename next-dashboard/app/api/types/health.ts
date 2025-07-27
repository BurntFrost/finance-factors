/**
 * Health Check Types and Interfaces
 * 
 * Comprehensive type definitions for all health check endpoints
 * including Vercel-specific metrics, dashboard functionality, and deployment verification
 */

// Base health check status
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// Service status for external dependencies
export type ServiceStatus = 'available' | 'unavailable' | 'degraded' | 'unknown';

// Performance metrics
export interface PerformanceMetrics {
  responseTime: number; // milliseconds
  memoryUsage: {
    used: number; // bytes
    total: number; // bytes
    percentage: number;
  };
  cpuUsage?: number; // percentage
  uptime: number; // seconds
}

// External API service health
export interface ApiServiceHealth {
  configured: boolean;
  status: ServiceStatus;
  lastChecked?: string;
  responseTime?: number;
  errorMessage?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: string;
}

// Base health check response
export interface BaseHealthCheck {
  status: HealthStatus;
  timestamp: string;
  version?: string;
  environment?: string;
  performance: PerformanceMetrics;
}

// Main API health check response
export interface ApiHealthCheck extends BaseHealthCheck {
  services: {
    fred: ApiServiceHealth;
    bls: ApiServiceHealth;
    census: ApiServiceHealth;
    alphaVantage: ApiServiceHealth;
  };
  cache: {
    enabled: boolean;
    size: number;
    hitRate?: number;
  };
  database?: {
    connected: boolean;
    responseTime?: number;
  };
}

// Vercel-specific health check
export interface VercelHealthCheck extends BaseHealthCheck {
  vercel: {
    region: string;
    deploymentId?: string;
    isColdStart: boolean;
    functionDuration?: number;
    edgeFunctions: {
      available: boolean;
      regions: string[];
    };
    cdn: {
      status: ServiceStatus;
      cacheHitRate?: number;
      edgeLocations?: string[];
    };
    staticAssets: {
      status: ServiceStatus;
      lastDeployment?: string;
      assetsCount?: number;
    };
  };
  limits: {
    functionTimeout: number;
    functionMemory: number;
    bandwidthUsed?: number;
    bandwidthLimit?: number;
  };
}

// Dashboard functionality health check
export interface DashboardHealthCheck extends BaseHealthCheck {
  dashboard: {
    chartJs: {
      loaded: boolean;
      version?: string;
      registeredCharts: string[];
    };
    dataSources: {
      live: {
        status: ServiceStatus;
        lastSuccessfulFetch?: string;
        failureCount: number;
      };
      sample: {
        status: ServiceStatus;
        dataIntegrity: boolean;
      };
    };
    interactiveFeatures: {
      hoverOverlays: boolean;
      cardAnimations: boolean;
      dropdownSelections: boolean;
      dataSourceSwitching: boolean;
    };
    components: {
      automaticChart: boolean;
      dataStatusPill: boolean;
      summaryCards: boolean;
      lazyLoading: boolean;
    };
  };
  webVitals?: {
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
    fcp?: number; // First Contentful Paint
    ttfb?: number; // Time to First Byte
  };
}

// Deployment verification health check
export interface DeploymentHealthCheck extends BaseHealthCheck {
  deployment: {
    routes: {
      api: {
        health: boolean;
        data: boolean;
        proxy: boolean;
      };
      pages: {
        home: boolean;
        dashboard: boolean;
      };
    };
    staticAssets: {
      css: boolean;
      js: boolean;
      images: boolean;
      fonts: boolean;
    };
    environmentVariables: {
      required: string[];
      missing: string[];
      configured: number;
      total: number;
    };
    build: {
      successful: boolean;
      timestamp?: string;
      duration?: number;
      errors?: string[];
      warnings?: string[];
    };
  };
  security: {
    headers: {
      cors: boolean;
      csp?: boolean;
      hsts?: boolean;
    };
    apiKeys: {
      exposed: boolean;
      encrypted: boolean;
    };
  };
}

// Monitoring integration response
export interface MonitoringHealthCheck extends BaseHealthCheck {
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
  };
  checks: HealthCheckResult[];
  alerts?: Alert[];
}

// Individual health check result
export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Alert definition
export interface Alert {
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  component: string;
  timestamp: string;
  resolved?: boolean;
}

// Health check configuration
export interface HealthCheckConfig {
  timeout: number;
  retries: number;
  enableDetailedChecks: boolean;
  enablePerformanceMetrics: boolean;
  enableExternalApiChecks: boolean;
}

// Error response for health checks
export interface HealthCheckError {
  status: 'error';
  timestamp: string;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  performance?: Partial<PerformanceMetrics>;
}

// Utility types for health check responses
export type HealthCheckResponse = 
  | ApiHealthCheck 
  | VercelHealthCheck 
  | DashboardHealthCheck 
  | DeploymentHealthCheck 
  | MonitoringHealthCheck 
  | HealthCheckError;

// Health check endpoint paths
export const HEALTH_CHECK_ENDPOINTS = {
  API: '/api/health',
  VERCEL: '/api/health/vercel',
  DASHBOARD: '/api/health/dashboard',
  DEPLOYMENT: '/api/health/deployment',
  MONITORING: '/api/health/monitoring',
} as const;

// Default health check configuration
export const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = {
  timeout: 5000,
  retries: 2,
  enableDetailedChecks: true,
  enablePerformanceMetrics: true,
  enableExternalApiChecks: true,
};
