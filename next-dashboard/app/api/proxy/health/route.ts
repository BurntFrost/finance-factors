/**
 * Enhanced API Health Check Endpoint - App Router Version
 *
 * Comprehensive health check for API proxy services with performance metrics,
 * external dependency testing, and detailed error reporting for Vercel deployment
 */

import { NextResponse } from 'next/server';
import {
  ApiHealthCheck,
  ServiceStatus
} from '../../types/health';
import {
  getPerformanceMetrics,
  checkApiServiceHealth,
  createHealthCheckError,
  isVercelEnvironment,
  getVercelDeploymentInfo
} from '../../utils/health-utils';

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Enhanced health check handler for GET requests
 */
export async function GET(request: Request): Promise<NextResponse> {
  const startTime = Date.now();
  const url = new URL(request.url);
  const detailed = url.searchParams.get('detailed') === 'true';
  const testApis = url.searchParams.get('testApis') === 'true';

  try {
    // Get performance metrics
    const performance = getPerformanceMetrics();
    performance.responseTime = Date.now() - startTime;

    // Get Vercel deployment info if available
    const deploymentInfo = isVercelEnvironment() ? getVercelDeploymentInfo() : null;

    // Check API services with optional connectivity testing
    const [fredHealth, blsHealth, censusHealth, alphaVantageHealth] = await Promise.all([
      testApis ? checkApiServiceHealth(
        'fred',
        'https://api.stlouisfed.org/fred',
        process.env.NEXT_PUBLIC_FRED_API_KEY,
        '/series?series_id=GDP&api_key='
      ) : {
        configured: !!process.env.NEXT_PUBLIC_FRED_API_KEY,
        status: (!!process.env.NEXT_PUBLIC_FRED_API_KEY ? 'available' : 'unavailable') as ServiceStatus,
        lastChecked: new Date().toISOString()
      },
      testApis ? checkApiServiceHealth(
        'bls',
        'https://api.bls.gov/publicAPI/v2',
        process.env.NEXT_PUBLIC_BLS_API_KEY,
        '/timeseries/data/'
      ) : {
        configured: !!process.env.NEXT_PUBLIC_BLS_API_KEY,
        status: (!!process.env.NEXT_PUBLIC_BLS_API_KEY ? 'available' : 'unavailable') as ServiceStatus,
        lastChecked: new Date().toISOString()
      },
      testApis ? checkApiServiceHealth(
        'census',
        'https://api.census.gov/data',
        process.env.NEXT_PUBLIC_CENSUS_API_KEY,
        '/timeseries/eits/resconst'
      ) : {
        configured: !!process.env.NEXT_PUBLIC_CENSUS_API_KEY,
        status: (!!process.env.NEXT_PUBLIC_CENSUS_API_KEY ? 'available' : 'unavailable') as ServiceStatus,
        lastChecked: new Date().toISOString()
      },
      testApis ? checkApiServiceHealth(
        'alphavantage',
        'https://www.alphavantage.co',
        process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY,
        '/query?function=TIME_SERIES_DAILY&symbol=MSFT'
      ) : {
        configured: !!process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY,
        status: (!!process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY ? 'available' : 'unavailable') as ServiceStatus,
        lastChecked: new Date().toISOString()
      }
    ]);

    // Build comprehensive health check response
    const healthCheck: ApiHealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: deploymentInfo?.environment || process.env.NODE_ENV || 'development',
      performance,
      services: {
        fred: fredHealth,
        bls: blsHealth,
        census: censusHealth,
        alphaVantage: alphaVantageHealth,
      },
      cache: {
        enabled: process.env.NEXT_PUBLIC_ENABLE_CACHING !== 'false',
        size: 0, // We don't expose internal cache size for security
        hitRate: detailed ? Math.random() * 100 : undefined, // Mock hit rate for demo
      },
    };

    // Add database info if detailed check requested
    if (detailed) {
      healthCheck.database = {
        connected: true, // Mock database connection
        responseTime: Math.floor(Math.random() * 50) + 10, // Mock response time
      };
    }

    // Determine overall status based on service health
    const services = Object.values(healthCheck.services);
    const configuredServices = services.filter(s => s.configured).length;
    const availableServices = services.filter(s => s.status === 'available').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;

    if (configuredServices === 0) {
      healthCheck.status = 'unhealthy';
    } else if (availableServices < configuredServices) {
      healthCheck.status = degradedServices > 0 ? 'degraded' : 'unhealthy';
    }

    // Set response status code based on health
    const statusCode = healthCheck.status === 'healthy' ? 200 :
                      healthCheck.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, {
      status: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
      },
    });

  } catch (error) {
    const healthCheckError = createHealthCheckError(
      'HEALTH_CHECK_FAILED',
      error instanceof Error ? error.message : 'Unknown error occurred during health check',
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
      },
    });
  }
}
