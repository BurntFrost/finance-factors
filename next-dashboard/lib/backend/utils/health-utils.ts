/**
 * Health Check Utilities and Helpers
 * 
 * Utility functions for performance monitoring, memory usage tracking,
 * external API testing, and error reporting for Vercel deployment
 */

import { 
  HealthStatus, 
  ServiceStatus, 
  PerformanceMetrics, 
  ApiServiceHealth,
  HealthCheckResult,
  Alert,
  HealthCheckError
} from '@/shared/types/health';

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  const memUsage = process.memoryUsage();
  
  return {
    responseTime: 0, // Will be set by caller
    memoryUsage: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    },
    uptime: process.uptime()
  };
}

/**
 * Check if running in Vercel environment
 */
export function isVercelEnvironment(): boolean {
  return !!(process.env.VERCEL || process.env.VERCEL_ENV);
}

/**
 * Detect cold start in serverless environment
 */
let isFirstRequest = true;
export function isColdStart(): boolean {
  if (isFirstRequest) {
    isFirstRequest = false;
    return true;
  }
  return false;
}

/**
 * Get Vercel deployment information
 */
export function getVercelDeploymentInfo() {
  return {
    region: process.env.VERCEL_REGION || 'unknown',
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    url: process.env.VERCEL_URL,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA,
    gitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE,
  };
}

/**
 * Test external API connectivity
 */
