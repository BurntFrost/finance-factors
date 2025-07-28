/**
 * Monitoring Integration Health Check Endpoint
 *
 * Aggregated health check endpoint designed for external monitoring services
 * with detailed error information, status codes, and alerting capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  MonitoringHealthCheck,
  HealthCheckResult,
  Alert
} from '@/backend/types/health';
import {
  getPerformanceMetrics,
  createHealthCheckError,
  createHealthCheckResult,
  determineOverallStatus,
  checkEnvironmentVariables,
  isVercelEnvironment,
  getVercelDeploymentInfo,
  isColdStart
} from '@/backend/utils/health-utils';

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Perform comprehensive health checks for monitoring
 */
async function performComprehensiveHealthChecks(): Promise<HealthCheckResult[]> {
  const checks: HealthCheckResult[] = [];
  const startTime = Date.now();

  // 1. Environment Variables Check
  const envVars = checkEnvironmentVariables();
  checks.push(
    createHealthCheckResult(
      'Environment Variables',
      envVars.missing.length === 0 ? 'healthy' : 'degraded',
      `${envVars.configured}/${envVars.total} configured. Missing: ${envVars.missing.join(', ') || 'none'}`,
      startTime,
      { configured: envVars.configured, total: envVars.total, missing: envVars.missing }
    )
  );

  // 2. Memory Usage Check
  const performance = getPerformanceMetrics();
  const memoryStatus = performance.memoryUsage.percentage < 80 ? 'healthy' : 
                      performance.memoryUsage.percentage < 95 ? 'degraded' : 'unhealthy';
  checks.push(
    createHealthCheckResult(
      'Memory Usage',
      memoryStatus,
      `Memory usage: ${performance.memoryUsage.percentage}% (${Math.round(performance.memoryUsage.used / 1024 / 1024)}MB used)`,
      startTime,
      { percentage: performance.memoryUsage.percentage, usedMB: Math.round(performance.memoryUsage.used / 1024 / 1024) }
    )
  );

  // 3. Process Uptime Check
  const uptimeHours = performance.uptime / 3600;
  const uptimeStatus = uptimeHours > 0.1 ? 'healthy' : 'degraded'; // Less than 6 minutes might indicate frequent restarts
  checks.push(
    createHealthCheckResult(
      'Process Uptime',
      uptimeStatus,
      `Process uptime: ${uptimeHours.toFixed(2)} hours`,
      startTime,
      { uptimeSeconds: performance.uptime, uptimeHours }
    )
  );

  // 4. Cold Start Detection (Vercel specific)
  if (isVercelEnvironment()) {
    const coldStart = isColdStart();
    checks.push(
      createHealthCheckResult(
        'Cold Start Status',
        coldStart ? 'degraded' : 'healthy',
        coldStart ? 'Function cold start detected' : 'Function warm',
        startTime,
        { isColdStart: coldStart }
      )
    );
  }

  // 5. API Services Check (quick configuration check)
  const apiServices = ['FRED', 'BLS', 'Census', 'Alpha Vantage'];
  const configuredApis = [
    !!process.env.NEXT_PUBLIC_FRED_API_KEY,
    !!process.env.NEXT_PUBLIC_BLS_API_KEY,
    !!process.env.NEXT_PUBLIC_CENSUS_API_KEY,
    !!process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY,
  ];
  const configuredCount = configuredApis.filter(Boolean).length;
  
  checks.push(
    createHealthCheckResult(
      'API Services Configuration',
      configuredCount > 0 ? 'healthy' : 'unhealthy',
      `${configuredCount}/${apiServices.length} API services configured`,
      startTime,
      { configured: configuredCount, total: apiServices.length, services: apiServices }
    )
  );

  // 6. Deployment Environment Check
  const deploymentInfo = isVercelEnvironment() ? getVercelDeploymentInfo() : null;
  const envStatus = process.env.NODE_ENV === 'production' ? 'healthy' : 'degraded';
  checks.push(
    createHealthCheckResult(
      'Deployment Environment',
      envStatus,
      `Environment: ${process.env.NODE_ENV || 'unknown'}${deploymentInfo ? ` (Vercel: ${deploymentInfo.region})` : ''}`,
      startTime,
      { 
        nodeEnv: process.env.NODE_ENV,
        isVercel: isVercelEnvironment(),
        region: deploymentInfo?.region,
        deploymentId: deploymentInfo?.deploymentId
      }
    )
  );

  return checks;
}

/**
 * Generate monitoring-specific alerts
 */
