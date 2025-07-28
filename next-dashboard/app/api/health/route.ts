/**
 * Health Check Summary Endpoint
 *
 * Provides an overview of all available health check endpoints
 * and their current status for easy monitoring dashboard integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { HEALTH_CHECK_ENDPOINTS } from '@/backend/types/health';
import { 
  getPerformanceMetrics,
  isVercelEnvironment,
  getVercelDeploymentInfo
} from '@/backend/utils/health-utils';

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Test endpoint availability
 */
async function testEndpoint(url: string): Promise<{ status: string; responseTime: number }> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    
    return {
      status: response.ok ? 'available' : 'error',
      responseTime: Date.now() - startTime,
    };
  } catch (_error) {
    return {
      status: 'unavailable',
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Health check summary handler
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const url = new URL(request.url);
  const testEndpoints = url.searchParams.get('testEndpoints') === 'true';
  const baseUrl = url.origin;

  try {
    // Get performance metrics
    const performance = getPerformanceMetrics();
    
    // Get deployment info
    const deploymentInfo = isVercelEnvironment() ? getVercelDeploymentInfo() : null;

    // Build endpoint information
    const endpoints = {
      api: {
        path: HEALTH_CHECK_ENDPOINTS.API,
        url: `${baseUrl}${HEALTH_CHECK_ENDPOINTS.API}`,
        description: 'Main API health check with service status',
        features: ['API service monitoring', 'Performance metrics', 'Cache status'],
        status: 'unknown',
        responseTime: 0,
      },
      vercel: {
        path: HEALTH_CHECK_ENDPOINTS.VERCEL,
        url: `${baseUrl}${HEALTH_CHECK_ENDPOINTS.VERCEL}`,
        description: 'Vercel-specific serverless environment monitoring',
        features: ['Cold start detection', 'Edge functions', 'CDN status'],
        status: 'unknown',
        responseTime: 0,
      },
      dashboard: {
        path: HEALTH_CHECK_ENDPOINTS.DASHBOARD,
        url: `${baseUrl}${HEALTH_CHECK_ENDPOINTS.DASHBOARD}`,
        description: 'Dashboard functionality and component verification',
        features: ['Chart.js status', 'Data sources', 'Interactive features'],
        status: 'unknown',
        responseTime: 0,
      },
      deployment: {
        path: HEALTH_CHECK_ENDPOINTS.DEPLOYMENT,
        url: `${baseUrl}${HEALTH_CHECK_ENDPOINTS.DEPLOYMENT}`,
        description: 'Post-deployment verification and route testing',
        features: ['Route accessibility', 'Static assets', 'Environment variables'],
        status: 'unknown',
        responseTime: 0,
      },
      monitoring: {
        path: HEALTH_CHECK_ENDPOINTS.MONITORING,
        url: `${baseUrl}${HEALTH_CHECK_ENDPOINTS.MONITORING}`,
        description: 'Aggregated monitoring for external services',
        features: ['Comprehensive checks', 'Alert generation', 'Prometheus metrics'],
        status: 'unknown',
        responseTime: 0,
      },
    };

    // Test endpoints if requested
    if (testEndpoints) {
      const endpointTests = await Promise.allSettled(
        Object.entries(endpoints).map(async ([key, endpoint]) => {
          const result = await testEndpoint(endpoint.url);
          return { key, ...result };
        })
      );

      endpointTests.forEach((test) => {
        if (test.status === 'fulfilled') {
          const { key, status, responseTime } = test.value;
          endpoints[key as keyof typeof endpoints].status = status;
          endpoints[key as keyof typeof endpoints].responseTime = responseTime;
        }
      });
    }

    // Update performance metrics
    performance.responseTime = Date.now() - startTime;

    // Build summary response
    const summary = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: deploymentInfo?.environment || process.env.NODE_ENV || 'development',
      performance,
      deployment: deploymentInfo ? {
        region: deploymentInfo.region,
        deploymentId: deploymentInfo.deploymentId,
        environment: deploymentInfo.environment,
        gitCommit: deploymentInfo.gitCommitSha,
      } : null,
      endpoints,
      usage: {
        quickCheck: `${baseUrl}${HEALTH_CHECK_ENDPOINTS.API}`,
        detailedCheck: `${baseUrl}${HEALTH_CHECK_ENDPOINTS.API}?detailed=true&testApis=true`,
        vercelCheck: `${baseUrl}${HEALTH_CHECK_ENDPOINTS.VERCEL}?checkAssets=true`,
        dashboardCheck: `${baseUrl}${HEALTH_CHECK_ENDPOINTS.DASHBOARD}?webVitals=true`,
        deploymentCheck: `${baseUrl}${HEALTH_CHECK_ENDPOINTS.DEPLOYMENT}?checkRoutes=true&checkAssets=true`,
        monitoringCheck: `${baseUrl}${HEALTH_CHECK_ENDPOINTS.MONITORING}?format=json&alerts=true`,
        prometheusMetrics: `${baseUrl}${HEALTH_CHECK_ENDPOINTS.MONITORING}?format=prometheus`,
      },
      documentation: {
        readme: 'See HEALTH_CHECK_DOCUMENTATION.md for detailed usage',
        testScript: 'Run `npm run test:health` to test all endpoints',
        examples: 'Check package.json scripts for usage examples',
      },
    };

    // Determine overall status based on endpoint tests
    if (testEndpoints) {
      const endpointStatuses = Object.values(endpoints).map(e => e.status);
      const availableCount = endpointStatuses.filter(s => s === 'available').length;
      const totalCount = endpointStatuses.length;
      
      if (availableCount === totalCount) {
        summary.status = 'healthy';
      } else if (availableCount > 0) {
        summary.status = 'degraded';
      } else {
        summary.status = 'unhealthy';
      }
    }

    const statusCode = summary.status === 'healthy' ? 200 : 
                      summary.status === 'degraded' ? 200 : 503;

    return NextResponse.json(summary, {
      status: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
        'X-Health-Summary': 'true',
        'X-Endpoints-Tested': testEndpoints.toString(),
      },
    });

  } catch (error) {
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        code: 'HEALTH_SUMMARY_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      performance: {
        responseTime: Date.now() - startTime,
      },
    };

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
      },
    });
  }
}

/**
 * POST endpoint for health check configuration
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'test-all':
        // Redirect to GET with testEndpoints=true
        const url = new URL(request.url);
        url.searchParams.set('testEndpoints', 'true');
        return NextResponse.redirect(url.toString());

      case 'get-config':
        return NextResponse.json({
          status: 'success',
          config: {
            endpoints: Object.keys(HEALTH_CHECK_ENDPOINTS),
            features: [
              'API service monitoring',
              'Vercel environment detection',
              'Dashboard functionality checks',
              'Deployment verification',
              'Monitoring integration',
              'Prometheus metrics',
            ],
            environment: {
              isVercel: isVercelEnvironment(),
              nodeEnv: process.env.NODE_ENV,
              region: process.env.VERCEL_REGION,
            },
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
        error: 'Failed to process health summary request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