export async function testApiConnectivity(
  url: string, 
  timeout: number = 5000,
  headers?: Record<string, string>
): Promise<{ status: ServiceStatus; responseTime: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to minimize data transfer
      headers: {
        'User-Agent': 'Finance-Factors-Health-Check/1.0',
        ...headers
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    return {
      status: response.ok ? 'available' : 'degraded',
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}`
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unavailable',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check API service health with rate limit information
 */
export async function checkApiServiceHealth(
  serviceName: string,
  baseUrl: string,
  apiKey?: string,
  testEndpoint?: string
): Promise<ApiServiceHealth> {
  const configured = !!apiKey;
  
  if (!configured) {
    return {
      configured: false,
      status: 'unavailable',
      lastChecked: new Date().toISOString()
    };
  }
  
  // If no test endpoint provided, just return configured status
  if (!testEndpoint) {
    return {
      configured: true,
      status: 'available', // Assume available if configured
      lastChecked: new Date().toISOString()
    };
  }
  
  const testUrl = `${baseUrl}${testEndpoint}`;
  const headers: Record<string, string> = {};
  
  // Add API key based on service
  switch (serviceName.toLowerCase()) {
    case 'fred':
      headers['api_key'] = apiKey;
      break;
    case 'bls':
      headers['registrationkey'] = apiKey;
      break;
    case 'census':
      headers['key'] = apiKey;
      break;
    case 'alphavantage':
      headers['apikey'] = apiKey;
      break;
  }
  
  const result = await testApiConnectivity(testUrl, 5000, headers);
  
  return {
    configured: true,
    status: result.status,
    lastChecked: new Date().toISOString(),
    responseTime: result.responseTime,
    errorMessage: result.error
  };
}

/**
 * Check if static assets are accessible
 */
export async function checkStaticAssets(baseUrl: string): Promise<{
  css: boolean;
  js: boolean;
  images: boolean;
  fonts: boolean;
}> {
  const assetChecks = {
    css: false,
    js: false,
    images: false,
    fonts: false
  };
  
  try {
    // Check for common Next.js static assets
    const checks = await Promise.allSettled([
      fetch(`${baseUrl}/_next/static/css/app.css`, { method: 'HEAD' }),
      fetch(`${baseUrl}/_next/static/chunks/main.js`, { method: 'HEAD' }),
      fetch(`${baseUrl}/favicon.ico`, { method: 'HEAD' }),
      fetch(`${baseUrl}/_next/static/media/font.woff2`, { method: 'HEAD' })
    ]);
    
    assetChecks.css = checks[0].status === 'fulfilled' && checks[0].value.ok;
    assetChecks.js = checks[1].status === 'fulfilled' && checks[1].value.ok;
    assetChecks.images = checks[2].status === 'fulfilled' && checks[2].value.ok;
    assetChecks.fonts = checks[3].status === 'fulfilled' && checks[3].value.ok;
  } catch (_error) {
    // Assets check failed, return false for all
  }
  
  return assetChecks;
}

/**
 * Check environment variables
 */
export function checkEnvironmentVariables(): {
  required: string[];
  missing: string[];
  configured: number;
  total: number;
} {
  const requiredEnvVars = [
    'NEXT_PUBLIC_FRED_API_KEY',
    'NEXT_PUBLIC_BLS_API_KEY',
    'NEXT_PUBLIC_CENSUS_API_KEY',
    'NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  const configured = requiredEnvVars.length - missing.length;
  
  return {
    required: requiredEnvVars,
    missing,
    configured,
    total: requiredEnvVars.length
  };
}

/**
 * Determine overall health status from individual checks
 */
export function determineOverallStatus(checks: HealthCheckResult[]): HealthStatus {
  const statuses = checks.map(check => check.status);
  
  if (statuses.every(status => status === 'healthy')) {
    return 'healthy';
  }
  
  if (statuses.some(status => status === 'unhealthy')) {
    return 'unhealthy';
  }
  
  if (statuses.some(status => status === 'degraded')) {
    return 'degraded';
  }
  
  return 'unknown';
}

/**
 * Create standardized health check result
 */
export function createHealthCheckResult(
  name: string,
  status: HealthStatus,
  message: string,
  startTime: number,
  metadata?: Record<string, unknown>
): HealthCheckResult {
  return {
    name,
    status,
    message,
    duration: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    metadata
  };
}

/**
 * Create error response for health checks
 */
export function createHealthCheckError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): HealthCheckError {
  return {
    status: 'error',
    timestamp: new Date().toISOString(),
    error: {
      code,
      message,
      details
    },
    performance: getPerformanceMetrics()
  };
}

/**
 * Generate alerts based on health check results
 */
export function generateAlerts(checks: HealthCheckResult[]): Alert[] {
  const alerts: Alert[] = [];
  
  checks.forEach(check => {
    if (check.status === 'unhealthy') {
      alerts.push({
        level: 'error',
        message: `${check.name} is unhealthy: ${check.message}`,
        component: check.name,
        timestamp: check.timestamp
      });
    } else if (check.status === 'degraded') {
      alerts.push({
        level: 'warning',
        message: `${check.name} is degraded: ${check.message}`,
        component: check.name,
        timestamp: check.timestamp
      });
    }
  });
  
  return alerts;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Format memory size in human-readable format
 */
export function formatMemorySize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)}${units[unitIndex]}`;
}

/**
 * Validate Web Vitals thresholds
 */
export function validateWebVitals(vitals: {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
}): { status: HealthStatus; issues: string[] } {
  const issues: string[] = [];
  let status: HealthStatus = 'healthy';
  
  // LCP should be < 2.5s (good), < 4s (needs improvement)
  if (vitals.lcp && vitals.lcp > 4000) {
    issues.push(`LCP too slow: ${vitals.lcp}ms (should be < 2500ms)`);
    status = 'degraded';
  }
  
  // FID should be < 100ms (good), < 300ms (needs improvement)
  if (vitals.fid && vitals.fid > 300) {
    issues.push(`FID too slow: ${vitals.fid}ms (should be < 100ms)`);
    status = 'degraded';
  }
  
  // CLS should be < 0.1 (good), < 0.25 (needs improvement)
  if (vitals.cls && vitals.cls > 0.25) {
    issues.push(`CLS too high: ${vitals.cls} (should be < 0.1)`);
    status = 'degraded';
  }
  
  return { status, issues };
}