function generateMonitoringAlerts(checks: HealthCheckResult[]): Alert[] {
  const alerts: Alert[] = [];

  checks.forEach(check => {
    switch (check.name) {
      case 'Memory Usage':
        if (check.status === 'unhealthy') {
          alerts.push({
            level: 'critical',
            message: `Critical memory usage detected: ${check.metadata?.percentage}%`,
            component: 'system',
            timestamp: check.timestamp,
          });
        } else if (check.status === 'degraded') {
          alerts.push({
            level: 'warning',
            message: `High memory usage: ${check.metadata?.percentage}%`,
            component: 'system',
            timestamp: check.timestamp,
          });
        }
        break;

      case 'Environment Variables':
        if (check.status === 'degraded' && check.metadata?.missing && Array.isArray(check.metadata.missing) && check.metadata.missing.length > 0) {
          alerts.push({
            level: 'warning',
            message: `Missing environment variables: ${(check.metadata.missing as string[]).join(', ')}`,
            component: 'configuration',
            timestamp: check.timestamp,
          });
        }
        break;

      case 'API Services Configuration':
        if (check.status === 'unhealthy') {
          alerts.push({
            level: 'error',
            message: 'No API services configured - application may not function properly',
            component: 'api',
            timestamp: check.timestamp,
          });
        }
        break;

      case 'Cold Start Status':
        if (check.status === 'degraded') {
          alerts.push({
            level: 'info',
            message: 'Function cold start detected - performance may be temporarily degraded',
            component: 'performance',
            timestamp: check.timestamp,
          });
        }
        break;
    }
  });

  return alerts;
}

/**
 * Monitoring health check handler
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'json';
  const includeAlerts = url.searchParams.get('alerts') !== 'false';

  try {
    // Perform comprehensive health checks
    const checks = await performComprehensiveHealthChecks();

    // Get performance metrics
    const performance = getPerformanceMetrics();
    performance.responseTime = Date.now() - startTime;

    // Calculate summary statistics
    const totalChecks = checks.length;
    const passedChecks = checks.filter(c => c.status === 'healthy').length;
    const failedChecks = checks.filter(c => c.status === 'unhealthy').length;
    const warningChecks = checks.filter(c => c.status === 'degraded').length;

    // Generate alerts if requested
    const alerts = includeAlerts ? generateMonitoringAlerts(checks) : [];

    // Determine overall status
    const overallStatus = determineOverallStatus(checks);

    // Build monitoring health check response
    const healthCheck: MonitoringHealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      performance,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks,
        warningChecks,
      },
      checks,
      alerts: alerts.length > 0 ? alerts : undefined,
    };

    // Handle different response formats
    if (format === 'prometheus') {
      // Return Prometheus metrics format
      const prometheusMetrics = generatePrometheusMetrics(healthCheck);
      return new NextResponse(prometheusMetrics, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Default JSON response
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, {
      status: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
        'X-Overall-Status': overallStatus,
        'X-Total-Checks': totalChecks.toString(),
        'X-Failed-Checks': failedChecks.toString(),
        'X-Alert-Count': alerts.length.toString(),
      },
    });

  } catch (error) {
    const healthCheckError = createHealthCheckError(
      'MONITORING_HEALTH_CHECK_FAILED',
      error instanceof Error ? error.message : 'Unknown error occurred during monitoring health check',
      {
        duration: Date.now() - startTime,
        environment: process.env.NODE_ENV,
        vercel: isVercelEnvironment(),
      }
    );

    return NextResponse.json(healthCheckError, {
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
      },
    });
  }
}

/**
 * Generate Prometheus metrics format
 */
function generatePrometheusMetrics(healthCheck: MonitoringHealthCheck): string {
  const metrics: string[] = [];
  
  // Overall health status (0 = unhealthy, 1 = degraded, 2 = healthy)
  const statusValue = healthCheck.status === 'healthy' ? 2 : 
                     healthCheck.status === 'degraded' ? 1 : 0;
  metrics.push(`finance_factors_health_status ${statusValue}`);
  
  // Summary metrics
  metrics.push(`finance_factors_health_checks_total ${healthCheck.summary.totalChecks}`);
  metrics.push(`finance_factors_health_checks_passed ${healthCheck.summary.passedChecks}`);
  metrics.push(`finance_factors_health_checks_failed ${healthCheck.summary.failedChecks}`);
  metrics.push(`finance_factors_health_checks_warnings ${healthCheck.summary.warningChecks}`);
  
  // Performance metrics
  metrics.push(`finance_factors_response_time_ms ${healthCheck.performance.responseTime}`);
  metrics.push(`finance_factors_memory_usage_percent ${healthCheck.performance.memoryUsage.percentage}`);
  metrics.push(`finance_factors_uptime_seconds ${healthCheck.performance.uptime}`);
  
  // Alert count
  metrics.push(`finance_factors_alerts_total ${healthCheck.alerts?.length || 0}`);
  
  return metrics.join('\n') + '\n';
}

/**
 * POST endpoint for webhook notifications and custom checks
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, webhook: _webhook, customChecks } = body;

    switch (action) {
      case 'webhook':
        // Handle webhook notification (e.g., from external monitoring)
        return NextResponse.json({
          status: 'success',
          message: 'Webhook received',
          timestamp: new Date().toISOString(),
        });

      case 'custom-check':
        // Perform custom health checks based on request
        const checks = await performComprehensiveHealthChecks();
        const filteredChecks = customChecks ? 
          checks.filter(check => customChecks.includes(check.name)) : 
          checks;
        
        return NextResponse.json({
          status: 'success',
          checks: filteredChecks,
          summary: {
            total: filteredChecks.length,
            passed: filteredChecks.filter(c => c.status === 'healthy').length,
            failed: filteredChecks.filter(c => c.status === 'unhealthy').length,
          },
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to process monitoring request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
